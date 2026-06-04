use axum::{extract::{State, Path, Query}, http::StatusCode, Json};
use sqlx::{PgPool, Postgres, Transaction};
use rust_decimal::prelude::ToPrimitive;
use uuid::Uuid;
use crate::models::UpdateBudgetRequest;
use crate::api::auth::UserClaims;
use crate::models::{CreateProjectRequest, ProjectResponse, ProjectStatus, ProjectFocusArea, PhaseResponse, CreatePhaseRequest};
use crate::models::{
    FieldLogResponse, CreateFieldLogRequest, UpdateFieldLogRequest,
    ProjectMessageResponse, CreateProjectMessageRequest, ProjectImpactMetricResponse, UpdateImpactMetricRequest
};

#[derive(serde::Deserialize)]
pub struct ProjectsQuery {
    pub status: Option<String>,
}

pub async fn refresh_project_status(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE projects
        SET status = CASE
            WHEN EXISTS(SELECT 1 FROM tasks WHERE project_id = $1)
                AND NOT EXISTS(SELECT 1 FROM tasks WHERE project_id = $1 AND status <> 'COMPLETED')
                THEN 'COMPLETED'::project_status
            WHEN EXISTS(SELECT 1 FROM tasks WHERE project_id = $1 AND status IN ('IN_PROGRESS', 'COMPLETED'))
                THEN 'IN_PROGRESS'::project_status
            ELSE 'PLANNING'::project_status
        END
        WHERE id = $1
        "#,
        project_id
    )
    .execute(&mut **tx)
    .await?;

    Ok(())
}

// GET /api/projects
pub async fn get_projects(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD: Extracts the user's country_id automatically
    Query(query): Query<ProjectsQuery>,
) -> Result<Json<Vec<ProjectResponse>>, (StatusCode, String)> {
    
    // 🌍 MULTI-TENANCY IN ACTION: `WHERE country_id = $1` prevents data leaks
    let mut projects = sqlx::query_as!(
        ProjectResponse,
        r#"
        SELECT
            p.id,
            p.country_id,
            p.name,
            p.description,
            p.budget_allocated,
            p.budget_spent,
            CASE
                WHEN task_rollup.task_count > 0 AND task_rollup.completed_count = task_rollup.task_count
                    THEN 'COMPLETED'::project_status
                WHEN task_rollup.active_count > 0
                    THEN 'IN_PROGRESS'::project_status
                ELSE 'PLANNING'::project_status
            END as "status!: ProjectStatus",
            p.funding_sources,
            p.focus_area as "focus_area: ProjectFocusArea",
            p.location_metadata,
            CASE
                WHEN task_rollup.total_days > 0
                    THEN (task_rollup.completed_days::float8 / task_rollup.total_days::float8) * 100.0
                ELSE 0.0
            END as "progress_percentage!",
            p.is_template
        FROM projects p
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) as task_count,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
                COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'COMPLETED')) as active_count,
                COALESCE(SUM(COALESCE(GREATEST(end_date - start_date + 1, 1), 1)), 0) as total_days,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(GREATEST(end_date - start_date + 1, 1), 1) ELSE 0 END), 0) as completed_days
            FROM tasks
            WHERE project_id = p.id
        ) task_rollup ON TRUE
        WHERE p.country_id = $1
        ORDER BY p.created_at DESC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(ref status_filter) = query.status {
        projects.retain(|p| {
            let status_str = match p.status {
                ProjectStatus::PLANNING => "PLANNING",
                ProjectStatus::IN_PROGRESS => "IN_PROGRESS",
                ProjectStatus::COMPLETED => "COMPLETED",
                ProjectStatus::ON_HOLD => "ON_HOLD",
            };
            status_str.eq_ignore_ascii_case(status_filter)
        });
    }

    Ok(Json(projects))
}

// GET /api/projects/:project_id
pub async fn get_project(
    State(pool): State<PgPool>,
    claims: UserClaims, // 🛡️ AUTH GUARD
    Path(project_id): Path<Uuid>,
) -> Result<Json<ProjectResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify the project belongs to the user's country
    let project = sqlx::query_as!(
        ProjectResponse,
        r#"
        SELECT
            p.id,
            p.country_id,
            p.name,
            p.description,
            p.budget_allocated,
            p.budget_spent,
            CASE
                WHEN task_rollup.task_count > 0 AND task_rollup.completed_count = task_rollup.task_count
                    THEN 'COMPLETED'::project_status
                WHEN task_rollup.active_count > 0
                    THEN 'IN_PROGRESS'::project_status
                ELSE 'PLANNING'::project_status
            END as "status!: ProjectStatus",
            p.funding_sources,
            p.focus_area as "focus_area: ProjectFocusArea",
            p.location_metadata,
            CASE
                WHEN task_rollup.total_days > 0
                    THEN (task_rollup.completed_days::float8 / task_rollup.total_days::float8) * 100.0
                ELSE 0.0
            END as "progress_percentage!",
            p.is_template
        FROM projects p
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) as task_count,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
                COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'COMPLETED')) as active_count,
                COALESCE(SUM(COALESCE(GREATEST(end_date - start_date + 1, 1), 1)), 0) as total_days,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(GREATEST(end_date - start_date + 1, 1), 1) ELSE 0 END), 0) as completed_days
            FROM tasks
            WHERE project_id = p.id
        ) task_rollup ON TRUE
        WHERE p.id = $1 AND p.country_id = $2
        "#,
        project_id,
        claims.country_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    Ok(Json(project))
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
        INSERT INTO projects (country_id, name, description, budget_allocated, funding_sources, focus_area, location_metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
            id, country_id, name, description, 
            budget_allocated, 
            budget_spent, 
            status as "status: ProjectStatus", 
            funding_sources,
            focus_area as "focus_area: ProjectFocusArea",
            location_metadata,
            0.0::float8 as "progress_percentage!",
            is_template
        "#,
        claims.country_id, // Automatically bind the project to the user's country!
        payload.name,
        payload.description,
        payload.budget_allocated,
        funding_json,
        payload.focus_area as ProjectFocusArea,
        payload.location_metadata
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
    
    // 1. Fetch current project state
    let project = sqlx::query!(
        r#"SELECT budget_allocated, budget_spent, country_id, name, budget_warning_sent FROM projects WHERE id = $1"#,
        project_id
    )
    .fetch_optional(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    if project.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    let user_id = claims.sub;

    let user_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) as "exists!: bool""#,
        user_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !user_exists {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Authenticated user not found. Please log in again.".to_string(),
        ));
    }

    let reason = payload.reason.trim();
    if reason.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Expense reason is required".to_string(),
        ));
    }

    // Calculate budget utilization with the incoming expense
    let new_spent = project.budget_spent + payload.amount_spent;
    let allocated_f = project.budget_allocated.to_f64().unwrap_or(1.0);
    let new_spent_f = new_spent.to_f64().unwrap_or(0.0);
    let utilization = (new_spent_f / allocated_f) * 100.0;

    // Check if we should trigger the warning strictly ONCE
    let should_trigger_warning = utilization >= 90.0 && !project.budget_warning_sent;

    // 🚀 2. BEGIN ATOMIC TRANSACTION
    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update budget_spent, and toggle the warning flag if the threshold is crossed
    let updated_project = sqlx::query_as!(
        ProjectResponse,
        r#"
        WITH updated_project AS (
            UPDATE projects
            SET budget_spent = budget_spent + $1,
                budget_warning_sent = CASE WHEN $3 = TRUE THEN TRUE ELSE budget_warning_sent END
            WHERE id = $2
            RETURNING *
        )
        SELECT
            p.id,
            p.country_id,
            p.name,
            p.description,
            p.budget_allocated,
            p.budget_spent,
            CASE
                WHEN task_rollup.task_count > 0 AND task_rollup.completed_count = task_rollup.task_count
                    THEN 'COMPLETED'::project_status
                WHEN task_rollup.active_count > 0
                    THEN 'IN_PROGRESS'::project_status
                ELSE 'PLANNING'::project_status
            END as "status!: ProjectStatus",
            p.funding_sources,
            p.focus_area as "focus_area: ProjectFocusArea",
            p.location_metadata,
            CASE
                WHEN task_rollup.total_days > 0
                    THEN (task_rollup.completed_days::float8 / task_rollup.total_days::float8) * 100.0
                ELSE 0.0
            END as "progress_percentage!",
            p.is_template
        FROM updated_project p
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) as task_count,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
                COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'COMPLETED')) as active_count,
                COALESCE(SUM(COALESCE(GREATEST(end_date - start_date + 1, 1), 1)), 0) as total_days,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(GREATEST(end_date - start_date + 1, 1), 1) ELSE 0 END), 0) as completed_days
            FROM tasks
            WHERE project_id = p.id
        ) task_rollup ON TRUE
        "#,
        payload.amount_spent,
        project_id,
        should_trigger_warning
    )
    .fetch_one(&mut *tx).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Write log to persistent audit log history
    let audit_new_value = serde_json::json!({
        "budget_spent": updated_project.budget_spent.to_string(),
        "amount_added": payload.amount_spent.to_string(),
        "reason": reason,
    })
    .to_string();

    sqlx::query!(
        r#"
        INSERT INTO audit_logs (project_id, user_id, action, old_value, new_value)
        VALUES ($1, $2, 'ADD_EXPENSE', $3, $4)
        "#,
        project_id,
        user_id,
        project.budget_spent.to_string(),
        audit_new_value
    )
    .execute(&mut *tx).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // If threshold crossed, enqueue the notification into our webhook delivery queue and insert an alert in the same transaction
    if should_trigger_warning {
        let webhook_payload = serde_json::json!({
            "event_type": "project.budget_warning",
            "data": {
                "project_id": project_id,
                "project_name": project.name,
                "utilization_percentage": utilization,
            }
        });

        sqlx::query!(
            r#"
            INSERT INTO webhook_delivery_queue (payload, status)
            VALUES ($1, 'PENDING')
            "#,
            webhook_payload
        )
        .execute(&mut *tx).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let alert_message = format!(
            "Project '{}' has spent {:.1}% of its allocated budget.",
            project.name, utilization
        );
        sqlx::query!(
            r#"
            INSERT INTO alerts (project_id, message, severity, dismissed)
            VALUES ($1, $2, 'high', FALSE)
            "#,
            project_id,
            alert_message
        )
        .execute(&mut *tx).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Commit transaction atomically
    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 🔔 3. OUTBOUND WEBHOOK LOGIC (Runs as a background task)
    if should_trigger_warning {
        let project_name = updated_project.name.clone();
        
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

// ─── PROJECT PHASES ───────────────────────────────────────────────────────────

// GET /api/projects/:project_id/phases
pub async fn get_project_phases(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<PhaseResponse>>, (StatusCode, String)> {
    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let phases = sqlx::query_as!(
        PhaseResponse,
        r#"
        SELECT id, project_id, name, sort_order
        FROM phases
        WHERE project_id = $1
        ORDER BY sort_order ASC, created_at ASC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(phases))
}

// POST /api/projects/:project_id/phases
pub async fn create_project_phase(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<CreatePhaseRequest>,
) -> Result<Json<PhaseResponse>, (StatusCode, String)> {
    if payload.project_id != project_id {
        return Err((StatusCode::BAD_REQUEST, "project_id must match the route project id".to_string()));
    }

    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let sort_order = payload.sort_order.unwrap_or(0);

    let phase = sqlx::query_as!(
        PhaseResponse,
        r#"
        INSERT INTO phases (project_id, name, sort_order)
        VALUES ($1, $2, $3)
        RETURNING id, project_id, name, sort_order
        "#,
        project_id,
        payload.name,
        sort_order
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(phase))
}

// ─── FIELD LOGS / NOTES ENDPOINTS ─────────────────────────────────────────────

// GET /api/projects/:project_id/notes
pub async fn get_project_notes(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<FieldLogResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify project belongs to user's country
    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let notes = sqlx::query_as!(
        FieldLogResponse,
        r#"
        SELECT id, project_id, author_id, content, is_edited, created_at, updated_at
        FROM field_logs
        WHERE project_id = $1
        ORDER BY created_at ASC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(notes))
}

// POST /api/projects/:project_id/notes
pub async fn create_project_note(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<CreateFieldLogRequest>,
) -> Result<Json<FieldLogResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify project belongs to user's country
    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let note = sqlx::query_as!(
        FieldLogResponse,
        r#"
        INSERT INTO field_logs (project_id, author_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, project_id, author_id, content, is_edited, created_at, updated_at
        "#,
        project_id,
        claims.sub, // The authorized user ID
        payload.content
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(note))
}

// PATCH /api/projects/:project_id/notes/:note_id
pub async fn update_project_note(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path((project_id, note_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateFieldLogRequest>,
) -> Result<Json<FieldLogResponse>, (StatusCode, String)> {
    
    // 1. Fetch note to verify project mapping and ownership
    let note = sqlx::query!(
        r#"SELECT author_id, project_id FROM field_logs WHERE id = $1"#,
        note_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Note not found".to_string()))?;

    if note.project_id != project_id {
        return Err((StatusCode::BAD_REQUEST, "Note does not belong to this project".to_string()));
    }

    // 🛡️ SECURITY: Only the author of the note is allowed to edit it
    if note.author_id != claims.sub {
        return Err((StatusCode::FORBIDDEN, "Only the author can edit this note".to_string()));
    }

    // 2. Perform the update and set is_edited to true
    let updated_note = sqlx::query_as!(
        FieldLogResponse,
        r#"
        UPDATE field_logs 
        SET content = $1, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, project_id, author_id, content, is_edited, created_at, updated_at
        "#,
        payload.content,
        note_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated_note))
}

// DELETE /api/projects/:project_id/notes/:note_id
pub async fn delete_project_note(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path((project_id, note_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    // 1. Fetch note to verify project mapping and ownership
    let note = sqlx::query!(
        r#"SELECT author_id, project_id FROM field_logs WHERE id = $1"#,
        note_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Note not found".to_string()))?;

    if note.project_id != project_id {
        return Err((StatusCode::BAD_REQUEST, "Note does not belong to this project".to_string()));
    }

    // 🛡️ SECURITY: Only the author or system admin can delete the note
    if note.author_id != claims.sub && claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Only the author or an admin can delete this note".to_string()));
    }

    // 2. Perform the deletion
    sqlx::query!(
        "DELETE FROM field_logs WHERE id = $1",
        note_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

// apps/backend/src/api/projects.rs
// ... add to the bottom of the file ...

// ─── UNIFIED MESSAGES ENDPOINTS ────────────────────────────────────────────────

// GET /api/projects/:project_id/messages
pub async fn get_project_messages(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectMessageResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify project belongs to user's country
    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let messages = sqlx::query_as!(
        ProjectMessageResponse,
        r#"
        SELECT id, project_id, sender_id, content, created_at
        FROM project_messages
        WHERE project_id = $1
        ORDER BY created_at ASC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(messages))
}

// POST /api/projects/:project_id/messages
pub async fn create_project_message(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<CreateProjectMessageRequest>,
) -> Result<Json<ProjectMessageResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify project belongs to user's country
    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let message = sqlx::query_as!(
        ProjectMessageResponse,
        r#"
        INSERT INTO project_messages (project_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, project_id, sender_id, content, created_at
        "#,
        project_id,
        claims.sub,
        payload.content
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(message))
}

// apps/backend/src/api/projects.rs
// ... add to the bottom of the file ...

// ─── PROJECT IMPACT METRICS ENDPOINTS ─────────────────────────────────────────

// GET /api/projects/:project_id/impact
pub async fn get_project_impact_metrics(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectImpactMetricResponse>>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify project belongs to user's country
    let project_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)"#,
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .unwrap_or(false);

    if !project_exists {
        return Err((StatusCode::FORBIDDEN, "Access Denied or Project not found".to_string()));
    }

    let metrics = sqlx::query_as!(
        ProjectImpactMetricResponse,
        r#"
        SELECT id, project_id, metric_template_id, target_value, current_value, is_manual_override, created_at, updated_at
        FROM project_impact_metrics
        WHERE project_id = $1
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metrics))
}

// PATCH /api/projects/:project_id/impact/:metric_id
pub async fn update_project_impact_metric(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path((project_id, metric_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateImpactMetricRequest>,
) -> Result<Json<ProjectImpactMetricResponse>, (StatusCode, String)> {
    
    // 🛡️ SECURITY: Verify target metric belongs to the specified project and user's country
    let metric_info = sqlx::query!(
        r#"
        SELECT m.id, p.country_id 
        FROM project_impact_metrics m
        JOIN projects p ON m.project_id = p.id
        WHERE m.id = $1 AND m.project_id = $2
        "#,
        metric_id,
        project_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Metric not found for this project".to_string()))?;

    if metric_info.country_id != claims.country_id {
        return Err((StatusCode::FORBIDDEN, "Access Denied".to_string()));
    }

    // Perform manual override update
    let updated_metric = sqlx::query_as!(
        ProjectImpactMetricResponse,
        r#"
        UPDATE project_impact_metrics
        SET current_value = $1, is_manual_override = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, project_id, metric_template_id, target_value, current_value, is_manual_override, created_at, updated_at
        "#,
        payload.current_value,
        metric_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated_metric))
}

// POST /api/projects/:project_id/use-template
pub async fn use_template(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(template_id): Path<Uuid>,
) -> Result<Json<Uuid>, (StatusCode, String)> {
    // 1. Fetch the template project
    let template = sqlx::query!(
        r#"
        SELECT name, description, budget_allocated, funding_sources, focus_area as "focus_area: ProjectFocusArea", location_metadata, start_date, end_date
        FROM projects
        WHERE id = $1 AND is_template = TRUE
        "#,
        template_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Template project not found".to_string()))?;

    // 2. Begin transaction
    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Create duplicate project (not a template, reset spent, status planning)
    let new_project_id = sqlx::query_scalar!(
        r#"
        INSERT INTO projects (
            country_id, name, description, budget_allocated, budget_spent, status, 
            funding_sources, start_date, end_date, focus_area, location_metadata, is_template
        )
        VALUES ($1, $2, $3, $4, $5, 'PLANNING'::project_status, $6, $7, $8, $9, $10, FALSE)
        RETURNING id
        "#,
        claims.country_id,
        template.name,
        template.description,
        template.budget_allocated,
        rust_decimal::Decimal::from(0),
        template.funding_sources,
        template.start_date,
        template.end_date,
        template.focus_area as ProjectFocusArea,
        template.location_metadata
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 4. Duplicate phases and keep old -> new mapping
    let old_phases = sqlx::query!(
        r#"
        SELECT id, name, sort_order
        FROM phases
        WHERE project_id = $1
        ORDER BY sort_order ASC
        "#,
        template_id
    )
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut phase_mapping = std::collections::HashMap::new();

    for phase in old_phases {
        let new_phase_id = sqlx::query_scalar!(
            r#"
            INSERT INTO phases (project_id, name, sort_order)
            VALUES ($1, $2, $3)
            RETURNING id
            "#,
            new_project_id,
            phase.name,
            phase.sort_order
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        phase_mapping.insert(phase.id, new_phase_id);
    }

    // 5. Duplicate tasks
    let old_tasks = sqlx::query!(
        r#"
        SELECT id, phase_id, name, dependencies, start_date, end_date
        FROM tasks
        WHERE project_id = $1
        "#,
        template_id
    )
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for task in old_tasks {
        let new_phase_id = task.phase_id.and_then(|id| phase_mapping.get(&id).copied());
        
        sqlx::query!(
            r#"
            INSERT INTO tasks (
                project_id, phase_id, assigned_to, name, status, dependencies, start_date, end_date
            )
            VALUES ($1, $2, NULL, $3, 'PLAN'::task_status, $4, $5, $6)
            "#,
            new_project_id,
            new_phase_id,
            task.name,
            task.dependencies,
            task.start_date,
            task.end_date
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(new_project_id))
}
