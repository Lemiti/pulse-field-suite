// apps/backend/src/models.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use rust_decimal::Decimal;

// --- TASK MODELS ---

#[derive(Serialize, Deserialize, TS, Debug)]
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
