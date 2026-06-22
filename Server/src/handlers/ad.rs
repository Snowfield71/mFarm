use std::sync::Arc;
use axum::{extract::State, Json};
use chrono::Utc;
use crate::{AppState, errors::*, middleware::auth::AuthUser, models::ad::*};

/// 各激励类型的每日上限
const DAILY_LIMITS: &[(&str, i32)] = &[
    ("crop_speedup", 10),
    ("craft_speedup", 10),
    ("double_harvest", 5),
    ("gold_boost", 5),
    ("diamond_reward", 5),
    ("mystery_box", 3),
    ("free_seed", 3),
    ("early_unlock_crop", 3),
];

/// 记录广告观看
pub async fn record_ad_watch(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<AdRecordRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // 验证激励类型是否存在
    let limit = DAILY_LIMITS.iter()
        .find(|(name, _)| *name == req.reward_type)
        .map(|(_, limit)| *limit)
        .ok_or_else(|| AppError::BadRequest("无效的激励类型".into()))?;

    // 检查今日已观看次数
    let record = sqlx::query_as::<_, AdRecord>(
        r#"
        SELECT * FROM ad_records
        WHERE user_id = ? AND reward_type = ? AND watch_date = ?
        "#
    )
    .bind(&auth_user.user_id)
    .bind(&req.reward_type)
    .bind(&today)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let current_count = record.as_ref().map(|r| r.watch_count).unwrap_or(0);

    if current_count >= limit {
        return Err(AppError::DailyLimitReached);
    }

    // 获取终身累计次数
    let lifetime = sqlx::query_scalar::<_, i32>(
        "SELECT COALESCE(lifetime_count, 0) FROM ad_records WHERE user_id = ? AND reward_type = ? ORDER BY watch_date DESC LIMIT 1"
    )
    .bind(&auth_user.user_id)
    .bind(&req.reward_type)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
    .unwrap_or(0);

    // 插入或更新记录
    sqlx::query(
        r#"
        INSERT INTO ad_records (user_id, reward_type, watch_date, watch_count, lifetime_count)
        VALUES (?, ?, ?, 1, ?)
        ON DUPLICATE KEY UPDATE
            watch_count = watch_count + 1,
            lifetime_count = lifetime_count + 1,
            last_watch_at = NOW()
        "#
    )
    .bind(&auth_user.user_id)
    .bind(&req.reward_type)
    .bind(&today)
    .bind(lifetime + 1)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(api_ok(serde_json::json!({
        "recorded": true,
        "today_count": current_count + 1,
        "daily_limit": limit,
    })))
}

/// 获取广告状态
pub async fn get_ad_status(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // 查询今日所有广告记录
    let today_records = sqlx::query_as::<_, AdRecord>(
        "SELECT * FROM ad_records WHERE user_id = ? AND watch_date = ?"
    )
    .bind(&auth_user.user_id)
    .bind(&today)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    // 查询总累计次数
    let lifetime_total: i32 = sqlx::query_scalar::<_, i32>(
        "SELECT COALESCE(SUM(watch_count), 0) FROM ad_records WHERE user_id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let today_total: i32 = today_records.iter().map(|r| r.watch_count).sum();

    let mut daily_rewards: Vec<DailyRewardStatus> = DAILY_LIMITS.iter()
        .map(|(reward_type, limit)| {
            let count = today_records.iter()
                .find(|r| r.reward_type == *reward_type)
                .map(|r| r.watch_count)
                .unwrap_or(0);
            DailyRewardStatus {
                reward_type: reward_type.to_string(),
                today_count: count,
                daily_limit: *limit,
                remaining: (*limit - count).max(0),
            }
        })
        .collect();

    daily_rewards.sort_by(|a, b| a.reward_type.cmp(&b.reward_type));

    Ok(api_ok(AdStatusResponse {
        today_watches: today_total,
        max_daily_watches: 20,
        lifetime_watches: lifetime_total,
        daily_rewards,
    }))
}
