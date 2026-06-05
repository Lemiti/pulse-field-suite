// apps/backend/src/api/auth.rs
use axum::{
    async_trait,
    extract::{FromRequestParts, Query, State, Path},
    http::{request::Parts, StatusCode},
    Json,
};
use sqlx::PgPool;
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

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AdminClaims(pub UserClaims);

#[async_trait]
impl<S> FromRequestParts<S> for AdminClaims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let claims = UserClaims::from_request_parts(parts, state)
            .await
            .map_err(|(code, msg)| (code, msg.to_string()))?;

        if claims.role.to_uppercase() != "ADMIN" {
            return Err((StatusCode::FORBIDDEN, "Access Denied: Admin role required".to_string()));
        }

        Ok(AdminClaims(claims))
    }
}

#[derive(Debug, Clone)]
pub struct PmOrAdminClaims(pub UserClaims);

#[async_trait]
impl<S> FromRequestParts<S> for PmOrAdminClaims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let claims = UserClaims::from_request_parts(parts, state)
            .await
            .map_err(|(code, msg)| (code, msg.to_string()))?;

        let role_upper = claims.role.to_uppercase();
        if role_upper != "PROJECT_MANAGER" && role_upper != "ADMIN" {
            return Err((StatusCode::FORBIDDEN, "Access Denied: Project Manager or Admin role required".to_string()));
        }

        Ok(PmOrAdminClaims(claims))
    }
}

#[derive(Debug, Clone)]
pub struct StaffClaims(pub UserClaims);

#[async_trait]
impl<S> FromRequestParts<S> for StaffClaims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let claims = UserClaims::from_request_parts(parts, state)
            .await
            .map_err(|(code, msg)| (code, msg.to_string()))?;

        let role_upper = claims.role.to_uppercase();
        if role_upper != "FIELD_OFFICER" && role_upper != "PROJECT_MANAGER" && role_upper != "ADMIN" {
            return Err((StatusCode::FORBIDDEN, "Access Denied: Authorized personnel only".to_string()));
        }

        Ok(StaffClaims(claims))
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

// --- TRADITIONAL AUTH REQUEST & RESPONSE MODELS ---

#[derive(Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/SignupRequest.ts")]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: String, // 'ADMIN', 'PROJECT_MANAGER', 'FIELD_OFFICER', 'DONOR'
    pub country_id: Uuid,
}

#[derive(Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/LoginRequest.ts")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/ChangePasswordRequest.ts")]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

#[derive(Serialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/LoginResponse.ts")]
pub struct LoginResponse {
    pub token: String,
    pub user_id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub country_id: Uuid,
}

// --- SIGNUP HANDLER ---
pub async fn signup(
    State(pool): State<PgPool>,
    Json(payload): Json<SignupRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    // 1. Hash password with bcrypt
    let hashed = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Hashing failed: {}", e)))?;

    // 2. Validate role is one of: ADMIN, PROJECT_MANAGER, FIELD_OFFICER, DONOR
    let role_upper = payload.role.to_uppercase();
    if role_upper != "ADMIN" && role_upper != "PROJECT_MANAGER" && role_upper != "FIELD_OFFICER" && role_upper != "DONOR" {
        return Err((StatusCode::BAD_REQUEST, "Invalid role".to_string()));
    }

    // 3. Check if email already exists
    let exists = sqlx::query!(
        "SELECT 1 as x FROM users WHERE email = $1",
        payload.email
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if exists.is_some() {
        return Err((StatusCode::BAD_REQUEST, "Email already registered".to_string()));
    }

    // 4. Insert user
    let user = sqlx::query!(
        r#"
        INSERT INTO users (country_id, name, email, role, password_hash)
        VALUES ($1, $2, $3, $4::text::user_role, $5)
        RETURNING id, name, email, role as "role: String", country_id
        "#,
        payload.country_id,
        payload.name,
        payload.email,
        role_upper,
        hashed
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 5. Generate token (valid for 7 days)
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .map(|dt| dt.timestamp() as usize)
        .unwrap_or(10000000000);

    let claims = UserClaims {
        sub: user.id,
        country_id: user.country_id,
        role: user.role.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("SUPER_SECRET_MVP_KEY_CHANGE_IN_PROD".as_ref()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Token generation failed: {}", e)))?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        country_id: user.country_id,
    }))
}

// --- LOGIN HANDLER ---
pub async fn login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    // 1. Fetch user by email
    let user = sqlx::query!(
        r#"
        SELECT id, name, email, role as "role: String", country_id, password_hash
        FROM users
        WHERE email = $1
        "#,
        payload.email
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "Invalid email or password".to_string()))?;

    // 2. Verify password with bcrypt
    let matches = bcrypt::verify(&payload.password, &user.password_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Verification failed: {}", e)))?;

    if !matches {
        return Err((StatusCode::UNAUTHORIZED, "Invalid email or password".to_string()));
    }

    // 3. Generate token
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .map(|dt| dt.timestamp() as usize)
        .unwrap_or(10000000000);

    let claims = UserClaims {
        sub: user.id,
        country_id: user.country_id,
        role: user.role.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("SUPER_SECRET_MVP_KEY_CHANGE_IN_PROD".as_ref()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Token generation failed: {}", e)))?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        country_id: user.country_id,
    }))
}

// --- CHANGE PASSWORD HANDLER ---
pub async fn change_password(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<Json<String>, (StatusCode, String)> {
    // 1. Fetch user's current password hash
    let user = sqlx::query!(
        "SELECT password_hash FROM users WHERE id = $1",
        claims.sub
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    // 2. Verify old password
    let matches = bcrypt::verify(&payload.old_password, &user.password_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Verification failed: {}", e)))?;

    if !matches {
        return Err((StatusCode::BAD_REQUEST, "Incorrect old password".to_string()));
    }

    // 3. Hash new password
    let new_hashed = bcrypt::hash(&payload.new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Hashing failed: {}", e)))?;

    // 4. Update database record
    sqlx::query!(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        new_hashed,
        claims.sub
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json("Password updated successfully".to_string()))
}

#[derive(Serialize, TS, Debug)]
#[ts(export, export_to = "../../../packages/shared-types/src/CurrentUserResponse.ts")]
pub struct CurrentUserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub country_id: Uuid,
    pub country_name: String,
}

pub async fn get_current_user(
    State(pool): State<PgPool>,
    claims: UserClaims,
) -> Result<Json<CurrentUserResponse>, (StatusCode, String)> {
    let user = sqlx::query!(
        r#"
        SELECT u.id, u.name, u.email, u.role as "role: String", u.country_id, c.name as country_name
        FROM users u
        JOIN countries c ON u.country_id = c.id
        WHERE u.id = $1
        "#,
        claims.sub
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(CurrentUserResponse {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        country_id: user.country_id,
        country_name: user.country_name,
    }))
}

