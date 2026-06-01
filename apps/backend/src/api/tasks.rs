use axum::{extract::{Path, State}, http::StatusCode, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::api::auth::UserClaims;
use crate::models::{CreateTaskRequest, TaskResponse, TaskStatus};
use crate::models::UpdateTaskStatusRequest;

// GET /api/projects/:project_id/tasks
pub async fn get_tasks(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<TaskResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Join with `projects` to ensure this project belongs to the user's country
    let tasks = sqlx::query_as!(
        TaskResponse,
        r#"
        SELECT t.id, t.project_id, t.phase_id, t.name, t.status as "status: TaskStatus"
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.project_id = $1 AND p.country_id = $2
        ORDER BY t.created_at ASC
        "#,
        project_id,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(tasks))
}

// POST /api/tasks
pub async fn create_task(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<CreateTaskRequest>,
) -> Result<Json<TaskResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify the user has access to this project before creating the task
    let has_access = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)",
        payload.project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(false));

    if has_access != Some(true) {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Project belongs to another tenant".to_string()));
    }

    let task = sqlx::query_as!(
        TaskResponse,
        r#"
        INSERT INTO tasks (project_id, phase_id, name)
        VALUES ($1, $2, $3)
        RETURNING id, project_id, phase_id, name, status as "status: TaskStatus"
        "#,
        payload.project_id,
        payload.phase_id,
        payload.name
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(task))
}

// PATCH /api/tasks/:task_id/status
pub async fn update_task_status(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(task_id): Path<Uuid>,
    Json(payload): Json<UpdateTaskStatusRequest>,
) -> Result<Json<TaskResponse>, (StatusCode, String)> {
    
    // 1. Fetch current task to get the project_id (for the audit log) and verify security
    let current_task = sqlx::query!(
        r#"
        SELECT t.id, t.project_id, t.status as "status: TaskStatus", p.country_id
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = $1
        "#,
        task_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Task not found".to_string()))?;

    // 🛡️ SECURITY CHECK: Does this task belong to the user's country?
    if current_task.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

// 🚀 2. BEGIN ATOMIC TRANSACTION
    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Prepare Audit Log values FIRST (Before payload.status is moved)
    let action = "UPDATE_TASK_STATUS";
    let old_val = format!("{:?}", current_task.status); // current_task.status is safe here
    let new_val = format!("{:?}", payload.status);      // payload.status is borrowed safely here

    // 4. Update the task
    let updated_task = sqlx::query_as!(
        TaskResponse,
        r#"
        UPDATE tasks 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, project_id, phase_id, name, status as "status: TaskStatus"
        "#,
        payload.status as TaskStatus, // <-- payload.status is MOVED here (which is now fine!)
        task_id
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 5. Write to Audit Log (Using the strings we prepared in step 3)
    sqlx::query!(
        r#"
        INSERT INTO audit_logs (project_id, user_id, action, old_value, new_value)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        current_task.project_id,
        claims.sub,
        action,
        old_val,
        new_val
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 🚀 6. COMMIT TRANSACTION
    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated_task))

}
