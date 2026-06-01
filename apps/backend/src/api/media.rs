use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::auth::UserClaims;
use crate::models::{ConfirmUploadRequest, GenerateUploadUrlRequest, UploadUrlResponse};

// POST /api/media/upload-url
pub async fn get_upload_url(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Json(payload): Json<GenerateUploadUrlRequest>,
) -> Result<Json<UploadUrlResponse>, (StatusCode, String)> {
    
    // 1. Verify user has access to this task's project
    let has_access = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = $1 AND p.country_id = $2
        )
        "#,
        payload.task_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(false));

    if has_access != Some(true) {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    // 2. MOCK GOOGLE DRIVE RESUMABLE URI GENERATION
    // In production, we'd use a Google Service Account here to ask GDrive for an upload URI.
    // For now, we return a mock URL so the mobile app can be built!
    let mock_file_id = format!("gdrive_mock_id_{}", Uuid::new_v4());
    let mock_upload_url = format!("https://mock-gdrive.com/upload?file_id={}", mock_file_id);

    Ok(Json(UploadUrlResponse {
        upload_url: mock_upload_url,
        file_id: mock_file_id,
    }))
}

// POST /api/media/confirm
pub async fn confirm_upload(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<ConfirmUploadRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    
    // 1. Save the metadata to the media table securely
    sqlx::query!(
        r#"
        INSERT INTO media (task_id, gdrive_file_id, gdrive_web_url, uploaded_by)
        VALUES ($1, $2, $3, $4)
        "#,
        payload.task_id,
        payload.file_id,
        payload.web_url,
        claims.sub // The user who uploaded the proof!
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true, "message": "Proof of Work saved!" })))
}
