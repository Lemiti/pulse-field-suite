// apps/backend/src/models.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::{DateTime, NaiveDate, Utc};

// --- TASK MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::Type, Clone, Copy)] 
#[sqlx(type_name = "task_status", rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(non_camel_case_types)]
#[ts(export, export_to = "../../../packages/shared-types/src/TaskStatus.ts")]
pub enum TaskStatus {
    PLAN,
    IN_PROGRESS,
    COMPLETED,
    ANALYSIS,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/TaskResponse.ts")]
pub struct TaskResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub name: String,
    pub status: TaskStatus,
    #[ts(type = "string | null")]
    pub start_date: Option<NaiveDate>,
    #[ts(type = "string | null")]
    pub end_date: Option<NaiveDate>,
    #[ts(type = "string | null")]
    pub created_at: Option<DateTime<Utc>>,
    #[ts(type = "string | null")]
    pub updated_at: Option<DateTime<Utc>>,
}

// --- PROJECT MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::Type, Clone, Copy, PartialEq, Eq)]
#[sqlx(type_name = "project_focus_area", rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(non_camel_case_types)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectFocusArea.ts")]
pub enum ProjectFocusArea {
    EDUCATION,
    HEALTH,
    WASH,
    EMPOWERMENT,
    TRAFFICKING,
}

#[derive(Serialize, Deserialize, TS, Debug, sqlx::Type)]
#[sqlx(type_name = "project_status", rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(non_camel_case_types)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectStatus.ts")]
pub enum ProjectStatus {
    PLANNING,
    IN_PROGRESS,
    COMPLETED,
    ON_HOLD,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreateProjectRequest.ts")]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    #[ts(type = "number")]
    pub budget_allocated: Decimal,
    pub funding_sources: Vec<String>,
    pub focus_area: ProjectFocusArea,         // Added
    #[ts(type = "any")]
    pub location_metadata: serde_json::Value, // Added (e.g. {"region": "Oromia", "woreda": "Bishoftu"})
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectResponse.ts")]
pub struct ProjectResponse {
    pub id: Uuid,
    pub country_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    #[ts(type = "number")]
    pub budget_allocated: Decimal,
    #[ts(type = "number")]
    pub budget_spent: Decimal,
    pub status: ProjectStatus,
    #[ts(type = "string[]")]
    pub funding_sources: serde_json::Value,
    pub focus_area: ProjectFocusArea,         // Added
    #[ts(type = "any")]
    pub location_metadata: serde_json::Value, // Added
    pub progress_percentage: f64,
    pub is_template: bool,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreateTaskRequest.ts")]
pub struct CreateTaskRequest {
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>, // Nullable! This satisfies the "Uncategorized Bucket" SRS rule.
    pub name: String,
    #[ts(type = "string")]
    pub start_date: NaiveDate,
    #[ts(type = "string")]
    pub end_date: NaiveDate,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/PhaseResponse.ts")]
pub struct PhaseResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreatePhaseRequest.ts")]
pub struct CreatePhaseRequest {
    pub project_id: Uuid,
    pub name: String,
    pub sort_order: Option<i32>,
}

// --- AUDIT LOG MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/AuditLogResponse.ts")]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub action: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    #[ts(type = "string")] // Tell TS this will arrive as an ISO-8601 string
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/UpdateTaskStatusRequest.ts")]
pub struct UpdateTaskStatusRequest {
    pub status: TaskStatus,
}

// --- AI GENERATION MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/AIGenerateRequest.ts")]
pub struct AIGenerateRequest {
    pub project_name: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/AITaskSuggestion.ts")]
pub struct AITaskSuggestion {
    pub name: String,
    pub estimated_days: u32,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/AIPhaseSuggestion.ts")]
pub struct AIPhaseSuggestion {
    pub name: String,
    pub tasks: Vec<AITaskSuggestion>,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/AIGenerateResponse.ts")]
pub struct AIGenerateResponse {
    pub phases: Vec<AIPhaseSuggestion>,
}

// --- WATERMELON DB SYNC MODELS ---
use std::collections::HashMap;

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/SyncTaskUpdate.ts")]
pub struct SyncTaskUpdate {
    pub id: Uuid,
    pub status: TaskStatus, // The field officer changed the status offline
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/SyncTableChanges.ts")]
pub struct SyncTableChanges {
    #[ts(type = "any[]")]
    pub created: Vec<serde_json::Value>, // Ignoring creates for MVP sync
    pub updated: Vec<SyncTaskUpdate>,    // We only care about Task updates!
    pub deleted: Vec<String>,            // Ignoring deletes for MVP sync
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/SyncPushRequest.ts")]
pub struct SyncPushRequest {
    pub changes: HashMap<String, SyncTableChanges>, // Map of table names (e.g., "tasks") to changes
    pub last_pulled_at: i64,
}

// --- MEDIA / PROOF OF WORK MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/GenerateUploadUrlRequest.ts")]
pub struct GenerateUploadUrlRequest {
    pub task_id: Uuid,
    pub mime_type: String, // e.g., "image/jpeg"
    pub file_size: i64,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/UploadUrlResponse.ts")]
pub struct UploadUrlResponse {
    pub upload_url: String,
    pub file_id: String,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/ConfirmUploadRequest.ts")]
pub struct ConfirmUploadRequest {
    pub task_id: Uuid,
    pub file_id: String,
    pub web_url: String,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/UpdateBudgetRequest.ts")]
pub struct UpdateBudgetRequest {
    #[ts(type = "number")]
    pub amount_spent: Decimal, // The new expense amount to add
    pub reason: String,
}

// --- NEW ALERT AND STATISTICS MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow)]
#[ts(export, export_to = "../../../packages/shared-types/src/AlertResponse.ts")]
pub struct AlertResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub message: String,
    pub severity: String,
    pub dismissed: bool,
    #[ts(type = "string")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectStatsResponse.ts")]
pub struct ProjectStatsResponse {
    pub project_id: Uuid,
    pub wells_completed: i64,
    pub active_teams: i64,
    pub budget_spent_percent: f64,
}

// --- PARTNER MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/Partner.ts")]
pub struct Partner {
    pub id: Uuid,
    pub name: String,
    pub r#type: String, // e.g., 'GOVERNMENT', 'FOUNDATION', 'PRIVATE_DONOR'
    pub country_id: Option<Uuid>,
}

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectPartner.ts")]
pub struct ProjectPartner {
    pub project_id: Uuid,
    pub partner_id: Uuid,
    #[ts(type = "number")]
    pub contribution_amount: Decimal,
}


// --- NOTES (FIELD LOGS) & MESSAGES MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/FieldLogResponse.ts")]
pub struct FieldLogResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub is_edited: bool,
    #[ts(type = "string")]
    pub created_at: Option<DateTime<Utc>>,
    #[ts(type = "string")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreateFieldLogRequest.ts")]
pub struct CreateFieldLogRequest {
    pub content: String,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/UpdateFieldLogRequest.ts")]
pub struct UpdateFieldLogRequest {
    pub content: String,
}

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectMessageResponse.ts")]
pub struct ProjectMessageResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    #[ts(type = "string")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreateProjectMessageRequest.ts")]
pub struct CreateProjectMessageRequest {
    pub content: String,
}



// --- IMPACT ANALYTICS & WEBHOOK MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/GlobalMetricTemplate.ts")]
pub struct GlobalMetricTemplate {
    pub id: Uuid,
    pub code: String,
    pub display_name: String,
    pub unit: String,
}

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectImpactMetricResponse.ts")]
pub struct ProjectImpactMetricResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub metric_template_id: Uuid,
    pub target_value: i32,
    pub current_value: i32,
    pub is_manual_override: bool,
    #[ts(type = "string")]
    pub created_at: Option<DateTime<Utc>>,
    #[ts(type = "string")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/UpdateImpactMetricRequest.ts")]
pub struct UpdateImpactMetricRequest {
    pub current_value: i32,
}

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/WebhookDeliveryQueueItem.ts")]
pub struct WebhookDeliveryQueueItem {
    pub id: Uuid,
    #[ts(type = "any")] 
    pub payload: serde_json::Value,
    pub retry_count: i32,
    #[ts(type = "string")]
    pub next_attempt_at: Option<DateTime<Utc>>,
    pub status: String,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/BvaProjectSummary.ts")]
pub struct BvaProjectSummary {
    pub project_id: Uuid,
    pub project_name: String,
    pub budget_allocated: f64,
    pub budget_spent: f64,
    pub variance: f64,
    pub utilization_percentage: f64,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ImpactMetricSummary.ts")]
pub struct ImpactMetricSummary {
    pub project_name: String,
    pub metric_code: String,
    pub metric_name: String,
    pub target_value: i32,
    pub current_value: i32,
    pub unit: String,
    pub progress_percentage: f64,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ReportSummaryResponse.ts")]
pub struct ReportSummaryResponse {
    pub bva_summary: Vec<BvaProjectSummary>,
    pub impact_summary: Vec<ImpactMetricSummary>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectMediaResponse.ts")]
pub struct ProjectMediaResponse {
    pub id: Uuid,
    pub task_id: Uuid,
    pub task_name: String,
    pub gdrive_file_id: Option<String>,
    pub gdrive_web_url: Option<String>,
    pub uploaded_by: Uuid,
    pub uploaded_by_name: String,
    #[ts(type = "string")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreateProjectMediaRequest.ts")]
pub struct CreateProjectMediaRequest {
    pub task_id: Uuid,
    pub gdrive_web_url: String,
}
