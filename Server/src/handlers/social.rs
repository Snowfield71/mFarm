use std::sync::Arc;
use axum::{extract::State, Json};
use chrono::Utc;
use crate::{AppState, errors::*, middleware::auth::AuthUser};

/// 记录分享
pub async fn record_share(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::value::Value>> {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    sqlx::query(
        r#"
        INSERT INTO share_records (user_id, share_date, share_count)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE
            share_count = share_count + 1
        "#
    )
    .bind(&auth_user.user_id)
    .bind(&today)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    // 分享奖励：+50 金币（直接加到存档）
    sqlx::query(
        "UPDATE game_saves SET gold = gold + 50 WHERE user_id = ?"
    )
    .bind(&auth_user.user_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(api_ok(serde_json::json!({
        "reward": 50,
        "reward_type": "gold",
    })))
}

/// 检查每日重置
pub async fn check_daily(
    State(_state): State<Arc<AppState>>,
    _auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    let now = Utc::now();
    let today_date = now.format("%Y-%m-%d").to_string();
    let next_reset = (now.date_naive() + chrono::Duration::days(1))
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp();

    Ok(api_ok(serde_json::json!({
        "today": today_date,
        "server_time": now.timestamp(),
        "next_reset_at": next_reset,
        "is_new_day": false,
    })))
}
