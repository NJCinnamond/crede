# Use an official Rust image as a build environment
FROM rust:latest AS builder

# Create a new directory for the Rust project
WORKDIR /usr/src/app

# Copy the current directory's contents into the container, except for what's in .dockerignore
COPY . .

# Build the Rust project in release mode
RUN cargo build --release

# Use a more recent Debian image for the runtime environment to avoid GLIBC issues
FROM debian:bookworm-slim

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

# Install snarkjs globally using npm
RUN npm install -g snarkjs

# Install the required system dependencies (if any)
RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory for the app
WORKDIR /usr/src/app

# Copy specific files from the circuits directory
COPY ./circuits/utils/inputs.json ./circuits/utils/inputs.json
COPY ./circuits/AgeVerificationWithSignature_js/AgeVerificationWithSignature.wasm ./circuits/AgeVerificationWithSignature_js/AgeVerificationWithSignature.wasm
COPY ./circuits/age_verification.zkey ./circuits/age_verification.zkey

# Copy the compiled binary from the build environment
COPY --from=builder /usr/src/app/target/release/crede-api .

# Make sure the binary is executable
RUN chmod +x ./crede-api

# Expose the port the API will run on
EXPOSE 8000

# Run the API
CMD ["./crede-api"]
