// X coordinate chunks
const xChunks = [
    "0x134c0ad62cd3d3d3",
    "0x9c440445e3f8eda1",
    "0xd27aa73fa683aba1",
    "0xddc6b4d8a3670a01"
  ]

// Concatenate the chunks into a single BigInt (256-bit number)
const X = BigInt(xChunks[0]) << 192n | BigInt(xChunks[1]) << 128n | BigInt(xChunks[2]) << 64n | BigInt(xChunks[3]);
console.log("Recombined X:", X.toString(16)); // Print in hex

// Y coordinate chunks
const yChunks = [
    "0xb2d2bc8732fd2d00",
    "0xd73072d88792c60d",
    "0xd3144e23eee5a15f",
    "0xce0fc63b8899a1b9"
  ];

// Concatenate the chunks into a single BigInt (256-bit number)
const Y = BigInt(yChunks[0]) << 192n | BigInt(yChunks[1]) << 128n | BigInt(yChunks[2]) << 64n | BigInt(yChunks[3]);
console.log("Recombined Y:", Y.toString(16)); // Print in hex

// secp256k1 field prime p
const p = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");

// Compute the left-hand side: y^2 (mod p)
const left = (Y * Y) % p;

// Compute the right-hand side: x^3 + 7 (mod p)
const right = (X * X * X + 7n) % p;

// Check if the public key lies on the curve
if (left === right) {
    console.log("The public key is valid and lies on the curve.");
} else {
    console.log("The public key is invalid and does not lie on the curve.");
}
