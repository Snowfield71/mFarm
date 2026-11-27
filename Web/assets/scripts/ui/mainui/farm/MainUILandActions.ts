/** Extracted from MainUILand.ts; preserves the original gameplay behavior. */
import {
  Button,
  Color,
  Graphics,
  Label,
  LabelOutline,
  Mask,
  Node,
  ScrollView,
  Tween,
  UIOpacity,
  UITransform,
  Vec2,
  Vec3,
  tween,
  view,
} from "cc";
import { Design, GameValues } from "../../../config/GameConfig";
import { GameManager } from "../../../core/GameManager";
import { InventorySystem } from "../../../systems/InventorySystem";
import { LandBlock, LandSystem } from "../../../systems/LandSystem";
import {
  getItem,
  getPlantableCrops,
  ITEM_DB,
  ItemCategory,
  ItemDef,
} from "../../../config/ItemConfig";
import { fillRect, fillRoundRect, strokeRoundRect } from "../../utils/UIDraw";
import {
  ENFORCE_FARM_SEASON_RESTRICTION,
  getSeasonInfo,
  isSeasonAllowed,
} from "../../../config/SeasonConfig";
import { animateItemToInventory } from "../shared/MainUIRewardAnimation";
import { showCropMaturityDialog } from "./MainUICropSpeedUp";
import { animateHarvest, clearSelectedLand, clearSelectedPasture, getPasturePosition, showSelectedLand, showSelectedPasture, updateHarvestAllButton, updateSideCollectButtonVisual } from "./MainUILandView";
import { isLivestockBuilding } from "./MainUILandShared";



export function handleLandClick(ui: any, blockId: number) {
  const land = LandSystem.getInstance();
  const block = land.getBlock(blockId);
  if (!block) return;

  if (ui.demolitionMode) {
    ui.closeSeedBubble();
    const tile = ui.landTiles.find(
      (item: Node) => item.name === `Land_${blockId}`,
    );
    if (
      block.cropType &&
      (block.state === "growing" || block.state === "harvesting")
    ) {
      playDemolitionAnimation(
        ui,
        tile,
        tile?.getChildByName("CropIcon"),
        () => {
          if (!land.removeCrop(blockId)) return;
          ui.refreshLandBlock(blockId);
          ui.setShovelMode(false);
          ui.toast("作物已铲除");
        },
      );
      return;
    }
    if (block.buildingId && block.state === "occupied") {
      const buildingId = block.buildingId;
      playDemolitionAnimation(
        ui,
        tile,
        tile?.getChildByName("OccupiedMarker"),
        () => {
          if (!land.removeLandOccupant(blockId)) return;
          ui.refreshLandBlock(blockId);
          ui.setShovelMode(false);
          ui.toast(`${ui.itemName(buildingId)}已销毁`);
        },
      );
      return;
    }
    ui.toast("这里没有可铲除的作物或建筑");
    return;
  }

  if (block.state === "empty") {
    if (ui.selectedSeedId) {
      ui.plantCrop(blockId, ui.selectedSeedId);
    } else {
      if (ui.activeBubbleLandId === blockId) {
        ui.closeSeedBubble();
        return;
      }
      if (
        ui.activeBubbleLandId >= 0 &&
        Math.floor(ui.activeBubbleLandId / ui.constructor.LAND_COLS) ===
          Math.floor(blockId / ui.constructor.LAND_COLS)
      ) {
        ui.openSeedBubble(blockId);
        return;
      }
      ui.openSeedBubble(blockId);
    }
    return;
  }

  if (block.state === "growing") {
    showCropMaturityDialog(ui, {
      title: "加速成熟",
      progress: () => land.getBlock(blockId)?.progress || 0,
      complete: () => land.speedUpCrop(blockId),
      refresh: () => ui.refreshLandBlock(blockId),
      successText: "作物已成熟",
    });
    return;
  }

  if (block.state === "occupied") {
    ui.handleOccupiedBuilding(blockId);
    return;
  }

  if (block.state === "harvesting") {
    const cropId = land.harvestCrop(blockId);
    if (!cropId) return;
    const def = getItem(cropId);
    const count = Math.max(1, Math.round(
      (def?.harvestCount ?? 1) *
      GameManager.getInstance().consumeHarvestMultiplier()));
    InventorySystem.getInstance().addItem(cropId, count);
    const rewardTile = ui.landTiles.find(
      (tile: Node) => tile.name === `Land_${blockId}`,
    );
    const rewardAnimated =
      !!rewardTile &&
      animateItemToInventory(
        ui,
        cropId,
        count,
        rewardTile.worldPosition.clone(),
      );
    GameManager.getInstance().addExperience(land.getHarvestExperience());
    ui.refreshTopBar();
    animateHarvest(ui, blockId, cropId, count, () => {
      ui.refreshLandBlock(blockId);
      if (!rewardAnimated) ui.toast(`收获 ${ui.itemName(cropId)} x${count}`);
    });
    updateHarvestAllButton(ui);
    return;
  }

  ui.toast("这块田地暂时被占用");
}


export function playDemolitionAnimation(
  ui: any,
  tile: Node | undefined,
  visual: Node | null | undefined,
  onComplete: () => void,
) {
  if (!tile || !visual) {
    onComplete();
    return;
  }
  if ((tile as any).__demolishing) return;
  (tile as any).__demolishing = true;
  const shovel = new Node("DemolitionShovel");
  shovel.addComponent(UITransform).setContentSize(44, 44);
  shovel.setPosition(21, 30);
  shovel.angle = 28;
  ui.applyUiIcon("entryShovel", shovel);
  tile.addChild(shovel);
  shovel.setSiblingIndex(tile.children.length - 1);

  const opacity =
    visual.getComponent(UIOpacity) || visual.addComponent(UIOpacity);
  opacity.opacity = 255;
  tween(shovel)
    .to(
      0.11,
      {
        position: new Vec3(4, 10, 0),
        angle: -34,
        scale: new Vec3(1.08, 1.08, 1),
      },
      { easing: "quadIn" },
    )
    .to(
      0.1,
      {
        position: new Vec3(13, 20, 0),
        angle: 8,
        scale: new Vec3(0.92, 0.92, 1),
      },
      { easing: "quadOut" },
    )
    .start();
  tween(visual)
    .delay(0.07)
    .to(0.08, { scale: new Vec3(1.08, 0.92, 1) }, { easing: "quadOut" })
    .to(0.14, { scale: new Vec3(0.12, 0.12, 1) }, { easing: "backIn" })
    .call(onComplete)
    .start();
  tween(opacity)
    .delay(0.11)
    .to(0.16, { opacity: 0 }, { easing: "quadIn" })
    .start();
}


export function harvestAllMatureCrops(ui: any) {
  const land = LandSystem.getInstance();
  const matureBlocks = land
    .getAllBlocks()
    .filter((block) => block.state === "harvesting" && block.cropType)
    // Land ids follow the visual grid: left-to-right, then top-to-bottom.
    .sort((a, b) => a.id - b.id);
  if (matureBlocks.length === 0) {
    ui.toast("没有成熟作物");
    updateHarvestAllButton(ui);
    return;
  }

  const gm = GameManager.getInstance();
  const ready = matureBlocks.map((block) => {
    // Consume at most one double-harvest charge per mature plot. Once the
    // remaining charges are exhausted, later plots use the normal multiplier.
    const harvestMultiplier = gm.consumeHarvestMultiplier();
    return {
      blockId: block.id,
      cropId: block.cropType as string,
      count: Math.max(1, Math.round(
        (getItem(block.cropType as string)?.harvestCount ?? 1) *
        harvestMultiplier)),
    };
  });

  let harvestedKinds = 0;
  let totalCount = 0;
  let remainingAnimations = ready.length;
  let rewardAnimated = false;

  for (const item of ready) {
    const cropId = land.harvestCrop(item.blockId);
    if (!cropId) {
      remainingAnimations--;
      continue;
    }
    harvestedKinds++;
    totalCount += item.count;
    InventorySystem.getInstance().addItem(cropId, item.count);
    const rewardTile = ui.landTiles.find(
      (tile: Node) => tile.name === `Land_${item.blockId}`,
    );
    if (rewardTile) {
      rewardAnimated =
        animateItemToInventory(
          ui,
          cropId,
          item.count,
          rewardTile.worldPosition.clone(),
        ) || rewardAnimated;
    }
    GameManager.getInstance().addExperience(land.getHarvestExperience());
    animateHarvest(
      ui,
      item.blockId,
      cropId,
      item.count,
      () => {
        remainingAnimations--;
        if (remainingAnimations <= 0) {
          ui.refreshLand();
          if (!rewardAnimated) {
            ui.toast(`一键收取 ${harvestedKinds} 块 x${totalCount}`);
          }
        }
      },
      true,
    );
  }

  ui.refreshTopBar();
  updateHarvestAllButton(ui);
}


export function handleLockedLandClick(ui: any, index: number) {
  const land = LandSystem.getInstance();
  const gm = GameManager.getInstance();
  const currentCount = land.getUnlockedCount();
  const unlockIndex = currentCount;
  const nextBlockId = land.getNextUnlockBlockId();
  const maxVisibleLand = Math.min(
    GameValues.MAX_LAND,
    ui.constructor.LAND_COLS * ui.constructor.LAND_ROWS,
  );

  if (unlockIndex >= maxVisibleLand || nextBlockId === null) {
    ui.toast("田地已全部解锁");
    return;
  }
  if (index !== nextBlockId) {
    ui.toast("请按石板标记顺序解锁");
    return;
  }

  const needLevel = ui.getNextLandUnlockLevel(unlockIndex);
  if (gm.playerLevel >= needLevel) {
    ui.suppressNextLandExpandedRefresh = true;
    land.expandBlocks(unlockIndex + 1);
    ui.toast("新田地解锁");
    ui.animateUnlockLand(nextBlockId);
    return;
  }

  ui.showDialog(
    "扩建田地",
    `达到 Lv.${needLevel} 后可免费解锁\n也可消耗 ${ui.constructor.LAND_UNLOCK_DIAMOND} 钻石提前扩建`,
    [
      { text: "稍后", cb: () => {} },
      {
        text: "扩建",
        cb: () => {
          if (!gm.spendDiamond(ui.constructor.LAND_UNLOCK_DIAMOND)) {
            ui.toast("钻石不足");
            return;
          }
          ui.suppressNextLandExpandedRefresh = true;
          land.expandBlocks(unlockIndex + 1);
          ui.refreshTopBar();
          ui.animateUnlockLand(nextBlockId);
          ui.toast("扩建成功");
        },
      },
    ],
  );
}


export function plantCrop(ui: any, blockId: number, cropId: string) {
  const inv = InventorySystem.getInstance();
  if (!inv.hasItems(cropId, 1)) {
    ui.selectedSeedId = null;
    ui.toast("种子不足");
    return;
  }
  const land = LandSystem.getInstance();
  if (!land.plantCrop(blockId, cropId)) {
    if (land.getLastPlantError() === "season") {
      ui.closeSeedBubble();
      const hasGreenhouseCard = inv.hasItems("greenhouseCard", 1);
      ui.showDialog(
        "非当季作物",
        "当前并非该作物生长季节，可前往合成工坊改造种子，或使用温室地块种植",
        [
          { text: "去合成", cb: () => ui.showPanel("craft") },
          hasGreenhouseCard
            ? {
                text: "使用温室卡",
                cb: () => {
                  if (
                    !land.activateGreenhouse(blockId) ||
                    !inv.removeItem("greenhouseCard", 1)
                  ) {
                    ui.toast("温室卡使用失败");
                    return;
                  }
                  ui.toast("该地块已获得7天恒温效果");
                  plantCrop(ui, blockId, cropId);
                },
              }
            : {
                text: "了解温室",
                cb: () => ui.toast("温室卡可让单块田地7天内跨季种植"),
              },
        ],
      );
      return;
    }
    ui.toast("这块田不能种植");
    return;
  }
  inv.removeItem(cropId, 1);
  ui.selectedSeedId = null;
  ui.closeSeedBubble();
  ui.toast("种植成功");
  ui.refreshLandBlock(blockId);
  ui.animatePlanting(blockId);
}


export function plantUniversalSeed(ui: any, blockId: number) {
  const inventory = InventorySystem.getInstance();
  if (!inventory.hasItems("universalSeed", 1)) {
    ui.toast("万能种子不足");
    return;
  }
  const gm = GameManager.getInstance();
  const greenhouse = LandSystem.getInstance().isGreenhouseActive(blockId);
  const candidates = getPlantableCrops().filter(
    (seed) =>
      seed.unlockLevel <= gm.playerLevel &&
      (!ENFORCE_FARM_SEASON_RESTRICTION ||
        greenhouse ||
        isSeasonAllowed(seed.seasons)),
  );
  if (candidates.length === 0) {
    ui.toast("当前没有可种植的作物");
    return;
  }
  const seed = candidates[Math.floor(Math.random() * candidates.length)];
  if (!LandSystem.getInstance().plantCrop(blockId, seed.id, true)) {
    ui.toast("这块田不能种植");
    return;
  }
  inventory.removeItem("universalSeed", 1);
  ui.selectedSeedId = null;
  ui.closeSeedBubble();
  ui.refreshLandBlock(blockId);
  ui.animatePlanting(blockId);
  ui.toast(`万能种子随机种下 ${getItem(seed.cropId || "")?.name || seed.name}`);
}


export function ownedPlantableCrops(_ui: any): ItemDef[] {
  const gm = GameManager.getInstance();
  const inv = InventorySystem.getInstance();
  const crops = getPlantableCrops().filter(
    (c) =>
      c.unlockLevel <= gm.playerLevel &&
      inv.hasItems(c.id, 1) &&
      (!ENFORCE_FARM_SEASON_RESTRICTION || isSeasonAllowed(c.seasons)),
  );
  const universalSeed = getItem("universalSeed");
  if (
    universalSeed &&
    universalSeed.unlockLevel <= gm.playerLevel &&
    inv.hasItems(universalSeed.id, 1)
  ) {
    crops.unshift(universalSeed);
  }
  return crops;
}


export function openSeedBubble(ui: any, blockId: number) {
  const crops = ui.ownedPlantableCrops();
  if (crops.length === 0) {
    ui.toast("没有种子，请点击右侧商城补充");
    ui.pulseShopEntry();
    return;
  }

  ui.bubbleRoot.removeAllChildren();
  ui.activeBubbleLandId = blockId;
  showSelectedLand(ui, blockId);

  const mask = new Node("BubbleMask");
  mask
    .addComponent(UITransform)
    .setContentSize(Design.WIDTH, view.getVisibleSize().height);
  fillRect(
    mask,
    Design.WIDTH,
    view.getVisibleSize().height,
    new Color(0, 0, 0, 0),
  );
  mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    const targetBlockId = getTouchedLandBlockId(ui, event);
    ui.scheduleOnce(() => {
      if (targetBlockId >= 0) ui.handleLandClick(targetBlockId);
      else ui.closeSeedBubble();
    }, 0);
  });
  ui.bubbleRoot.addChild(mask);

  const itemSize = 48;
  const cols = 4;
  const rows = Math.ceil(crops.length / cols);
  const visibleRows = 2;
  const gapX = 9;
  const gapY = 6;
  const w = 258;
  const viewportH = visibleRows * itemSize + (visibleRows - 1) * gapY;
  const contentH = Math.max(
    viewportH,
    rows * itemSize + Math.max(0, rows - 1) * gapY,
  );
  const h = 145;
  const landPos = ui.getLandPosition(blockId);

  const bubble = new Node("SeedBubble");
  bubble.addComponent(UITransform).setContentSize(w, h);
  bubble.setPosition(getSeedBubblePosition(ui, landPos, w, h));
  bubble.on(Node.EventType.TOUCH_END, (event: any) =>
    event?.stopPropagation?.(),
  );
  ui.bubbleRoot.addChild(bubble);
  const background = new Node("SeedBubbleBackground");
  background.addComponent(UITransform).setContentSize(w, h);
  ui.applyUiIcon("seedSelectorBg", background);
  bubble.addChild(background);

  const viewport = new Node("SeedViewport");
  viewport.addComponent(UITransform).setContentSize(w - 24, viewportH);
  viewport.setPosition(0, 0);
  viewport.addComponent(Mask);
  bubble.addChild(viewport);

  const content = new Node("SeedContent");
  const gridW = cols * itemSize + (cols - 1) * gapX;
  content.addComponent(UITransform).setContentSize(gridW, contentH);
  viewport.addChild(content);

  const startX = -gridW / 2 + itemSize / 2;
  const startY = contentH / 2 - itemSize / 2;
  crops.forEach((crop, index) => {
    const cell = new Node(`Seed_${crop.id}`);
    cell.addComponent(UITransform).setContentSize(itemSize, itemSize);
    cell.setPosition(
      startX + (index % cols) * (itemSize + gapX),
      startY - Math.floor(index / cols) * (itemSize + gapY),
    );
    fillRoundRect(cell, 46, 46, 10, new Color(255, 252, 235, 244));
    strokeRoundRect(cell, 46, 46, 10, new Color(173, 112, 62, 180), 1.4);

    const icon = ui.createItemIcon(crop.id, 33);
    icon.setPosition(0, 5);
    cell.addChild(icon);
    cell.addChild(
      ui.makeLabel(
        ui.itemName(crop.id),
        8,
        new Color(78, 50, 30),
        false,
        0,
        -17,
        itemSize - 4,
        11,
      ),
    );
    cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
      const target = ui.activeBubbleLandId;
      ui.scheduleOnce(() => {
        if (target < 0) return;
        const targetBlock = LandSystem.getInstance().getBlock(target);
        if (!targetBlock || targetBlock.state !== "empty") {
          ui.toast("这块田地当前不能种植");
          return;
        }
        if (!InventorySystem.getInstance().hasItems(crop.id, 1)) {
          ui.toast("种子不足");
          return;
        }
        if (crop.id === "universalSeed") ui.plantUniversalSeed(target);
        else ui.plantCrop(target, crop.id);
      }, 0);
    });
    content.addChild(cell);
  });

  if (rows > visibleRows) {
    const scrollView = viewport.addComponent(ScrollView);
    scrollView.horizontal = false;
    scrollView.vertical = true;
    scrollView.inertia = true;
    (scrollView as any).elastic = false;
    scrollView.content = content;
    ui.scheduleOnce(() => {
      if (viewport.isValid && content.isValid) scrollView.scrollToTop(0);
    }, 0);
  }

  bubble.scale = new Vec3(0.7, 0.7, 1);
  tween(bubble)
    .to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
    .start();
}


export function getSeedBubblePosition(
  ui: any,
  landPos: { x: number; y: number },
  bubbleW: number,
  bubbleH: number,
): Vec3 {
  const currentRowY = ui.landRoot.position.y + landPos.y * ui.landRoot.scale.y;
  const previousRowOffset =
    (ui.constructor.TILE_SIZE + ui.constructor.TILE_GAP) * ui.landRoot.scale.y;
  const vs = view.getVisibleSize();
  const margin = 8;
  const targetX = ui.landRoot.position.x;
  const targetY = currentRowY + previousRowOffset;
  return new Vec3(
    Math.max(
      -vs.width / 2 + bubbleW / 2 + margin,
      Math.min(vs.width / 2 - bubbleW / 2 - margin, targetX),
    ),
    Math.max(
      -vs.height / 2 + bubbleH / 2 + 88,
      Math.min(vs.height / 2 - bubbleH / 2 - 148, targetY),
    ),
    0,
  );
}


export function openBuildingBubble(ui: any, slotId: number) {
  const inventory = InventorySystem.getInstance();
  const buildings = Object.keys(ITEM_DB)
    .map((id) => ITEM_DB[id])
    .filter(
      (item) =>
        (item.category === ItemCategory.BUILDING ||
          item.category === ItemCategory.DECORATION) &&
        inventory.hasItems(item.id, 1),
    )
    .sort((a, b) => a.unlockLevel - b.unlockLevel);
  if (buildings.length === 0) {
    ui.toast("背包中没有可放置的建筑");
    return;
  }
  ui.bubbleRoot.removeAllChildren();
  ui.activePastureSlotId = slotId;
  showSelectedPasture(ui, slotId);

  const mask = new Node("BuildingBubbleMask");
  mask
    .addComponent(UITransform)
    .setContentSize(Design.WIDTH, view.getVisibleSize().height);
  fillRect(
    mask,
    Design.WIDTH,
    view.getVisibleSize().height,
    new Color(0, 0, 0, 0),
  );
  mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    const targetSlotId = getTouchedPastureSlotId(ui, event);
    ui.scheduleOnce(
      () =>
        targetSlotId >= 0
          ? ui.handlePastureClick(targetSlotId)
          : ui.closeBuildingBubble(),
      0,
    );
  });
  ui.bubbleRoot.addChild(mask);

  const itemSize = 58;
  const cols = Math.min(4, buildings.length);
  const rows = Math.ceil(buildings.length / cols);
  const visibleRows = Math.min(2, rows);
  const gap = 6;
  const width = cols * itemSize + (cols - 1) * gap + 18;
  const viewportHeight = visibleRows * itemSize + (visibleRows - 1) * gap;
  const contentHeight = rows * itemSize + (rows - 1) * gap;
  const height = viewportHeight + 20;
  const visibleSize = view.getVisibleSize();
  const y = Math.min(
    visibleSize.height / 2 - height / 2 - 150,
    ui.pastureRoot.position.y + 190 * ui.pastureRoot.scale.y,
  );

  const bubble = new Node("BuildingBubble");
  bubble.addComponent(UITransform).setContentSize(width, height);
  bubble.setPosition(0, y);
  fillRoundRect(bubble, width, height, 13, new Color(255, 249, 226, 252));
  strokeRoundRect(bubble, width, height, 13, new Color(148, 105, 63, 210), 2);
  bubble.on(Node.EventType.TOUCH_END, (event: any) =>
    event?.stopPropagation?.(),
  );
  ui.bubbleRoot.addChild(bubble);

  const viewport = new Node("BuildingViewport");
  viewport.addComponent(UITransform).setContentSize(width - 12, viewportHeight);
  viewport.addComponent(Mask);
  bubble.addChild(viewport);
  const content = new Node("BuildingContent");
  content.addComponent(UITransform).setContentSize(width - 12, contentHeight);
  viewport.addChild(content);
  const startX = -(width - 18) / 2 + itemSize / 2;
  const startY = contentHeight / 2 - itemSize / 2;

  buildings.forEach((building, index) => {
    const cell = new Node(`Building_${building.id}`);
    cell.addComponent(UITransform).setContentSize(itemSize, itemSize);
    cell.setPosition(
      startX + (index % cols) * (itemSize + gap),
      startY - Math.floor(index / cols) * (itemSize + gap),
    );
    fillRoundRect(cell, itemSize, itemSize, 10, new Color(246, 227, 191, 250));
    strokeRoundRect(
      cell,
      itemSize,
      itemSize,
      10,
      new Color(168, 111, 57, 170),
      1.3,
    );
    const icon = ui.createItemIcon(building.id, 39);
    icon.setPosition(0, 7);
    cell.addChild(icon);
    cell.addChild(
      ui.makeLabel(
        building.name,
        9,
        new Color(78, 43, 24),
        true,
        0,
        -18,
        itemSize - 4,
        12,
      ),
    );
    cell.addChild(
      ui.makeLabel(
        `x${inventory.getItemCount(building.id)}`,
        8,
        new Color(114, 67, 35),
        false,
        17,
        18,
        24,
        12,
      ),
    );
    cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
      if (ui.activePastureSlotId >= 0)
        ui.placeBuilding(ui.activePastureSlotId, building.id);
    });
    content.addChild(cell);
  });
  if (rows > visibleRows) {
    const scrollView = viewport.addComponent(ScrollView);
    scrollView.horizontal = false;
    scrollView.vertical = true;
    scrollView.inertia = true;
    (scrollView as any).elastic = false;
    scrollView.content = content;
  }
  bubble.scale = new Vec3(0.72, 0.72, 1);
  tween(bubble)
    .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
    .start();
}


export function closeBuildingBubble(ui: any) {
  if (ui.bubbleRoot) ui.bubbleRoot.removeAllChildren();
  ui.activePastureSlotId = -1;
  clearSelectedPasture(ui);
}


export function getTouchedPastureSlotId(ui: any, event: any): number {
  const location = event?.getUILocation?.();
  if (!location || !ui.pastureRoot) return -1;
  const transform = ui.pastureRoot.getComponent(UITransform);
  const local = transform?.convertToNodeSpaceAR?.(
    new Vec3(location.x, location.y, 0),
  );
  if (!local) return -1;
  for (const slot of LandSystem.getInstance().getBuildingSlots()) {
    const pos = getPasturePosition(ui, slot.id);
    if (Math.abs(local.x - pos.x) <= 47 && Math.abs(local.y - pos.y) <= 47)
      return slot.id;
  }
  return -1;
}


export function placeBuilding(ui: any, slotId: number, buildingId: string) {
  const item = getItem(buildingId);
  const inventory = InventorySystem.getInstance();
  const isPlaceable =
    item?.category === ItemCategory.BUILDING ||
    item?.category === ItemCategory.DECORATION;
  if (!item || !isPlaceable || !inventory.hasItems(buildingId, 1)) {
    ui.toast("建筑数量不足");
    return;
  }
  if (!LandSystem.getInstance().occupyBuildingSlot(slotId, buildingId)) {
    ui.toast("这块地无法放置建筑");
    return;
  }
  inventory.removeItem(buildingId, 1);
  closeBuildingBubble(ui);
  ui.toast(`${item.name}放置完成`);
}


export function updatePastureCollectAllButton(ui: any) {
  const button = ui.node.getChildByName("PastureCollectAllButton");
  if (!button) return;
  const land = LandSystem.getInstance();
  const ready = land.getBuildingSlots().some((slot) =>
    isLivestockBuilding(slot.buildingId)
      ? land
          .getLivestockSlots(slot.id)
          .some(
            (productionSlot) =>
              productionSlot.unlocked &&
              !!land.getLivestockSlotProduction(slot.id, productionSlot.id)?.ready,
          )
      : !!land.getBuildingProduction(slot.id)?.ready,
  );
  updateSideCollectButtonVisual(
    ui,
    button,
    ui.activeWorld === "pasture",
    ready,
  );
}


export function collectAllPastureProducts(ui: any) {
  const land = LandSystem.getInstance();
  const inventory = InventorySystem.getInstance();
  const collected = new Map<string, number>();
  let rewardAnimated = false;
  for (const slot of land.getBuildingSlots()) {
    const tile = ui.pastureTiles.find(
      (candidate: Node) => candidate.name === `Pasture_${slot.id}`,
    );
    const products = isLivestockBuilding(slot.buildingId)
      ? land
          .getLivestockSlots(slot.id)
          .map((productionSlot) =>
            land.collectLivestockSlotProduct(slot.id, productionSlot.id),
          )
          .filter(
            (product): product is { itemId: string; count: number } =>
              !!product,
          )
      : [land.collectBuildingProduct(slot.id)].filter(
          (product): product is { itemId: string; count: number } => !!product,
        );
    for (const product of products) {
      inventory.addItem(product.itemId, product.count);
      if (tile) {
        rewardAnimated =
          animateItemToInventory(
            ui,
            product.itemId,
            product.count,
            tile.worldPosition.clone(),
          ) || rewardAnimated;
      }
      collected.set(
        product.itemId,
        (collected.get(product.itemId) || 0) + product.count,
      );
    }
  }
  if (collected.size === 0) {
    ui.toast("当前没有可收取的牧场产物");
    return;
  }
  ui.refreshPasture();
  const summary = Array.from(collected.entries())
    .map(([id, count]) => `${ui.itemName(id)} x${count}`)
    .join("、");
  if (!rewardAnimated) ui.toast(`一键收取：${summary}`);
}


export function getTouchedLandBlockId(ui: any, event: any): number {
  const location = event?.getUILocation?.();
  if (!location || !ui.landRoot) return -1;

  const landTransform = ui.landRoot.getComponent(UITransform);
  let localX = 0;
  let localY = 0;
  if (landTransform?.convertToNodeSpaceAR) {
    const local = landTransform.convertToNodeSpaceAR(
      new Vec3(location.x, location.y, 0),
    );
    localX = local.x;
    localY = local.y;
  } else {
    const vs = view.getVisibleSize();
    const rootX = location.x - vs.width / 2;
    const rootY = location.y - vs.height / 2;
    localX = (rootX - ui.landRoot.position.x) / ui.landRoot.scale.x;
    localY = (rootY - ui.landRoot.position.y) / ui.landRoot.scale.y;
  }
  const halfSize = ui.constructor.TILE_SIZE / 2 + 8;

  for (const block of LandSystem.getInstance().getAllBlocks()) {
    const pos = ui.getLandPosition(block.id);
    if (
      Math.abs(localX - pos.x) <= halfSize &&
      Math.abs(localY - pos.y) <= halfSize
    ) {
      return block.id;
    }
  }
  return -1;
}


export function closeSeedBubble(ui: any) {
  ui.bubbleRoot.removeAllChildren();
  ui.activeBubbleLandId = -1;
  clearSelectedLand(ui);
}
