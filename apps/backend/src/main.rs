// apps/backend/src/main.rs
mod models;
mod api;

use axum::{routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use ts_rs::TS; // Required trait for .export()

#[tokio::main]
async fn main() {
    // 1. Initialize environment & logging
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    // 2. Export TypeScript Bindings via ts-rs
    if cfg!(debug_assertions) {
        // Export individual TS files
        models::TaskStatus::export().unwrap();
        models::TaskResponse::export().unwrap();
        models::CreateProjectRequest::export().unwrap();
        
        // Auto-generate the index.ts bridge
        let index_content = "export * from './TaskStatus';\nexport * from './TaskResponse';\nexport * from './CreateProjectRequest';\n";
        std::fs::write("../../packages/shared-types/src/index.ts", index_content)
            .expect("Failed to write index.ts for shared types");

        tracing::info!("✅ TypeScript bindings generated successfully via ts-rs!");
    }

    // 3. Connect to PostgreSQL
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    tracing::info!("✅ Connected to Database");

    // 4. Build Axum Router
    let app = Router::new()
        .route("/api/health", get(|| async { "Pulse-Field API is online!" }))
        .route("/api/auth/mock-login", get(api::auth::mock_login))
        .with_state(pool);

    // 5. Start Server
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    tracing::info!("🚀 Server running on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
