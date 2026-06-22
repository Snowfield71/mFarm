use std::sync::Arc;
use axum::{extract::State, Json};
use crate::{AppState, errors::*, middleware::auth::AuthUser, models::game_data::*};

/// 保存游戏
pub async fn save_game(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<SaveGameRequest>,
) -> AppResult<Json<serde_json::Value>> {
    sqlx::query(
        r#"
        INSERT INTO game_saves (user_id, player_level, experience, gold, diamond,
            land_data, inventory_data, unlocked_recipes, quest_data, achievement_data,
            total_play_time, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            player_level = VALUES(player_level),
            experience = VALUES(experience),
            gold = VALUES(gold),
            diamond = VALUES(diamond),
            land_data = VALUES(land_data),
            inventory_data = VALUES(inventory_data),
            unlocked_recipes = VALUES(unlocked_recipes),
            quest_data = VALUES(quest_data),
            achievement_data = VALUES(achievement_data),
            total_play_time = VALUES(total_play_time),
            updated_at = NOW()
        "#
    )
    .bind(&auth_user.user_id)
    .bind(req.player_level)
    .bind(req.experience)
    .bind(req.gold)
    .bind(req.diamond)
    .bind(req.land_data.to_string())
    .bind(req.inventory_data.to_string())
    .bind(serde_json::to_string(&req.unlocked_recipes).unwrap_or_default())
    .bind(req.quest_data.to_string())
    .bind(serde_json::to_string(&req.achievement_data).unwrap_or_default())
    .bind(req.total_play_time)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    tracing::info!("💾 用户 {} 存档已保存", auth_user.user_id);
    Ok(api_ok(serde_json::json!({ "saved_at": chrono::Utc::now().to_rfc3339() })))
}

/// 加载游戏存档
pub async fn load_game(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    let save = sqlx::query_as::<_, GameSave>(
        "SELECT * FROM game_saves WHERE user_id = ?"
    )
    .bind(&auth_user.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    match save {
        Some(s) => Ok(api_ok(s.to_response())),
        None => Ok(api_ok(serde_json::json!({
            "player_level": 1,
            "experience": 0,
            "gold": 200,
            "diamond": 50,
            "land_data": [],
            "inventory_data": [],
            "unlocked_recipes": [],
            "quest_data": {},
            "achievement_data": [],
            "total_play_time": 0,
        }))),
    }
}

/// 清除游戏存档
pub async fn clear_game(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM game_saves WHERE user_id = ?")
        .bind(&auth_user.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // 重新插入初始存档
    sqlx::query("INSERT INTO game_saves (user_id) VALUES (?)")
        .bind(&auth_user.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(api_ok(serde_json::json!({ "cleared": true })))
}
