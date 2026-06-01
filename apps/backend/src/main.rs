// apps/backend/src/main.rs
mod api;
mod models;

use axum::{
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use ts_rs::TS;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    // 1. Export TypeScript Bindings
    if cfg!(debug_assertions) {
        models::TaskStatus::export().unwrap();
        models::TaskResponse::export().unwrap();
        models::ProjectStatus::export().unwrap();
        models::CreateProjectRequest::export().unwrap();
        models::ProjectResponse::export().unwrap();
        api::auth::UserClaims::export().unwrap();
        
        let index_content = r#"
export * from './TaskStatus';
export * from './TaskResponse';
export * from './ProjectStatus';
export * from './CreateProjectRequest';
export * from './ProjectResponse';
export * from './UserClaims';
"#;
        std::fs::write("../../packages/shared-types/src/index.ts", index_content.trim())
            .expect("Failed to write index.ts");

        tracing::info!("✅ TypeScript bindings generated successfully!");
    }

    // 2. Connect to DB
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    tracing::info!("✅ Connected to Database");

    // 3. Build Axum Router
    let app = Router::new()
        .route("/api/health", get(|| async { "Pulse-Field API is online!" }))
        .route("/api/auth/mock-login", get(api::auth::mock_login))
        // 🚀 NEW SECURE ROUTES:
        .route("/api/projects", get(api::projects::get_projects))
        .route("/api/projects", post(api::projects::create_project))
        .with_state(pool);

    // 4. Start Server
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    tracing::info!("🚀 Server running on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
