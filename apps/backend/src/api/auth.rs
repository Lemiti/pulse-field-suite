// apps/backend/src/api/auth.rs
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

// The data stored inside our JWT token
#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "../../packages/shared-types/src/UserClaims.ts")]
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

// --- MOCK LOGIN ROUTE FOR MVP ---
// In a real app, this verifies a Google OAuth token. 
// For our sprint, it just hands us a dummy token so we can test our API.
pub async fn mock_login() -> String {
    let claims = UserClaims {
        sub: Uuid::new_v4(), // Fake User ID
        country_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(), // Fake Tenant ID
        role: "ADMIN".to_string(),
        exp: 10000000000, // Never expires
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("SUPER_SECRET_MVP_KEY_CHANGE_IN_PROD".as_ref()),
    )
    .unwrap()
}
