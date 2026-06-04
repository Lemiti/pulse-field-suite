use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use rust_decimal::prelude::ToPrimitive;

use crate::api::auth::UserClaims;
use crate::models::{ReportSummaryResponse, BvaProjectSummary, ImpactMetricSummary};

// GET /api/reports/summary
pub async fn get_report_summary(
    State(pool): State<PgPool>,
    claims: UserClaims,
) -> Result<Json<ReportSummaryResponse>, (StatusCode, String)> {
    
    // 1. Fetch BVA summary (Budget vs Actuals)
    let raw_bva = sqlx::query!(
        r#"
        SELECT
            p.id as project_id,
            p.name as project_name,
            p.budget_allocated as "budget_allocated!",
            p.budget_spent as "budget_spent!"
        FROM projects p
        WHERE p.country_id = $1
        ORDER BY p.name ASC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let bva_summary = raw_bva.into_iter().map(|p| {
        let budget_allocated = p.budget_allocated.to_f64().unwrap_or(0.0);
        let budget_spent = p.budget_spent.to_f64().unwrap_or(0.0);
        let variance = budget_allocated - budget_spent;
        let utilization_percentage = if budget_allocated > 0.0 {
            (budget_spent / budget_allocated) * 100.0
        } else {
            0.0
        };
        BvaProjectSummary {
            project_id: p.project_id,
            project_name: p.project_name,
            budget_allocated,
            budget_spent,
            variance,
            utilization_percentage,
        }
    }).collect::<Vec<_>>();

    // 2. Fetch KPI / Impact Metrics summary
    let raw_impact = sqlx::query!(
        r#"
        SELECT
            p.name as project_name,
            gmt.code as metric_code,
            gmt.display_name as metric_name,
            pim.target_value as "target_value!",
            pim.current_value as "current_value!",
            gmt.unit as unit
        FROM project_impact_metrics pim
        JOIN projects p ON pim.project_id = p.id
        JOIN global_metric_templates gmt ON pim.metric_template_id = gmt.id
        WHERE p.country_id = $1
        ORDER BY p.name ASC, gmt.display_name ASC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let impact_summary = raw_impact.into_iter().map(|m| {
        let target = m.target_value as f64;
        let current = m.current_value as f64;
        let progress_percentage = if target > 0.0 {
            (current / target) * 100.0
        } else {
            0.0
        };
        ImpactMetricSummary {
            project_name: m.project_name,
            metric_code: m.metric_code,
            metric_name: m.metric_name,
            target_value: m.target_value,
            current_value: m.current_value,
            unit: m.unit,
            progress_percentage,
        }
    }).collect::<Vec<_>>();

    Ok(Json(ReportSummaryResponse {
        bva_summary,
        impact_summary,
    }))
}
