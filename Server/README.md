# 萌田农场 - 后端服务

## 快速启动

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 MySQL DATABASE_URL、JWT_SECRET 和微信配置

# 2. 在 MySQL 中创建数据库
# CREATE DATABASE moefarm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. 运行
cargo run
```

启动后自动：
- 连接 MySQL 并执行数据库迁移
- 监听 `http://localhost:3000`
- 提供 API 接口和静态资源

当前阶段不强制依赖 Redis。玩家规模和并发较低时，MySQL 足以承担登录数据、存档与排行榜；后续需要登录会话集中管理、排行榜热点缓存、广告计数限流、分布式锁或多实例部署时再接入 Redis。

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/wx_login` | 微信登录 |
| POST | `/api/auth/refresh` | 刷新登录令牌 |
| POST | `/api/game/save` | 保存存档 |
| GET | `/api/game/load` | 读取存档 |
| POST | `/api/game/clear` | 清除存档 |
| GET | `/api/leaderboard` | 排行榜 |
| POST | `/api/leaderboard/update` | 更新排行榜成绩 |
| POST | `/api/ad/record` | 记录广告 |
| GET | `/api/ad/status` | 查询广告次数状态 |
| POST | `/api/share` | 记录分享 |
| GET | `/api/daily/check` | 查询每日状态 |
| GET | `/api/health` | 健康检查 |

分享和排行榜以微信登录取得稳定玩家身份为前置。广告接口目前仅保留服务端能力，项目计划在正式上线且达到平台要求的 500 用户门槛后再接入客户端广告流程。

## 图片访问

```
http://localhost:3000/assets/textures/items/Vegetables/wheat/item_wheat.png
http://localhost:3000/assets/textures/items/Fruits/strawberry/item_strawberry.png
http://localhost:3000/assets/textures/items/Foods/item_bread.png
http://localhost:3000/assets/textures/items/Processed/item_flour.png
```
