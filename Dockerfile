# Stage 1: Build React Frontend
FROM node:22-slim AS frontend-builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy pnpm lockfile and workspace configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install frontend dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy shared types and frontend source code
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

# Build frontend to apps/web/dist
RUN pnpm --filter web build

# Stage 2: Build Rust Backend
FROM rust:latest-slim AS backend-builder
WORKDIR /app

# Enable offline SQLx macro compilation
ENV SQLX_OFFLINE=true

# Install build dependencies required for compiling Rust crates (e.g. reqwest, openssl, sqlx)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy backend source code and Cargo manifest files
COPY apps/backend ./apps/backend

# Compile backend binary in release mode
WORKDIR /app/apps/backend
RUN cargo build --release

# Stage 3: Lightweight Runtime Runner
FROM debian:bookworm-slim
WORKDIR /app

# Install runtime dependencies (libssl, ca-certificates for HTTP/HTTPS requests)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the compiled Rust backend binary
COPY --from=backend-builder /app/apps/backend/target/release/backend /usr/local/bin/backend

# Copy the static web assets built in Stage 1
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

# Expose server port
EXPOSE 8080

# Configure production environment variables
ENV APP_ENV=production
ENV STATIC_DIR=/app/apps/web/dist
ENV HOST=0.0.0.0
ENV PORT=8080

# Run the backend application
CMD ["backend"]
