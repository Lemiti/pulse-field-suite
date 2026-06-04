use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::auth::UserClaims;
use crate::models::{
    ConfirmUploadRequest, GenerateUploadUrlRequest, UploadUrlResponse,
    ProjectMediaResponse, CreateProjectMediaRequest,
};

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
        ) as "exists!: bool"
        "#,
        payload.task_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(false);

    if !has_access {
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

// GET /api/projects/:project_id/media
pub async fn get_project_media(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectMediaResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify project matches user's country
    let has_access = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM projects
            WHERE id = $1 AND country_id = $2
        ) as "exists!: bool"
        "#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !has_access {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    let media_records = sqlx::query_as!(
        ProjectMediaResponse,
        r#"
        SELECT 
            m.id,
            m.task_id,
            t.name as task_name,
            m.gdrive_file_id,
            m.gdrive_web_url,
            m.uploaded_by,
            u.name as uploaded_by_name,
            m.created_at
        FROM media m
        JOIN tasks t ON m.task_id = t.id
        JOIN users u ON m.uploaded_by = u.id
        WHERE t.project_id = $1
        ORDER BY m.created_at DESC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(media_records))
}

// POST /api/projects/:project_id/media
pub async fn create_project_media(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<CreateProjectMediaRequest>,
) -> Result<Json<ProjectMediaResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify task belongs to this project, and project matches user's country
    let belongs = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = $1 AND p.id = $2 AND p.country_id = $3
        ) as "exists!: bool"
        "#,
        payload.task_id,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !belongs {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    let media_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO media (id, task_id, gdrive_file_id, gdrive_web_url, uploaded_by)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        media_id,
        payload.task_id,
        None::<String>,
        payload.gdrive_web_url,
        claims.sub
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let inserted = sqlx::query_as!(
        ProjectMediaResponse,
        r#"
        SELECT 
            m.id,
            m.task_id,
            t.name as task_name,
            m.gdrive_file_id,
            m.gdrive_web_url,
            m.uploaded_by,
            u.name as uploaded_by_name,
            m.created_at
        FROM media m
        JOIN tasks t ON m.task_id = t.id
        JOIN users u ON m.uploaded_by = u.id
        WHERE m.id = $1
        "#,
        media_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(inserted))
}

// DELETE /api/projects/:project_id/media/:media_id
pub async fn delete_project_media(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path((project_id, media_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify media belongs to this project, and matches user's country
    let media = sqlx::query!(
        r#"
        SELECT m.uploaded_by, p.country_id
        FROM media m
        JOIN tasks t ON m.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE m.id = $1 AND p.id = $2
        "#,
        media_id,
        project_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Attachment not found".to_string()))?;

    if media.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    if media.uploaded_by != claims.sub && claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Only uploader or admin can delete this attachment".to_string()));
    }

    sqlx::query!(
        "DELETE FROM media WHERE id = $1",
        media_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
