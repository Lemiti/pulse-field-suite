use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::api::auth::UserClaims;
use crate::models::{
    GlobalMetricTemplate, ProjectImpactMetricResponse,
    CreateMetricTemplateRequest, UpdateMetricTemplateRequest, AssignImpactMetricRequest, UpdateImpactMetricRequest
};

// ================= GLOBAL METRIC TEMPLATES CRUD (Admin) =================

// GET /api/admin/metric-templates
pub async fn get_metric_templates(
    State(pool): State<PgPool>,
    _claims: UserClaims, // Authenticated users can read templates to assign them
) -> Result<Json<Vec<GlobalMetricTemplate>>, (StatusCode, String)> {
    let templates = sqlx::query_as!(
        GlobalMetricTemplate,
        r#"
        SELECT id, code, display_name, unit
        FROM global_metric_templates
        ORDER BY display_name ASC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(templates))
}

// POST /api/admin/metric-templates
pub async fn create_metric_template(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<CreateMetricTemplateRequest>,
) -> Result<Json<GlobalMetricTemplate>, (StatusCode, String)> {
    if claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Admins only".to_string()));
    }

    let template = sqlx::query_as!(
        GlobalMetricTemplate,
        r#"
        INSERT INTO global_metric_templates (code, display_name, unit)
        VALUES ($1, $2, $3)
        RETURNING id, code, display_name, unit
        "#,
        payload.code,
        payload.display_name,
        payload.unit
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(template))
}

// PUT /api/admin/metric-templates/:template_id
pub async fn update_metric_template(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(template_id): Path<Uuid>,
    Json(payload): Json<UpdateMetricTemplateRequest>,
) -> Result<Json<GlobalMetricTemplate>, (StatusCode, String)> {
    if claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Admins only".to_string()));
    }

    let template = sqlx::query_as!(
        GlobalMetricTemplate,
        r#"
        UPDATE global_metric_templates
        SET code = $1, display_name = $2, unit = $3
        WHERE id = $4
        RETURNING id, code, display_name, unit
        "#,
        payload.code,
        payload.display_name,
        payload.unit,
        template_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(template))
}

// DELETE /api/admin/metric-templates/:template_id
pub async fn delete_metric_template(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(template_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    if claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Admins only".to_string()));
    }

    sqlx::query!(
        r#"
        DELETE FROM global_metric_templates
        WHERE id = $1
        "#,
        template_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

// ================= PROJECT-SPECIFIC IMPACT METRICS =================

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
        SELECT 
            m.id, 
            m.project_id, 
            m.metric_template_id, 
            m.target_value, 
            m.current_value, 
            m.is_manual_override, 
            m.created_at, 
            m.updated_at,
            t.code as "code!",
            t.display_name as "display_name!",
            t.unit as "unit!"
        FROM project_impact_metrics m
        JOIN global_metric_templates t ON m.metric_template_id = t.id
        WHERE m.project_id = $1
        ORDER BY t.display_name ASC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metrics))
}

// POST /api/projects/:project_id/impact (assign metric template)
pub async fn assign_project_impact_metric(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<AssignImpactMetricRequest>,
) -> Result<Json<ProjectImpactMetricResponse>, (StatusCode, String)> {
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

    // Insert or update on conflict
    let inserted = sqlx::query!(
        r#"
        INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (project_id, metric_template_id) 
        DO UPDATE SET target_value = EXCLUDED.target_value, current_value = EXCLUDED.current_value, updated_at = CURRENT_TIMESTAMP
        RETURNING id
        "#,
        project_id,
        payload.metric_template_id,
        payload.target_value,
        payload.current_value
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch the inserted/updated record with template details joined
    let metric = sqlx::query_as!(
        ProjectImpactMetricResponse,
        r#"
        SELECT 
            m.id, 
            m.project_id, 
            m.metric_template_id, 
            m.target_value, 
            m.current_value, 
            m.is_manual_override, 
            m.created_at, 
            m.updated_at,
            t.code as "code!",
            t.display_name as "display_name!",
            t.unit as "unit!"
        FROM project_impact_metrics m
        JOIN global_metric_templates t ON m.metric_template_id = t.id
        WHERE m.id = $1
        "#,
        inserted.id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metric))
}

// PATCH /api/projects/:project_id/impact/:metric_id (update logged values)
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

    // Update value
    sqlx::query!(
        r#"
        UPDATE project_impact_metrics
        SET current_value = $1, is_manual_override = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        "#,
        payload.current_value,
        metric_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch updated record with template details joined
    let metric = sqlx::query_as!(
        ProjectImpactMetricResponse,
        r#"
        SELECT 
            m.id, 
            m.project_id, 
            m.metric_template_id, 
            m.target_value, 
            m.current_value, 
            m.is_manual_override, 
            m.created_at, 
            m.updated_at,
            t.code as "code!",
            t.display_name as "display_name!",
            t.unit as "unit!"
        FROM project_impact_metrics m
        JOIN global_metric_templates t ON m.metric_template_id = t.id
        WHERE m.id = $1
        "#,
        metric_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metric))
}
