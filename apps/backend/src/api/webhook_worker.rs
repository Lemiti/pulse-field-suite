// apps/backend/src/api/webhook_worker.rs
use std::time::Duration;
use sqlx::PgPool;
use chrono::{Utc, Duration as ChronoDuration};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::models::WebhookDeliveryQueueItem;
use crate::api::auth::AdminClaims;

/// Runs as a background task to process pending webhooks in the queue.
pub async fn run_webhook_worker(pool: PgPool) {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    tracing::info!("🚀 Webhook background worker started!");

    loop {
        tokio::time::sleep(Duration::from_secs(5)).await;

        // Fetch pending webhooks where next_attempt_at <= NOW()
        let pending_webhooks = match sqlx::query_as!(
            WebhookDeliveryQueueItem,
            r#"
            SELECT id, payload, retry_count, next_attempt_at, status, created_at
            FROM webhook_delivery_queue
            WHERE status = 'PENDING' AND next_attempt_at <= CURRENT_TIMESTAMP
            "#
        )
        .fetch_all(&pool)
        .await {
            Ok(items) => items,
            Err(e) => {
                tracing::error!("Failed to fetch pending webhooks: {}", e);
                continue;
            }
        };

        for webhook in pending_webhooks {
            let webhook_url = std::env::var("WEBHOOK_URL")
                .unwrap_or_else(|_| "http://localhost:9999/mock-webhook".to_string());

            tracing::info!("Attempting to dispatch webhook {} to {}", webhook.id, webhook_url);

            let success = match client.post(&webhook_url)
                .json(&webhook.payload)
                .send()
                .await {
                    Ok(resp) => {
                        let status = resp.status();
                        if status.is_success() {
                            true
                        } else {
                            tracing::warn!("Webhook {} failed with HTTP status {}", webhook.id, status);
                            false
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Webhook {} failed to send: {}", webhook.id, e);
                        false
                    }
                };

            if success {
                let update_res = sqlx::query!(
                    r#"
                    UPDATE webhook_delivery_queue
                    SET status = 'SUCCESS'
                    WHERE id = $1
                    "#,
                    webhook.id
                )
                .execute(&pool)
                .await;
                
                if let Err(e) = update_res {
                    tracing::error!("Failed to update success status for webhook {}: {}", webhook.id, e);
                } else {
                    tracing::info!("Webhook {} dispatched successfully", webhook.id);
                }
            } else {
                let new_retry_count = webhook.retry_count + 1;
                let update_res = if new_retry_count >= 5 {
                    // Mark as FAILED after 5 attempts
                    sqlx::query!(
                        r#"
                        UPDATE webhook_delivery_queue
                        SET status = 'FAILED', retry_count = $1, next_attempt_at = NULL
                        WHERE id = $2
                        "#,
                        new_retry_count,
                        webhook.id
                    )
                    .execute(&pool)
                    .await
                } else {
                    // Exponential backoff: 10s * 2^retry_count
                    let backoff_secs = 10 * 2_i32.pow(new_retry_count as u32);
                    let next_attempt = Utc::now() + ChronoDuration::seconds(backoff_secs as i64);
                    sqlx::query!(
                        r#"
                        UPDATE webhook_delivery_queue
                        SET retry_count = $1, next_attempt_at = $2
                        WHERE id = $3
                        "#,
                        new_retry_count,
                        next_attempt,
                        webhook.id
                    )
                    .execute(&pool)
                    .await
                };

                if let Err(e) = update_res {
                    tracing::error!("Failed to update failure status for webhook {}: {}", webhook.id, e);
                }
            }
        }
    }
}

/// GET /api/developer/webhooks
/// Returns all webhook delivery attempts ordered by creation time.
pub async fn get_webhooks(
    State(pool): State<PgPool>,
    _claims: AdminClaims, // 🛡️ AUTH GUARD: Admin role required
) -> Result<Json<Vec<WebhookDeliveryQueueItem>>, (StatusCode, String)> {
    let webhooks = sqlx::query_as!(
        WebhookDeliveryQueueItem,
        r#"
        SELECT id, payload, retry_count, next_attempt_at, status, created_at
        FROM webhook_delivery_queue
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(webhooks))
}

/// POST /api/developer/webhooks/:id/retry
/// Manually schedules a failed or success webhook to retry immediately.
pub async fn retry_webhook(
    State(pool): State<PgPool>,
    _claims: AdminClaims, // 🛡️ AUTH GUARD: Admin role required
    Path(webhook_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query!(
        r#"
        UPDATE webhook_delivery_queue
        SET status = 'PENDING', retry_count = 0, next_attempt_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
        webhook_id
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}
