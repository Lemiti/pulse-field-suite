use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use crate::api::auth::UserClaims;
use crate::models::{
    BeneficiaryResponse, BeneficiaryDependent, DistributionLedgerEntry,
    CreateBeneficiaryRequest, CreateDistributionRequest,
};

// GET /api/beneficiaries
pub async fn get_beneficiaries(
    State(pool): State<PgPool>,
    _claims: UserClaims,
) -> Result<Json<Vec<BeneficiaryResponse>>, (StatusCode, String)> {
    // 1. Fetch all beneficiaries
    let beneficiaries = sqlx::query!(
        r#"
        SELECT id, name, region, zone, woreda, focus_area, household_size, contact, registration_date, has_duplicate_warning, duplicate_details, age, needs, project_ids, is_pending, source_project_id
        FROM beneficiaries
        ORDER BY registration_date DESC, name ASC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch beneficiaries: {}", e)))?;

    // 2. Fetch all dependents
    let dependents = sqlx::query_as!(
        BeneficiaryDependent,
        r#"
        SELECT id, beneficiary_id, age, vulnerability_notes
        FROM beneficiary_dependents
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch dependents: {}", e)))?;

    // 3. Fetch all distribution ledger entries
    let distributions = sqlx::query!(
        r#"
        SELECT dl.id, dl.beneficiary_id, dl.project_id, p.name as project_name, dl.asset_id, a.name as asset_name, dl.quantity, dl.issued_by_user_id, u.name as issued_by_user_name, dl.issued_at
        FROM distribution_ledger dl
        LEFT JOIN projects p ON dl.project_id = p.id
        LEFT JOIN assets a ON dl.asset_id = a.id
        LEFT JOIN users u ON dl.issued_by_user_id = u.id
        ORDER BY dl.issued_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch distribution ledger: {}", e)))?;

    // 4. Map and construct responses
    let mut responses = Vec::new();
    for b in beneficiaries {
        let b_id = b.id.clone();
        
        let b_dependents: Vec<BeneficiaryDependent> = dependents
            .iter()
            .filter(|d| d.beneficiary_id == b_id)
            .cloned()
            .collect();

        let b_distributions: Vec<DistributionLedgerEntry> = distributions
            .iter()
            .filter(|d| d.beneficiary_id == b_id)
            .map(|d| DistributionLedgerEntry {
                id: d.id,
                beneficiary_id: d.beneficiary_id.clone(),
                project_id: d.project_id,
                project_name: Some(d.project_name.clone()),
                asset_id: d.asset_id,
                asset_name: Some(d.asset_name.clone()),
                quantity: d.quantity,
                issued_by_user_id: d.issued_by_user_id,
                issued_by_user_name: Some(d.issued_by_user_name.clone()),
                issued_at: d.issued_at,
            })
            .collect();

        responses.push(BeneficiaryResponse {
            id: b.id,
            name: b.name,
            region: b.region,
            zone: b.zone,
            woreda: b.woreda,
            focus_area: b.focus_area,
            household_size: b.household_size,
            contact: b.contact,
            registration_date: b.registration_date,
            has_duplicate_warning: b.has_duplicate_warning,
            duplicate_details: b.duplicate_details,
            age: b.age,
            needs: b.needs,
            project_ids: b.project_ids,
            is_pending: b.is_pending,
            source_project_id: b.source_project_id,
            dependents: b_dependents,
            distributions: b_distributions,
        });
    }

    Ok(Json(responses))
}

// POST /api/beneficiaries
pub async fn create_beneficiary(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<CreateBeneficiaryRequest>,
) -> Result<Json<BeneficiaryResponse>, (StatusCode, String)> {
    // Generate a beneficiary ID using UUID fallback.
    let is_pending = claims.role == "FIELD_OFFICER";
    let rand_num = (Uuid::new_v4().as_u128() % 900 + 100) as u16;
    let b_id = if is_pending {
        format!("PEND-{}", rand_num)
    } else {
        format!("BEN-GD-{}", rand_num)
    };

    let registration_date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let project_ids = serde_json::json!([payload.source_project_id]);

    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let beneficiary = sqlx::query!(
        r#"
        INSERT INTO beneficiaries (id, name, region, zone, woreda, focus_area, household_size, contact, registration_date, age, needs, project_ids, is_pending, source_project_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, name, region, zone, woreda, focus_area, household_size, contact, registration_date, has_duplicate_warning, duplicate_details, age, needs, project_ids, is_pending, source_project_id
        "#,
        b_id,
        payload.name,
        payload.region,
        payload.zone,
        payload.woreda,
        payload.focus_area,
        payload.household_size,
        payload.contact,
        registration_date,
        payload.age,
        payload.needs,
        project_ids,
        is_pending,
        Some(payload.source_project_id)
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create beneficiary: {}", e),
        )
    })?;

    // Create a default dependent for demonstration, e.g., if household size > 1
    if payload.household_size > 1 {
        for i in 1..payload.household_size {
            let dep_age = 5 + i * 3;
            let dep_notes = format!("Household dependent #{}", i);
            sqlx::query!(
                r#"
                INSERT INTO beneficiary_dependents (beneficiary_id, age, vulnerability_notes)
                VALUES ($1, $2, $3)
                "#,
                beneficiary.id,
                dep_age,
                dep_notes
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create dependent: {}", e)))?;
        }
    }

    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch newly created beneficiary with dependents
    let dependents = sqlx::query_as!(
        BeneficiaryDependent,
        r#"
        SELECT id, beneficiary_id, age, vulnerability_notes
        FROM beneficiary_dependents
        WHERE beneficiary_id = $1
        "#,
        beneficiary.id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(BeneficiaryResponse {
        id: beneficiary.id,
        name: beneficiary.name,
        region: beneficiary.region,
        zone: beneficiary.zone,
        woreda: beneficiary.woreda,
        focus_area: beneficiary.focus_area,
        household_size: beneficiary.household_size,
        contact: beneficiary.contact,
        registration_date: beneficiary.registration_date,
        has_duplicate_warning: beneficiary.has_duplicate_warning,
        duplicate_details: beneficiary.duplicate_details,
        age: beneficiary.age,
        needs: beneficiary.needs,
        project_ids: beneficiary.project_ids,
        is_pending: beneficiary.is_pending,
        source_project_id: beneficiary.source_project_id,
        dependents,
        distributions: Vec::new(),
    }))
}

// POST /api/beneficiaries/:id/approve
pub async fn approve_beneficiary(
    State(pool): State<PgPool>,
    _claims: UserClaims,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Generate new BEN-GD- ID using UUID fallback
    let rand_num = (Uuid::new_v4().as_u128() % 900 + 100) as u16;
    let new_id = format!("BEN-GD-{}", rand_num);

    // Update ID and set is_pending = false
    sqlx::query!(
        r#"
        UPDATE beneficiaries
        SET id = $1, is_pending = false
        WHERE id = $2
        "#,
        new_id,
        id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to approve beneficiary: {}", e)))?;

    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "success": true,
        "new_id": new_id
    })))
}

// POST /api/beneficiaries/:id/reject
pub async fn reject_beneficiary(
    State(pool): State<PgPool>,
    _claims: UserClaims,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query!("DELETE FROM beneficiaries WHERE id = $1", id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to reject beneficiary: {}", e)))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

// DELETE /api/beneficiaries/:id
pub async fn delete_beneficiary(
    State(pool): State<PgPool>,
    _claims: UserClaims,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query!("DELETE FROM beneficiaries WHERE id = $1", id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete beneficiary: {}", e)))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

// POST /api/beneficiaries/:id/link-project
pub async fn link_project(
    State(pool): State<PgPool>,
    _claims: UserClaims,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let project_id = payload["project_id"]
        .as_str()
        .ok_or((StatusCode::BAD_REQUEST, "Missing project_id".to_string()))?;
    let project_uuid = Uuid::parse_str(project_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid project_id UUID".to_string()))?;

    // Fetch existing project_ids
    let b = sqlx::query!("SELECT project_ids FROM beneficiaries WHERE id = $1", id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to find beneficiary: {}", e)))?;

    let mut project_ids_arr: Vec<String> = serde_json::from_value(b.project_ids).unwrap_or_default();
    if !project_ids_arr.contains(&project_uuid.to_string()) {
        project_ids_arr.push(project_uuid.to_string());
    }

    sqlx::query!(
        "UPDATE beneficiaries SET project_ids = $1 WHERE id = $2",
        serde_json::to_value(project_ids_arr).unwrap(),
        id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to link project: {}", e)))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

// POST /api/beneficiaries/:id/unlink-project
pub async fn unlink_project(
    State(pool): State<PgPool>,
    _claims: UserClaims,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let project_id = payload["project_id"]
        .as_str()
        .ok_or((StatusCode::BAD_REQUEST, "Missing project_id".to_string()))?;
    let project_uuid = Uuid::parse_str(project_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid project_id UUID".to_string()))?;

    // Fetch existing project_ids
    let b = sqlx::query!("SELECT project_ids FROM beneficiaries WHERE id = $1", id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to find beneficiary: {}", e)))?;

    let mut project_ids_arr: Vec<String> = serde_json::from_value(b.project_ids).unwrap_or_default();
    project_ids_arr.retain(|x| x != &project_uuid.to_string());

    sqlx::query!(
        "UPDATE beneficiaries SET project_ids = $1 WHERE id = $2",
        serde_json::to_value(project_ids_arr).unwrap(),
        id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to unlink project: {}", e)))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

// POST /api/distributions
pub async fn create_distribution(
    State(pool): State<PgPool>,
    claims: UserClaims,
    Json(payload): Json<CreateDistributionRequest>,
) -> Result<Json<DistributionLedgerEntry>, (StatusCode, String)> {
    if payload.quantity <= 0 {
        return Err((StatusCode::BAD_REQUEST, "Quantity must be greater than zero".to_string()));
    }

    // 🚀 ATOMIC DATABASE TRANSACTION
    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 1. Decrement the available quantity in assets
    let update_result = sqlx::query!(
        r#"
        UPDATE assets
        SET quantity = quantity - $1
        WHERE id = $2
        RETURNING quantity, name
        "#,
        payload.quantity,
        payload.asset_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error during asset check: {}", e),
        )
    })?;

    let (new_qty, asset_name) = match update_result {
        Some(r) => (r.quantity, r.name),
        None => {
            return Err((StatusCode::BAD_REQUEST, "Asset not found in inventory".to_string()));
        }
    };

    // Rollback if quantity drops below zero
    if new_qty < 0 {
        tx.rollback().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Insufficient stock. Only {} items available.", new_qty + payload.quantity),
        ));
    }

    // 2. Insert into distribution ledger
    let ledger_id = Uuid::new_v4();
    let issued_at = chrono::Utc::now();
    let user_id = claims.sub;

    sqlx::query!(
        r#"
        INSERT INTO distribution_ledger (id, beneficiary_id, project_id, asset_id, quantity, issued_by_user_id, issued_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        ledger_id,
        payload.beneficiary_id,
        payload.project_id,
        payload.asset_id,
        payload.quantity,
        user_id,
        issued_at
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to insert into distribution ledger: {}", e),
        )
    })?;

    // Commit transaction
    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch the project name
    let project = sqlx::query!("SELECT name FROM projects WHERE id = $1", payload.project_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch user name
    let user = sqlx::query!("SELECT name FROM users WHERE id = $1", user_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(DistributionLedgerEntry {
        id: ledger_id,
        beneficiary_id: payload.beneficiary_id,
        project_id: payload.project_id,
        project_name: Some(project.name),
        asset_id: payload.asset_id,
        asset_name: Some(asset_name),
        quantity: payload.quantity,
        issued_by_user_id: user_id,
        issued_by_user_name: Some(user.name),
        issued_at,
    }))
}
