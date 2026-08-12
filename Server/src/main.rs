pub mod db;
pub mod errors;
pub mod models;
pub mod config;
pub mod handlers;
pub mod middleware;

use std::sync::Arc;
use axum::{Router, routing::{get, post}};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tower_http::services::ServeDir;
use tracing_subscriber::EnvFilter;

pub struct AppState {
    pub db: sqlx::MySqlPool,
    pub config: config::AppConfig,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志（默认显示 info 级别，可通过 RUST_LOG 覆盖）
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info"))
        )
        .init();

    // 加载环境变量
    dotenvy::dotenv().ok();
    let config = config::AppConfig::from_env();

    // 初始化数据库
    let db = db::init_pool(&config.database_url).await?;
    db::run_migrations(&db).await?;

    let server_host = config.server_host.clone();
    let server_port = config.server_port;

    // 解析静态资源目录为绝对路径
    // Resolve once at startup and fail fast instead of silently returning 404
    // for every image when launched from a different working directory.
    let abs_assets = config::resolve_static_dir(&config.static_dir)?;
    tracing::info!("serving static assets from {}", abs_assets.display());

    let state = Arc::new(AppState { db, config });

    // 构建 CORS 层 — 允许任何来源的跨域请求
    let cors = CorsLayer::new()
        .allow_origin(Any)                         // 允许任意 origin
        .allow_methods(Any)                        // 允许任意 HTTP 方法 (含 OPTIONS)
        .allow_headers(Any)                        // 允许任意请求头
        .expose_headers(Any);                      // 暴露所有响应头

    // 构建路由
    let app = Router::new()
        // 静态资源服务（图片等）
        .nest_service("/assets", ServeDir::new(&abs_assets))
        // API 路由
        .route("/api/auth/wx_login", post(handlers::auth::wx_login))
        .route("/api/auth/refresh", post(handlers::auth::refresh_token))
        .route("/api/game/save", post(handlers::game::save_game))
        .route("/api/game/load", get(handlers::game::load_game))
        .route("/api/game/clear", post(handlers::game::clear_game))
        .route("/api/leaderboard", get(handlers::leaderboard::get_leaderboard))
        .route("/api/leaderboard/update", post(handlers::leaderboard::update_score))
        .route("/api/ad/record", post(handlers::ad::record_ad_watch))
        .route("/api/ad/status", get(handlers::ad::get_ad_status))
        .route("/api/share", post(handlers::social::record_share))
        .route("/api/daily/check", get(handlers::social::check_daily))
        .route("/api/health", get(|| async { "ok" }))
        // 中间件：注意层序 — CORS 在最后 = 在最外层包裹所有路由
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let addr = format!("{}:{}", server_host, server_port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
