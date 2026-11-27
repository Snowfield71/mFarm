# 参与贡献

感谢你为萌田农场贡献代码、文档、设计或测试反馈。

## 开始之前

1. 先搜索现有 Issue，避免重复工作。
2. 对较大的功能或目录调整，先创建 Feature Request 说明目标、范围和兼容方案。
3. 不要提交 `.env`、数据库、构建目录、Cocos 缓存、生成式验证产物或没有再分发权利的素材。

## 开发流程

1. Fork 仓库并从 `main` 创建分支。
2. 分支建议使用 `feat/`、`fix/`、`docs/`、`refactor/` 前缀。
3. 保持提交单一、可回滚，并使用清晰的提交信息。
4. 修改前后分别执行仓库检查：

   ```bash
   bash scripts/check.sh
   ```

   Windows 可运行：

   ```powershell
   .\scripts\check.ps1
   ```

5. 更新受影响的文档与 `CHANGELOG.md` 的 `Unreleased` 区域。

## Pull Request 要求

- 说明问题、实现方案、测试步骤和兼容性影响。
- UI 调整请附修改前后截图或录屏。
- 玩法修改请说明存档迁移、资源消耗和数值变化。
- 不混入与本次目标无关的格式化或生成文件。
- 确保 CI 通过，并处理评审意见。

## 代码约定

- TypeScript、JSON、YAML 使用 2 空格缩进；Rust 遵循 `rustfmt`。
- 新增模块应职责单一，避免继续扩大大型 UI 文件。
- 客户端资源路径集中维护，避免提交开发机绝对路径。
- 业务逻辑修改应包含可复现的验证步骤。

参与项目即表示同意遵守 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)。
