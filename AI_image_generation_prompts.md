# 萌田农场 AI 图片生成提示词文档

本文档用于统一 `Server/assets/textures` 下所有图片资源的生成风格。目标不是只生成“能用的图标”，而是让农作物、田地、背景、树木、UI 图标都像同一套游戏美术。

## 统一风格

所有图片统一为：

- 日系治愈卡通农场风格，类似休闲农场手游原型图。
- 手绘感，圆润造型，暖色调，干净可爱。
- 2D 游戏资产，不要写实，不要 3D，不要摄影质感。
- 外轮廓使用深棕色或深绿色描边，描边柔和但清晰。
- 左上方柔和高光，右下方轻微阴影。
- 色彩饱和但不过亮，避免荧光色。
- PNG，透明背景，主体居中。

通用负面提示词：

```text
photorealistic, 3d render, realistic texture, harsh shadow, neon color, low resolution, blurry, text, watermark, logo, background, frame, UI panel, cropped object, inconsistent outline, overly detailed, dark mood
```

## 二次生成修正规范

如果生成结果偏“欧美卡通图标”、描边过重、光泽过强、田地像厚按钮，下一轮生成必须追加以下修正提示词：

```text
softer pastel Japanese mobile farm game style, lower contrast, thinner warm brown outline, gentle hand drawn shading, less glossy, flatter rounded shapes, cozy cute farm UI, closer to the prototype image, soft and relaxed visual weight
```

UI 图标可以保留清晰轮廓，但不要比顶部栏、底部栏、角色头像更抢眼。整体目标是接近原型图的柔和休闲农场 UI，而不是高光很重的独立图标合集。

田地资源必须追加：

```text
flat soft soil plot, not a thick button, low height, rounded irregular hand drawn edges, subtle shadow only, warm brown soil, gentle low contrast, same silhouette as the prototype field tile
```

未解锁田地必须追加：

```text
muted light green grass, not neon, same silhouette as the unlocked soil plot, same outline, same shadow, same perspective, looks like the same field tile in locked state
```

当前生成结果评估：金币、钻石、背包、齿轮、卷轴、商店方向可用；田地需要优先重新生成一版更扁、更柔、更接近原型图的版本。

## 输出规格

### 物品图标

- 尺寸：`256x256`
- 背景：透明
- 安全边距：主体不要贴边，至少保留 18px 透明边距
- 图标主体占画布 70%-82%
- 用于背包、商店、图鉴、奖励飞行动画

### 农作物阶段图

- 尺寸：`256x256`
- 背景：透明
- 三阶段根部中心必须一致
- 推荐根部中心：`x=128, y=178`
- 第 1 阶段是种子/小芽，第 2 阶段是成长植物，第 3 阶段是成熟可收获物
- 成熟阶段不要做成过高的竖直植株，优先像原型图一样横向铺在田地上

### 田地图片

已解锁和未解锁田地都是图片资源，不是运行时代码绘制。

- 尺寸：`256x256`
- 背景：透明
- 同一个透视角度、同一个圆角轮廓、同一个描边厚度
- 地块中心有轻微十字分割线
- 已解锁田地是暖棕色土壤
- 未解锁田地是在已解锁田地基础上改成浅绿色草地状态，但轮廓、阴影、透视必须一致

## 场景与 UI 资源

| 文件 | 提示词 |
| --- | --- |
| `avatar/avatar_farmgirl.png` | cute smiling farm girl avatar, straw hat, brown braided hair, round face, warm eyes, Japanese healing cartoon farm game style, soft beige circular portrait, thick soft brown outline, transparent background, 256x256 |
| `ui/icon_field.png` | unlocked farm soil tile, rounded square dirt plot, warm brown soil, soft hand drawn outline, subtle center cross grid lines, tiny soil spots, cute mobile farm game style, same perspective as prototype, transparent background, 256x256 |
| `ui/icon_green_field.png` | locked farm tile based on the same unlocked soil tile shape, rounded square grass plot, light green grass filling, same brown outline and shadow as unlocked field, subtle center cross grid lines, cute farm game style, transparent background, 256x256 |
| `ui/icon_gold.png` | cute gold coin icon, embossed dollar symbol, warm yellow gold, thick brown outline, glossy highlight, mobile farm game UI icon, transparent background, 256x256 |
| `ui/icon_diamond.png` | cute blue diamond gem icon, faceted crystal, cyan and sky blue highlights, thick dark teal outline, glossy, mobile farm game UI icon, transparent background, 256x256 |
| `ui/icon_bag.png` | cute brown leather backpack icon, rounded shape, small buckle, warm hand drawn farm game UI style, thick brown outline, transparent background, 256x256 |
| `ui/icon_gear.png` | cute craft gear icon, blue gray gear with small wooden blocks, cozy farm crafting UI style, thick brown outline, transparent background, 256x256 |
| `ui/icon_settings.png` | cute settings gear icon, soft blue gray gear, warm brown outline, simple mobile farm UI style, transparent background, 256x256 |
| `ui/icon_quest.png` | cute parchment task scroll icon, cream paper, curled edges, small red mark, thick brown outline, farm game UI style, transparent background, 256x256 |
| `ui/icon_catalog.png` | cute red-brown catalog book icon, bookmark, cream page edge, thick brown outline, farm game UI style, transparent background, 256x256 |
| `ui/icon_shop.png` | cute small market shop icon, striped awning, wooden counter, warm colors, thick brown outline, transparent background, 256x256 |
| `ui/icon_leaf.png` | cute sprout planting icon, two green leaves and small seed, warm brown outline, farm game UI style, transparent background, 256x256 |
| `ui/icon_billboard.png` | cute wooden billboard sign icon, warm wood texture, small nails, thick brown outline, farm game UI style, transparent background, 256x256 |

## 背景场景资源提示词

这些提示词用于后续把代码绘制背景替换成图片资源，或统一绘制新的背景分层。

| 资源建议名 | 提示词 |
| --- | --- |
| `bg/bg_farm_sky_hills.png` | vertical mobile game farm background, clear blue sky gradient, soft distant green hills, Japanese healing cartoon style, clean and bright, no characters, no UI, no text, 750x1334 |
| `bg/bg_grass_field.png` | soft green farm grass ground, gentle curved hill foreground, subtle tiny grass strokes, clean open area for farm tiles, Japanese cute mobile farm game style, no objects, no text, 750x900 |
| `bg/bg_top_left_trees.png` | left side background trees for cute farm game, rounded leafy green canopies, warm brown trunks, hand drawn thick soft outlines, partially cropped at screen edge, matches prototype, transparent background, 512x512 |
| `bg/bg_top_right_trees.png` | right side background trees for cute farm game, rounded leafy green canopies, warm brown trunks, hand drawn thick soft outlines, partially cropped at screen edge, mirrored composition but not identical, transparent background, 512x512 |
| `bg/bg_mid_hills.png` | distant rolling hills layer, soft teal green, low contrast, smooth cartoon shape, no outlines or very soft outlines, transparent background, 750x280 |
| `bg/bg_grass_details.png` | small scattered grass strokes and tiny leaf clusters, soft green, cute farm game style, transparent background, 750x900 |

## 农作物三阶段资源

文件命名规则：`item_{crop}_stage_1.png`, `item_{crop}_stage_2.png`, `item_{crop}_stage_3.png`。

通用提示词模板：

```text
cute hand drawn {crop name} growth stage {stage}, Japanese healing cartoon farm game asset, transparent background, 256x256, thick soft brown or green outline, warm colors, left top soft highlight, root contact point centered at x=128 y=178, consistent perspective with rounded farm soil tile, no text, no frame
```

| 文件 | 提示词 |
| --- | --- |
| `items/Vegetables/item_wheat_stage_1.png` | tiny wheat seed sprout, two small green leaves emerging from two golden wheat seeds, root point centered, cute hand drawn farm crop stage 1, transparent background, 256x256 |
| `items/Vegetables/item_wheat_stage_2.png` | young wheat plant, several short green stalks with small golden tips, cute hand drawn farm crop stage 2, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_wheat_stage_3.png` | mature wheat bunch, golden wheat heads leaning gently, compact and not too tall, cute hand drawn farm crop stage 3, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_corn_stage_1.png` | tiny corn seed sprout, small green leaves from yellow seed, cute farm crop stage 1, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_corn_stage_2.png` | young corn plant, medium green leaves, short stalk, cute farm crop stage 2, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_corn_stage_3.png` | mature corn plant with yellow corn cobs, compact height, cute hand drawn farm crop stage 3, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_tomato_stage_1.png` | tiny tomato seed sprout, two small green leaves and two tan seeds, cute hand drawn farm crop stage 1, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_tomato_stage_2.png` | growing tomato vine, green leaves, one small red tomato, compact plant, cute hand drawn farm crop stage 2, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_tomato_stage_3.png` | mature tomato harvest, cluster of red tomatoes with green vine lying low on the soil, like prototype harvest object, not tall vertical plant, cute hand drawn farm crop stage 3, root point centered, transparent background, 256x256 |
| `items/Vegetables/item_carrot_stage_1.png` | tiny carrot sprout, small orange seed root and two green leaves, cute farm crop stage 1, transparent background, 256x256 |
| `items/Vegetables/item_carrot_stage_2.png` | growing carrot top leaves with small orange carrot partly visible, cute farm crop stage 2, transparent background, 256x256 |
| `items/Vegetables/item_carrot_stage_3.png` | mature carrot bunch, orange carrots with leafy tops lying low, cute farm crop stage 3, transparent background, 256x256 |
| `items/Vegetables/item_pumpkin_stage_1.png` | tiny pumpkin sprout, small green leaves from seed, cute farm crop stage 1, transparent background, 256x256 |
| `items/Vegetables/item_pumpkin_stage_2.png` | growing pumpkin vine, broad green leaves, small pumpkin bud, cute farm crop stage 2, transparent background, 256x256 |
| `items/Vegetables/item_pumpkin_stage_3.png` | mature orange pumpkin with vine leaves, round and low on soil, cute farm crop stage 3, transparent background, 256x256 |
| `items/Vegetables/item_lettuce_stage_1.png` | tiny lettuce sprout, two soft green leaves, cute farm crop stage 1, transparent background, 256x256 |
| `items/Vegetables/item_lettuce_stage_2.png` | growing lettuce rosette, medium green leaves, cute farm crop stage 2, transparent background, 256x256 |
| `items/Vegetables/item_lettuce_stage_3.png` | mature lettuce head, round leafy green cabbage-like lettuce, cute farm crop stage 3, transparent background, 256x256 |
| `items/Fruits/item_strawberry_stage_1.png` | tiny strawberry sprout, small leaves and seed, cute farm crop stage 1, transparent background, 256x256 |
| `items/Fruits/item_strawberry_stage_2.png` | growing strawberry plant with white flower and tiny berry, cute farm crop stage 2, transparent background, 256x256 |
| `items/Fruits/item_strawberry_stage_3.png` | mature strawberry cluster, red strawberries and green leaves lying low, cute farm crop stage 3, transparent background, 256x256 |
| `items/Fruits/item_cherry_stage_1.png` | tiny cherry sapling sprout, small leaves, cute farm crop stage 1, transparent background, 256x256 |
| `items/Fruits/item_cherry_stage_2.png` | small cherry sapling with leaves and blossom, cute farm crop stage 2, transparent background, 256x256 |
| `items/Fruits/item_cherry_stage_3.png` | mature cherry harvest cluster, red cherries with stems and leaves, compact low arrangement, cute farm crop stage 3, transparent background, 256x256 |
| `items/Fruits/item_banana_stage_1.png` | tiny banana plant sprout, two tropical leaves, cute farm crop stage 1, transparent background, 256x256 |
| `items/Fruits/item_banana_stage_2.png` | small banana plant, broad green leaves, cute farm crop stage 2, transparent background, 256x256 |
| `items/Fruits/item_banana_stage_3.png` | ripe banana bunch with tropical leaves, compact cute farm crop stage 3, transparent background, 256x256 |
| `items/Fruits/item_apple_stage_1.png` | tiny apple sapling sprout, small leaves, cute farm crop stage 1, transparent background, 256x256 |
| `items/Fruits/item_apple_stage_2.png` | small apple sapling with leaves and blossom, cute farm crop stage 2, transparent background, 256x256 |
| `items/Fruits/item_apple_stage_3.png` | mature apple harvest cluster, red apples with leaves, compact low arrangement, cute farm crop stage 3, transparent background, 256x256 |

## 物品图标资源

### 基础农产品

| 文件 | 提示词 |
| --- | --- |
| `items/Vegetables/item_wheat.png` | cute wheat item icon, golden wheat bundle, thick brown outline, warm highlight, transparent background, 256x256 |
| `items/Vegetables/item_corn.png` | cute corn cob item icon, yellow kernels with green husk, thick brown outline, transparent background, 256x256 |
| `items/Vegetables/item_tomato.png` | cute red tomato item icon, plump round tomato with green stem, thick brown outline, transparent background, 256x256 |
| `items/Vegetables/item_carrot.png` | cute carrot item icon, orange carrot with green leaves, thick brown outline, transparent background, 256x256 |
| `items/Vegetables/item_pumpkin.png` | cute orange pumpkin item icon, rounded pumpkin with green stem, thick brown outline, transparent background, 256x256 |
| `items/Vegetables/item_lettuce.png` | cute lettuce item icon, round leafy green lettuce, thick dark green outline, transparent background, 256x256 |
| `items/Fruits/item_strawberry.png` | cute strawberry item icon, red berry with seeds and green leaves, thick brown outline, transparent background, 256x256 |
| `items/Fruits/item_cherry.png` | cute cherry item icon, pair of red cherries with stems and leaf, thick brown outline, transparent background, 256x256 |
| `items/Fruits/item_banana.png` | cute banana item icon, small banana bunch, warm yellow, thick brown outline, transparent background, 256x256 |
| `items/Fruits/item_apple.png` | cute red apple item icon, green leaf, glossy highlight, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_egg.png` | cute egg item icon, cream white egg with soft yellow highlight, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_milk.png` | cute milk bottle item icon, white milk bottle with blue label, thick brown outline, transparent background, 256x256 |

### 种子

| 文件 | 提示词 |
| --- | --- |
| `items/Seeds/seed_wheat.png` | cute wheat seed icon, small golden seeds with tiny sprout, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_corn.png` | cute corn seed icon, yellow kernels and small green sprout, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_tomato.png` | cute tomato seed icon, small tan seeds and tiny tomato sprout, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_carrot.png` | cute carrot seed icon, tiny orange root sprout and green leaves, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_pumpkin.png` | cute pumpkin seed icon, cream seed with little vine sprout, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_lettuce.png` | cute lettuce seed icon, tiny green sprout and small seed, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_strawberry.png` | cute strawberry seed icon, small red seed packet feeling, tiny leaf sprout, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_cherry.png` | cute cherry seed icon, cherry pit with tiny leaves, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_banana.png` | cute banana seedling icon, tiny tropical leaves, thick brown outline, transparent background, 256x256 |
| `items/Seeds/seed_apple.png` | cute apple seed icon, brown apple seed with tiny green leaves, thick brown outline, transparent background, 256x256 |

### 加工品

| 文件 | 提示词 |
| --- | --- |
| `items/Processed/item_flour.png` | cute flour bag icon, cream paper sack with flour powder, warm beige, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_butter.png` | cute butter block icon, golden butter on small wrapper, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_honey.png` | cute honey jar icon, amber honey jar with honey dipper, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_sugar.png` | cute sugar jar icon, white sugar crystals in small jar, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_oatmeal.png` | cute oatmeal bowl icon, beige oats in small bowl, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_bananaSauce.png` | cute banana sauce jar icon, yellow sauce jar with banana label, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_jam.png` | cute red jam jar icon, strawberry cherry jam, cloth lid, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_carrotPuree.png` | cute carrot puree bowl icon, orange puree with spoon, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_cheese.png` | cute cheese wedge icon, pale yellow cheese with holes, thick brown outline, transparent background, 256x256 |
| `items/Processed/item_ketchup.png` | cute ketchup bottle icon, red tomato sauce bottle, thick brown outline, transparent background, 256x256 |

### 食物料理

| 文件 | 提示词 |
| --- | --- |
| `items/Foods/item_bread.png` | cute bread loaf icon, warm brown baked bread, thick outline, transparent background, 256x256 |
| `items/Foods/item_croissant.png` | cute croissant icon, golden crescent pastry, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_cake.png` | cute cake slice icon, cream cake with pink frosting, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_cupcake.png` | cute cupcake icon, paper cup and frosting, pastel colors, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_cookie.png` | cute cookie icon, round cookie with chocolate chips, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_pie.png` | cute fruit pie icon, golden crust with red filling, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_strawberryCake.png` | cute strawberry cake icon, pink cream cake with strawberries, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_baguette.png` | cute baguette icon, long golden bread, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_donut.png` | cute donut icon, pink glaze and sprinkles, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_chocolateCake.png` | cute chocolate cake icon, dark chocolate frosting, warm highlight, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_cereal.png` | cute cereal bowl icon, oatmeal cereal with milk, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_pasta.png` | cute pasta plate icon, golden noodles with tomato sauce, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_butterToast.png` | cute butter toast icon, toast slice with melting butter, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_honeyToast.png` | cute honey toast icon, toast slice with honey drizzle, thick brown outline, transparent background, 256x256 |
| `items/Foods/item_jamToast.png` | cute jam toast icon, toast slice with red jam, thick brown outline, transparent background, 256x256 |

### 建筑

| 文件 | 提示词 |
| --- | --- |
| `items/Buildings/item_craftTable.png` | cute wooden crafting table icon, small workbench with gear and tools, warm wood, thick brown outline, transparent background, 256x256 |
| `items/Buildings/item_chickenCoop.png` | cute chicken coop icon, small red brown coop with roof, farm game style, thick brown outline, transparent background, 256x256 |
| `items/Buildings/item_barn.png` | cute barn icon, small red barn with cream doors, thick brown outline, transparent background, 256x256 |
| `items/Buildings/item_warehouse.png` | cute warehouse icon, wooden storage shed, warm brown, thick outline, transparent background, 256x256 |
| `items/Buildings/item_house.png` | cute farmhouse icon, small cozy house with red roof, thick brown outline, transparent background, 256x256 |
| `items/Buildings/item_well.png` | cute water well icon, stone well with wooden roof and bucket, thick brown outline, transparent background, 256x256 |
| `items/Buildings/item_garden.png` | cute flower garden icon, small fenced flower bed, colorful flowers, thick brown outline, transparent background, 256x256 |
| `items/Buildings/item_beehive.png` | cute beehive icon, yellow beehive box with tiny bee, thick brown outline, transparent background, 256x256 |

### 装饰

| 文件 | 提示词 |
| --- | --- |
| `items/Decorations/item_sunflower.png` | cute sunflower decoration icon, bright yellow sunflower, green leaves, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_tulip.png` | cute tulip decoration icon, red pink tulip, green stem, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_rose.png` | cute rose decoration icon, red rose bloom with leaves, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_tree.png` | cute leafy tree decoration icon, round green canopy and brown trunk, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_palmTree.png` | cute palm tree decoration icon, curved trunk and tropical leaves, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_stone.png` | cute stone decoration icon, rounded gray stones, soft highlight, thick outline, transparent background, 256x256 |
| `items/Decorations/item_log.png` | cute wooden log decoration icon, cut log with rings, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_fence.png` | cute wooden fence decoration icon, small fence segment, warm wood, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_tent.png` | cute camping tent decoration icon, pastel tent with flags, thick brown outline, transparent background, 256x256 |
| `items/Decorations/item_pumpkinLantern.png` | cute pumpkin lantern icon, orange jack-o-lantern, warm glow, thick brown outline, transparent background, 256x256 |

### 特殊物品与道具

| 文件 | 提示词 |
| --- | --- |
| `items/Special/item_mysteryBox.png` | cute mystery gift box icon, purple present box with ribbon and sparkles, thick brown outline, transparent background, 256x256 |
| `items/Special/item_luckyStar.png` | cute lucky star icon, golden star with soft glow, thick brown outline, transparent background, 256x256 |
| `items/Special/item_jade.png` | cute jade gem icon, green teal jade stone, glossy highlight, thick dark outline, transparent background, 256x256 |
| `items/Tools/item_speedTicket.png` | cute speed ticket icon, blue ticket with small clock symbol, thick brown outline, transparent background, 256x256 |
| `items/Tools/item_doubleHarvestCard.png` | cute double harvest card icon, golden card with two wheat symbols, thick brown outline, transparent background, 256x256 |
| `items/Tools/item_goldBoostCard.png` | cute gold boost card icon, gold card with coin symbol and sparkle, thick brown outline, transparent background, 256x256 |
| `items/Tools/item_universalSeed.png` | cute universal seed icon, rainbow seed pouch with tiny sprout, thick brown outline, transparent background, 256x256 |

## 最终检查清单

- 同一类资源的描边颜色一致。
- 田地、作物、UI 图标都偏暖棕描边，不要混入写实素材。
- 已解锁田地和未解锁田地必须像同一个地块的两种状态。
- 背景树木不要比 UI 主体更抢眼，饱和度略低于作物。
- 作物成熟阶段不要超过气泡和地块太多，优先低矮、横向、可收获感。
- 所有 PNG 导出后检查透明边界，避免出现 `256x295` 或底部大透明边距。

## 追加检查清单：基于首批 UI 资源评审

- 田地不能像厚按钮，必须更扁、更柔、更接近原型图里的软土块。
- 未解锁田地不能使用荧光绿，必须是低饱和浅绿色，并且轮廓和阴影与已解锁田地一致。
- UI 图标不能过度高光或过度立体，避免比主界面 UI、头像和作物更抢眼。
- 如果一批图标看起来像独立 App 图标合集，而不是同一张农场界面的组成部分，需要降低对比度和描边重量后重新生成。
- 金币、钻石、背包、齿轮、卷轴、商店这批方向可用；田地和未解锁田地优先重新生成。

## Gemini 与 ChatGPT 首批资源对比结论

图 2（ChatGPT）作为主美术方向，图 1（Gemini）作为田地结构参考。

采用策略：

- 背景、树木、头像、背包、任务卷轴、商店：优先使用 ChatGPT 版本的柔和治愈风格。
- 田地：参考 Gemini 版本更简洁、规整的轮廓，但使用 ChatGPT 版本更柔和的材质与色彩。
- 金币、钻石、齿轮：ChatGPT 版本方向可用，但需要降低高光、降低对比、减轻描边，避免比主界面 UI 更抢眼。
- 草地背景：ChatGPT 版本方向可用，但实际进游戏时应避免细节过密，必要时降低饱和度和透明度。

下一轮已解锁田地生成提示词：

```text
soft flat rounded farm soil tile, same silhouette as the Gemini sample but softer like the ChatGPT sample, low height, not a thick button, warm brown soil, subtle center cross lines, small soil spots, soft hand drawn warm brown outline, gentle shadow only, Japanese healing mobile farm game style, transparent background, 256x256
```

下一轮未解锁田地生成提示词：

```text
soft flat rounded locked grass field tile, same silhouette and perspective as the unlocked soil tile, muted light green grass, subtle center cross lines, very gentle grass texture, not neon, not too furry edges, soft hand drawn warm brown outline, gentle shadow only, Japanese healing mobile farm game style, transparent background, 256x256
```

下一轮金币、钻石、齿轮修正提示词：

```text
softer UI icon, less glossy, lower contrast, lighter outline weight, warm hand drawn cartoon style, should blend into the farm interface instead of looking like a standalone app icon, transparent background, 256x256
```

下一轮背景草地修正提示词：

```text
soft farm grass background, clean open area for farm tiles, fewer details in the center gameplay area, low saturation green, subtle tiny grass strokes only near edges, Japanese healing mobile farm game background, no text, no UI
```

## Gemini 与 ChatGPT 第二轮资源对比结论

第二轮对比中，Gemini 版本的田地更接近原型图：更扁、更简洁、透视更像铺在草地上的软土块；ChatGPT 版本整体资源更完整，背景、树木、头像、背包、商店等更适合作为主美术方向。

采用策略保持不变，但田地优先级进一步明确：

- `icon_field.png` 和 `icon_green_field.png`：优先参考 Gemini 第二轮版本的轮廓、厚度和透视。
- 田地材质：吸收 ChatGPT 第二轮版本的柔和颗粒、草边和手绘质感，但需要减少边缘杂草。
- 背景与树木：优先使用 ChatGPT 第二轮版本的方向，保持柔和、分层、治愈。
- UI 图标：ChatGPT 第二轮版本整体更成套；Gemini 图标更简洁，可作为小尺寸可读性参考。
- 头像：ChatGPT 版本更精致，Gemini 版本更接近原型的简洁圆润；最终头像应介于两者之间，减少五官细节，保留清爽可爱。

下一轮田地最终修正提示词：

```text
soft flat rounded farm soil tile, use the Gemini second-round field silhouette and low thickness as the main reference, but apply the softer hand-painted texture from the ChatGPT second-round sample, warm brown soil, subtle center cross lines, a few tiny soil spots, low contrast, not a thick button, not too many edge details, soft warm brown outline, gentle shadow only, Japanese healing mobile farm game style, transparent background, 256x256
```

下一轮未解锁田地最终修正提示词：

```text
soft flat rounded locked grass field tile, same silhouette, perspective, thickness, outline and shadow as the unlocked soil tile, use muted light green grass, subtle center cross lines, very gentle grass texture, only a few small edge grass details, not neon, not furry, not a thick button, Japanese healing mobile farm game style, transparent background, 256x256
```

下一轮 UI 图标整体修正提示词：

```text
cohesive cute farm UI icon set, softer than glossy app icons, lower contrast, warm brown outline, hand-painted but clean, readable at small size, should feel like part of the same farm interface, not separate sticker icons, transparent background, 256x256
```

## 2026-06-30 实机画面对比修正：背景与田地层次

基于当前项目实机图与原型图对比，后续资源生成需要优先修正两个问题：

1. 当前背景偏写实水彩插画，细节和空气透视较多，和 UI/田地的粗描边卡通贴纸风不完全一致。
2. 当前已解锁田地比未解锁田地少层次感，主要因为已解锁田地缺少原型图里的外圈厚边、底部投影、土块内部明暗块面。

### 背景资源修正方向

背景应该回到原型图方向：更扁平、更卡通、更像 2D 手游场景底图，而不是写实风景插画。

追加到背景提示词中的正向修正词：

```text
match the prototype mobile farm UI, flat 2D cartoon background, simplified shapes, thick soft rounded tree silhouettes, clean blue sky gradient, simple rounded distant hills, low detail grass, no realistic watercolor texture, no painterly landscape, no tiny flowers near the main play area, warm cute Japanese farm game style, background should be less detailed than UI icons and field tiles
```

背景负面提示词必须追加：

```text
realistic landscape, watercolor illustration, painterly texture, high detail grass, photographic depth, complex flowers, semi realistic mountains, oil painting, naturalistic lighting, overly soft edges
```

新的 `bg/bg_farm_sky_hills.png` 推荐提示词：

```text
vertical mobile farm game background, match the provided prototype image, flat 2D Japanese cute cartoon farm style, clear blue sky gradient, simple rounded teal green distant hills, soft curved bright green field, very few grass strokes, thick soft rounded side trees, clean open center area for farm tiles, warm pastel colors, no realistic watercolor texture, no characters, no UI, no text, 750x1334
```

### 已解锁田地修正方向

已解锁田地不能只是一个平的土色方块，需要和原型图一样有“软厚度”和“地块层次”：

- 外圈深棕描边要比内部十字线更明显。
- 底部和右下需要柔和投影，形成贴在草地上的层次。
- 土地内部需要 3-5 个低对比度土斑，不要太密。
- 中间十字线要柔和、低透明，不要像 UI 分割线。
- 已解锁和未解锁田地必须同尺寸、同透视、同描边厚度、同投影逻辑，只是材质颜色不同。

新的 `ui/icon_field.png` 推荐提示词：

```text
unlocked farm soil tile, same style as the prototype image, rounded square soft dirt plot, warm brown soil, thick soft dark brown outer outline, subtle bottom-right drop shadow, slightly raised sticker-like depth, gentle inner cross grid lines, a few low contrast soil patches, hand drawn 2D Japanese cute mobile farm game asset, transparent background, 256x256
```

新的 `ui/icon_green_field.png` 推荐提示词：

```text
locked farm tile based on the same unlocked soil tile silhouette, same rounded square shape, same thick dark brown outline, same bottom-right shadow and sticker-like depth, muted light green grass surface, subtle inner cross grid lines, very low contrast grass patches, not neon green, hand drawn 2D Japanese cute mobile farm game asset, transparent background, 256x256
```

田地负面提示词必须追加：

```text
flat plain square, no shadow, no outline, realistic soil, photo texture, button-like glossy tile, neon green, too clean, too small, mismatched perspective, different shape between locked and unlocked tiles
```

## 2026-06-30 小麦三阶段资源评审与修正

当前生成的小麦三阶段整体方向可用，阶段识别清晰：第 1 阶段是种子发芽，第 2 阶段是生长期，第 3 阶段是成熟收获期。整体描边、暖色和卡通感基本符合当前项目主题。

需要修正的问题：

- 第 1 阶段主体偏小，放到田地上会显得弱，建议放大 15%-25%。
- 第 2 阶段高度合适，但根部接地点要更集中，方便和田地中心点对齐。
- 第 3 阶段成熟小麦横向铺得较开，放到田地上可能压住边缘，建议整体缩小 10%-15%，底部茎秆中心点更集中。
- 三个阶段必须共享同一个根部接触点，避免阶段切换时作物跳动。

下一轮小麦三阶段统一修正提示词：

```text
cute hand drawn wheat crop growth stages for a Japanese cute mobile farm game, transparent background, 256x256, warm golden wheat colors, soft brown outline, consistent style with rounded 2x2 farm field tile, all three stages must share the same root contact point at the bottom center, stage 1 slightly larger and readable on a small farm tile, stage 2 root base gathered clearly at the center, stage 3 compact and not too wide, suitable for placing on a 2x2 rounded farm field tile, no text, no frame
```

小麦第 1 阶段补充：

```text
wheat stage 1, two small green leaves sprouting from golden wheat seeds, make the sprout and seeds 15 to 25 percent larger than the current sample, clear bottom center contact point, readable at small size
```

小麦第 2 阶段补充：

```text
wheat stage 2, young wheat plant with several green stalks and small golden tips, compact vertical shape, roots gathered at one bottom center point, not scattered, readable on farm tile
```

小麦第 3 阶段补充：

```text
wheat stage 3, mature golden wheat bunch, compact harvest cluster, 10 to 15 percent smaller than the current wide sample, not too wide, bottom stalks gathered at one center contact point, should not cover the whole field tile
```

小麦负面提示词：

```text
too tiny, too wide, scattered root points, different anchor points between stages, realistic wheat photo, overly detailed grains, harsh shadow, 3d render, blurry, text, watermark, frame
```

## 作物三阶段与图鉴展示图的区分

后续作物资源必须区分两类图片：

1. `item_{crop}_stage_1/2/3.png` 是田地里的生长阶段图，必须保持从种子、幼苗到成熟植株的连续过渡。
2. `item_{crop}.png` 是背包/图鉴/商店展示图，可以是单个收获物图标，例如单颗番茄、单根玉米棒。

重要规则：

- 完全成熟期不是图鉴收获物图标，不能突然从根状植株变成只有果实。
- 番茄完全成熟期应该保留植株/藤蔓/根部接触点，只是在植株上挂满成熟番茄。
- 单颗番茄只用于图鉴、背包、商店展示图，不用于 `item_tomato_stage_3.png`。
- 玉米完全成熟期应该是田地里的完整玉米植株，有主茎、叶片、玉米棒和顶部玉穗。
- 单根玉米棒只用于图鉴、背包、商店展示图，不用于 `item_corn_stage_3.png`。

番茄完全成熟期修正提示词：

```text
tomato stage 3 mature plant for farm field, full tomato plant with visible central stem, green leaves, vines, several ripe red tomatoes attached to the plant, bottom root contact point centered, continuous transition from tomato seedling stage, not just harvested fruit, not a single tomato icon, suitable for placement on a 2x2 rounded farm field tile, transparent background, 256x256
```

玉米完全成熟期修正提示词：

```text
corn stage 3 mature plant for farm field, full standing corn plant like the prototype reference, central green stalk, broad curved leaves, two yellow corn cobs attached to the stalk, small golden tassel at the top, bottom root contact point centered, continuous transition from corn seedling stage, not just a corn cob icon, suitable for placement on a 2x2 rounded farm field tile, transparent background, 256x256
```

图鉴/背包展示图补充：

```text
catalog item icon version, harvested crop only, isolated single harvest object, tomato as one plump red tomato, corn as one peeled yellow corn cob, no roots, no full plant, no soil, transparent background, 256x256
```

## 单体物品与农作物阶段资源规范

### 一、整体风格规范 Global Style Guidelines

正向 Prompt Key：

```text
isolated single item icon, cute chibi style, vector illustration, flat color, rounded corners, pastel colors, minimalist hand-drawn vector outline, soft gradients, clean lines, mass front, neat lines, friendly, minimalist composition, 2D asset
```

负向 Prompt Key：

```text
photorealistic, complex textures, harsh shadows, sharp edges, 3D render, text, multi items, busy background
```

### 二、蔬菜类农作物 Vegetables

Grouped by crop, listed by crop growth stage. Use item names from `Moefarm_items_and_recipes.md`.

#### A01 小麦 Wheat

Stage 1 Seed:

```text
Single isolated plump golden-brown wheat seed kernel, chibi rounded shape.
```

Stage 2 Sprout:

```text
Young wheat seedling, a few delicate green shoots emerging from a single golden-brown seed base.
```

Stage 3 Mature:

```text
Full rounded bunch of golden-brown wheat stalks with heavy stylized seed heads, tied with a ribbon.
```

#### A02 玉米 Corn

Stage 1 Seed:

```text
Single teardrop-shaped simplified bright yellow corn kernel.
```

Stage 2 Sprout:

```text
Corn seedling with strong central stalk and broad rounded green leaves.
```

Stage 3 Mature:

```text
Isolated ear of corn with simplified bright yellow kernels and peeled back green husk.
```

#### A03 番茄 Tomato

Stage 1 Seed:

```text
Cluster of tiny simplified flattened tan tomato seeds.
```

Stage 2 Sprout:

```text
Tomato seedling with young central stem and first rounded green leaves.
```

Stage 3 Mature:

```text
Single isolated round bright red tomato icon with small green leafy calyx.
```

#### A04 胡萝卜 Carrot

Stage 1 Seed:

```text
Small simplified elongated tan carrot seed.
```

Stage 2 Sprout:

```text
Few delicate green leafy fronds of a carrot seedling emerging.
```

Stage 3 Mature:

```text
Single isolated orange carrot with rounded body and leafy green top fronds.
```

### 三、水果类农作物 Fruits

#### A06 草莓 Strawberry

Stage 1 Seed:

```text
Small simplified cluster of tiny tan strawberry seeds.
```

Stage 2 Sprout:

```text
Young strawberry plant with first cluster of rounded green leaves and tiny white blossom.
```

Stage 3 Mature:

```text
Single isolated plump bright red strawberry with tiny seeds and simplified green leafy top.
```
