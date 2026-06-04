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

// GET /api/alerts
pub async fn get_global_alerts(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
) -> Result<Json<Vec<AlertResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Filter by user's country_id
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
        WHERE p.country_id = $1 AND a.dismissed = FALSE
        ORDER BY a.created_at DESC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(alerts))
}

// POST /api/alerts/:alert_id/dismiss
pub async fn dismiss_alert(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Path(alert_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify alert exists and project matches user's country_id
    let alert = sqlx::query!(
        r#"
        SELECT p.country_id
        FROM alerts a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1
        "#,
        alert_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Alert not found".to_string()))?;

    if alert.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    sqlx::query!(
        r#"
        UPDATE alerts
        SET dismissed = TRUE
        WHERE id = $1
        "#,
        alert_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
