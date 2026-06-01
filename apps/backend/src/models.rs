// apps/backend/src/models.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};

// --- TASK MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::Type, Clone, Copy)] 
#[sqlx(type_name = "task_status", rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(non_camel_case_types)]
#[ts(export, export_to = "../../packages/shared-types/src/TaskStatus.ts")]
pub enum TaskStatus {
    PLAN,
    IN_PROGRESS,
    COMPLETED,
    ANALYSIS,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/TaskResponse.ts")]
pub struct TaskResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub name: String,
    pub status: TaskStatus,
}

// --- PROJECT MODELS ---

#[derive(Serialize, Deserialize, TS, Debug, sqlx::Type)]
#[sqlx(type_name = "project_status", rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(non_camel_case_types)]
#[ts(export, export_to = "../../packages/shared-types/src/ProjectStatus.ts")]
pub enum ProjectStatus {
    PLANNING,
    IN_PROGRESS,
    COMPLETED,
    ON_HOLD,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/CreateProjectRequest.ts")]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    #[ts(type = "number")]
    pub budget_allocated: Decimal,
    pub funding_sources: Vec<String>,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/ProjectResponse.ts")]
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
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/CreateTaskRequest.ts")]
pub struct CreateTaskRequest {
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>, // Nullable! This satisfies the "Uncategorized Bucket" SRS rule.
    pub name: String,
}

// --- AUDIT LOG MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/AuditLogResponse.ts")]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Uuid,
    pub action: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    #[ts(type = "string")] // Tell TS this will arrive as an ISO-8601 string
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/UpdateTaskStatusRequest.ts")]
pub struct UpdateTaskStatusRequest {
    pub status: TaskStatus,
}

// --- AI GENERATION MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/AIGenerateRequest.ts")]
pub struct AIGenerateRequest {
    pub project_name: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../packages/shared-types/src/AITaskSuggestion.ts")]
pub struct AITaskSuggestion {
    pub name: String,
    pub estimated_days: u32,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../packages/shared-types/src/AIPhaseSuggestion.ts")]
pub struct AIPhaseSuggestion {
    pub name: String,
    pub tasks: Vec<AITaskSuggestion>,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/AIGenerateResponse.ts")]
pub struct AIGenerateResponse {
    pub phases: Vec<AIPhaseSuggestion>,
}

// --- WATERMELON DB SYNC MODELS ---
use std::collections::HashMap;

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/SyncTaskUpdate.ts")]
pub struct SyncTaskUpdate {
    pub id: Uuid,
    pub status: TaskStatus, // The field officer changed the status offline
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/SyncTableChanges.ts")]
pub struct SyncTableChanges {
    #[ts(type = "any[]")]
    pub created: Vec<serde_json::Value>, // Ignoring creates for MVP sync
    pub updated: Vec<SyncTaskUpdate>,    // We only care about Task updates!
    pub deleted: Vec<String>,            // Ignoring deletes for MVP sync
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/SyncPushRequest.ts")]
pub struct SyncPushRequest {
    pub changes: HashMap<String, SyncTableChanges>, // Map of table names (e.g., "tasks") to changes
    pub last_pulled_at: i64,
}

// --- MEDIA / PROOF OF WORK MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/GenerateUploadUrlRequest.ts")]
pub struct GenerateUploadUrlRequest {
    pub task_id: Uuid,
    pub mime_type: String, // e.g., "image/jpeg"
    pub file_size: i64,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/UploadUrlResponse.ts")]
pub struct UploadUrlResponse {
    pub upload_url: String,
    pub file_id: String,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/ConfirmUploadRequest.ts")]
pub struct ConfirmUploadRequest {
    pub task_id: Uuid,
    pub file_id: String,
    pub web_url: String,
}

