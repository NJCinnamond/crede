export async function pollForProof(jobId: string, maxAttempts = 60) {
  // 10 minutes max by default
  const BASE_URL = "https://crede-api-2-5f9c65727a97.herokuapp.com";
  const POLLING_INTERVAL = 30000; // 30 seconds
  let attempts = 0;
  let allowedErrors = 1;

  while (attempts < maxAttempts) {
    try {
      const statusResponse = await fetch(`${BASE_URL}/proof-status/${jobId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!statusResponse.ok) {
        if (allowedErrors == 0) {
          throw new Error(`HTTP error! status: ${statusResponse.status}`);
        }
        allowedErrors -= 1;
      } else {
        const statusData = await statusResponse.json();

        // If proof is available, return the data
        if (statusData.proof !== null) {
          return statusData;
        }

        // Wait for the polling interval before next attempt
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        attempts++;
      }
    } catch (error) {
      console.error("Error polling for proof:", error);
      throw error;
    }
  }

  throw new Error("Timeout: Proof generation took too long");
}

export type ProofGenerationPayload = {
  birthdate_timestamp: number;
  id_number: number;
  expiry_date: number;
  msghash: string[];
  sig_r: string[];
  sig_s: string[];
  pub_key: string[][];
  current_timestamp: string;
};

// Usage example with your existing code
export async function generateAndWaitForProof(payload: ProofGenerationPayload) {
  try {
    // Initial proof generation request
    const response = await fetch(
      "https://crede-api-2-5f9c65727a97.herokuapp.com/generate-proof",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const { job_id } = data;

    if (!job_id) {
      throw new Error("No job_id received from proof generation");
    }

    // Poll for the proof
    const proofResult = await pollForProof(job_id);
    return proofResult;
  } catch (error) {
    console.error("Error in proof generation process:", error);
    throw error;
  }
}

export type ProofVerificationPayload = {
  id: string;
  proof: string;
};

// Usage example with your existing code
export async function verifyProof(payload: ProofVerificationPayload) {
  try {
    // Initial proof generation request
    const response = await fetch(
      "https://crede-api-2-5f9c65727a97.herokuapp.com/verify-proof",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in proof generation process:", error);
    throw error;
  }
}
