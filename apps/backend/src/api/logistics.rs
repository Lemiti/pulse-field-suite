// apps/backend/src/api/logistics.rs
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use crate::api::auth::{UserClaims, StaffClaims};
use crate::models::{AssetResponse, CreateAssetRequest, PipelineResponse, CreatePipelineRequest};

// GET /api/logistics/assets
pub async fn get_assets(
    State(pool): State<PgPool>,
    _claims: UserClaims, // 🛡️ AUTH GUARD (any logged-in user can view)
) -> Result<Json<Vec<AssetResponse>>, (StatusCode, String)> {
    let assets = sqlx::query_as!(
        AssetResponse,
        r#"
        SELECT 
            id, 
            asset_code, 
            name, 
            serial, 
            location, 
            assigned_to, 
            condition, 
            purchase_date, 
            value, 
            created_at
        FROM assets
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(assets))
}

// POST /api/logistics/assets
pub async fn create_asset(
    State(pool): State<PgPool>,
    _claims: StaffClaims, // 🛡️ STAFF ONLY (Field Officer, PM, Admin)
    Json(payload): Json<CreateAssetRequest>,
) -> Result<Json<AssetResponse>, (StatusCode, String)> {
    let asset = sqlx::query_as!(
        AssetResponse,
        r#"
        INSERT INTO assets (asset_code, name, serial, location, assigned_to, condition, purchase_date, value)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, asset_code, name, serial, location, assigned_to, condition, purchase_date, value, created_at
        "#,
        payload.asset_code,
        payload.name,
        payload.serial,
        payload.location,
        payload.assigned_to,
        payload.condition,
        payload.purchase_date,
        payload.value
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(asset))
}

// GET /api/logistics/pipelines
pub async fn get_pipelines(
    State(pool): State<PgPool>,
    _claims: UserClaims, // 🛡️ AUTH GUARD
) -> Result<Json<Vec<PipelineResponse>>, (StatusCode, String)> {
    let pipelines = sqlx::query_as!(
        PipelineResponse,
        r#"
        SELECT 
            id, 
            pipeline_code, 
            item, 
            qty, 
            supplier, 
            status, 
            expected_date, 
            project, 
            cost, 
            created_at
        FROM procurement_pipelines
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(pipelines))
}

// POST /api/logistics/pipelines
pub async fn create_pipeline(
    State(pool): State<PgPool>,
    _claims: StaffClaims, // 🛡️ STAFF ONLY
    Json(payload): Json<CreatePipelineRequest>,
) -> Result<Json<PipelineResponse>, (StatusCode, String)> {
    let pipeline = sqlx::query_as!(
        PipelineResponse,
        r#"
        INSERT INTO procurement_pipelines (pipeline_code, item, qty, supplier, status, expected_date, project, cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, pipeline_code, item, qty, supplier, status, expected_date, project, cost, created_at
        "#,
        payload.pipeline_code,
        payload.item,
        payload.qty,
        payload.supplier,
        payload.status,
        payload.expected_date,
        payload.project,
        payload.cost
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(pipeline))
}
