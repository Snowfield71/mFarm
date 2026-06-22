use serde::{Deserialize, Serialize};

/// 排行榜条目
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaderboardEntry {
    pub user_id: String,
    pub nickname: String,
    pub avatar_url: String,
    pub score_type: String,
    pub score_value: i64,
    pub updated_at: String,
}

/// 排行榜响应
#[derive(Debug, Serialize)]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
    pub my_rank: Option<RankInfo>,
}

#[derive(Debug, Serialize)]
pub struct RankInfo {
    pub rank: i64,
    pub score: i64,
}

/// 更新分数请求
#[derive(Debug, Deserialize)]
pub struct UpdateScoreRequest {
    pub score_type: String,      // "level" | "gold" | "crafts"
    pub score_value: i64,
}
