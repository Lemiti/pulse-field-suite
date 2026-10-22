use axum::{
    extract::{Path, State, Multipart},
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

    crate::api::projects::check_project_write_access(&pool, project_id, claims.sub, &claims.role).await?;

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

// POST /api/projects/:project_id/files
pub async fn upload_project_file(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify user has write access to the project
    crate::api::projects::check_project_write_access(&pool, project_id, claims.sub, &claims.role).await?;

    let mut file_bytes = Vec::new();
    let mut file_name = String::new();
    let mut content_type = String::new();
    let mut task_id_str = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            file_name = field.file_name().unwrap_or_default().to_string();
            content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            let bytes_data = field.bytes().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            file_bytes = bytes_data.to_vec();
        } else if name == "task_id" {
            task_id_str = field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        }
    }

    if file_bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No file uploaded or file is empty".to_string()));
    }

    if task_id_str.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing task_id".to_string()));
    }

    let task_id = Uuid::parse_str(&task_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid task_id UUID format".to_string()))?;

    // Verify task belongs to this project, and project matches user's country
    let belongs = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = $1 AND p.id = $2 AND p.country_id = $3
        ) as "exists!: bool"
        "#,
        task_id,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !belongs {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Task does not belong to the project or user's country".to_string()));
    }

    // Use Google Drive API to upload file
    let client = reqwest::Client::new();
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
    let gdrive_url = format!(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&key={}",
        api_key
    );

    // Build metadata part
    let metadata = serde_json::json!({
        "name": file_name,
        "parents": vec!["1HM-CJ2xiNfsJJV4pSZj-kamF41uVd_rw"]
    });

    let form = reqwest::multipart::Form::new()
        .part("metadata", reqwest::multipart::Part::text(metadata.to_string())
            .mime_str("application/json")
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?)
        .part("file", reqwest::multipart::Part::bytes(file_bytes)
            .file_name(file_name.clone())
            .mime_str(&content_type)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?);

    let response = client.post(&gdrive_url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to send request to Google Drive: {}", e)))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Google Drive API error: {}", err_text)));
    }

    let gdrive_res: serde_json::Value = response.json().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse Google Drive response: {}", e)))?;

    let gdrive_file_id = gdrive_res["id"].as_str()
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Google Drive response missing 'id'".to_string()))?;
    let gdrive_web_url = gdrive_res["webViewLink"].as_str()
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Google Drive response missing 'webViewLink'".to_string()))?;

    // Save metadata to database
    let media_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO media (id, task_id, gdrive_file_id, gdrive_web_url, uploaded_by)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        media_id,
        task_id,
        Some(gdrive_file_id.to_string()),
        Some(gdrive_web_url.to_string()),
        claims.sub
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "success": true,
        "media_id": media_id,
        "gdrive_file_id": gdrive_file_id,
        "gdrive_web_url": gdrive_web_url
    })))
}
