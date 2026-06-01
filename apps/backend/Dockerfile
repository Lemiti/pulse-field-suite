# 1. Build Stage
FROM rust:1.78-slim as builder
WORKDIR /app

# Install build dependencies (required for OpenSSL/Reqwest)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy the backend code
COPY apps/backend ./apps/backend

# Set the working directory to the backend package and build for release
WORKDIR /app/apps/backend
RUN cargo build --release

# 2. Production Stage (Tiny footprint)
FROM debian:bookworm-slim
WORKDIR /app

# Install runtime dependencies (OpenSSL & CA Certificates for HTTP calls)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder
COPY --from=builder /app/apps/backend/target/release/backend /usr/local/bin/backend

# Expose the standard port
EXPOSE 8080

# Run the API
CMD ["backend"]
