use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use axum::extract::Path;
use rust_decimal::prelude::ToPrimitive;
use uuid::Uuid;
use crate::models::UpdateBudgetRequest;
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

// PATCH /api/projects/:project_id/budget
pub async fn update_project_budget(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<UpdateBudgetRequest>,
) -> Result<Json<ProjectResponse>, (StatusCode, String)> {
    
    // 1. Fetch current project to verify access
    let project = sqlx::query!(
        r#"SELECT budget_allocated, budget_spent, country_id, name FROM projects WHERE id = $1"#,
        project_id
    )
    .fetch_optional(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    if project.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    // 🚀 2. BEGIN ATOMIC TRANSACTION
    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update budget_spent
    let updated_project = sqlx::query_as!(
        ProjectResponse,
        r#"
        UPDATE projects SET budget_spent = budget_spent + $1 WHERE id = $2
        RETURNING id, country_id, name, description, budget_allocated, budget_spent, status as "status: ProjectStatus", funding_sources
        "#,
        payload.amount_spent,
        project_id
    )
    .fetch_one(&mut *tx).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Write to Audit Log
    sqlx::query!(
        r#"
        INSERT INTO audit_logs (project_id, user_id, action, old_value, new_value)
        VALUES ($1, $2, 'ADD_EXPENSE', $3, $4)
        "#,
        project_id, claims.sub, project.budget_spent.to_string(), updated_project.budget_spent.to_string()
    )
    .execute(&mut *tx).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 🔔 3. OUTBOUND WEBHOOK LOGIC (Runs in the background!)
    // If budget utilized > 90%, fire alert
    let allocated = updated_project.budget_allocated.to_f64().unwrap_or(1.0);
    let spent = updated_project.budget_spent.to_f64().unwrap_or(0.0);
    let utilization = (spent / allocated) * 100.0;

    if utilization >= 90.0 {
        let project_name = updated_project.name.clone();
        
        // Spawn a background Tokio task so the user doesn't wait for the HTTP request to finish
        tokio::spawn(async move {
            let client = reqwest::Client::new();
            let webhook_url = std::env::var("WEBHOOK_URL").unwrap_or_else(|_| "http://localhost:9999/mock-webhook".to_string());
            
            let payload = serde_json::json!({
                "event_type": "project.budget_warning",
                "data": {
                    "project_id": project_id,
                    "project_name": project_name,
                    "utilization_percentage": utilization,
                }
            });

            // Fire and forget
            if let Err(e) = client.post(&webhook_url).json(&payload).send().await {
                tracing::warn!("Failed to dispatch webhook: {}", e);
            } else {
                tracing::info!("🔔 WEBHOOK DISPATCHED: Project budget > 90%!");
            }
        });
    }

    Ok(Json(updated_project))
}

use crate::models::ProjectStatsResponse;

// GET /api/projects/:project_id/stats
pub async fn get_project_stats(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Path(project_id): Path<Uuid>,
) -> Result<Json<ProjectStatsResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify the project belongs to the user's country
    let project = sqlx::query!(
        r#"SELECT budget_allocated, budget_spent, country_id FROM projects WHERE id = $1"#,
        project_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    if project.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    // Query wells completed
    let wells_completed = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status = 'COMPLETED'"#,
        project_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(0);

    // Query active teams (distinct users assigned to tasks)
    let active_teams = sqlx::query_scalar!(
        r#"SELECT COUNT(DISTINCT assigned_to) FROM tasks WHERE project_id = $1 AND assigned_to IS NOT NULL"#,
        project_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(0);

    // Calculate budget percentage
    let allocated = project.budget_allocated.to_f64().unwrap_or(1.0);
    let spent = project.budget_spent.to_f64().unwrap_or(0.0);
    let budget_spent_percent = if allocated > 0.0 {
        (spent / allocated) * 100.0
    } else {
        0.0
    };

    Ok(Json(ProjectStatsResponse {
        project_id,
        wells_completed,
        active_teams,
        budget_spent_percent,
    }))
}

