const { buildPoseidon } = require("circomlibjs"); // Import Poseidon hash function
const fs = require('fs'); // File system module to write JSON file
const crypto = require('crypto');
const asn1 = require('asn1.js'); // For decoding ECDSA signature

// Define the structure of an ECDSA signature (two integers: r and s)
const EcdsaSigAsn1 = asn1.define('EcdsaSig', function () {
  this.seq().obj(
    this.key('r').int(),
    this.key('s').int()
  );
});

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });

const spki = publicKey.export({ type: 'spki', format: 'der' });
const pem = `-----BEGIN PUBLIC KEY-----
${Buffer.from(spki).toString('base64')}
-----END PUBLIC KEY-----`;
console.log("Public key: ", pem)

// Function to split the signature components r and s into 4 registers (64-bit chunks)
const splitIntoRegisters = (valueHex) => {
    const paddedHex = valueHex.padStart(64, '0'); // Ensure 64 hex characters (32 bytes)
    const registers = [];
    for (let i = 0; i < 64; i += 16) {
        registers.push('0x' + paddedHex.slice(i, i + 16));
    }
    return registers;
}

// Function to split public key into 4 chunks of 64 bits each (64 hex characters)
const splitIntoChunks = (bigIntValue) => {
    const hexString = bigIntValue.toString(16).padStart(64, '0'); // Ensure it's 64 hex digits
    console.log("Hex string: ", hexString)
    const chunks = [];
    for (let i = 0; i < 64; i += 16) {
        chunks.push('0x' + hexString.slice(i, i + 16));
    }
    return chunks;
};

// Function to convert Uint8Array to a single BigInt
// function uint8ArrayToBigInt(uint8Array) {
//     let hexString = Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
//     return BigInt('0x' + hexString);
// }

function uint8ArrayToBigInt(buf) {
    let bits = 8n
    if (ArrayBuffer.isView(buf)) {
      bits = BigInt(buf.BYTES_PER_ELEMENT * 8)
    } else {
      buf = new Uint8Array(buf)
    }
  
    let ret = 0n
    for (const i of buf.values()) {
      const bi = BigInt(i)
      ret = (ret << bits) + bi
    }
    return ret
  }

// Function to split a BigInt into 64-bit chunks
function splitIntoChunks2(bigIntValue, chunkSize = 64) {
    const hexString = bigIntValue.toString(16).padStart(64, '0'); // Ensure 64 hex digits
    const chunks = [];
    for (let i = 0; i < hexString.length; i += 16) {  // Split into 64-bit chunks (16 hex digits per chunk)
        chunks.push(BigInt('0x' + hexString.slice(i, i + 16)));
    }
    return chunks;
}

const extractPublicKeyCoords = (publicKey) => {

    // Export the raw public key as a buffer (DER formatted to extract coordinates)
    const rawPublicKey = publicKey.export({ type: 'spki', format: 'der' });

    console.log("Raw public key: ", rawPublicKey.toString('hex'))

    // First byte will be 0x04 indicating uncompressed format
    const coordinateStart = 24;  // After metadata (based on SPKI format)
    const coordinateLength = 32; // X and Y coordinates are 32 bytes each

    // Extract X and Y coordinates from the raw public key
    const xCoord = rawPublicKey.slice(coordinateStart, coordinateStart + coordinateLength);
    const yCoord = rawPublicKey.slice(coordinateStart + coordinateLength, coordinateStart + 2 * coordinateLength);

    return { x: xCoord.toString('hex'), y: yCoord.toString('hex') };
};

// Function to convert the msghash byte array to a hex string and split it into chunks
const formatMsgHash = (msgArray) => {
    const hexString = msgArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); // Convert bytes to hex
    return splitIntoRegisters(hexString);  // Use the same splitting function to split into 64-bit chunks
};

function splitBigIntToHexChunks(bigIntValue) {
    // Convert the BigInt to a hex string
    let hexString = bigIntValue.toString(16).padStart(64, '0'); // Ensure 64 hex characters

    const chunks = [];
    for (let i = 0; i < 64; i += 16) {
        chunks.push('0x' + hexString.slice(i, i + 16));
    }

    return chunks.reverse();  // Reverse the chunks to go from least to most significant
}

// Updated functions to ensure LSB-first order
const splitIntoRegistersLSBFirst = (valueHex) => {
    const paddedHex = valueHex.padStart(64, '0');
    const registers = [];
    for (let i = 0; i < 64; i += 16) {
        registers.push('0x' + paddedHex.slice(i, i + 16));
    }
    return registers.reverse();  // Reverse the chunks for LSB-first format
};

const splitIntoChunksLSBFirst = (bigIntValue) => {
    const hexString = bigIntValue.toString(16).padStart(64, '0');
    const chunks = [];
    for (let i = 0; i < 64; i += 16) {
        chunks.push('0x' + hexString.slice(i, i + 16));
    }
    return chunks.reverse();  // Reverse for LSB-first format
};

// Main function to build hash, signature, and generate inputs.json
const buildHashAndSignature = async () => {
    const poseidon = await buildPoseidon();

    // Example inputs
    const birthdateTimestamp = BigInt(10061998); // DDMMYYYY as BigInt
    const idNumber = BigInt(123456789); // Example ID number
    const expiryDate = BigInt(9032029); // DDMMYYYY as BigInt (expiry date)

    // Compute Poseidon hash (msghash) of the inputs (this is the message hash that will be signed)
    const inputs = [birthdateTimestamp, idNumber, expiryDate];

    // Convert the Poseidon hash Uint8Array to a BigInt
    const poseidonHashBigInt = poseidon.F.toString(poseidon(inputs))

    console.log("Poseidon hash big int: ", poseidonHashBigInt)

    // Split the Poseidon hash BigInt into 4 chunks of 64 bits
    const msghashChunks = splitBigIntToHexChunks(BigInt(poseidonHashBigInt));

    // Sign the msghash with the private key
    const sign = crypto.createSign('SHA256');  // Use SHA256 for signing
    sign.write(msghashChunks.join(''), 'hex');
    sign.end();
    const signature = sign.sign(privateKey);

    console.log("Private key: ", privateKey.export({ format: 'pem', type: 'pkcs8' }));

    // Decode the signature to extract r and s
    const decodedSignature = EcdsaSigAsn1.decode(signature, 'der');
    const r = decodedSignature.r.toBuffer();
    const s = decodedSignature.s.toBuffer();

    // Split r and s into 4 chunks each
    const sigR = splitIntoRegistersLSBFirst(r.toString('hex'));
    const sigS = splitIntoRegistersLSBFirst(s.toString('hex'));

    // Extract X and Y coordinates from the public key
    const { x, y } = extractPublicKeyCoords(publicKey);
    console.log("X coord: ", x);
    console.log("Y coord: ", y);

    // Split X and Y coordinates into 4 chunks each
    const pubKeyXChunks = splitIntoChunksLSBFirst(BigInt('0x' + x));
    const pubKeyYChunks = splitIntoChunksLSBFirst(BigInt('0x' + y));

    // Example current timestamp
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000)); // Unix timestamp
    
    // Generate the inputs.json file in the required format
    const inputsDict = {
        "birthdateTimestamp": Number(birthdateTimestamp),
        "idNumber": Number(idNumber),
        "expiryDate": Number(expiryDate),
        "msghash": msghashChunks,  // The formatted msghash in 64-bit chunks
        "sigR": sigR,
        "sigS": sigS,
        "pubKey": [pubKeyXChunks, pubKeyYChunks],
        "currentTimestamp": currentTimestamp.toString()
    };

    // Write the inputs to inputs.json
    fs.writeFileSync('inputs.json', JSON.stringify(inputsDict, null, 2));

    console.log('Poseidon Hash (msghash) in chunks:', msghashChunks);
    console.log('Signature:', signature.toString('hex'));
    console.log('Inputs JSON saved to inputs.json');
}

buildHashAndSignature();
