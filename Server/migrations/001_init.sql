-- 萌田农场 数据库初始化 (MySQL)
-- 注意: 需先 CREATE DATABASE moefarm;

CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(36) PRIMARY KEY,
    wx_open_id      VARCHAR(128) NOT NULL UNIQUE,
    wx_union_id     VARCHAR(128),
    nickname        VARCHAR(64) NOT NULL DEFAULT '萌田农场主',
    avatar_url      VARCHAR(256) NOT NULL DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT NOW(),
    last_login_at   DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_saves (
    user_id          VARCHAR(36) PRIMARY KEY,
    player_level     INT NOT NULL DEFAULT 1,
    experience       INT NOT NULL DEFAULT 0,
    gold             BIGINT NOT NULL DEFAULT 200,
    diamond          INT NOT NULL DEFAULT 50,
    land_data        JSON NOT NULL DEFAULT ('[]'),
    inventory_data   JSON NOT NULL DEFAULT ('[]'),
    unlocked_recipes JSON NOT NULL DEFAULT ('[]'),
    quest_data       JSON NOT NULL DEFAULT ('{}'),
    achievement_data JSON NOT NULL DEFAULT ('[]'),
    total_play_time  INT NOT NULL DEFAULT 0,
    updated_at       DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leaderboard (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    score_type      VARCHAR(32) NOT NULL DEFAULT 'level',
    score_value     BIGINT NOT NULL DEFAULT 0,
    updated_at      DATETIME NOT NULL DEFAULT NOW(),
    UNIQUE KEY uk_user_score (user_id, score_type),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ad_records (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    reward_type     VARCHAR(64) NOT NULL,
    watch_date      DATE NOT NULL,
    watch_count     INT NOT NULL DEFAULT 0,
    lifetime_count  INT NOT NULL DEFAULT 0,
    last_watch_at   DATETIME NOT NULL DEFAULT NOW(),
    UNIQUE KEY uk_user_reward_date (user_id, reward_type, watch_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS share_records (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    share_date      DATE NOT NULL,
    share_count     INT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_user_share_date (user_id, share_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 索引由 UNIQUE KEY / FOREIGN KEY 自动创建，无需额外建索引
