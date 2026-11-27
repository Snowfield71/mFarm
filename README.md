# 萌田农场（Moefarm）

[![CI](https://github.com/Snowfield71/mFarm/actions/workflows/ci.yml/badge.svg)](https://github.com/Snowfield71/mFarm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

萌田农场是一款以种植、养殖、生产建筑、任务与图鉴收集为核心的竖屏农场游戏。仓库同时包含 Cocos Creator 客户端、Rust 后端服务、游戏设计文档和美术规范。

> 项目仍处于开发阶段，接口、数值和资源结构可能继续调整。

## 仓库结构

```text
.
├─ .github/      # GitHub 工作流、Issue 与 Pull Request 模板
├─ docs/         # 游戏设计、技术架构、美术与系统文档
├─ scripts/      # 仓库检查与本地开发辅助脚本
├─ Server/       # Rust + Axum 后端服务与静态资源
├─ Web/          # Cocos Creator 3.8.x 客户端
├─ CHANGELOG.md  # 版本变更记录
└─ README.md     # 项目入口
```

本地生成的验证文件保存在被 Git 忽略的 `artifacts/`；大型原型图保存在被忽略的 `原型图/`，不会进入提交历史。

## 环境要求

- Cocos Creator `3.8.x`（当前项目版本 `3.8.8`）
- Rust stable 与 Cargo
- MySQL 8.x
- Node.js 20+（用于仓库检查和 TypeScript 辅助验证）

## 快速开始

### 客户端

1. 使用 Cocos Creator 打开 [`Web/`](Web/) 目录。
2. 打开项目主场景并运行预览。
3. 等待 TypeScript 编译和资源预加载完成。

客户端说明见 [`Web/README.md`](Web/README.md)。

### 后端

```bash
cp Server/.env.example Server/.env
cargo run --manifest-path Server/Cargo.toml
```

请先在 `Server/.env` 配置数据库与登录参数。后端说明见 [`Server/README.md`](Server/README.md)。

## 开发检查

Windows：

```powershell
.\scripts\check.ps1
```

macOS / Linux：

```bash
bash scripts/check.sh
```

检查包括仓库结构、后端测试；当 Cocos Creator 已生成 `Web/temp/tsconfig.cocos.json` 时，同时执行客户端 TypeScript 检查。

## 文档

- [文档索引](docs/README.md)
- [技术架构](docs/technical-architecture.md)
- [游戏设计](docs/game-design.md)
- [美术规范](docs/art-design.md)
- [物品与配方](docs/items-and-recipes.md)
- [季节系统](docs/season-system.md)

## 参与贡献

提交 Issue 或 Pull Request 前，请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)。安全问题请按 [`SECURITY.md`](SECURITY.md) 的流程私下报告。

## 许可证

项目代码以 [MIT License](LICENSE) 发布。第三方素材及其授权以资源目录内的声明为准；贡献者应确保提交内容具有可再分发权利。
