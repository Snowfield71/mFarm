use serde::{Deserialize, Serialize};

/// 游戏存档请求
#[derive(Debug, Deserialize)]
pub struct SaveGameRequest {
    pub player_level: i32,
    pub experience: i32,
    pub gold: i64,
    pub diamond: i32,
    pub land_data: serde_json::Value,        // 地块 JSON
    pub inventory_data: serde_json::Value,   // 物品栏 JSON
    pub unlocked_recipes: Vec<String>,
    pub quest_data: serde_json::Value,       // 任务 JSON
    pub achievement_data: Vec<String>,
    pub total_play_time: i32,
}

/// 游戏存档数据库记录
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct GameSave {
    pub user_id: String,
    pub player_level: i32,
    pub experience: i32,
    pub gold: i64,
    pub diamond: i32,
    pub land_data: String,
    pub inventory_data: String,
    pub unlocked_recipes: String,
    pub quest_data: String,
    pub achievement_data: String,
    pub total_play_time: i32,
    pub updated_at: String,
}

/// 游戏存档响应（序列化后的 JSON）
#[derive(Debug, Serialize)]
pub struct GameSaveResponse {
    pub player_level: i32,
    pub experience: i32,
    pub gold: i64,
    pub diamond: i32,
    pub land_data: serde_json::Value,
    pub inventory_data: serde_json::Value,
    pub unlocked_recipes: Vec<String>,
    pub quest_data: serde_json::Value,
    pub achievement_data: Vec<String>,
    pub total_play_time: i32,
}

impl GameSave {
    /// 转换为 API 响应格式
    pub fn to_response(&self) -> GameSaveResponse {
        GameSaveResponse {
            player_level: self.player_level,
            experience: self.experience,
            gold: self.gold,
            diamond: self.diamond,
            land_data: serde_json::from_str(&self.land_data).unwrap_or_default(),
            inventory_data: serde_json::from_str(&self.inventory_data).unwrap_or_default(),
            unlocked_recipes: serde_json::from_str(&self.unlocked_recipes).unwrap_or_default(),
            quest_data: serde_json::from_str(&self.quest_data).unwrap_or_default(),
            achievement_data: serde_json::from_str(&self.achievement_data).unwrap_or_default(),
            total_play_time: self.total_play_time,
        }
    }
}
