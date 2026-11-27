# 后端静态资源使用审计

审计范围：`Server/assets/textures`。运行时路径来源为 `ImageCache.ts`，同时包含启动预加载、建筑合并图和四季作物阶段图的动态路径。

## 结论

- PNG 文件总数：580 → 546 → 538
- 当前可能使用的运行时 PNG 路径：503 → 495
- 当前未被运行时代码引用的 PNG：77 → 43
- 已物理删除的未引用室内场景 PNG：34
- 已删除的孤立切图元数据 JSON：1
- 花房阶段图请求：12 张独立图片 → 4 张三阶段雪碧图
- 释放文件体积：22,177,971 字节（21.15 MiB）
- 物品请求键：246
- UI 请求键：268 → 240
- 已取消的唯一请求路径：24
- 缺失运行时资源：0
- HTTP HEAD 失败：0

前端已停止请求确认未使用的路径；本次又从后端静态目录物理删除 34 张未引用的室内场景图片和 1 个随旧牛棚合并图遗留的 JSON。仍在请求的合并图、花盆/扩展按钮、动物交互素材以及对应清单均保留。

## 花房三阶段雪碧图

向日葵、普通花、郁金香、玫瑰各使用一张横向 `1536 x 512` 雪碧图，阶段 1/2/3 的帧坐标依次为 `x=0/512/1024`。12 张独立阶段图已由以下 4 张运行时图片替代，唯一请求路径减少 8 条：

- `textures/ui/farm/flowerhouse/growth/flower_sunflower_stages_sheet.png`
- `textures/ui/farm/flowerhouse/growth/flower_flower_stages_sheet.png`
- `textures/ui/farm/flowerhouse/growth/flower_tulip_stages_sheet.png`
- `textures/ui/farm/flowerhouse/growth/flower_rose_stages_sheet.png`

玫瑰成熟帧已补全顶部花冠，透明边界从 `y=152` 上移至 `y=114`，底部基线继续保持在 `y=480`。

## 本次物理删除的室内场景文件

- `textures/ui/farm/common/interior_scene_fillers/flowerhouse_fill_overlay.png`
- `textures/ui/farm/common/interior_scene_fillers/greenhouse_fill_overlay.png`
- `textures/ui/farm/common/interior_scenes/bg_barn_complete_v2.png`
- `textures/ui/farm/common/interior_scenes/bg_barn_consistent.png`
- `textures/ui/farm/common/interior_scenes/bg_barn_v2.png`
- `textures/ui/farm/common/interior_scenes/bg_barn_v3.png`
- `textures/ui/farm/common/interior_scenes/bg_barn.png`
- `textures/ui/farm/common/interior_scenes/bg_beehive.png`
- `textures/ui/farm/common/interior_scenes/bg_chicken.png`
- `textures/ui/farm/common/interior_scenes/bg_flowerhouse.png`
- `textures/ui/farm/common/interior_scenes/bg_greenhouse.png`
- `textures/ui/farm/flowerhouse/growth/flower_all_stages_atlas.png`
- `textures/ui/farm/flowerhouse/growth/flower_flower_stages_sheet.png`
- `textures/ui/farm/flowerhouse/growth/flower_rose_stages_sheet.png`
- `textures/ui/farm/flowerhouse/growth/flower_sunflower_stages_sheet.png`
- `textures/ui/farm/flowerhouse/growth/flower_tulip_stages_sheet.png`
- `textures/ui/farm/livestock/barn/avatar_barn_dada_frameless.png`
- `textures/ui/farm/livestock/barn/avatar_barn_dada.png`
- `textures/ui/farm/livestock/barn/avatar_barn_moomoo_frameless.png`
- `textures/ui/farm/livestock/barn/avatar_barn_moomoo.png`
- `textures/ui/farm/livestock/barn/barn_sprite_sheet_v2.png`
- `textures/ui/farm/livestock/barn/barn_sprite_sheet.png`
- `textures/ui/farm/livestock/barn/cow_barn_dada_full_v2.png`
- `textures/ui/farm/livestock/barn/cow_barn_dada_full.png`
- `textures/ui/farm/livestock/barn/cow_barn_moomoo_full_v2.png`
- `textures/ui/farm/livestock/barn/cow_barn_moomoo_full.png`
- `textures/ui/farm/livestock/barn/fence_barn_left_v2.png`
- `textures/ui/farm/livestock/barn/fence_barn_left.png`
- `textures/ui/farm/livestock/barn/fence_barn_right_v2.png`
- `textures/ui/farm/livestock/barn/fence_barn_right.png`
- `textures/ui/farm/livestock/barn/panel_barn_cow_status.png`
- `textures/ui/farm/livestock/barn/product_milk_front.png`
- `textures/ui/farm/livestock/barn/selection_barn_cow.png`
- `textures/ui/farm/livestock/barn/slot_barn_milk_cubby.png`
- `textures/ui/farm/livestock/barn/barn_sprite_sheet.json`

## 已取消请求的路径

- `textures/avatar/avatar_farmgirl.png`
- `textures/ui/craft/icons/icon_craft_arrow.png`
- `textures/ui/farm/common/dialogs/btn_crop_speedup.png`
- `textures/ui/farm/common/interior_scene_fillers/flowerhouse_fill_overlay.png`
- `textures/ui/farm/common/interior_scene_fillers/greenhouse_fill_overlay.png`
- `textures/ui/farm/home/icon_building_pad.png`
- `textures/ui/farm/home/icon_green_field.png`
- `textures/ui/farm/livestock/barn/avatar_barn_dada.png`
- `textures/ui/farm/livestock/barn/avatar_barn_dada_frameless.png`
- `textures/ui/farm/livestock/barn/avatar_barn_moomoo.png`
- `textures/ui/farm/livestock/barn/avatar_barn_moomoo_frameless.png`
- `textures/ui/farm/livestock/barn/barn_sprite_sheet.png`
- `textures/ui/farm/livestock/barn/cow_barn_dada_full.png`
- `textures/ui/farm/livestock/barn/cow_barn_moomoo_full.png`
- `textures/ui/farm/livestock/barn/fence_barn_left.png`
- `textures/ui/farm/livestock/barn/fence_barn_right.png`
- `textures/ui/farm/livestock/barn/panel_barn_cow_status.png`
- `textures/ui/farm/livestock/barn/product_milk_front.png`
- `textures/ui/farm/livestock/barn/selection_barn_cow.png`
- `textures/ui/farm/livestock/barn/slot_barn_milk_cubby.png`
- `textures/ui/shop/icons/icon_shop_seeds.png`
- `textures/ui/shop/icons/icon_shop_tools.png`
- `textures/ui/shop/tabs/shop_tabs_seeds.png`
- `textures/ui/shop/tabs/shop_tabs_tools.png`

## 当前未被运行时代码引用的 PNG

- `textures/avatar/avatar_farmgirl.png`
- `textures/items/Buildings/item_barn.png`
- `textures/items/Buildings/item_beehive.png`
- `textures/items/Buildings/item_chickenCoop.png`
- `textures/items/Buildings/item_fourSeasonGreenhouse.png`
- `textures/items/Buildings/item_garden.png`
- `textures/items/Buildings/item_house.png`
- `textures/items/Buildings/item_warehouse.png`
- `textures/items/Buildings/item_well.png`
- `textures/ui/common/navigation/seasons/autumn/icon_bag.png`
- `textures/ui/common/navigation/seasons/autumn/icon_catalog.png`
- `textures/ui/common/navigation/seasons/autumn/icon_gear.png`
- `textures/ui/common/navigation/seasons/autumn/icon_quest.png`
- `textures/ui/common/navigation/seasons/spring/icon_bag.png`
- `textures/ui/common/navigation/seasons/spring/icon_catalog.png`
- `textures/ui/common/navigation/seasons/spring/icon_gear.png`
- `textures/ui/common/navigation/seasons/spring/icon_quest.png`
- `textures/ui/common/navigation/seasons/summer/icon_bag.png`
- `textures/ui/common/navigation/seasons/summer/icon_catalog.png`
- `textures/ui/common/navigation/seasons/summer/icon_gear.png`
- `textures/ui/common/navigation/seasons/summer/icon_quest.png`
- `textures/ui/common/navigation/seasons/winter/icon_bag.png`
- `textures/ui/common/navigation/seasons/winter/icon_catalog.png`
- `textures/ui/common/navigation/seasons/winter/icon_gear.png`
- `textures/ui/common/navigation/seasons/winter/icon_quest.png`
- `textures/ui/craft/icons/icon_craft_arrow.png`
- `textures/ui/farm/common/dialogs/btn_crop_speedup.png`
- `textures/ui/farm/home/icon_building_pad.png`
- `textures/ui/farm/home/icon_green_field.png`
- `textures/ui/farm/home/locked_field_seasons_sheet.png`
- `textures/ui/farm/home/seasons/autumn/icon_building_pad.png`
- `textures/ui/farm/home/seasons/autumn/icon_field.png`
- `textures/ui/farm/home/seasons/spring/icon_building_pad.png`
- `textures/ui/farm/home/seasons/spring/icon_field.png`
- `textures/ui/farm/home/seasons/summer/icon_building_pad.png`
- `textures/ui/farm/home/seasons/summer/icon_field.png`
- `textures/ui/farm/home/seasons/winter/icon_building_pad.png`
- `textures/ui/farm/home/seasons/winter/icon_field.png`
- `textures/ui/farm/pasture/locked_pasture_seasons_sheet.png`
- `textures/ui/shop/icons/icon_shop_seeds.png`
- `textures/ui/shop/icons/icon_shop_tools.png`
- `textures/ui/shop/tabs/shop_tabs_seeds.png`
- `textures/ui/shop/tabs/shop_tabs_tools.png`

## 保留的室内场景核心资源

- `textures/ui/farm/common/interior_scenes/interior_scenes_sheet.png`
- `textures/ui/farm/common/interior_scenes/interior_scenes_sheet.json`
- `textures/ui/farm/common/interior_scene_fillers/manifest.json`
- `textures/ui/farm/common/interior_scene_fillers/slot_plus_manifest.json`
- `textures/ui/farm/livestock/barn/pointer_barn_cow.png`
- `textures/ui/farm/livestock/barn/panel_barn_selected_cow.png`
- `textures/ui/farm/livestock/barn/btn_barn_feed.png`
- `textures/ui/farm/livestock/barn/btn_barn_milk.png`
- `textures/ui/farm/livestock/barn/btn_barn_groom.png`
- `textures/ui/farm/livestock/barn/icon_barn_milk_cup.png`

## 非 PNG 支持文件

以下 JSON/SVG 用于运行时切图、生成或设计追溯，不属于独立 PNG 请求清单：

- `textures/items/Buildings/item_buildings_sheet.json`
- `textures/items/crop_season_variants_manifest.json`
- `textures/ui/farm/common/interior_scene_fillers/manifest.json`
- `textures/ui/farm/common/interior_scene_fillers/slot_plus_manifest.json`
- `textures/ui/farm/common/interior_scenes/interior_scenes_sheet.json`
- `textures/ui/task/tabs/task_tabs_branch.svg`
- `textures/ui/task/tabs/task_tabs_daily.svg`
- `textures/ui/task/tabs/task_tabs_main.svg`
- `textures/ui/task/tabs/task_tabs_special.svg`

## 复查命令

```powershell
python Server/tools/audit_static_assets.py --base-url http://127.0.0.1:3000/assets --json-out artifacts/flowerhouse-growth-sprite-sheets-20260824/modified-audit.json
```
