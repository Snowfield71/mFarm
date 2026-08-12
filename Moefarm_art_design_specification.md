# 萌田农场美术规范与图片生成提示词

> 本文由原“美术资源和图标设计规范”与“AI 图片生成提示词”合并而成，是项目唯一的美术图片规范入口。

## 1. 视觉基准

- 风格：精致二维手绘休闲农场游戏，温暖、柔和、童趣，但边缘必须干净。
- 轮廓：深棕色细描边，线宽稳定，圆角统一，不使用纯黑硬边。
- 材质：轻微纸张纹理和柔和高光，避免明显噪点、波浪色差与生成式涂抹痕迹。
- 光照：左上方柔光，阴影向右下，阴影短而轻。
- 主色：奶油纸张 `#F9E8CF`、棕色描边 `#9B622E`、粉色缎带、蜂蜜金、叶片绿。
- 禁止：摄影写实、3D 塑料感、厚重投影、紫蓝霓虹、文字水印、棋盘格背景、伪透明。

## 2. 当前资源结构

```text
Server/assets/textures/ui/
├─ common/
│  ├─ currency/
│  ├─ navigation/
│  └─ panels/panel_bg.png
├─ task/
│  ├─ buttons/
│  ├─ icons/
│  ├─ rewards/
│  └─ tabs/
├─ catalog/catalog_bg.png
├─ craft/
│  ├─ buttons/
│  └─ icons/
├─ inventory/icons/
├─ signin/buttons/
└─ shop/
   ├─ buttons/
   ├─ icons/
   └─ tabs/
```

通用面板使用 `common/panels/panel_bg.png`；图鉴因包含 `3 x 3` 卡片与右下角对折，使用独立的 `catalog/catalog_bg.png`。

### 2.1 当前已落地美术资源（2026-07-23）

- 作物资源共 `34` 种：蔬菜目录 `29` 种，水果目录 `5` 种。每种作物均包含收获物图标以及 `stage_1`、`stage_2`、`stage_3` 三张生长图，共 `34` 张收获物图标和 `102` 张生长阶段图。
- 当前作物为：小麦、玉米、番茄、胡萝卜、南瓜、草莓、樱桃、香蕉、苹果、莴笋、马铃薯、黄瓜、甘薯、菠菜、豌豆、芦笋、大黄、茴香、洋蓟、茄子、甜椒、西瓜、秋葵、花生、西兰花、甜菜根、芜菁、芹菜、生姜、羽衣甘蓝、大白菜、大蒜、韭葱、小卷心菜。
- 种子袋不再集中存放；每张种子袋位于对应作物目录，统一命名为 `item_{cropId}_seed.png`。商店、背包和种植选择仍通过原有 `seedXxx` 业务 ID 共用同一资源。
- 全部生长阶段图为 `512 x 512` RGBA，非透明边界底部统一位于 `y=480`；当前 `102` 张生长图按尺寸、透明通道、水平中心和基线规范交付。
- 作物接地阴影使用一体化绘制的暖棕色实心接触面。直立单茎作物使用紧凑阴影；南瓜、西瓜、草莓、番茄等贴地多果实作物按果实和根冠的真实接触总宽度扩大，不按叶冠宽度扩张，也不压缩成单茎宽度。
- 农场和牧场已配置春、夏、秋、冬四季视觉：春季沿用基础背景，夏、秋、冬使用独立背景资源；秋季叠加落叶，冬季叠加多层雪花。头像和导航图标随季节切换，顶部农场标题与季节天数统一使用固定棕色文字体系。
- 当前已接入的重点 UI/功能美术包括：金币与钻石图标、农场/牧场切换入口、土地与建筑位、铲除入口、一键收获入口、温室花盆解锁图标、鸡舍与牛棚内部交互场景、商店季节图标、任务/签到/成就/称号/图鉴/合成面板资源。
- 六张功能券统一为 `256 x 256` RGBA，整张票面统一约 `-14°` 右上扬角度、`214px` 主体宽度和 `(128,128)` 视觉中心；只能等比缩放和整体旋转，不得拉伸券面或替换内部图案。
- 秋冬作物料理新增十五张独立透明物品图标：十张单作物基础料理与五张多作物高阶料理。统一使用暖棕描边、左上高光、两级明暗和 `256 x 256` 透明画布；显示名称必须控制在 `5-6` 个汉字，避免超出合成卡片矩形宽度。
- 水果合成品补充三张独立透明物品图标：樱桃果酱瓶、香甜苹果派和冰爽西瓜汁；香蕉沿用原有香蕉酱图并补齐配方。三张新图均为 `256 x 256` RGBA、透明四角、约 `214px` 最大主体尺寸，并使用不同器皿或轮廓避免模板化。
- 甜椒、秋葵和芹菜成熟阶段需保持旧版主体高度与接地基线，但减少细碎枝干、平行茎线和重复叶缘线；莴笋发芽阶段保持双叶短茎轮廓，只使用与后续阶段一致的明亮黄绿色。四张修订图均保持 `y=480` 基线。
- 当前建筑美术覆盖住宅、鸡舍、牛棚、水井、蜂窝、花园、仓库和恒温温室，并统一使用三分之四前视角、暖棕描边、两级明暗和小范围接地层。

## 3. 导出规范

| 资源     | 建议母版          | 导出要求                                |
| -------- | ----------------- | --------------------------------------- |
| 物品图标 | 512 x 512         | PNG、透明背景、主体占画布 78% 至 86%    |
| 功能图标 | 256 x 256         | PNG、透明背景、四周留白一致             |
| 按钮     | 4 倍实际显示尺寸  | PNG、透明背景、文字与按钮合成时保持清晰 |
| 分类栏   | 4 倍实际显示尺寸  | 四种选中状态宽高完全一致                |
| 面板背景 | 至少 2 倍设计尺寸 | 不拉伸文字或装饰，必要时九宫格缩放      |

所有透明 PNG 必须检查 Alpha：外部像素 `A=0`；抗锯齿边缘允许半透明，但 RGB 应接近边缘主体色，不能残留白、灰、黑或 `#CFA774` 色边。

## 4. 面板规范

### 4.1 通用面板

- 内容比例与设计分辨率 `360 x 640` 一致。
- 奶油色纸张背景，顶部粉色缎带，四角叶片与花朵装饰。
- 任务、合成、背包和商店不包含右下角对折。
- 面板图片内部不预绘业务文字，标题由代码渲染。
- 关闭按钮、分类栏和内容卡片由代码与独立图片组合。

### 4.2 图鉴面板

- 与通用面板宽高、背景色和标题位置一致。
- 固定 `3 x 3` 金色卡片，每张卡片包含图标区与底部名称区。
- 九个卡片整体比通用参考位置向上 `8px`。
- 仅右下角有纸张对折；对折外部必须真透明。
- 对折轮廓不可被抠图侵蚀，也不能在外侧保留金色、灰色或白色毛边。

### 4.3 分类栏

- 选中项背景为 `#F9E8CF`，与面板背景融合。
- 未选中项使用略深的暖杏色。
- 项目之间保持统一间距，底部横向连接线完整。
- 只有选中项底部两角向外转圆；未选中项底部保持水平连接。
- 图标和文字分别作为独立元素渲染，禁止把低分辨率整图再次拉伸。

### 4.4 卡片与进度条

- 内容卡片使用暖白背景、棕色描边和轻微底部阴影。
- 标题遮盖区背景必须与卡片背景相同。
- 进度条采用连续圆角胶囊，左右圆角一致，不得出现白色圆点、中间接缝或端点断裂。

## 5. 通用生成提示词

### 5.1 正向模板

```text
Create a polished 2D hand-painted mobile farming game asset for “Moefarm”.
Warm cream paper palette, soft pink and honey-gold accents, clean dark-brown outlines,
consistent rounded geometry, subtle upper-left highlight and short lower-right shadow.
Precise symmetrical silhouette, smooth antialiased edges, production-ready game UI quality.
No text unless explicitly supplied. Keep the requested proportions and composition exactly.
Transparent PNG outside the object, true alpha transparency, no matte color, no watermark.
```

### 5.2 负向模板

```text
no watermark, no signature, no letters, no checkerboard, no fake transparency,
no white halo, no gray fringe, no brown fringe outside the outline,
no missing outline pixels, no duplicated edges, no ghosting, no color waves,
no noisy texture, no uneven border width, no distorted proportions,
no photorealism, no 3D plastic render, no heavy drop shadow
```

## 6. 专项提示词

### 6.1 通用背景面板

```text
Using the provided panel reference as the exact composition template, recreate a high-resolution
vertical mobile game panel at the same aspect ratio. Preserve the cream paper background,
top pink ribbon, corner flowers and leaves. Remove all watermark artifacts and all business text.
Do not add a folded corner. Keep the interior clean for runtime UI. The outer silhouette must be
fully opaque where paper exists and truly transparent only where explicitly marked.
```

### 6.2 图鉴背景

```text
Edit the supplied catalog panel without changing its canvas size or aspect ratio.
Keep the title ribbon and decorations. Keep exactly nine cards in a 3 by 3 grid and move the
whole grid upward by 8 pixels. Preserve card sizes, spacing, gold borders and bottom name masks.
Keep one small folded paper corner at bottom-right. Everything outside the fold contour must have
alpha 0. Preserve every gold outline pixel on the fold; remove all beige, gold, gray and white
residue outside it. No other content changes.
```

### 6.3 物品图标

```text
Create one centered [ITEM NAME] icon for a cozy hand-painted farming game.
Three-quarter front view, recognizable silhouette, warm natural colors, dark-brown clean outline,
subtle highlight, minimal short shadow contained inside the object bounds. The object occupies
82 percent of a square canvas. Transparent background, no frame, no label, no quantity, no watermark.
```

### 6.4 功能按钮

```text
Create a compact rounded rectangular game button matching the supplied task button reference.
Warm [BUTTON COLOR] fill, dark-brown outline, thin inner highlight, small orange-brown bottom bevel,
no separate black shadow plate. Center the Chinese label “[LABEL]” in bold dark-brown characters
with a soft cream outline. Transparent outside the button and no extra padding.
```

### 6.5 厨师帽与勺子

```text
Create a clean hand-painted cooking status icon: a white chef hat beside a wooden spoon,
with two small golden sparkles. Dark-brown smooth outline, warm cream shading, compact balanced
composition matching the supplied reference. Transparent background, no square backdrop,
no placeholder symbols, no text, no watermark.
```

### 6.6 农作物三阶段

#### 硬性规则

- 每种农作物分别生成发芽期、成长期、完全成熟期三张独立图片，统一为 `512 x 512` RGBA。优先逐张生成；只有明确需要批次一致性时才允许在一张分隔清晰的母图中生成，随后按独立单元裁切。
- 三阶段使用同一画布中心线 `x=256`，最终非透明边界底部固定为 `y=480`，下方保留 `32px` 透明区域；底部只允许贴地接触阴影，不绘制土壤或土丘。
- 阴影必须与单张主体一体绘制，后期只允许抠图、整图等比缩放和平移。禁止压缩、拉伸、行填充、重着色、粘贴或复用通用阴影模板；阴影不合格时必须单张重绘。
- 阴影使用近似 `#634324` 的不透明暖中棕色，长轴保持水平，外缘平滑且不带描边、暗色闭环、内环、纹理或拼接痕迹。正常抗锯齿只允许出现在最外侧一像素边缘。
- 阴影宽度由真实接地实体决定：单一直立茎通常约为茎基宽度的 `3-5` 倍；多个贴地果实必须覆盖全部果实与根冠的接触范围，但不得扩展到悬空叶片或整片叶冠下方。
- 收获物图标只展示实际可收获主体，不绘制任何贴地阴影；黄瓜、马铃薯、甘薯等果实或块根图禁止附加叶片、藤条、枝条或装饰性花朵。
- 发芽期遵循项目统一的短茎双叶约定，但必须通过叶片长宽比、外轮廓、相对大小、张开角度、茎高和倾斜体现作物差异，不能复用同一个对称双叶模板。
- 成长期和成熟期叶片必须向不同方位和前后层次自然生长，以轮廓、弧线、遮挡、连接点、缩短比例和负形表现空间关系；禁止机械镜像、同角度扇形排布和全部正面朝向。
- 叶片保持圆润、简化和优雅的 C/S 曲线，不绘制密集叶脉；明暗只使用同一绿色家族内的紧凑左上高光与少量右下暗面，不用写实体积光制造层次。
- 使用简单色块和两级明暗表现体积，减少叶脉、纹理线和写实细节。
- 南瓜、卷心菜等重型作物必须贴地生长；胡萝卜等根茎作物应表现埋入土壤，而不是由细茎悬空托举。
- 完全成熟期必须明确处于可收获状态。果实、豆荚、谷物和种子类作物不得保留花朵或花苞，除非花本身就是收获器官；成熟小麦穗、茎、叶统一为金黄或琥珀色，不残留幼态绿色。
- 成熟豌豆、豆类使用完整闭合豆荚，只能用轻微外轮廓鼓起暗示内部种子，不直接展示圆形豆粒、剖面或开口。
- 每个果实必须通过果梗、茎或藤蔓连续连接到植株根冠或接地基部；禁止悬浮果实、隐藏缺失的连接点、断裂藤蔓和脱离主体的叶片。
- 同批作物的描边宽度、绿色范围、饱和度和主体占比必须统一；树类果实不能左右偏离田地中心。

#### 生成提示词

```text
Create one isolated growth-stage sprite for [CROP NAME], stage [1/2/3], for the Moefarm mobile game.
Canvas 512 by 512. Match the approved corn and tomato references exactly: concise cute hand-painted
2D cartoon, smooth warm dark-brown outline with the same relative line width, bright but controlled
natural colors, simple two-step shading, very few internal detail lines and gently curved organic shapes.
Use one unified soft midday light from above and slightly upper-left. Highlights belong on upper-facing
and front-left surfaces; darker values stay subtle on lower-right surfaces. Use only a compact soft
contact shadow directly beneath the plant or fruit. Never use low-angle sunset backlight, rear-to-front
cast shadows, long side shadows, heavy black shade or inconsistent light directions between crops.
Design this stage from the real germination and growth structure of [CROP NAME]. Do not reuse a generic
two-leaf seedling. Keep the three stages on one shared x=256 center line and one shared bottom baseline
near y=480. Use only a compact grounded oval shadow beneath the plant, never a soil mound or soil patch.
Match each stage shadow width to that stage's actual contact footprint; do not reuse one generic shadow size.
Keep the shadow outline at the same relative visual weight as the plant outline. Harvested produce icons must
show only the edible harvested body, with no shadow and no decorative leaves, vines, branches or flowers.
Match apparent visible size by the opaque artwork bounds rather than canvas size or node size. Crops of
similar mass, such as mature tomato and strawberry groups, must have comparable perceived scale.
For fruit trees, preserve species-specific structure: apple uses a dense broad cohesive rounded crown;
cherry uses lighter asymmetric tiered clusters, visible gaps and more exposed branching. Do not reuse
the same canopy silhouette and distinguish the trees only by changing fruit.
Transparent background with true alpha, no checkerboard, no fake transparency, no separate long shadow,
no text, no frame, no watermark, no magenta residue, no white/gray fringe and no disconnected pixels.
```

### 6.6.1 成就图标

```text
Create one [ACHIEVEMENT SUBJECT] icon for the Moefarm achievement list on a 256 by 256 canvas.
Use the approved crop illustration language: compact cute hand-painted 2D cartoon, smooth warm
dark-brown outline, controlled natural colors, simple two-step shading and soft midday light from above
and slightly upper-left. Every achievement must be designed as a complete badge, not as a normal item
icon and not as a pictogram inserted into one repeated medal template. Keep only the family-level art
language consistent: outline width, two-step shading, lighting direction, canvas occupancy and low detail
density. Give every achievement its own outer silhouette, dominant color, edge geometry, ribbon or side
decoration, material impression and integrated semantic composition. Use simple solid color blocks and
only two levels of light and shade; avoid realistic metal, glossy reflections, complex gradients, ornate
carving, tiny texture, thick 3D bevel and painterly rendering. The badge must remain readable at 32 to 44
pixels. No letters, numbers, badge text, long shadow, checkerboard, watermark or photorealism. True
transparent background outside the badge and no white, gray or magenta fringe.
```

禁止“套娃式”复用同一外框并只替换中央图案。徽章之间必须同时具备系统归属感和独立身份：统一的是画法，不统一外框。

成就按视觉权重分为三层：

| 类型     | 用途               | 视觉处理                                                                     |
| -------- | ------------------ | ---------------------------------------------------------------------------- |
| 普通成就 | 完成基础任务       | 主色降低约 20% 饱和度，使用较浅的暖棕描边，不添加闪光。                      |
| 稀有成就 | 完成难度较高的任务 | 使用一圈干净的蜂蜜金边，只在轮廓上附着一枚四角小闪光；禁止散布多个亮点。     |
| 隐藏成就 | 特殊条件解锁       | 未解锁时使用灰蓝低饱和锁定徽章，强化神秘感；解锁后恢复该成就专属的彩色徽章。 |

统一约束如下：

- `256 x 256` 原图的主体外描边视觉宽度统一为约 `8–10px`，内部线条明显更细；不使用纯黑描边。
- 光源统一来自左上方，高光仅保留一块完整色面；阴影统一为短距离右下投影，禁止长阴影与写实金属反射。
- 徽章底色优先使用浅米色或浅金色。普通成就降低对比，稀有成就才允许金边；装饰只选小星星、小闪光或小叶子中的一种。
- 小尺寸优先保证剪影：大齿轮最多 `8` 齿，小齿轮最多 `6` 齿；叶片最多保留一条主叶脉；书本只保留中缝，不绘制多层页线；奖杯高光不得拆成碎点。
- 最终必须在成就列表实际显示尺寸 `44 x 44` 下检查，无法帮助识别成就语义的线条一律删除。

成就分类菜单固定为四类：种植成就、合成成就、经营成长、收集牧场。分类菜单图标不是成就徽章，不使用奖章外框；应延续任务分类图标的简洁程度，在 `25–34px` 下只保留一个主符号：双叶幼苗、齿轮麦穗、金币成长星、收藏册牧场标记。分类图标必须是透明 PNG 美术资源，不得用 Canvas 临时绘制。

成就语义固定如下：

- `first_plant`：一株刚破土的双叶幼苗。
- `plant_50`：三株并排生长、带小土丘的作物。
- `gold_100`：装有金币的束口钱袋。
- `gold_10000`：带麦穗尾饰与单个四角闪光的蜂蜜金存钱罐，不能复用钱袋轮廓。
- `diamond_50`：由两片奶油色农场叶托起的蓝色钻石叶冠，钻石最多使用四块大色面。
- `level_10`：带星形的蜂蜜金等级徽章，不出现数字或文字。
- `level_20`：红色农舍、蜂蜜金大星与两条绿色田垄组合的农场星章，不出现数字或文字。
- `first_craft`：一枚小齿轮与一根麦穗组合。
- `craft_50`：大齿轮与金色星芒组合，结构比初次合成更完整。
- `recipes_all`：打开的奶油色配方书，书页带小叶片图形但没有文字。
- `catalog_20`：棕红色半开田园图鉴册，顶部只露出叶片、鸡蛋、苹果三张简化收藏卡。
- `catalog_all`：棕红色收藏册与金色星形书签组合，不出现文字。
- `pasture_first`：装有一枚鸡蛋和一瓶牛奶的浅金编织收获篮，底部只保留一组短草叶。
- `pasture_50`：谷仓门形徽章，内部只使用鸡蛋、牛奶滴和蜂巢三种大符号，并带单个四角闪光。

### 6.7 建筑物图标

#### 同组画风

- 统一 `256 x 256` 透明画布，主体横向宽度建议 `210px` 至 `224px`，四周留白均衡。
- 使用紧凑的三分之四前视角、深暖棕圆润外描边、较细的内部描边、明快自然色和两级卡通明暗。
- 建筑底部使用小范围草地、灌木或贴地阴影作为共同环境层，不能有的悬空、有的落地。
- 线条密度以鸡舍、房屋、牛棚、水井为基准；禁止写实木纹、复杂透视线和建筑渲染图质感。
- “统一风格”只统一描边、色彩、光照、视角、留白和环境层，不得复用其他建筑的标志性结构。

鸡舍、牛棚、花房、蜂窝的内部交互场景使用与恒温温室一致的纵向圆角装饰框、顶部标题安全区、底部信息区以及完全相同的外部垂直边界。标题节点的代码坐标必须根据每张背景图顶部实际留白单独做视觉基线校准，禁止因复用同一个 Y 常量而造成视觉错位。场景主体必须具有明确纵深：鸡舍以木墙、巢箱、栖架和三只成年母鸡构成空间，禁止用小鸡填补中间鸡窝；牛棚以左右牛栏、围栏和中央通道构成空间，取消左右侧窗，只保留高处中央阁楼窗。牛棚顶部两朵装饰花之间必须是连续的浅奶油色空白区域，背景图不得绘制标题牌或额外矩形。场景主体内不得常驻放大的鸡蛋或牛奶。右上角关闭符号必须水平、垂直居中于装饰框预留的空缺花心。

花房与蜂窝场景的空间逻辑硬性要求：

- 原露天“花园”改为可进入的“花房”。建筑外观必须具有木制框架、玻璃墙面、明确入口和绿色弧形屋顶，并保留白、黄、粉、紫四组花卉作为独有识别；禁止继续使用只有围边花坛、没有门窗的露天花圃图标。
- 花房内部必须表现木制拱梁、玻璃窗、中央通道和四组扎根于花床的花卉，结构上与建筑外观连续；禁止把露天花园、采摘后的花束或普通温室花盆直接当作花房内部。
- 花房交互区按“四张等宽竖向圆角花位卡＋一行双操作按钮＋底部横向花卉选择栏”组织。四张卡片必须共享宽高、圆角、描边、顶部名称基线、花卉图标尺寸和底部状态基线；空花位只允许中央出现一个低对比种植加号，禁止在右下角重复加号。种植后卡片底部必须显示真实生长进度条，成熟时显示满格进度，不得用加号冒充进度。底部选中花卉必须同时改变底色和描边，不能只依靠微弱颜色差。
- 花位卡、收获/铲除操作区和底部横向选择区必须使用三张独立透明 PNG 底板，不再由代码临时绘制外框。花位卡为上下同形的普通大圆角矩形，四角半径一致，不得出现顶部凸弧、孔洞、内凹缺口或破损纸边；卡内进度条末端使用参考图同款立体圆形右箭头资源。
- 温室、牛棚、鸡舍、蜂窝与花房背景的左右下角均不再保留花朵或叶片装饰；移除后必须补齐奶油色面板、连续内描边和木色外框，透明画布外不得残留棋盘格、白底或灰底。花房操作区和选择区的安全范围仅由独立底板控制，不得依赖底角花饰遮挡内容。
- 四张花位卡采用紧凑纵向排版，名称、图标、状态和进度之间不得保留大段无效留白；操作按钮宽度以容纳图标和文字为限，不得横向填满面板。“一键收获”左侧固定使用白手套图标。底部花卉横向选择栏必须完整位于左右两组底角花饰的内边界之间，不得遮住花瓣或叶片。
- 建筑场景标题和关闭叉号禁止按相似背景共用经验坐标：标题以背景顶部奶油色标题区的像素质心为视觉中心，并扣除文字子节点自身偏移；关闭叉号以右上粉色花朵的花心像素质心换算至实际 `336 × 602` 显示节点。卡片、按钮和选择栏调整位置时必须作为整体移动，不得破坏内部间距。
- 花房交互内容最终相对初版整体上移 `37px`。花位卡必须使用统一的浅奶油色圆角卡片底图；名称、图标、状态文本、进度条自上而下紧凑排列。空花位显示“点击种植”且仍保留空进度槽；种植后显示“生长中”，成熟后显示“鲜花已经准备好了”与满格进度条。成熟花图标禁止跳动，收获仅通过底部一键收获操作完成。进度右箭头必须跟随实际填充末端移动。底部横向选择栏的完整可见数量必须由“底板内宽减去左右安全边距”除以单元宽度动态计算，只显示完整单元，禁止露出左右半格。
- 花位进度右箭头必须使用单独绘制的高分辨率 RGBA 图标，不得从带底色截图硬抠；图标以进度条末端为基准覆盖在填充层上方。收获/铲除双按钮与底部横向选择栏使用更宽的独立圆角底板，二者之间保留稳定上下间距；如超出花房底部信息区，必须将这组三层交互内容整体上移。
- 花房当前版本不使用进度右箭头；卡片进度仅以填充条表达。收获/铲除底板与花卉横向选择底板的内面必须同花位卡片一致为浅奶油色，保留暖棕描边和金色内描边；卡片、双按钮底板、选择底板之间的空隙必须紧凑且均匀。右上关闭叉号必须以粉色花朵花心为中心定位。生长中花位点击后弹出保留场景的加速层，允许以钻石或农作物加速券立即成熟。
- 花房种植每次必须先消耗固定金币；金币不足时不得落种。花卉加速弹层中的进度数值必须以当前时间实时刷新，取消、钻石加速、加速券三个操作保持紧凑等距布局，禁止沿用普通弹框的过大按钮间距。
- 花房成熟花朵允许直接点击其图标收获，同时保留一键收获；禁止将整个花位卡片都作为收获热区。种植必须保留“从下方缩小弹入并轻微回弹”的动效。收获/铲除底板和横向选择底板必须按源图片原始长宽比例显示，禁止压缩高度；横向选择项采用高于宽的竖向圆角小长方形，不得退化为正方形。
- 花卉选择项图标须上移，底部显示金币图标与对应种植价格；花卉类型各自拥有独立的金币价格与成熟时间。花卉加速弹层只保留“取消”和“钻石加速”两个按钮；钻石加速按钮为浅绿色圆角底图，左侧使用普通钻石图标，右侧由游戏字体显示加速文本。禁止在钻石内部或外部绘制额外的加速箭头、闪电或拖尾。
- 花位卡必须使用紧凑高度，标题、图标、状态与进度条自上而下排列且无大段空白；收获/铲除区与横向选择区整体随卡片上移。卡片到操作区固定留 `8px`，操作区到选择区固定留 `4px`。加速弹层中的取消与钻石加速按钮必须使用相同视觉高度、按实际图片宽度加 `12px` 间距计算整体水平居中；钻石按钮文字固定深棕/黑色，图标不得过大。
- 花房的“收获/铲除区”和底部横向滚动区必须复用同一张底板资源 `bg_flower_bottom_panel`：外框主色固定为 `#d98926`，金色内描边须连续完整，四个内角的圆角过渡对称且不得断线、缺角或压缩变形。
- 田地、温室和花房必须复用同一套种植与铲除动效语言：种植时作物或花卉从下方缩小弹入并轻微回弹；铲除时必须显示田地同款铲子挥动，随后主体压缩退场。禁止温室、花房使用无反馈的瞬时替换或另造不一致的简化动画。
- 成熟花卉的跳动提示单轮约 `0.4秒`，两轮之间至少停顿 `1.8秒`，禁止连续高频抖动。花位卡缩短高度时保持底部基线不变，名称与图标向下收拢、进度条向上靠近图标。花卉选择栏初始状态必须完整显示前三项，第四项完全位于遮罩外；禁止以“左半项＋两个完整项＋右半项”的方式暗示滚动。
- 蜂窝内部场景必须采用进入蜂箱后的剖面视角：蜂蜡六边形巢房形成墙体与空间主体，明确区分储蜜、封盖和空巢房，并有工蜂活动。禁止把完整蜂箱摆放在另一个房间、棚屋或花园中冒充“内部”。
- 花房与蜂窝沿用温室/鸡舍/牛棚的暖棕圆润描边、两级以上明暗、空间层次和花饰边框；外框透明边缘不得残留洋红色，顶部内描边必须连续闭合。

鸡舍、牛棚生产槽的硬性美术要求：

- 牛棚不再使用四个收纳槽，改为左右两张奶牛身份卡。左卡为“哞哞”、右卡为“哒哒”，两卡尺寸、上下间距和内容边距严格对称。
- 奶牛身份卡必须使用独立生成的横向木制圆角框背景资源，禁止以临时代码矩形替代；卡片木色与牛栏栅栏一致，内部为浅奶油色。
- 奶牛头像必须连同木色背景和圆角木框一起制作；木框色接近牛栏栅栏，禁止高饱和橙色。头像为带颈部、胸口和肩部的连续三分之四半身，禁止悬浮头部；耳朵允许轻微跨过内框但不得越出外框。
- 头像朝向必须和场景奶牛一致并朝向中央：左侧“哞哞”斜向右，右侧“哒哒”斜向左。两头牛须通过额发、眼周斑点和肩部斑纹形成清晰差异；卡片内部头像靠外侧，名称、牛奶图标和进度靠中央，形成镜像对称布局。
- 名称下方使用尺寸清晰的正视牛奶杯图标，并在杯子右侧放置一条连续生产进度条；禁止拆成两条进度条，不得继续使用牛奶瓶替代，也不得在头像下方放倒计时文字。
- 牛奶成熟状态必须将进度条显示为满格，并让牛奶杯以缓慢缩放和透明度变化形成呼吸闪烁；动画不得造成卡片整体位移。
- 奶牛选中状态必须同时改变卡片内部底色并提供轻微缩放反馈，不能只依赖不明显的描边变化。
- 牛棚底部饲料区使用温室式横向滚动卡片，不使用 `2 x 2` 宫格。饲料卡只放真实可食用植物图标、缩短秒数和持有数量；其下保留一键收获。
- 牛棚背景必须基于确认稿单独抠图，外框四边和两个底角保持连续，底部不得残留棋盘格、白边或旧透明蒙版裁切痕迹。内框结构以温室背景为基准：顶部弧形内描边必须在两组花饰后方连续延伸，并分别接入左右竖向内描边，整圈不得出现断点、悬空短线或未闭合的顶部转角。右上粉色花朵不得包含烘焙在图片内的叉号或独立黄色花心；花瓣自然收拢。鸡舍、牛棚、温室的关闭叉号统一由代码绘制，并在花心预留区水平、垂直居中。
- 牛奶瓶和鸡蛋均为单体、完整、正面直立、无旋转、无透视倾角的透明 PNG；不得带草窝、地面、阴影或额外道具。
- 鸡舍槽由当前项目白色成年母鸡自然蹲坐在浅圆盘式鸡窝中构成。鸡窝必须采用完整连续的琥珀金色厚边、内凹底面和少量整齐干草，不得使用巨大蓬松草堆或重复套叠的双层草圈。
- 产蛋状态必须基于同一张无蛋母鸡基座母版制作 `1–5` 枚五张图片；母鸡、基座、画布、视角、缩放和底部基线完全不变，只递增鸡蛋。五枚鸡蛋使用同一个正面直立鸡蛋素材、同一尺寸、同一描边和同一颜色，按“前中、前左、前右、后左、后右”的浅半环顺序出现，禁止每阶段重新生成造成大小漂移。
- 未解锁鸡舍槽使用左朝向、无脚、圆润扁平卡通风格的小鸡图标；小鸡轮廓、身体颜色和高光与已解锁母鸡属于同一美术家族。未解锁卡片与已解锁卡片必须共用相同矩形尺寸和底部基线。
- 未解锁鸡舍卡片使用与已解锁卡片相同的浅奶油底色，边框固定为 `#944614`；右上角放置小型金色锁图标。卡片自上而下依次为“扩建栏位”、小鸡图标、解锁金币数量、“解锁新鸡位”，文字不可越出卡片边界。
- 各槽位素材必须使用暖棕色统一描边、柔和高光和两级以上明暗，保留空间感；透明边缘不得出现洋红、黑边或残留底色。
- 温室及生产槽解锁弹窗的“稍后/解锁”按钮必须沿用背包出售弹框的圆角比例、描边、内高光和文字安全区，不得用临时代码矩形代替。
- 鸡蛋、牛奶等非正方形主体必须放在正方形显示节点内等比缩放，禁止分别指定不同的显示宽高造成压扁或拉长；槽内鸡蛋的视觉高度必须明显小于母鸡。

#### 建筑辨识规则

- 所有新建筑必须沿用现有房屋、鸡舍的同一组三分之四视角与朝向：正面和可见侧面必须位于同一侧，屋顶退线方向、地面椭圆和投影方向保持一致；禁止水平镜像、反向透视或单独改变俯视角。仓库、温室等后续建筑也必须遵守本规则。

- 牛棚：红色立面、弧形深色屋顶、白色 X 形大门。
- 鸡舍：小型红瓦坡顶、鸡形入口、木坡道与围栏。
- 房屋：住宅门窗、烟囱、花箱与门廊。
- 水井：石砌井台、蓝色顶棚、卷轴与水桶。
- 蜂窝：绿色缓坡顶、抽屉式蜂箱、蜜蜂与花丛。
- 花房：绿色弧形屋顶、木制玻璃墙、正面入口与四组差异化花箱；禁止退化为露天围边花坛。
- 仓库：低矮横向体量、缓坡金属顶、轨道平移门、装卸平台、粮袋与货箱；禁止使用牛棚的弧形瓦顶和 X 形大门。
- 生成新建筑前先列出其三项独有结构，再列出必须避开的现有建筑结构；结构重复则判定不通过。

#### 生成提示词

```text
Create one [BUILDING NAME] icon for the Moefarm mobile game on a 256 by 256 transparent canvas.
Match the approved building family only in illustration language: compact three-quarter front view,
thick rounded warm dark-brown outer contour, thinner warm internal outlines, bright cheerful palette,
simple two-step cel shading, restrained highlights, low line density and a small organic ground layer.
Give [BUILDING NAME] its own unmistakable silhouette and these unique structures: [UNIQUE FEATURES].
Do not borrow signature structures from other buildings: [FORBIDDEN FEATURES].
Keep the subject width between 210 and 224 pixels and visually centered. No realistic architectural
rendering, no complex wood grain, no text, no frame, no watermark, and true alpha outside the object.
```

#### 仓库固定提示词

```text
Create a low, wide farm warehouse with a shallow asymmetrical blue-gray corrugated metal shed roof,
warm golden horizontal timber siding, one large plain vertical-plank sliding door on a visible dark rail,
a short loading platform and ramp, two stacked crates and one grain sack. Use a mostly horizontal silhouette.
Absolutely no arched roof, roof tiles, gable facade, X-braced barn doors, red barn colors, chimney,
residential windows, porch or flower garden. Match Moefarm building outline, shading and grass base.
```

### 6.8 农田与牧场扩建牌

- 两张图片必须由同一个母版派生，统一 `256 x 256`、牌体尺寸、文字、钉子、木纹、支撑位置和底部基线。
- 文字固定为“扩建”，奶油色字面、深棕描边和短偏移阴影；不得让模型自由改字。
- 农田版：两根支撑底部保留绿色草丛，并有轻微贴地阴影。
- 牧场版：不出现草，使用与农田版草丛占地宽度相同的柔和椭圆贴地阴影。
- 支撑必须从牌体后方到底部连续完整，禁止拆成上下两段、宽度错位、断层或重复支撑。
- 外部必须真透明，不允许白底、棋盘格、洋红底或颜色毛边进入最终文件。

```text
Using the approved expansion billboard as an exact master, create the [FARMLAND/PASTURE] variant.
Preserve the three honey-gold wooden planks, two top pegs, four round nails, Chinese text “扩建”,
two continuous support posts, board proportions, line thickness, highlights and shared ground baseline.
For FARMLAND, keep green grass tufts around both post bases. For PASTURE, remove all grass and add
two soft oval contact shadows with the same footprint as the farmland grass. Change nothing else.
Canvas 256 by 256, centered, true transparent background, no disconnected pixels and no watermark.
```

### 6.9 UI 与面板资源

- 面板、分类栏、按钮和入口图标沿用第 4 节的尺寸与状态规则；同组状态必须从同一母版派生。
- UI 文字优先由代码渲染；必须烘焙文字时，先锁定准确中文内容，再检查缺字、错字和变形。
- 入口、货币、任务、签到与导航图标使用简化轮廓和高对比主体，实际显示尺寸下仍能一眼识别。
- 项目运行前统一预加载美术资源；资源路径、大小写和 `ImageCache.ts` 映射必须一致，禁止运行时临时请求不存在的旧文件。

### 6.10 建筑内部交互层级

- 温室、牛棚、鸡舍、花房和蜂窝统一采用“场景实体直接交互 + 底部管理区”的双层结构，禁止把上半场景当作不可点击的背景插画。
- 上层控件必须贴合实体：奶牛对奶牛、鸡窝对鸡窝、花位对花圃、蜂巢对蜂巢格；不得重新排成与底部相同的第二条横向列表。
- 上层状态提示采用小型奶油色胶囊，深棕细描边、绿色生产进度、橙黄色可收获状态；尺寸只覆盖必要信息，不遮挡主体关键细节。
- 底部继续使用各建筑既有背景与横向选择器，但功能必须差异化：牛棚为饲料、鸡舍为鸡位/饲料、花房为花种、蜂窝为喂养花朵。
- 同一生产槽的上下两个入口必须展示相同状态；状态变化只更新对应图标、文本和进度，不允许整区闪烁、跳回最左侧或反复销毁重建。

## 7. 图片编辑流程

1. 先锁定原图画布尺寸与目标实际显示尺寸。
2. 只修改用户指定区域，不重新生成未要求变化的内容。
3. 需要多个状态时先制作一个母版，再复制母版改变选中项，禁止分别自由生成。
4. 去背景时使用 Alpha 蒙版或路径蒙版，不用颜色阈值反复侵蚀描边。
5. 对右下角对折先沿最外轮廓建立闭合路径，再将路径外像素设为 `RGBA(0,0,0,0)`。
6. 以深色、白色和棋盘格三种底色放大到 400% 检查边缘。
7. 用最近邻和线性缩放分别预览，确认缩放后无断线、白边与模糊文字。

## 8. 验收清单

- [ ] 画布宽高、主体位置和参考图一致。
- [ ] 同组图片尺寸、间距、描边宽度和圆角一致。
- [ ] 图标未被横向或纵向拉伸。
- [ ] 缎带左右完全对称，褶皱色彩连续，无波浪或留白。
- [ ] 花朵和叶片只有一次清晰轮廓，无重影。
- [ ] 透明区 Alpha 为 0，不存在白边、灰边或金棕色残留。
- [ ] 图鉴对折轮廓完整，对折外部真透明。
- [ ] 农作物三阶段使用 `x=256` 中心线和 `y=480` 底部基线；阴影与主体一体绘制、无描边，并与真实接地实体宽度匹配。
- [ ] 建筑物共享画风但轮廓与功能结构互不混用；仓库不得出现牛棚弧顶和 X 形大门。
- [ ] 农田与牧场扩建牌尺寸和支撑完全一致，仅底部草丛与贴地阴影不同。
- [ ] 导入 Cocos 后按实际尺寸显示仍清晰。
- [ ] 文件名与 `ImageCache.ts` 路径映射一致。

### 6.11 五建筑室内场景雪碧图硬性要求

- 温室、牛棚、鸡舍、花房、蜂窝必须使用同一张母版雪碧图生成，禁止逐张拉伸或独立套壳。
- 母版固定为 `3760 x 1359`，每格固定为 `752 x 1359`；顺序固定：温室 `x=0`、牛棚 `x=752`、鸡舍 `x=1504`、花房 `x=2256`、蜂窝 `x=3008`，且 `y=0`。
- 五格必须共享完全一致的外框宽高、标题带、内部开口和底部交互面板坐标；代码仅使用 Rect 裁切，不得再次改变单格比例。
- 每格左上角保留完整白花与绿叶，右上角保留完整粉花与绿叶；左右下角不得出现花朵。
- 背景只绘制永久静态结构和空交互基座；奶牛、母鸡、鸡蛋、花朵、蜂蜜罐等状态对象必须作为动态填充层。
- 牛棚两头奶牛和鸡舍 0 至 5 枚鸡蛋状态必须使用统一动态填充雪碧图，保持主体大小、描边、光向、视角和底部基线一致。
- 重绘交付必须同时验证：五个裁片尺寸相同、裁片像素与母版对应区域完全一致、四角 Alpha 为 0、运行时标题与关闭按钮坐标一致。
