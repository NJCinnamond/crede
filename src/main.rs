#[macro_use]
extern crate serde_json;

use std::sync::Arc;
use std::env;
use std::net::SocketAddr;
use actix_web::{web, App, HttpServer, Responder, HttpResponse, post, get};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs::File;
use std::io::Write;
use serde_json::Value;
use chrono::Utc;
use uuid::Uuid;
use std::time::Duration;
use tokio::time::sleep;
use env_logger;
use tokio::sync::Mutex;

use std::collections::HashMap;
use log::{info, debug, error};

#[derive(Clone, Serialize)]
struct JobStatus {
    status: String,
    proof: Option<ProofResponse>,
    error: Option<String>,
}

#[derive(Clone)]
struct AppState {
    jobs: Arc<Mutex<HashMap<String, JobStatus>>>,
}

#[derive(Serialize)]
struct GenerateProofResponse {
    job_id: String,
    status: String,
}

#[derive(Deserialize, Clone)]
struct PublicInputs {
    birthdate_timestamp: u64,
    id_number: u64,
    expiry_date: u64,
    msghash: Vec<String>,
    sig_r: Vec<String>,
    sig_s: Vec<String>,
    pub_key: Vec<Vec<String>>,
    current_timestamp: String,
}

#[derive(Clone, Serialize)]
struct ProofResponse {
    proof: String,
    status: String,
    id: String,
}

#[derive(Deserialize)]
struct ProofInputs {
    id: String,
    proof: String,
}

#[derive(Serialize)]
struct VerificationResponse {
    is_valid: bool,
    status: String,
}

#[derive(Debug)]
struct ProofAndSalt {
    proof: String,
    salt: String,
}

#[post("/generate-proof")]
async fn generate_proof(
    state: web::Data<AppState>,
    inputs: web::Json<PublicInputs>
) -> impl Responder {
    let job_id = Uuid::new_v4().to_string();
    
    {
        let mut jobs = state.jobs.lock().await;
        jobs.insert(job_id.clone(), JobStatus {
            status: "pending".to_string(),
            proof: None,
            error: None,
        });
    }
    
    let state_clone = state.clone();
    let job_id_clone = job_id.clone();
    let inputs_clone = inputs.into_inner();

    tokio::spawn(async move {
        match generate_proof_from_inputs(&inputs_clone).await {
            Ok(result) => {
                let mut jobs = state_clone.jobs.lock().await;
                if let Some(job) = jobs.get_mut(&job_id_clone) {
                    job.status = "completed".to_string();
                    job.proof = Some(ProofResponse {
                        proof: result.proof,
                        status: "success".to_string(),
                        id: result.salt,
                    });
                }
            }
            Err(e) => {
                let mut jobs = state_clone.jobs.lock().await;
                if let Some(job) = jobs.get_mut(&job_id_clone) {
                    job.status = "failed".to_string();
                    job.error = Some(e);
                }
            }
        }
    });

    HttpResponse::Accepted().json(GenerateProofResponse {
        job_id,
        status: "pending".to_string(),
    })
}

#[get("/proof-status/{job_id}")]
async fn get_proof_status(
    state: web::Data<AppState>,
    job_id: web::Path<String>
) -> impl Responder {
    let jobs = state.jobs.lock().await;
    
    let job_id_string = job_id.into_inner();

    match jobs.get(&job_id_string) {
        Some(job) => HttpResponse::Ok().json(job),
        None => HttpResponse::NotFound().json(json!({
            "error": "Job not found",
            "status": "not_found"
        }))
    }
}

async fn cleanup_old_jobs(state: Arc<AppState>) {
    let cleanup_interval = Duration::from_secs(3600);
    
    loop {
        sleep(cleanup_interval).await;
        
        let mut jobs = state.jobs.lock().await;
        jobs.retain(|_, job| job.status == "pending");
    }
}

async fn generate_proof_from_inputs(inputs: &PublicInputs) -> Result<ProofAndSalt, String> {
    let timestamp = Utc::now().timestamp();
    let uuid = Uuid::new_v4();
    let salt = format!("{}_{}", timestamp, uuid);

    let inputs_file = format!("./circuits/utils/inputs_{}.json", salt);
    let witness_file = format!("witness_{}.wtns", salt);
    let proof_file = format!("proof_{}.json", salt);
    let public_file = format!("public_{}.json", salt);

    let inputs_json = json!({
        "birthdateTimestamp": inputs.birthdate_timestamp,
        "idNumber": inputs.id_number,
        "expiryDate": inputs.expiry_date,
        "msghash": inputs.msghash,
        "sigR": inputs.sig_r,
        "sigS": inputs.sig_s,
        "pubKey": inputs.pub_key,
        "currentTimestamp": inputs.current_timestamp,
    });

    let mut file = File::create(&inputs_file)
        .map_err(|e| format!("Unable to create inputs.json: {}", e))?;
    file.write_all(inputs_json.to_string().as_bytes())
        .map_err(|e| format!("Unable to write data to inputs.json: {}", e))?;

    let witness_command = Command::new("snarkjs")
        .args(&[
            "wtns",
            "calculate",
            "./circuits/AgeVerificationWithSignature_js/AgeVerificationWithSignature.wasm",
            &inputs_file,
            &witness_file,
        ])
        .output()
        .map_err(|e| format!("Failed to execute snarkjs witness calculation: {}", e))?;

    if !witness_command.status.success() {
        return Err(format!("Witness generation failed: {:?}", witness_command));
    }

    let proof_command = Command::new("snarkjs")
        .args(&[
            "groth16",
            "prove",
            "./circuits/age_verification2.zkey",
            &witness_file,
            &proof_file,
            &public_file,
        ])
        .output()
        .map_err(|e| format!("Failed to execute snarkjs proof generation: {}", e))?;

    if !proof_command.status.success() {
        return Err(format!("Proof generation failed: {:?}", proof_command));
    }

    let proof_file = File::open(&proof_file)
        .map_err(|e| format!("Unable to open proof file: {}", e))?;
    let proof: Value = serde_json::from_reader(proof_file)
        .map_err(|e| format!("Unable to parse proof file: {}", e))?;

    Ok(ProofAndSalt {
        proof: proof.to_string(),
        salt,
    })
}

async fn verify_proof(inputs: &ProofInputs) -> bool {
    let uuid = Uuid::new_v4();
    let proof_salt = format!("{}_{}", inputs.id, uuid);
    let proof_file = format!("proof_{}.json", proof_salt);

    let proof_json: Value = serde_json::from_str(&inputs.proof)
        .expect("Invalid proof format");
    
    let mut file = File::create(&proof_file)
        .expect("Unable to create proof.json");
    file.write_all(proof_json.to_string().as_bytes())
        .expect("Unable to write proof");

    let public_file = format!("public_{}.json", inputs.id);

    let verify_command = Command::new("snarkjs")
        .args(&[
            "groth16",
            "verify",
            "/usr/src/app/circuits/verification_key.json",
            &public_file,
            &proof_file
        ])
        .output()
        .expect("Failed to execute snarkjs verify command");

    verify_command.status.success()
}

#[post("/verify-proof")]
async fn verify_proof_endpoint(inputs: web::Json<ProofInputs>) -> impl Responder {
    let is_valid = verify_proof(&inputs).await;

    HttpResponse::Ok().json(VerificationResponse {
        is_valid,
        status: if is_valid { "success".to_string() } else { "failure".to_string() },
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();

    let shared_state = AppState {
        jobs: Arc::new(Mutex::new(HashMap::new())),
    };

    let cleanup_state = Arc::new(shared_state.clone());
    tokio::spawn(cleanup_old_jobs(cleanup_state));

    let port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());
    let port: u16 = port.parse().expect("PORT must be a number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(shared_state.clone()))
            .service(generate_proof)
            .service(get_proof_status)
            .service(verify_proof_endpoint)
    })
    .bind(addr)?
    .run()
    .await
}