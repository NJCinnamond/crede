#[macro_use]
extern crate serde_json;

use std::sync::{Arc, Mutex};
use std::env;
use std::net::SocketAddr;
use actix_web::{web, App, HttpServer, Responder, HttpResponse, post};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs::File;
use std::io::Write;
use serde_json::Value;
use chrono::Utc;
use uuid::Uuid;
use std::time::{Duration, Instant};
use tokio::time::sleep;

#[derive(Deserialize)]
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

#[derive(Serialize)]
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

struct ProofAndSalt {
    proof: String,
    salt: String,
}

async fn generate_proof_from_inputs(inputs: &PublicInputs) -> ProofAndSalt {
    // Generate a unique identifier (salt) for this proof generation
    let timestamp = Utc::now().timestamp();
    let uuid = Uuid::new_v4();
    let salt = format!("{}_{}", timestamp, uuid);

    // Construct unique file names using the salt
    let inputs_file = format!("/usr/src/app/circuits/utils/inputs_{}.json", salt);
    let witness_file = format!("witness_{}.wtns", salt);
    let proof_file = format!("proof_{}.json", salt);
    let public_file = format!("public_{}.json", salt);

    // Prepare the inputs.json file
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
        .expect("Unable to create inputs.json");
    file.write_all(inputs_json.to_string().as_bytes())
        .expect("Unable to write data to inputs.json");

    // Call SnarkJS to generate the witness using the .wasm and inputs
    let witness_command = Command::new("snarkjs")
        .args(&[
            "wtns",
            "calculate",
            "/usr/src/app/circuits/AgeVerificationWithSignature_js/AgeVerificationWithSignature.wasm",
            &inputs_file,
            &witness_file,
        ])
        .output()
        .expect("Failed to execute snarkjs witness calculation");

    if !witness_command.status.success() {
        panic!("Witness generation failed: {:?}", witness_command);
    }

    // Call SnarkJS to generate the proof using the proving key and witness
    let proof_command = Command::new("snarkjs")
        .args(&[
            "groth16",
            "prove",
            "/usr/src/app/circuits/age_verification2.zkey",
            &witness_file,
            &proof_file,
            &public_file,
        ])
        .output()
        .expect("Failed to execute snarkjs proof generation");

    if !proof_command.status.success() {
        panic!("Proof generation failed: {:?}", proof_command);
    }
    
    // TODO: Store proof and witness in S3

    // Read the proof from proof.json
    let proof_file = File::open(&proof_file).expect("Unable to open proof file");
    let proof: Value = serde_json::from_reader(proof_file).expect("Unable to parse proof file");

    ProofAndSalt {
        proof: proof.to_string(),
        salt: salt
    }
}

// Shared state to hold proof generation result
#[derive(Clone)]
struct AppState {
    result: Arc<Mutex<Option<ProofResponse>>>,
}

#[post("/generate-proof")]
async fn generate_proof(state: web::Data<AppState>, inputs: web::Json<PublicInputs>) -> impl Responder {
    let state_clone = state.result.clone();

    // Spawn a new task to generate proof
    tokio::spawn(async move {
        let result = generate_proof_from_inputs(&inputs).await;

        // Store the result in shared state
        let mut result_lock = state_clone.lock().unwrap();
        *result_lock = Some(ProofResponse {
            proof: result.proof,
            status: "success".to_string(),
            id: result.salt,
        });
    });

    let mut attempts = 0;
    let mut last_keep_alive = Instant::now();

    while attempts < 1000 { // Limit the number of attempts to avoid infinite loop
        {
            let result_lock = state.result.lock().unwrap();
            if let Some(response) = &*result_lock {
                return HttpResponse::Ok().json(response);
            }
        }

        // Send a keep-alive response every 20 seconds
        if last_keep_alive.elapsed() >= Duration::from_secs(20) {
            last_keep_alive = Instant::now(); // Reset the keep-alive timer
            return HttpResponse::Ok().body(" "); // Sending a single space to keep connection alive
        }

        attempts += 1;
        sleep(Duration::from_secs(1)).await; // Wait before checking again
    }

    HttpResponse::InternalServerError().json("Proof generation timed out.")
}

async fn verify_proof(inputs: &ProofInputs) -> bool {
    // Create a new salt to store the proof
    let uuid = Uuid::new_v4();
    let proof_salt = format!("{}_{}", inputs.id, uuid);
    let proof_file = format!("proof_{}.json", proof_salt);

    // Parse the proof string into a Value
    let proof_json: Value = serde_json::from_str(&inputs.proof)
        .expect("Invalid proof format");
    
    // Create and write to proof.json
    let mut file = File::create(&proof_file)
        .expect("Unable to create proof.json");
    file.write_all(proof_json.to_string().as_bytes())
        .expect("Unable to write proof");

    // Use corresponding public file based on salt
    let public_file = format!("public_{}.json", inputs.id);

    let verify_command = Command::new("snarkjs")
        .args(&[
            "groth16",
            "verify",
            "/usr/src/app/circuits/verification_key.json",
            &public_file,
            &proof_file  // Use the generated proof file name
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
    let shared_state = AppState {
        result: Arc::new(Mutex::new(None)),
    };

    // Get the port from the environment, default to 8000 if not set
    let port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());
    let port: u16 = port.parse().expect("PORT must be a number");

    // Create the server address
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(shared_state.clone()))
            .service(generate_proof)
            .service(verify_proof_endpoint)
    })
    .bind(addr)?
    .run()
    .await
}