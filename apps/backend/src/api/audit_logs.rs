use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::auth::UserClaims;
use crate::models::AuditLogResponse;

// GET /api/projects/:project_id/audit-logs
pub async fn get_audit_logs(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<AuditLogResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Join with projects to enforce multi-tenant country_id isolation
    let logs = sqlx::query_as!(
        AuditLogResponse,
        r#"
        SELECT 
            a.id, 
            a.project_id, 
            a.user_id, 
            a.action, 
            a.old_value, 
            a.new_value, 
            a.created_at
        FROM audit_logs a
        JOIN projects p ON a.project_id = p.id
        WHERE a.project_id = $1 AND p.country_id = $2
        ORDER BY a.created_at DESC
        "#,
        project_id,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(logs))
}
