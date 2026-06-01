use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use crate::api::auth::UserClaims;
use crate::models::{SyncPushRequest, TaskStatus};
use serde_json::json;

// POST /api/sync
pub async fn push_sync(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Json(payload): Json<SyncPushRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    
    // Check if the mobile app sent us any "tasks" changes
    if let Some(task_changes) = payload.changes.get("tasks") {
        
        // Loop through all tasks the Field Officer updated while offline
        for offline_task in &task_changes.updated {
            
            // 1. Fetch the current task and check tenant security
            let current_task = sqlx::query!(
                r#"
                SELECT t.project_id, t.status as "status: TaskStatus", p.country_id
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                WHERE t.id = $1
                "#,
                offline_task.id
            )
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            // If task exists and belongs to the user's country, process the update
            if let Some(task) = current_task {
                if task.country_id == claims.country_id {
                    
                    // 🚀 ATOMIC TRANSACTION FOR OFFLINE SYNC
                    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                    // Update task
                    sqlx::query!(
                        "UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                        offline_task.status as TaskStatus,
                        offline_task.id
                    )
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                    // Write Audit Log (Marking it as an OFFLINE_SYNC action!)
                    let action = "OFFLINE_SYNC_TASK_UPDATE";
                    let old_val = format!("{:?}", task.status);
                    let new_val = format!("{:?}", offline_task.status);

                    sqlx::query!(
                        r#"
                        INSERT INTO audit_logs (project_id, user_id, action, old_value, new_value)
                        VALUES ($1, $2, $3, $4, $5)
                        "#,
                        task.project_id, claims.sub, action, old_val, new_val
                    )
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                }
            }
        }
    }

    // Tell WatermelonDB the sync was successful
    Ok(Json(json!({ "success": true })))
}
