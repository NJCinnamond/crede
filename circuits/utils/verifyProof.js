// The salt from your generate-proof response
const id = "1729357535_48ee81d7-baf9-4be4-bd4e-f986f0e4ca56"; 

// Function to verify the proof
async function verifyProof() {
    
        // Read the proof from the file - assuming you have the proof file locally
        const proofPath = `proof_${id}.json`;
        const proofJson = await fetch(proofPath).then(res => res.text());
        
        // Prepare the request body
        const requestBody = {
            salt: id,
            proof: proofJson  // This should be the stringified JSON proof
        };

        // Call the verify-proof endpoint
        const response = await fetch('http://0.0.0.0:8000/verify-proof', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        console.log('Verification result:', result);
        // result will be: { is_valid: boolean, status: "success" | "failure" }
        
    
}

// Alternative version if you already have the proof as a JSON object
async function verifyProofWithProofObject(proofObject) {
    
        const requestBody = {
            id,
            proof: JSON.stringify(proofObject)  // Convert proof object to string
        };

        console.log("req: ", requestBody)

        const response = await fetch('http://0.0.0.0:8000/verify-proof', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        console.log('Verification result:', result);
}

// Example usage:
// If you have the proof as an object:
const proofObject = {
    "pi_a": [
        "955531246911430184578670786260969202854057821800238730774635998968378593201",
        "2035513522425608290667994761046493209823175786951607426900349461941607340684",
        "1"
       ],
       "pi_b": [
        [
         "9880662616633765743915865521886572499842538632409834972182632094029493646820",
         "11656857026737724451725125354470069362281612693280163180174656319966756753858"
        ],
        [
         "17817730086290713217708217397389530437557741907331627671106757610200825167688",
         "15471020772432305191238114499747709993187533357246139601084410865158308302965"
        ],
        [
         "1",
         "0"
        ]
       ],
       "pi_c": [
        "1208738270716556020686497213087421975434942383090719629909976080929608636262",
        "8089326401208000329071072563539451653300619893704144266920472896422822798196",
        "1"
       ],
       "protocol": "groth16",
       "curve": "bn128"
};

verifyProofWithProofObject(proofObject);

// Or if you're reading from file:
//verifyProof();