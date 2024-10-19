const wc = require("../AgeVerificationWithSignature_js/witness_calculator.js");
const { readFileSync, writeFile } = require("fs");

if (process.argv.length != 5) {
    console.log("Usage: node generateWitnessn...js <file.wasm> <input.json> <output.wtns>");
} else {
    const input = JSON.parse(readFileSync(process.argv[3], "utf8"));
    
    const buffer = readFileSync(process.argv[2]);
    wc(buffer).then(async witnessCalculator => {
        // Calculate the full witness
        const witness = await witnessCalculator.calculateWitness(input, 0);

        // Log all outputs, starting with the first output signals
        console.log("Debug Signals:");

        // Log Poseidon hash signals
        console.log("debug_computedHash:", witness[1]);  // First output signal for computed Poseidon hash


        // Log signature signals (R and S)
        console.log("debug_sigR0:", witness[2]);  // First chunk of sigR
        console.log("debug_sigR1:", witness[3]);  // Second chunk of sigR
        console.log("debug_sigR2:", witness[4]);  // Third chunk of sigR
        console.log("debug_sigR3:", witness[5]);  // Fourth chunk of sigR

        console.log("debug_sigS0:", witness[6]);  // First chunk of sigS
        console.log("debug_sigS1:", witness[7]);  // Second chunk of sigS
        console.log("debug_sigS2:", witness[8]);  // Third chunk of sigS
        console.log("debug_sigS3:", witness[9]); // Fourth chunk of sigS

        // Log msghash signals
        console.log("debug_msghash0:", witness[10]);  // First chunk of msghash
        console.log("debug_msghash1:", witness[11]);  // Second chunk of msghash
        console.log("debug_msghash2:", witness[12]);  // Third chunk of msghash
        console.log("debug_msghash3:", witness[13]);  // Fourth chunk of msghash


        // Log public key signals (X and Y coordinates)
        console.log("debug_pubKeyX0:", witness[14]);  // First chunk of X coordinate of public key
        console.log("debug_pubKeyX1:", witness[15]);  // Second chunk of X coordinate
        console.log("debug_pubKeyX2:", witness[16]);  // Third chunk of X coordinate
        console.log("debug_pubKeyX3:", witness[17]);  // Fourth chunk of X coordinate

        console.log("debug_pubKeyY0:", witness[18]);  // First chunk of Y coordinate of public key
        console.log("debug_pubKeyY1:", witness[19]);  // Second chunk of Y coordinate
        console.log("debug_pubKeyY2:", witness[20]);  // Third chunk of Y coordinate
        console.log("debug_pubKeyY3:", witness[21]);  // Fourth chunk of Y coordinate

        // Log msghash signals
        console.log("debug_msghashcomputed0:", witness[22]);  // First chunk of msghash
        console.log("debug_msghashcomputed1:", witness[23]);  // Second chunk of msghash
        console.log("debug_msghashcomputed2:", witness[24]);  // Third chunk of msghash
        console.log("debug_msghashcomputed3:", witness[25]);  // Fourth chunk of msghash

        // Write the binary witness output to a file
        const buff = await witnessCalculator.calculateWTNSBin(input, 0);
        writeFile(process.argv[4], buff, function (err) {
            if (err) throw err;
        });
    });
}
