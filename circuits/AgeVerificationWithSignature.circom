pragma circom 2.0.0;

include "poseidon.circom";
include "ecdsa.circom";
include "comparators.circom";

template AgeVerificationWithSignature(n, k) {
    // Input signals
    signal input birthdateTimestamp;
    signal input idNumber;
    signal input expiryDate;
    signal input msghash[k];   // This is the 4-chunk message hash to verify the signature
    signal input sigR[k];      // Signature R (4 chunks of 64 bits)
    signal input sigS[k];      // Signature S (4 chunks of 64 bits)
    signal input pubKey[2][k]; // Public key X and Y coordinates (each has 4 chunks of 64 bits)
    signal input currentTimestamp;

    var eighteenYearsInSeconds = 18 * 365 * 24 * 60 * 60;

    // Poseidon hash computation
    component hasher = Poseidon(3);
    hasher.inputs[0] <== birthdateTimestamp;
    hasher.inputs[1] <== idNumber;
    hasher.inputs[2] <== expiryDate;

    signal computedHash;
    computedHash <== hasher.out;

    // Debugging: Emit computedHash for comparison
    signal output debug_computedHash <== computedHash;

    // Break computedHash into bits
    component computedHashBits = Num2Bits(n * k);  // 256 bits (n=64, k=4)
    computedHashBits.in <== computedHash;

    // Group bits into chunks and reconstruct msghashComputed
    signal msghashComputed[k];
    component chunkBits[k];
    for (var i = 0; i < k; i++) {
        chunkBits[i] = Bits2Num(n);  // Each chunk is 64 bits
        for (var j = 0; j < n; j++) {
            chunkBits[i].in[j] <== computedHashBits.out[i * n + j];
        }
        msghashComputed[i] <== chunkBits[i].out;
    }

    // Compare computed msghash chunks with input msghash
    for (var i = 0; i < k; i++) {
        assert(msghashComputed[i] == msghash[i]);
    }

    // Emit debug signals for signature and public key for validation
    // signal output debug_sigR0 <== sigR[0];
    // signal output debug_sigR1 <== sigR[1];
    // signal output debug_sigR2 <== sigR[2];
    // signal output debug_sigR3 <== sigR[3];

    // signal output debug_sigS0 <== sigS[0];
    // signal output debug_sigS1 <== sigS[1];
    // signal output debug_sigS2 <== sigS[2];
    // signal output debug_sigS3 <== sigS[3];

    // // Debugging: Emit msghash chunks
    // signal output debug_msghash0 <== msghash[0];
    // signal output debug_msghash1 <== msghash[1];
    // signal output debug_msghash2 <== msghash[2];
    // signal output debug_msghash3 <== msghash[3];

    // signal output debug_pubKeyX0 <== pubKey[0][0];
    // signal output debug_pubKeyX1 <== pubKey[0][1];
    // signal output debug_pubKeyX2 <== pubKey[0][2];
    // signal output debug_pubKeyX3 <== pubKey[0][3];

    // signal output debug_pubKeyY0 <== pubKey[1][0];
    // signal output debug_pubKeyY1 <== pubKey[1][1];
    // signal output debug_pubKeyY2 <== pubKey[1][2];
    // signal output debug_pubKeyY3 <== pubKey[1][3];

    // // Debugging: Emit msghash chunks
    // signal output debug_msghashcomputed0 <== msghashComputed[0];
    // signal output debug_msghashcomputed1 <== msghashComputed[1];
    // signal output debug_msghashcomputed2 <== msghashComputed[2];
    // signal output debug_msghashcomputed3 <== msghashComputed[3];

    // // ECDSA verification
    component sigVerifier = ECDSAVerifyNoPubkeyCheck(n, k);
    sigVerifier.r <== sigR;
    sigVerifier.s <== sigS;
    sigVerifier.msghash <== msghash;  // Directly feed msghash into the ECDSA verification
    sigVerifier.pubkey <== pubKey;

    signal output isSignatureValid <== sigVerifier.result;

    // Age verification
    var ageInSeconds = currentTimestamp - birthdateTimestamp;
    component ageCheck = LessThan(64);
    ageCheck.in[0] <== ageInSeconds;
    ageCheck.in[1] <== eighteenYearsInSeconds;

    signal output isOver18 <== 1 - ageCheck.out;
}

component main = AgeVerificationWithSignature(64, 4);
