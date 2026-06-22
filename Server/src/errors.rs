use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

/// 统一错误类型
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("未授权")]
    Unauthorized,

    #[error("参数错误: {0}")]
    BadRequest(String),

    #[error("资源不存在")]
    NotFound,

    #[error("内部错误: {0}")]
    Internal(String),

    #[error("已达每日上限")]
    DailyLimitReached,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, code, message) = match &self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized", "未授权，请重新登录"),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg.as_str()),
            AppError::NotFound => (StatusCode::NOT_FOUND, "not_found", "资源不存在"),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error", msg.as_str()),
            AppError::DailyLimitReached => (StatusCode::TOO_MANY_REQUESTS, "daily_limit", "已达每日上限"),
        };

        let body = json!({
            "code": code,
            "message": message,
        });

        (status, Json(body)).into_response()
    }
}

/// API 统一成功响应
pub fn api_ok<T: serde::Serialize>(data: T) -> Json<serde_json::Value> {
    Json(json!({ "code": "ok", "data": data }))
}

pub type AppResult<T> = Result<T, AppError>;
