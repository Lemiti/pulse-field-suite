// apps/backend/src/main.rs
mod api;
mod models;

use axum::{
    routing::{get, post, patch, delete},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use ts_rs::TS;
use crate::api::projects::{
    get_projects, get_project, create_project, update_project_budget, get_project_stats,
    // Phase 2: Notes & Messages Handlers
    get_project_notes, create_project_note, update_project_note,
    get_project_messages, create_project_message,
    // Phase 3: Impact Analytics Handlers
    get_project_impact_metrics, update_project_impact_metric,
    get_project_phases, create_project_phase,
};

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
	    models::CreateTaskRequest::export().unwrap();
	    models::AuditLogResponse::export().unwrap();
	    models::UpdateTaskStatusRequest::export().unwrap(); 
	    models::AIGenerateRequest::export().unwrap();
        models::AITaskSuggestion::export().unwrap();
        models::AIPhaseSuggestion::export().unwrap();
        models::AIGenerateResponse::export().unwrap();
	    models::SyncTaskUpdate::export().unwrap();
        models::SyncTableChanges::export().unwrap();
        models::SyncPushRequest::export().unwrap();
	    models::GenerateUploadUrlRequest::export().unwrap();
        models::UploadUrlResponse::export().unwrap();
        models::ConfirmUploadRequest::export().unwrap();
	    models::UpdateBudgetRequest::export().unwrap();        
        models::AlertResponse::export().unwrap();
        models::ProjectStatsResponse::export().unwrap();

        // ─── NEW BINDINGS FOR PHASES 1, 2, & 3 ──────────────────────────────────
        models::ProjectFocusArea::export().unwrap();
        models::Partner::export().unwrap();
        models::ProjectPartner::export().unwrap();
        models::FieldLogResponse::export().unwrap();
        models::CreateFieldLogRequest::export().unwrap();
        models::UpdateFieldLogRequest::export().unwrap();
        models::ProjectMessageResponse::export().unwrap();
        models::CreateProjectMessageRequest::export().unwrap();
        models::GlobalMetricTemplate::export().unwrap();
        models::ProjectImpactMetricResponse::export().unwrap();
        models::UpdateImpactMetricRequest::export().unwrap();
        models::WebhookDeliveryQueueItem::export().unwrap();
        models::PhaseResponse::export().unwrap();
        models::CreatePhaseRequest::export().unwrap();
        models::BvaProjectSummary::export().unwrap();
        models::ImpactMetricSummary::export().unwrap();
        models::ReportSummaryResponse::export().unwrap();
        models::ProjectMediaResponse::export().unwrap();
        models::CreateProjectMediaRequest::export().unwrap();
        api::auth::SignupRequest::export().unwrap();
        api::auth::LoginRequest::export().unwrap();
        api::auth::ChangePasswordRequest::export().unwrap();
        api::auth::LoginResponse::export().unwrap();



        let index_content = r#"
export * from './TaskStatus';
export * from './TaskResponse';
export * from './ProjectStatus';
export * from './CreateProjectRequest';
export * from './ProjectResponse';
export * from './CreateTaskRequest';
export * from './UserClaims';
export * from './AuditLogResponse';
export * from './UpdateTaskStatusRequest';
export * from './AIGenerateRequest';
export * from './AITaskSuggestion';
export * from './AIPhaseSuggestion';
export * from './AIGenerateResponse';
export * from './SyncTaskUpdate';
export * from './SyncTableChanges';
export * from './SyncPushRequest';
export * from './GenerateUploadUrlRequest';
export * from './UploadUrlResponse';
export * from './ConfirmUploadRequest';
export * from './UpdateBudgetRequest';
export * from './AlertResponse';
export * from './ProjectStatsResponse';
export * from './ProjectFocusArea';
export * from './Partner';
export * from './ProjectPartner';
export * from './FieldLogResponse';
export * from './CreateFieldLogRequest';
export * from './UpdateFieldLogRequest';
export * from './ProjectMessageResponse';
export * from './CreateProjectMessageRequest';
export * from './GlobalMetricTemplate';
export * from './ProjectImpactMetricResponse';
export * from './UpdateImpactMetricRequest';
export * from './WebhookDeliveryQueueItem';
export * from './PhaseResponse';
export * from './CreatePhaseRequest';
export * from './BvaProjectSummary';
export * from './ImpactMetricSummary';
export * from './ReportSummaryResponse';
export * from './ProjectMediaResponse';
export * from './CreateProjectMediaRequest';
export * from './SignupRequest';
export * from './LoginRequest';
export * from './ChangePasswordRequest';
export * from './LoginResponse';

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
        .route("/api/auth/signup", post(api::auth::signup))
        .route("/api/auth/login", post(api::auth::login))
        .route("/api/auth/change-password", post(api::auth::change_password))
        // 🚀 NEW SECURE ROUTES:
        .route("/api/projects", get(api::projects::get_projects))
        .route("/api/projects", post(api::projects::create_project))
        .route("/api/projects/:project_id", get(api::projects::get_project))
        .route("/api/projects/:project_id/use-template", post(api::projects::use_template))
        .route("/api/projects/:project_id/tasks", get(api::tasks::get_tasks))
        .route("/api/projects/:project_id/phases", get(get_project_phases).post(create_project_phase))
        .route("/api/tasks", post(api::tasks::create_task))
	    .route("/api/projects/:project_id/audit-logs", get(api::audit_logs::get_audit_logs))
        .route("/api/reports/summary", get(api::reports::get_report_summary))
        .route("/api/tasks/:task_id/status", patch(api::tasks::update_task_status))
	    .route("/api/ai/suggest-phases", post(api::ai::suggest_phases))
	    .route("/api/sync", post(api::sync::push_sync))
        .route("/api/media/upload-url", post(api::media::get_upload_url))
        .route("/api/media/confirm", post(api::media::confirm_upload))
        .route("/api/projects/:project_id/media", get(api::media::get_project_media).post(api::media::create_project_media))
        .route("/api/projects/:project_id/media/:media_id", delete(api::media::delete_project_media))
	    .route("/api/projects/:project_id/budget", patch(api::projects::update_project_budget))
        .route("/api/projects/:project_id/alerts", get(api::alerts::get_alerts))
        .route("/api/alerts", get(api::alerts::get_global_alerts))
        .route("/api/alerts/:alert_id/dismiss", post(api::alerts::dismiss_alert))
        .route("/api/projects/:project_id/stats", get(api::projects::get_project_stats))
        // ─── NEW PHASE 2 ENDPOINTS (NOTES & MESSAGES) ─────────────────────────
        .route("/api/projects/:project_id/notes", get(api::projects::get_project_notes).post(api::projects::create_project_note))
        .route("/api/projects/:project_id/notes/:note_id", patch(api::projects::update_project_note).delete(api::projects::delete_project_note))
        .route("/api/projects/:project_id/messages", get(api::projects::get_project_messages).post(api::projects::create_project_message))

        // ─── NEW PHASE 3 ENDPOINTS (IMPACT METRICS) ────────────────────────────
        .route("/api/projects/:project_id/impact", get(api::projects::get_project_impact_metrics))
        .route("/api/projects/:project_id/impact/:metric_id", patch(api::projects::update_project_impact_metric))

        .layer(axum::middleware::from_fn(cors_middleware))
        .with_state(pool);


    // 4. Start Server
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    tracing::info!("🚀 Server running on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

use axum::{
    http::{HeaderValue, Method, Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};

async fn cors_middleware(
    request: Request<axum::body::Body>,
    next: Next,
) -> axum::response::Response {
    let method = request.method().clone();
    
    // Handle OPTIONS preflight requests
    if method == Method::OPTIONS {
        let mut response = StatusCode::NO_CONTENT.into_response();
        let headers = response.headers_mut();
        headers.insert("access-control-allow-origin", HeaderValue::from_static("*"));
        headers.insert("access-control-allow-methods", HeaderValue::from_static("GET, POST, PATCH, PUT, DELETE, OPTIONS"));
        headers.insert(
            "access-control-allow-headers",
            HeaderValue::from_static("authorization, content-type, x-active-country-id"),
        );
        return response;
    }

    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert("access-control-allow-origin", HeaderValue::from_static("*"));
    headers.insert("access-control-allow-methods", HeaderValue::from_static("GET, POST, PATCH, PUT, DELETE, OPTIONS"));
    headers.insert(
        "access-control-allow-headers",
        HeaderValue::from_static("authorization, content-type, x-active-country-id"),
    );
    response
}
