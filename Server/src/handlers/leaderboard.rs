use std::sync::Arc;
use axum::{extract::{Query, State}, Json};
use serde::Deserialize;
use crate::{AppState, errors::*, middleware::auth::AuthUser, models::leaderboard::*};

/// 排行榜查询参数
#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    score_type: Option<String>,    // 默认 "level"
    limit: Option<i64>,            // 默认 50
}

/// 获取排行榜
pub async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(query): Query<LeaderboardQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let score_type = query.score_type.unwrap_or_else(|| "level".into());
    let limit = query.limit.unwrap_or(50).min(100);

    // 查询排行榜 TOP N
    let entries = sqlx::query_as::<_, LeaderboardEntry>(
        r#"
        SELECT l.user_id, u.nickname, u.avatar_url,
               l.score_type, l.score_value, l.updated_at
        FROM leaderboard l
        JOIN users u ON l.user_id = u.id
        WHERE l.score_type = ?
        ORDER BY l.score_value DESC
        LIMIT ?
        "#
    )
    .bind(&score_type)
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    // 查询自己的排名
    let my_rank = sqlx::query_as::<_, (i64, i64)>(
        r#"
        SELECT rank, score_value FROM (
            SELECT user_id, score_value,
                   ROW_NUMBER() OVER (ORDER BY score_value DESC) as rank
            FROM leaderboard
            WHERE score_type = ?
        ) WHERE user_id = ?
        "#
    )
    .bind(&score_type)
    .bind(&auth_user.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let my_rank_info = my_rank.map(|(rank, score)| RankInfo {
        rank,
        score,
    });

    Ok(api_ok(LeaderboardResponse {
        entries,
        my_rank: my_rank_info,
    }))
}

/// 更新分数
pub async fn update_score(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<UpdateScoreRequest>,
) -> AppResult<Json<serde_json::Value>> {
    if !["level", "gold", "crafts"].contains(&req.score_type.as_str()) {
        return Err(AppError::BadRequest("无效的排行榜类型".into()));
    }

    sqlx::query(
        r#"
        INSERT INTO leaderboard (user_id, score_type, score_value, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            score_value = GREATEST(VALUES(score_value), score_value),
            updated_at = NOW()
        "#
    )
    .bind(&auth_user.user_id)
    .bind(&req.score_type)
    .bind(req.score_value)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(api_ok(serde_json::json!({ "updated": true })))
}
