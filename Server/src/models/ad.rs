use serde::{Deserialize, Serialize};

/// 广告观看记录请求
#[derive(Debug, Deserialize)]
pub struct AdRecordRequest {
    pub reward_type: String,     // 激励类型
}

/// 广告状态响应
#[derive(Debug, Serialize)]
pub struct AdStatusResponse {
    pub today_watches: i32,           // 今日总观看次数
    pub max_daily_watches: i32,        // 每日上限
    pub lifetime_watches: i32,         // 终身累计
    pub daily_rewards: Vec<DailyRewardStatus>,  // 各奖励剩余次数
}

#[derive(Debug, Serialize)]
pub struct DailyRewardStatus {
    pub reward_type: String,
    pub today_count: i32,
    pub daily_limit: i32,
    pub remaining: i32,
}

/// 广告观看数据库记录
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AdRecord {
    pub id: i64,
    pub user_id: String,
    pub reward_type: String,
    pub watch_date: String,
    pub watch_count: i32,
    pub lifetime_count: i32,
    pub last_watch_at: String,
}
