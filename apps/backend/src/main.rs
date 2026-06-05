// apps/backend/src/main.rs
mod api;
mod models;

use axum::{
    routing::{get, post, patch, delete, put},
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
        api::auth::CurrentUserResponse::export().unwrap();
        api::tasks::UpdateTaskPhaseRequest::export().unwrap();
        models::GlobalMetrics::export().unwrap();
        models::ActionItem::export().unwrap();
        models::ActivityFeedEntry::export().unwrap();
        models::DashboardSummary::export().unwrap();
        models::AssignImpactMetricRequest::export().unwrap();
        models::CreateMetricTemplateRequest::export().unwrap();
        models::UpdateMetricTemplateRequest::export().unwrap();

        api::partners::CreatePartnerRequest::export().unwrap();
        api::partners::UpdatePartnerRequest::export().unwrap();
        api::partners::ProjectPartnerResponse::export().unwrap();
        api::partners::ProjectPartnerInput::export().unwrap();
        api::partners::UpdateProjectPartnersRequest::export().unwrap();
        models::CountryResponse::export().unwrap();



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
export * from './CurrentUserResponse';
export * from './UpdateTaskPhaseRequest';
export * from './GlobalMetrics';
export * from './ActionItem';
export * from './ActivityFeedEntry';
export * from './DashboardSummary';
export * from './AssignImpactMetricRequest';
export * from './CreateMetricTemplateRequest';
export * from './UpdateMetricTemplateRequest';
export * from './CreatePartnerRequest';
export * from './UpdatePartnerRequest';
export * from './ProjectPartnerResponse';
export * from './ProjectPartnerInput';
export * from './UpdateProjectPartnersRequest';
export * from './CountryResponse';
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

    // Spawn the Webhook background worker
    let worker_pool = pool.clone();
    tokio::spawn(async move {
        api::webhook_worker::run_webhook_worker(worker_pool).await;
    });

    // 3. Build Axum Router
    let app = Router::new()
        .route("/api/health", get(|| async { "Pulse-Field API is online!" }))
        .route("/api/auth/mock-login", get(api::auth::mock_login))
        .route("/api/auth/signup", post(api::auth::signup))
        .route("/api/auth/login", post(api::auth::login))
        .route("/api/auth/change-password", post(api::auth::change_password))
        .route("/api/users/me", get(api::auth::get_current_user))
        // 🚀 NEW SECURE ROUTES:
        .route("/api/dashboard/summary", get(api::dashboard::get_dashboard_summary))
        .route("/api/projects", get(api::projects::get_projects))
        .route("/api/projects", post(api::projects::create_project))
        .route("/api/projects/:project_id", get(api::projects::get_project).put(api::projects::update_project))
        .route("/api/projects/:project_id/use-template", post(api::projects::use_template))
        .route("/api/projects/:project_id/tasks", get(api::tasks::get_tasks))
        .route("/api/projects/:project_id/phases", get(get_project_phases).post(create_project_phase))
        .route("/api/tasks", post(api::tasks::create_task))
	    .route("/api/projects/:project_id/audit-logs", get(api::audit_logs::get_audit_logs))
        .route("/api/reports/summary", get(api::reports::get_report_summary))
        .route("/api/tasks/:task_id/status", patch(api::tasks::update_task_status))
        .route("/api/tasks/:task_id/phase", patch(api::tasks::update_task_phase))
	    .route("/api/ai/suggest-phases", post(api::ai::suggest_phases))
	    .route("/api/developer/webhooks", get(api::webhook_worker::get_webhooks))
	    .route("/api/developer/webhooks/:id/retry", post(api::webhook_worker::retry_webhook))
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
        .route("/api/projects/:project_id/impact", get(api::metrics::get_project_impact_metrics).post(api::metrics::assign_project_impact_metric))
        .route("/api/projects/:project_id/impact/:metric_id", patch(api::metrics::update_project_impact_metric))

        // Admin Global Metric Templates
        .route("/api/admin/metric-templates", get(api::metrics::get_metric_templates).post(api::metrics::create_metric_template))
        .route("/api/admin/metric-templates/:template_id", put(api::metrics::update_metric_template).delete(api::metrics::delete_metric_template))

        // Partners CRUD & Project Partners endpoints
        .route("/api/partners", get(api::partners::get_partners).post(api::partners::create_partner))
        .route("/api/partners/:partner_id", put(api::partners::update_partner).delete(api::partners::delete_partner))
        .route("/api/projects/:project_id/partners", get(api::partners::get_project_partners).post(api::partners::update_project_partners))

        // Country endpoints
        .route("/api/countries/:country_id", get(api::countries::get_country))


        .layer(axum::middleware::from_fn(error_json_middleware))
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

async fn error_json_middleware(
    request: Request<axum::body::Body>,
    next: Next,
) -> axum::response::Response {
    let response = next.run(request).await;
    let status = response.status();

    if status.is_client_error() || status.is_server_error() {
        let (parts, body) = response.into_parts();
        
        let bytes = match axum::body::to_bytes(body, usize::MAX).await {
            Ok(b) => b,
            Err(_) => {
                return (
                    status,
                    [("content-type", "application/json")],
                    r#"{"error":"Internal Server Error"}"#,
                )
                    .into_response();
            }
        };

        let is_json = parts.headers.get(axum::http::header::CONTENT_TYPE)
            .and_then(|val| val.to_str().ok())
            .map(|s| s.contains("application/json"))
            .unwrap_or(false);

        if is_json {
            return axum::response::Response::from_parts(parts, axum::body::Body::from(bytes));
        }

        let error_msg = String::from_utf8_lossy(&bytes).into_owned();
        let readable_msg = map_to_readable_error(&error_msg);

        let json_body = serde_json::json!({ "error": readable_msg });
        let json_str = serde_json::to_string(&json_body).unwrap_or_else(|_| r#"{"error":"Internal Server Error"}"#.to_string());

        (
            status,
            [("content-type", "application/json")],
            json_str,
        )
            .into_response()
    } else {
        response
    }
}

fn map_to_readable_error(msg: &str) -> String {
    let msg_lower = msg.to_lowercase();
    if msg_lower.contains("duplicate key value violates unique constraint") {
        "This record already exists.".to_string()
    } else if msg_lower.contains("violates foreign key constraint") {
        "The referenced record could not be found.".to_string()
    } else if msg_lower.contains("violates not-null constraint") {
        "A required field is missing.".to_string()
    } else if msg_lower.contains("invalid input syntax for type uuid") {
        "Invalid ID format.".to_string()
    } else if msg_lower.contains("numeric field overflow") {
        "Number exceeds the maximum allowed value.".to_string()
    } else if msg_lower.contains("budget allocation exceeds") || msg_lower.contains("budget warning") {
        msg.to_string()
    } else if msg_lower.contains("access denied") || msg_lower.contains("unauthorized") {
        msg.to_string()
    } else {
        if msg_lower.contains("database error") || msg_lower.contains("sqlx") {
            "A database error occurred. Please verify your inputs and try again.".to_string()
        } else {
            msg.to_string()
        }
    }
}

