use std::sync::Arc;
use axum::{extract::State, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use chrono::Utc;
use uuid::Uuid;

use crate::{AppState, errors::*, models::user::*};

/// 微信登录
pub async fn wx_login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<WxLoginRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // 调用微信接口换取 openid
    let wx_session = get_wx_session(&state, &req.code).await?;

    let open_id = wx_session.openid
        .ok_or_else(|| AppError::BadRequest("微信登录失败".into()))?;

    // 查找或创建用户
    let (user, is_new) = find_or_create_user(&state.db, &open_id).await?;

    // 生成 JWT
    let now = Utc::now().timestamp() as usize;
    let claims = JwtClaims {
        sub: user.id.clone(),
        wx_open_id: open_id,
        exp: now + 7 * 24 * 3600,  // 7 天过期
        iat: now,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(api_ok(WxLoginResponse {
        token,
        user_id: user.id,
        is_new_user: is_new,
    }))
}

/// 刷新 token
pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    auth_user: crate::middleware::auth::AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    let now = Utc::now().timestamp() as usize;
    let claims = JwtClaims {
        sub: auth_user.user_id.clone(),
        wx_open_id: auth_user.wx_open_id,
        exp: now + 7 * 24 * 3600,
        iat: now,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "code": "ok",
        "data": { "token": token }
    })))
}

/// 调用微信接口获取 session
async fn get_wx_session(state: &AppState, code: &str) -> Result<WxSessionResponse, AppError> {
    // 如果未配置微信凭据，返回模拟数据（开发调试用）
    if state.config.wx_app_id.is_empty() || state.config.wx_app_secret.is_empty() {
        tracing::warn!("⚠️ 微信凭据未配置，使用模拟登录");
        return Ok(WxSessionResponse {
            openid: Some(format!("mock_openid_{}", code.chars().take(8).collect::<String>())),
            session_key: Some("mock_session_key".into()),
            unionid: None,
            errcode: None,
            errmsg: None,
        });
    }

    let url = format!(
        "https://api.weixin.qq.com/sns/jscode2session?appid={}&secret={}&js_code={}&grant_type=authorization_code",
        state.config.wx_app_id, state.config.wx_app_secret, code
    );

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| AppError::Internal(format!("微信接口请求失败: {}", e)))?;

    let session: WxSessionResponse = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("微信响应解析失败: {}", e)))?;

    if let Some(err) = session.errcode {
        if err != 0 {
            return Err(AppError::BadRequest(
                session.errmsg.unwrap_or_else(|| "微信登录异常".into()),
            ));
        }
    }

    Ok(session)
}

/// 查找或创建用户
async fn find_or_create_user(db: &sqlx::MySqlPool, open_id: &str) -> Result<(User, bool), AppError> {
    // 尝试查找已有用户
    let existing = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE wx_open_id = ?"
    )
    .bind(open_id)
    .fetch_optional(db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    if let Some(user) = existing {
        // 更新最后登录时间
        sqlx::query("UPDATE users SET last_login_at = NOW() WHERE id = ?")
            .bind(&user.id)
            .execute(db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok((user, false))
    } else {
        // 创建新用户
        let user_id = Uuid::new_v4().to_string();
        let nickname = format!("萌田农场主_{}", &user_id[..6]);

        sqlx::query(
            "INSERT INTO users (id, wx_open_id, nickname) VALUES (?, ?, ?)"
        )
        .bind(&user_id)
        .bind(open_id)
        .bind(&nickname)
        .execute(db)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        // 为新用户创建初始存档
        sqlx::query("INSERT INTO game_saves (user_id) VALUES (?)")
            .bind(&user_id)
            .execute(db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let user = User {
            id: user_id,
            wx_open_id: open_id.to_string(),
            wx_union_id: None,
            nickname,
            avatar_url: String::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            last_login_at: chrono::Utc::now().to_rfc3339(),
        };

        Ok((user, true))
    }
}
