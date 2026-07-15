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

## 3. 导出规范

| 资源 | 建议母版 | 导出要求 |
| --- | --- | --- |
| 物品图标 | 512 x 512 | PNG、透明背景、主体占画布 78% 至 86% |
| 功能图标 | 256 x 256 | PNG、透明背景、四周留白一致 |
| 按钮 | 4 倍实际显示尺寸 | PNG、透明背景、文字与按钮合成时保持清晰 |
| 分类栏 | 4 倍实际显示尺寸 | 四种选中状态宽高完全一致 |
| 面板背景 | 至少 2 倍设计尺寸 | 不拉伸文字或装饰，必要时九宫格缩放 |

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

- 每种农作物分别生成发芽期、成长期、完全成熟期三张独立图片，统一为 `256 x 256`，禁止先生成合图再裁切。
- 三阶段使用同一画布中心线和同一底部基线；土壤最底部建议固定在 `y=232` 附近，横向中心固定在 `x=128`。
- 土壤必须与植物作为一个完整画面生成，不允许后期把植物和通用土壤两层简单叠加。
- 三阶段土壤的颜色、描边、明暗、纹理和不规则轮廓必须完全一致；只能根据植物实际根部宽度做轻微横向变化。
- 土壤使用温暖中棕色、短而轻的内部明暗，不使用深黑投影，不与植物根部上下分离。
- 发芽期必须参考该作物现实中的幼苗形态，不能所有作物都画成相同的对称双叶。
- 避免笔直的茎、叶脉和机械对称轮廓；使用自然弧线与少量不对称变化。
- 使用简单色块和两级明暗表现体积，减少叶脉、纹理线和写实细节。
- 南瓜、卷心菜等重型作物必须贴地生长；胡萝卜等根茎作物应表现埋入土壤，而不是由细茎悬空托举。
- 完全成熟期不得保留不符合生长阶段的花朵，例如成熟草莓以果实为主。
- 同批作物的描边宽度、绿色范围、饱和度和主体占比必须统一；树类果实不能左右偏离田地中心。

#### 生成提示词

```text
Create one isolated growth-stage sprite for [CROP NAME], stage [1/2/3], for the Moefarm mobile game.
Canvas 256 by 256. Match the supplied approved crop references exactly: concise cute 2D cartoon,
smooth dark warm-brown outline, bright but controlled natural colors, simple two-step light and shade,
very few internal detail lines, gently curved organic shapes, no realism and no mechanical symmetry.
Design this stage from the real germination and growth structure of [CROP NAME]. Do not reuse a generic
two-leaf seedling. The plant grows directly from one integrated irregular warm-brown soil patch.
Use the exact same soil color, outline, highlight, texture and bottom silhouette as the other two stages.
Center the plant at x=128 and place the lowest soil pixel on the shared y=232 baseline.
Heavy produce such as pumpkin or cabbage rests naturally on the soil; root crops remain partly buried.
Transparent background, no separate drop shadow, no text, no frame, no watermark, no magenta residue.
```

### 6.7 建筑物图标

#### 同组画风

- 统一 `256 x 256` 透明画布，主体横向宽度建议 `210px` 至 `224px`，四周留白均衡。
- 使用紧凑的三分之四前视角、深暖棕圆润外描边、较细的内部描边、明快自然色和两级卡通明暗。
- 建筑底部使用小范围草地、灌木或贴地阴影作为共同环境层，不能有的悬空、有的落地。
- 线条密度以鸡舍、房屋、牛棚、水井为基准；禁止写实木纹、复杂透视线和建筑渲染图质感。
- “统一风格”只统一描边、色彩、光照、视角、留白和环境层，不得复用其他建筑的标志性结构。

#### 建筑辨识规则

- 牛棚：红色立面、弧形深色屋顶、白色 X 形大门。
- 鸡舍：小型红瓦坡顶、鸡形入口、木坡道与围栏。
- 房屋：住宅门窗、烟囱、花箱与门廊。
- 水井：石砌井台、蓝色顶棚、卷轴与水桶。
- 蜂窝：绿色缓坡顶、抽屉式蜂箱、蜜蜂与花丛。
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
- [ ] 农作物三阶段使用同一土壤材质、中心线和底部基线，植物与土壤为一体绘制。
- [ ] 建筑物共享画风但轮廓与功能结构互不混用；仓库不得出现牛棚弧顶和 X 形大门。
- [ ] 农田与牧场扩建牌尺寸和支撑完全一致，仅底部草丛与贴地阴影不同。
- [ ] 导入 Cocos 后按实际尺寸显示仍清晰。
- [ ] 文件名与 `ImageCache.ts` 路径映射一致。
