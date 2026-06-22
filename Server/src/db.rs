use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

/// 初始化数据库连接池
pub async fn init_pool(database_url: &str) -> anyhow::Result<MySqlPool> {
    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    tracing::info!("✅ 数据库连接成功");
    Ok(pool)
}

/// 运行数据库迁移（逐条执行 SQL 语句）
pub async fn run_migrations(pool: &MySqlPool) -> anyhow::Result<()> {
    let sql = include_str!("../migrations/001_init.sql");

    // 按分号分割，过滤空语句
    for stmt in sql.split(';') {
        let trimmed = stmt.trim();
        if trimmed.is_empty() || trimmed.starts_with("--") {
            continue;
        }
        sqlx::query(trimmed).execute(pool).await?;
    }

    tracing::info!("✅ 数据库迁移完成");
    Ok(())
}
