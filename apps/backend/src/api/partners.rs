// apps/backend/src/api/partners.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api::auth::UserClaims;
use crate::models::Partner;

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/CreatePartnerRequest.ts")]
pub struct CreatePartnerRequest {
    pub name: String,
    pub r#type: String,
    pub country_id: Option<Uuid>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/UpdatePartnerRequest.ts")]
pub struct UpdatePartnerRequest {
    pub name: String,
    pub r#type: String,
    pub country_id: Option<Uuid>,
}

#[derive(Serialize, Deserialize, TS, Debug, sqlx::FromRow, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectPartnerResponse.ts")]
pub struct ProjectPartnerResponse {
    pub partner_id: Uuid,
    pub name: String,
    pub r#type: String,
    pub country_id: Option<Uuid>,
    #[ts(type = "number")]
    pub contribution_amount: Decimal,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/ProjectPartnerInput.ts")]
pub struct ProjectPartnerInput {
    pub partner_id: Uuid,
    #[ts(type = "number")]
    pub contribution_amount: Decimal,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone)]
#[ts(export, export_to = "../../../packages/shared-types/src/UpdateProjectPartnersRequest.ts")]
pub struct UpdateProjectPartnersRequest {
    pub partners: Vec<ProjectPartnerInput>,
}

// ================= GLOBAL PARTNERS CRUD (Admin-only for write) =================

// GET /api/partners
pub async fn get_partners(
    State(pool): State<PgPool>,
    _claims: UserClaims,
) -> Result<Json<Vec<Partner>>, (StatusCode, String)> {
    let partners = sqlx::query_as!(
        Partner,
        r#"
        SELECT id, name, type, country_id
        FROM partners
        ORDER BY name ASC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(partners))
}

// POST /api/partners
pub async fn create_partner(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<CreatePartnerRequest>,
) -> Result<Json<Partner>, (StatusCode, String)> {
    if claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Admins only".to_string()));
    }

    let partner = sqlx::query_as!(
        Partner,
        r#"
        INSERT INTO partners (name, type, country_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, type, country_id
        "#,
        payload.name,
        payload.r#type,
        payload.country_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(partner))
}

// PUT /api/partners/:partner_id
pub async fn update_partner(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(partner_id): Path<Uuid>,
    Json(payload): Json<UpdatePartnerRequest>,
) -> Result<Json<Partner>, (StatusCode, String)> {
    if claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Admins only".to_string()));
    }

    let partner = sqlx::query_as!(
        Partner,
        r#"
        UPDATE partners
        SET name = $1, type = $2, country_id = $3
        WHERE id = $4
        RETURNING id, name, type, country_id
        "#,
        payload.name,
        payload.r#type,
        payload.country_id,
        partner_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(partner))
}

// DELETE /api/partners/:partner_id
pub async fn delete_partner(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(partner_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    if claims.role != "ADMIN" {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Admins only".to_string()));
    }

    sqlx::query!(
        "DELETE FROM partners WHERE id = $1",
        partner_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

// ================= PROJECT PARTNERS LINKING (Project Managers) =================

// GET /api/projects/:project_id/partners
pub async fn get_project_partners(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectPartnerResponse>>, (StatusCode, String)> {
    // 🛡️ SECURITY: Verify project belongs to user's country
    let has_access = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)",
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(false));

    if has_access != Some(true) {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Project belongs to another tenant".to_string()));
    }

    let project_partners = sqlx::query_as!(
        ProjectPartnerResponse,
        r#"
        SELECT 
            pp.partner_id,
            p.name,
            p.type,
            p.country_id,
            pp.contribution_amount
        FROM project_partners pp
        JOIN partners p ON pp.partner_id = p.id
        WHERE pp.project_id = $1
        ORDER BY p.name ASC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(project_partners))
}

// POST /api/projects/:project_id/partners
pub async fn update_project_partners(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Path(project_id): Path<Uuid>,
    Json(payload): Json<UpdateProjectPartnersRequest>,
) -> Result<Json<Vec<ProjectPartnerResponse>>, (StatusCode, String)> {
    // 🛡️ SECURITY: Verify project belongs to user's country
    let has_access = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND country_id = $2)",
        project_id,
        claims.country_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(false));

    if has_access != Some(true) {
        return Err((StatusCode::FORBIDDEN, "Access Denied: Project belongs to another tenant".to_string()));
    }

    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 1. Delete all existing partners for this project
    sqlx::query!(
        "DELETE FROM project_partners WHERE project_id = $1",
        project_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Insert the new ones and calculate total contribution
    let mut total_contribution = Decimal::new(0, 2);
    for item in &payload.partners {
        sqlx::query!(
            r#"
            INSERT INTO project_partners (project_id, partner_id, contribution_amount)
            VALUES ($1, $2, $3)
            "#,
            project_id,
            item.partner_id,
            item.contribution_amount
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        total_contribution += item.contribution_amount;
    }

    // 3. Update the projects table with aggregated total_income
    sqlx::query!(
        r#"
        UPDATE projects
        SET total_income = $1
        WHERE id = $2
        "#,
        total_contribution,
        project_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 4. Retrieve the updated list to return to frontend
    let project_partners = sqlx::query_as!(
        ProjectPartnerResponse,
        r#"
        SELECT 
            pp.partner_id,
            p.name,
            p.type,
            p.country_id,
            pp.contribution_amount
        FROM project_partners pp
        JOIN partners p ON pp.partner_id = p.id
        WHERE pp.project_id = $1
        ORDER BY p.name ASC
        "#,
        project_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(project_partners))
}
