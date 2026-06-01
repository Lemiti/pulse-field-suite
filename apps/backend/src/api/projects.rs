use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use crate::api::auth::UserClaims;
use crate::models::{CreateProjectRequest, ProjectResponse, ProjectStatus};

// GET /api/projects
pub async fn get_projects(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD: Extracts the user's country_id automatically
) -> Result<Json<Vec<ProjectResponse>>, (StatusCode, String)> {
    
    // 🌍 MULTI-TENANCY IN ACTION: `WHERE country_id = $1` prevents data leaks
    let projects = sqlx::query_as!(
        ProjectResponse,
        r#"
        SELECT 
            id, country_id, name, description, 
            budget_allocated, 
            budget_spent, 
            status as "status: ProjectStatus", 
            funding_sources
        FROM projects
        WHERE country_id = $1
        ORDER BY created_at DESC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(projects))
}

// POST /api/projects
pub async fn create_project(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Json(payload): Json<CreateProjectRequest>,
) -> Result<Json<ProjectResponse>, (StatusCode, String)> {
    
    // Convert Rust Vec<String> to a JSON value for Postgres
    let funding_json = serde_json::to_value(&payload.funding_sources)
        .unwrap_or(serde_json::json!([]));

    let project = sqlx::query_as!(
        ProjectResponse,
        r#"
        INSERT INTO projects (country_id, name, description, budget_allocated, funding_sources)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
            id, country_id, name, description, 
            budget_allocated, 
            budget_spent, 
            status as "status: ProjectStatus", 
            funding_sources
        "#,
        claims.country_id, // Automatically bind the project to the user's country!
        payload.name,
        payload.description,
        payload.budget_allocated,
        funding_json
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(project))
}
