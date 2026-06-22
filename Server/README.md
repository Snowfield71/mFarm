# 萌田农场 - 后端服务

## 快速启动

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填写 JWT_SECRET

# 2. 运行
cargo run
```

启动后自动：
- 创建 SQLite 数据库 `moefarm.db`
- 监听 `http://localhost:3000`
- 提供 API 接口和静态资源

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/wx_login` | 微信登录 |
| POST | `/api/game/save` | 保存存档 |
| GET | `/api/game/load` | 读取存档 |
| GET | `/api/leaderboard` | 排行榜 |
| POST | `/api/ad/record` | 记录广告 |
| GET | `/api/health` | 健康检查 |

## 图片访问

```
http://localhost:3000/assets/textures/items/Vegetables/item_wheat.png
http://localhost:3000/assets/textures/items/Fruits/item_strawberry.png
http://localhost:3000/assets/textures/items/Foods/item_bread.png
http://localhost:3000/assets/textures/items/Processed/item_flour.png
```
