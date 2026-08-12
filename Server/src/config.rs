use anyhow::{bail, Context};
use std::path::PathBuf;

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

/// Resolve relative static paths from the Server crate instead of the caller's
/// current working directory. This keeps `cargo run` and
/// `cargo run --manifest-path Server/Cargo.toml` serving the same asset tree.
pub fn resolve_static_dir(static_dir: &str) -> anyhow::Result<PathBuf> {
    let configured = PathBuf::from(static_dir);
    let candidate = if configured.is_absolute() {
        configured
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(configured)
    };
    let resolved = candidate.canonicalize().with_context(|| {
        format!(
            "static asset directory does not exist: {}",
            candidate.display()
        )
    })?;
    if !resolved.is_dir() {
        bail!(
            "static asset path is not a directory: {}",
            resolved.display()
        );
    }
    Ok(resolved)
}

#[cfg(test)]
mod tests {
    use super::resolve_static_dir;

    #[test]
    fn default_assets_directory_exists() {
        let path = resolve_static_dir("./assets").expect("default static directory");
        assert!(path.ends_with("assets"));
        assert!(path.join("textures").is_dir());
    }

    #[test]
    fn missing_static_directory_is_rejected() {
        assert!(resolve_static_dir("./assets-that-do-not-exist").is_err());
    }
}
