// apps/backend/src/api/countries.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::auth::UserClaims;
use crate::models::CountryResponse;

// GET /api/countries/:country_id
pub async fn get_country(
    State(pool): State<PgPool>,
    _claims: UserClaims, // 🛡️ AUTH GUARD
    Path(country_id): Path<Uuid>,
) -> Result<Json<CountryResponse>, (StatusCode, String)> {
    let country = sqlx::query_as!(
        CountryResponse,
        r#"
        SELECT 
            id, 
            name, 
            currency_code,
            administrative_boundaries
        FROM countries
        WHERE id = $1
        "#,
        country_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Country not found".to_string()))?;

    Ok(Json(country))
}
