use axum::{
    extract::{FromRef, FromRequestParts, State},
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde_json::json;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use crate::AppState;
use crate::models::user::JwtClaims;

/// 认证用户身份，从 JWT 提取用户信息
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
    pub wx_open_id: String,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
    Arc<AppState>: FromRef<S>,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    fn from_request_parts<'life0, 'life1, 'async_trait>(
        parts: &'life0 mut Parts,
        state: &'life1 S,
    ) -> Pin<Box<dyn Future<Output = Result<Self, Self::Rejection>> + Send + 'async_trait>>
    where
        'life0: 'async_trait,
        'life1: 'async_trait,
        Self: 'async_trait,
    {
        Box::pin(async move {
            let State(state): State<Arc<AppState>> = State::from_request_parts(parts, state)
                .await
                .map_err(|_| {
                    (
                        StatusCode::UNAUTHORIZED,
                        Json(json!({"code": "unauthorized", "message": "未授权，请重新登录"})),
                    )
                })?;

            // 从 Authorization header 提取 token
            let auth_header = parts
                .headers
                .get(AUTHORIZATION)
                .and_then(|v| v.to_str().ok())
                .ok_or((
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"code": "unauthorized", "message": "缺少认证令牌"})),
                ))?;

            let token = auth_header
                .strip_prefix("Bearer ")
                .ok_or((
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"code": "unauthorized", "message": "认证令牌格式错误"})),
                ))?;

            // 解码 JWT
            let token_data = decode::<JwtClaims>(
                token,
                &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
                &Validation::new(Algorithm::HS256),
            )
            .map_err(|_| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"code": "unauthorized", "message": "认证令牌无效或已过期"})),
                )
            })?;

            Ok(AuthUser {
                user_id: token_data.claims.sub,
                wx_open_id: token_data.claims.wx_open_id,
            })
        })
    }
}
