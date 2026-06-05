use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use rust_decimal::prelude::ToPrimitive;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::api::auth::UserClaims;
use crate::models::{
    DashboardSummary, GlobalMetrics, ProjectResponse, ProjectStatus, ProjectFocusArea,
    ActionItem, ActivityFeedEntry,
};

// GET /api/dashboard/summary
pub async fn get_dashboard_summary(
    State(pool): State<PgPool>,
    claims: UserClaims,
) -> Result<Json<DashboardSummary>, (StatusCode, String)> {

    // 1. Fetch ALL non-template projects for global metrics calculation
    let all_projects = sqlx::query!(
        r#"
        SELECT
            CASE
                WHEN p.status = 'DRAFT'::project_status THEN 'DRAFT'::project_status
                WHEN task_rollup.task_count > 0 AND task_rollup.completed_count = task_rollup.task_count
                    THEN 'COMPLETED'::project_status
                WHEN task_rollup.active_count > 0
                    THEN 'IN_PROGRESS'::project_status
                ELSE 'PLANNING'::project_status
            END as "status!: ProjectStatus",
            p.budget_allocated as "budget_allocated!",
            p.budget_spent as "budget_spent!",
            CASE
                WHEN task_rollup.total_days > 0
                    THEN (task_rollup.completed_days::float8 / task_rollup.total_days::float8) * 100.0
                ELSE 0.0
            END as "progress_percentage!"
        FROM projects p
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) as task_count,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
                COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'COMPLETED')) as active_count,
                COALESCE(SUM(COALESCE(GREATEST(end_date - start_date + 1, 1), 1)), 0) as total_days,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(GREATEST(end_date - start_date + 1, 1), 1) ELSE 0 END), 0) as completed_days
            FROM tasks
            WHERE project_id = p.id
        ) task_rollup ON TRUE
        WHERE p.country_id = $1 AND p.is_template = FALSE
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut active_projects_count = 0;
    let mut total_budget_allocated = 0.0;
    let mut total_budget_spent = 0.0;
    let mut sum_progress = 0.0;
    let count = all_projects.len() as f64;

    for proj in &all_projects {
        let status = proj.status;
        if status != ProjectStatus::COMPLETED && status != ProjectStatus::DRAFT {
            active_projects_count += 1;
        }
        total_budget_allocated += proj.budget_allocated.to_f64().unwrap_or(0.0);
        total_budget_spent += proj.budget_spent.to_f64().unwrap_or(0.0);
        sum_progress += proj.progress_percentage;
    }

    let average_progress_percentage = if count > 0.0 {
        sum_progress / count
    } else {
        0.0
    };

    let global_metrics = GlobalMetrics {
        active_projects_count,
        total_budget_allocated,
        total_budget_spent,
        average_progress_percentage,
    };

    // 2. Fetch the 4 most recently updated projects
    let recent_projects = sqlx::query_as!(
        ProjectResponse,
        r#"
        SELECT
            p.id,
            p.country_id,
            p.name,
            p.description,
            p.budget_allocated as "budget_allocated!",
            p.budget_spent as "budget_spent!",
            CASE
                WHEN p.status = 'DRAFT'::project_status THEN 'DRAFT'::project_status
                WHEN task_rollup.task_count > 0 AND task_rollup.completed_count = task_rollup.task_count
                    THEN 'COMPLETED'::project_status
                WHEN task_rollup.active_count > 0
                    THEN 'IN_PROGRESS'::project_status
                ELSE 'PLANNING'::project_status
            END as "status!: ProjectStatus",
            p.funding_sources,
            p.focus_area as "focus_area: ProjectFocusArea",
            p.location_metadata,
            CASE
                WHEN task_rollup.total_days > 0
                    THEN (task_rollup.completed_days::float8 / task_rollup.total_days::float8) * 100.0
                ELSE 0.0
            END as "progress_percentage!",
            p.is_template,
            p.start_date,
            p.end_date,
            p.sector_type,
            p.risks_and_mitigations,
            p.assumptions,
            p.outcomes_and_indicators,
            p.total_income,
            p.donor_name
        FROM projects p
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) as task_count,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
                COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'COMPLETED')) as active_count,
                COALESCE(SUM(COALESCE(GREATEST(end_date - start_date + 1, 1), 1)), 0) as total_days,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(GREATEST(end_date - start_date + 1, 1), 1) ELSE 0 END), 0) as completed_days
            FROM tasks
            WHERE project_id = p.id
        ) task_rollup ON TRUE
        WHERE p.country_id = $1 AND p.is_template = FALSE
        ORDER BY p.created_at DESC
        LIMIT 4
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Fetch action items (un-dismissed alerts + pending approvals)
    let raw_alerts = sqlx::query!(
        r#"
        SELECT 
            a.id, 
            a.project_id, 
            p.name as project_name,
            a.message, 
            a.severity, 
            a.created_at as "created_at!"
        FROM alerts a
        JOIN projects p ON a.project_id = p.id
        WHERE p.country_id = $1 AND a.dismissed = FALSE
        ORDER BY a.created_at DESC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut action_items = raw_alerts.into_iter().map(|a| {
        ActionItem {
            id: a.id,
            project_id: a.project_id,
            project_name: a.project_name,
            item_type: "ALERT".to_string(),
            message: a.message,
            severity: a.severity,
            created_at: a.created_at,
        }
    }).collect::<Vec<_>>();

    // Approvals: tasks in the tenant's projects with status = 'ANALYSIS'
    let raw_approvals = sqlx::query!(
        r#"
        SELECT
            t.id,
            t.project_id,
            p.name as project_name,
            t.name as task_name,
            t.updated_at as "created_at!"
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.country_id = $1 AND t.status = 'ANALYSIS'::task_status
        ORDER BY t.updated_at DESC
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let approval_items = raw_approvals.into_iter().map(|t| {
        ActionItem {
            id: t.id,
            project_id: t.project_id,
            project_name: t.project_name,
            item_type: "APPROVAL".to_string(),
            message: format!("Task approval required: {}", t.task_name),
            severity: "MEDIUM".to_string(),
            created_at: t.created_at,
        }
    });

    action_items.extend(approval_items);
    action_items.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // 4. Fetch the 5 most recent activity entries (audit_logs + field_logs)
    let raw_activities = sqlx::query!(
        r#"
        SELECT 
            id as "id!",
            project_id as "project_id!",
            project_name as "project_name!",
            user_id as "user_id!",
            user_name as "user_name!",
            activity_type as "activity_type!",
            content as "content!",
            created_at as "created_at!"
        FROM (
            SELECT 
                al.id,
                al.project_id,
                p.name as project_name,
                al.user_id,
                u.name as user_name,
                'AUDIT' as activity_type,
                al.action as content,
                al.created_at
            FROM audit_logs al
            JOIN users u ON al.user_id = u.id
            JOIN projects p ON al.project_id = p.id
            WHERE p.country_id = $1

            UNION ALL

            SELECT 
                fl.id,
                fl.project_id,
                p.name as project_name,
                fl.author_id as user_id,
                u.name as user_name,
                'FIELD_LOG' as activity_type,
                fl.content,
                fl.created_at
            FROM field_logs fl
            JOIN users u ON fl.author_id = u.id
            JOIN projects p ON fl.project_id = p.id
            WHERE p.country_id = $1
        ) combined
        ORDER BY created_at DESC
        LIMIT 5
        "#,
        claims.country_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let activity_feed = raw_activities.into_iter().map(|act| {
        ActivityFeedEntry {
            id: act.id,
            project_id: act.project_id,
            project_name: act.project_name,
            user_id: act.user_id,
            user_name: act.user_name,
            activity_type: act.activity_type,
            content: act.content,
            created_at: act.created_at,
        }
    }).collect::<Vec<_>>();

    Ok(Json(DashboardSummary {
        global_metrics,
        recent_projects,
        action_items,
        activity_feed,
    }))
}
