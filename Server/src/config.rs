/// 应用配置

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub server_host: String,
    pub server_port: u16,
    pub jwt_secret: String,
    pub wx_app_id: String,
    pub wx_app_secret: String,
    pub static_dir: String, // 静态资源目录
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .expect("请设置 MySQL DATABASE_URL 环境变量"),
            server_host: std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: std::env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .expect("SERVER_PORT 必须是数字"),
            jwt_secret: std::env::var("JWT_SECRET").expect("请设置 JWT_SECRET 环境变量"),
            wx_app_id: std::env::var("WX_APP_ID").unwrap_or_default(),
            wx_app_secret: std::env::var("WX_APP_SECRET").unwrap_or_default(),
            static_dir: std::env::var("STATIC_DIR").unwrap_or_else(|_| "./assets".to_string()),
        }
    }
}
