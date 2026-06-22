use serde::{Deserialize, Serialize};

/// 微信登录请求
#[derive(Debug, Deserialize)]
pub struct WxLoginRequest {
    pub code: String,             // 微信临时登录凭证
}

/// 微信登录响应
#[derive(Debug, Serialize, Deserialize)]
pub struct WxLoginResponse {
    pub token: String,            // JWT token
    pub user_id: String,
    pub is_new_user: bool,
}

/// 微信端返回的 session 信息
#[derive(Debug, Deserialize)]
pub struct WxSessionResponse {
    pub openid: Option<String>,
    pub session_key: Option<String>,
    pub unionid: Option<String>,
    pub errcode: Option<i32>,
    pub errmsg: Option<String>,
}

/// 用户数据库记录
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub wx_open_id: String,
    pub wx_union_id: Option<String>,
    pub nickname: String,
    pub avatar_url: String,
    pub created_at: String,
    pub last_login_at: String,
}

/// 微信登录信息（用于 JWT）
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,              // 用户 ID
    pub wx_open_id: String,
    pub exp: usize,               // 过期时间戳
    pub iat: usize,               // 签发时间
}
