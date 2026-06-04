use axum::{extract::{Path, State}, http::StatusCode, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::api::auth::UserClaims;
use crate::api::projects::refresh_project_status;
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
        SELECT
            t.id,
            t.project_id,
            t.phase_id,
            t.name,
            t.status as "status: TaskStatus",
            t.start_date,
            t.end_date,
            t.created_at,
            t.updated_at
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

    if payload.end_date < payload.start_date {
        return Err((StatusCode::BAD_REQUEST, "end_date must be after or equal to start_date".to_string()));
    }

    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let task = sqlx::query_as!(
        TaskResponse,
        r#"
        INSERT INTO tasks (project_id, phase_id, name, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            project_id,
            phase_id,
            name,
            status as "status: TaskStatus",
            start_date,
            end_date,
            created_at,
            updated_at
        "#,
        payload.project_id,
        payload.phase_id,
        payload.name,
        payload.start_date,
        payload.end_date
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    refresh_project_status(&mut tx, payload.project_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
        RETURNING
            id,
            project_id,
            phase_id,
            name,
            status as "status: TaskStatus",
            start_date,
            end_date,
            created_at,
            updated_at
        "#,
        payload.status as TaskStatus, // <-- payload.status is MOVED here (which is now fine!)
        task_id
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    refresh_project_status(&mut tx, current_task.project_id)
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
