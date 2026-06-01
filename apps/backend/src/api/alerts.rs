use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::auth::UserClaims;
use crate::models::AlertResponse;

// GET /api/projects/:project_id/alerts
pub async fn get_alerts(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<AlertResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Join with projects to enforce multi-tenant country_id isolation
    let alerts = sqlx::query_as!(
        AlertResponse,
        r#"
        SELECT 
            a.id, 
            a.project_id, 
            a.message, 
            a.severity, 
            a.dismissed, 
            a.created_at
        FROM alerts a
        JOIN projects p ON a.project_id = p.id
        WHERE a.project_id = $1 AND p.country_id = $2 AND a.dismissed = FALSE
        ORDER BY a.created_at DESC
        "#,
        project_id,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(alerts))
}
