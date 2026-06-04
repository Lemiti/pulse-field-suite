// apps/backend/src/api/auth.rs
use axum::{
    async_trait,
    extract::{FromRequestParts, Query},
    http::{request::Parts, StatusCode},
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

// The data stored inside our JWT token
#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "../../../packages/shared-types/src/UserClaims.ts")]
pub struct UserClaims {
    pub sub: Uuid,        // User ID
    pub country_id: Uuid, // Tenant ID (For Multi-Tenancy)
    pub role: String,     // 'ADMIN', 'PROJECT_MANAGER', 'FIELD_OFFICER', 'DONOR'
    pub exp: usize,       // Expiration time
}

// Axum Extractor: This automatically runs on any route that requests `claims: UserClaims`
#[async_trait]
impl<S> FromRequestParts<S> for UserClaims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract the Authorization header
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|val| val.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing Authorization header"))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((StatusCode::UNAUTHORIZED, "Invalid Authorization header format"));
        }

        let token = &auth_header["Bearer ".len()..];

        // Decode the JWT (Using a hardcoded secret for the 9-day MVP)
        let secret = "SUPER_SECRET_MVP_KEY_CHANGE_IN_PROD";
        let token_data = decode::<UserClaims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &Validation::default(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid or expired token"))?;

        Ok(token_data.claims)
    }
}

#[derive(Debug, Deserialize)]
pub struct MockLoginQuery {
    pub role: Option<String>,
    pub country_id: Option<String>,
}

// --- MOCK LOGIN ROUTE FOR MVP ---
pub async fn mock_login(Query(params): Query<MockLoginQuery>) -> String {
    let country_id = params
        .country_id
        .as_deref()
        .and_then(|id| Uuid::parse_str(id).ok())
        .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());

    let role = params.role.unwrap_or_else(|| "ADMIN".to_string());

    let sub = user_id_for_role(&role);

    let claims = UserClaims {
        sub,
        country_id,
        role,
        exp: 10000000000,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("SUPER_SECRET_MVP_KEY_CHANGE_IN_PROD".as_ref()),
    )
    .unwrap()
}

/// Maps mock-login roles to seeded `users.id` rows (FK-safe for messages, audit logs, media).
fn user_id_for_role(role: &str) -> Uuid {
    match role {
        "ADMIN" => Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000001").unwrap(),
        "PROJECT_MANAGER" => Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000002").unwrap(),
        "FIELD_OFFICER" => Uuid::parse_str("11111111-0000-0000-0000-000000000001").unwrap(),
        "DONOR" => Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000003").unwrap(),
        _ => Uuid::parse_str("11111111-0000-0000-0000-000000000001").unwrap(),
    }
}
