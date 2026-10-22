use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use ts_rs::TS;
use crate::api::auth::UserClaims;

#[derive(Deserialize)]
pub struct SearchParams {
    pub q: Option<String>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, sqlx::FromRow)]
#[ts(export, export_to = "../../../packages/shared-types/src/SearchItem.ts")]
pub struct SearchItem {
    pub id: String,
    pub name: String,
    pub item_type: String, // "PROJECT", "BENEFICIARY", "ASSET"
    pub details: Option<String>,
}

pub async fn global_search(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<SearchItem>>, (StatusCode, String)> {
    let query = params.q.unwrap_or_default().trim().to_string();
    if query.is_empty() {
        return Ok(Json(Vec::new()));
    }

    let search_pattern = format!("%{}%", query);

    // 1. Query projects (filtered by user's country_id for multi-tenancy)
    let projects = sqlx::query_as::<_, SearchItem>(
        r#"
        SELECT id::text as id, name, 'PROJECT' as item_type, description as details
        FROM projects
        WHERE country_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
        LIMIT 10
        "#
    )
    .bind(claims.country_id)
    .bind(&search_pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Query assets
    let assets = sqlx::query_as::<_, SearchItem>(
        r#"
        SELECT id::text as id, name, 'ASSET' as item_type, asset_code as details
        FROM assets
        WHERE name ILIKE $1 OR asset_code ILIKE $1 OR location ILIKE $1
        LIMIT 10
        "#
    )
    .bind(&search_pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Query beneficiaries
    let beneficiaries = sqlx::query_as::<_, SearchItem>(
        r#"
        SELECT id as id, name, 'BENEFICIARY' as item_type, woreda as details
        FROM beneficiaries
        WHERE name ILIKE $1 OR id ILIKE $1 OR woreda ILIKE $1
        LIMIT 10
        "#
    )
    .bind(&search_pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Combine results
    let mut results = Vec::new();
    results.extend(projects);
    results.extend(assets);
    results.extend(beneficiaries);

    Ok(Json(results))
}
