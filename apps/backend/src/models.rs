// apps/backend/src/models.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/TaskStatus.ts")]
#[allow(non_camel_case_types)]
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

#[derive(Serialize, Deserialize, TS, Debug)]
#[ts(export, export_to = "../../packages/shared-types/src/CreateProjectRequest.ts")]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub budget_allocated: f64,
    pub funding_sources: Vec<String>,
}
