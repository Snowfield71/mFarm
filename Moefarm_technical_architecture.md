# 萌田农场技术架构

> 本文以当前仓库代码为准。项目主体是 Cocos Creator 3.8.x TypeScript 客户端；`Server` 目录当前主要承担美术资源与服务端预留内容，不应把尚未接入的网络能力描述为已上线功能。

## 1. 技术栈

- 引擎：Cocos Creator 3.8.x。
- 语言：TypeScript。
- 设计分辨率：`360 x 640`，竖屏。
- 当前前端存档：浏览器 `localStorage`；正式服权威数据：规划中的 Rust 服务端。
- UI：运行时节点绘制与 PNG 资源组合。
- 资源加载：统一通过 `ImageCache` 映射、预加载和缓存。

## 2. 目录职责

```text
farm cocos/
├─ Web/
│  └─ assets/scripts/
│     ├─ config/       # 物品、配方、任务和全局数值
│     ├─ core/         # GameManager、DataManager、EventManager
│     ├─ systems/      # 土地、背包、合成、货币、等级
│     ├─ ui/           # 主界面、面板、绘制工具和交互
│     └─ utils/        # ImageCache 等公共工具
├─ Server/
│  └─ assets/textures/ # 游戏位图资源
└─ *.md                # 设计、技术、美术与内容文档
```

## 3. 核心模块

### 3.1 GameManager

`Web/assets/scripts/core/GameManager.ts`

- 持有玩家等级、经验、金币、钻石等全局状态。
- 初始化各业务系统并恢复存档。
- 监听种植、收获、制作、出售、扩地和升级事件。
- 推进任务、图鉴与成就状态。
- 统一触发延迟存档，避免连续事件造成高频写入。

### 3.2 DataManager

`Web/assets/scripts/core/DataManager.ts`

- 将 `SaveData` 序列化到 `localStorage`。
- 负责读取、清除和页面退出前保存。
- 存档字段新增时必须保持可选并提供默认值，以兼容旧存档。

### 3.3 EventManager

`Web/assets/scripts/core/EventManager.ts`

- 系统之间通过事件通信，降低 UI 与业务模块的直接耦合。
- 主要事件包括 `inventoryChanged`、`craftStarted`、`craftCompleted`、`taskChanged` 等。

### 3.4 InventorySystem

`Web/assets/scripts/systems/InventorySystem.ts`

- 管理物品堆叠、增加、移除与数量查询。
- 从存档恢复并导出存档格式。
- 内容变化后派发 `inventoryChanged`。
- 当前 UI 不启用容量限制。

### 3.5 LandSystem

`Web/assets/scripts/systems/LandSystem.ts`

- 管理地块解锁、种植物、种植时间和收获统计。
- 地块数据与种植计数均纳入存档。

### 3.6 CraftSystem

`Web/assets/scripts/systems/CraftSystem.ts`

- 校验配方、材料、货币和制作队列容量，并在全部通过后原子扣除资源。
- 消耗材料后创建制作进程。
- 根据开始时间和时长计算进度，完成时发放产物。
- 活跃制作进程和自增 ID 均可恢复，避免刷新后队列丢失。
- 制作队列槽位从1个扩容到最多3个，槽位数量随存档恢复。
- 完成事件只更新合成区域内容，不能关闭并重开整个面板。

### 3.7 CurrencySystem 与 LevelSystem

- 两个系统均由 `GameManager` 在启动时注册。
- `CurrencySystem` 统一负责金币、钻石的格式化、增减与校验。
- `LevelSystem` 负责等级对应的种子、配方和土地解锁查询；等级状态仍由 `GameManager` 持有。
- 顶部货币组件的两个数值必须共用同一格式化和布局逻辑。

## 4. 配置层

| 文件 | 内容 |
| --- | --- |
| `config/GameConfig.ts` | 色彩、设计尺寸、默认数值、土地和加速规则 |
| `config/ItemConfig.ts` | 物品定义、分类、售价、等级、作物属性 |
| `config/RecipeConfig.ts` | 配方材料、产物、时长、成本、经验和等级 |
| `config/TaskConfig.ts` | 四类任务、触发事件、目标、跳转动作和奖励 |

新增内容优先修改配置，不在 UI 渲染代码中复制业务数据。

## 5. UI 架构

### 5.1 主界面

`Web/assets/scripts/ui/mainui/MainUIScene.ts`

- 构建农场场景、顶部状态栏和底部导航。
- 主场景维护农田/牧场两套内容根节点；背景切换由云层遮挡动画保护资源替换过程。
- `LandSystem` 分离 `landBlocks` 与 `buildingSlots`，并在旧存档加载时将占用农田的建筑迁移到牧场建筑位。
- 底部导航面板映射：`inventory`、`craft`、`task`、`quest`。
- 好物集市使用 `shop` 面板，由种植入口或任务动作打开。

### 5.2 面板调度

`Web/assets/scripts/ui/mainui/MainUIPanels.ts`

- `showPanel` 负责创建、预加载、显示与切换面板。
- 主要渲染函数：
  - `renderInventoryPanel`
  - `renderCraftPanel`
  - `renderShopPanel`
  - `renderTaskPanel`
  - `renderQuestPanel`
  - `renderDailySignInPanel`
  - `renderAchievementPanel`
- 面板开启前预加载关键背景与按钮，关闭时执行过渡动画。
- 更新局部状态时应复用现有容器，避免整屏闪烁。

### 5.3 绘制工具

`Web/assets/scripts/ui/utils/UIDraw.ts`

- 提供圆角矩形、描边、阴影、胶囊进度条等公共绘制能力。
- 任务和合成进度条应复用图鉴进度条的连续圆角逻辑。
- 相同类型卡片应共享圆角、描边宽度和底部阴影参数。

## 6. 图片资源

`Web/assets/scripts/utils/ImageCache.ts` 将逻辑名称映射到资源相对路径，例如：

- `panelBg` -> `common/panels/panel_bg`
- `catalogBg` -> `catalog/catalog_bg`
- 任务资源 -> `task/buttons`、`task/icons`、`task/rewards`、`task/tabs`
- 合成资源 -> `craft/buttons`、`craft/icons`
- 背包资源 -> `inventory/icons`
- 商店资源 -> `shop/buttons`、`shop/icons`、`shop/tabs`
- 签到资源 -> `signin/buttons`

资源路径调整时必须同步更新 `ImageCache.ts`，并检查预加载列表。

## 7. 存档结构

当前存档包含：

- 玩家等级、经验和货币；
- 背包槽位；
- 地块、种植物和累计种植数据；
- 活跃合成进程和下一个制作 ID；
- 已解锁配方；
- 已发现图鉴物品；
- 任务进度、每日日期与领取状态；
- 成就、制作次数和游玩时间。
- 签到轮次与日期、成就领取状态、工具增益次数和制作队列槽位数量。

页面隐藏、切到后台、刷新或关闭前会立即保存，同时保留事件延迟保存与60秒自动保存。

兼容原则：读取时使用空数组、空对象或配置默认值补齐缺失字段，不强制迁移旧存档。

## 8. 正式服服务端边界

- 当前 TypeScript 逻辑用于界面和玩法闭环验证，不代表最终线上数据可信边界。
- Rust 服务端接入后，登录存档、货币与背包变更、制作队列、任务/成就/签到奖励必须通过接口确认，客户端不得自行生成最终结果。
- 制作接口应提交配方 ID 和请求幂等键，由服务端校验材料、金币、队列容量与服务器时间后一次性扣除资源并返回队列记录。
- 加速券接口应提交队列 ID，由服务端原子校验并扣除道具、更新结束时间；无有效队列时不得扣券。
- 客户端保留配置驱动的展示层和短期缓存，网络失败时回滚乐观界面或重新拉取玩家快照。

## 9. 响应式与清晰度

- 面板宽度与设备可视宽度一致，底边停在底部导航上方。
- 背景图保持原始宽高比；若需要伸缩区域，应使用九宫格或将装饰拆成独立节点。
- 业务文字由 Cocos 标签渲染，不把文字烘焙进低分辨率背景后再拉伸。
- 高清母版建议至少为目标显示尺寸的两倍。
- 透明资源导入后检查预乘 Alpha、过滤模式和实际缩放倍率。

## 10. 开发约定

- 业务状态放在系统或 `GameManager`，UI 只负责展示和交互。
- 配置数据保持单一来源。
- 图片逻辑名集中在 `ImageCache`，禁止在多个界面硬编码路径。
- 面板切换使用同一动画入口，关闭按钮不得直接销毁未保存状态。
- 修改 UI 后至少验证 `360 x 640`、窄屏手机和较宽浏览器视口。
- 修改图片后在深色、浅色背景上放大检查透明边缘。

## 11. 当前验证流程

1. 启动 Cocos 预览并清空控制台错误。
2. 依次打开物品栏、合成、任务、图鉴和商店。
3. 验证面板开关、分类切换和底部导航选中状态。
4. 完成一次种植、收获、制作和任务领奖。
5. 刷新页面，确认土地、背包、队列、任务和图鉴正确恢复。
