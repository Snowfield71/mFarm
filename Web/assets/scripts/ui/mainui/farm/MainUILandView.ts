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
import { closeBuildingBubble, openBuildingBubble, playDemolitionAnimation, updatePastureCollectAllButton } from "./MainUILandActions";
import { EXPANSION_BILLBOARD_SIZE } from "./MainUILandShared";



export function refreshLand(ui: any) {
  ui.layoutLandArea();
  ui.landTiles.forEach((tile) => tile.destroy());
  ui.landTiles = [];

  const land = LandSystem.getInstance();
  const totalSlots = Math.min(
    GameValues.MAX_LAND,
    ui.constructor.LAND_COLS * ui.constructor.LAND_ROWS,
  );
  for (let index = 0; index < totalSlots; index++) {
    const block = land.getBlock(index);
    const tile = block ? ui.createLandTile(block) : ui.createLockedTile(index);
    const pos = ui.getLandPosition(index);
    tile.setPosition(pos.x, pos.y);
    ui.landRoot.addChild(tile);
    ui.landTiles.push(tile);
  }
  updateHarvestAllButton(ui);
  refreshPasture(ui);
}


export function refreshPasture(ui: any) {
  if (!ui.pastureRoot) return;
  ui.pastureTiles.forEach((tile: Node) => tile.destroy());
  ui.pastureTiles = [];
  for (const slot of LandSystem.getInstance().getBuildingSlots()) {
    const tile = createPastureTile(ui, slot);
    const pos = getPasturePosition(ui, slot.id);
    tile.setPosition(pos.x, pos.y);
    ui.pastureRoot.addChild(tile);
    ui.pastureTiles.push(tile);
  }
  if (ui.activePastureSlotId >= 0)
    showSelectedPasture(ui, ui.activePastureSlotId);
  updatePastureCollectAllButton(ui);
}


export function refreshPastureSlot(ui: any, slotId: number) {
  const index = ui.pastureTiles.findIndex(
    (tile: Node) => tile.name === `Pasture_${slotId}`,
  );
  const slot = LandSystem.getInstance().getBuildingSlot(slotId);
  if (index < 0 || !slot) return;
  const oldTile = ui.pastureTiles[index];
  const newTile = createPastureTile(ui, slot);
  newTile.setPosition(oldTile.position);
  oldTile.removeFromParent();
  oldTile.destroy();
  ui.pastureRoot.addChild(newTile);
  newTile.setSiblingIndex(index);
  ui.pastureTiles[index] = newTile;
  if (slot.state === "empty" && ui.activePastureSlotId === slotId) {
    showSelectedPasture(ui, slotId);
  }
  updatePastureCollectAllButton(ui);
}


export function createPastureTile(ui: any, slot: LandBlock): Node {
  const tile = new Node(`Pasture_${slot.id}`);
  tile.addComponent(UITransform).setContentSize(82, 82);
  const pad = new Node("BuildingPad");
  pad.addComponent(UITransform).setContentSize(96, 96);
  const season = getSeasonInfo().season;
  const padIcon = {
    spring: "buildingPadSpring",
    summer: "buildingPadSummer",
    autumn: "buildingPadAutumn",
    winter: "buildingPadWinter",
  }[season];
  ui.applyUiIcon(padIcon, pad);
  tile.addChild(pad);
  const unlocked = LandSystem.getInstance().isPastureSlotUnlocked(slot.id);
  const nextLockedSlotId = LandSystem.getInstance().getNextPastureUnlockSlotId();
  if (!unlocked) {
    const lockedIcon = {
      spring: "lockedPastureSpring",
      summer: "lockedPastureSummer",
      autumn: "lockedPastureAutumn",
      winter: "lockedPastureWinter",
    }[season];
    ui.applyUiIcon(lockedIcon, pad);
    // Only the next sequentially unlockable slab carries the wooden sign.
    if (slot.id === nextLockedSlotId) {
      const billboard = createPastureExpansionBillboard(ui);
      // Plant the sign behind the rear half of the pad instead of floating over
      // its centre. The larger silhouette remains readable at gameplay scale.
      billboard.setPosition(8, 31);
      tile.addChild(billboard);
    }
  } else if (slot.state === "occupied") {
    drawOccupiedMarker(ui, tile, slot);
  }
  // Match farm land: locked pads beyond the next sequential target are inert.
  if (unlocked || slot.id === nextLockedSlotId) {
    tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      handlePastureClick(ui, slot.id);
    });
  }
  return tile;
}


export function getPasturePosition(
  _ui: any,
  index: number,
): { x: number; y: number } {
  const cols = 3;
  const stepX = 92;
  const stepY = 96;
  return {
    x: ((index % cols) - 1) * stepX,
    y: (1.5 - Math.floor(index / cols)) * stepY,
  };
}


export function handlePastureClick(ui: any, slotId: number) {
  const slot = LandSystem.getInstance().getBuildingSlot(slotId);
  if (!slot) return;
  if (ui.demolitionMode) {
    closeBuildingBubble(ui);
    if (slot.state !== "occupied" || !slot.buildingId) {
      ui.toast("这里没有可拆除的建筑");
      return;
    }
    const buildingId = slot.buildingId;
    if (
      buildingId === "fourSeasonGreenhouse" &&
      LandSystem.getInstance()
        .getGreenhouseBlocksForBuilding(slotId)
        .some((block) => block.state !== "empty")
    ) {
      ui.toast("请先收获温室花盆中的作物");
      return;
    }
    const tile = ui.pastureTiles.find(
      (item: Node) => item.name === `Pasture_${slotId}`,
    );
    playDemolitionAnimation(
      ui,
      tile,
      tile?.getChildByName("OccupiedMarker"),
      () => {
        // clearBuildingSlot emits pastureChanged synchronously. Suppress that
        // full-scene rebuild because this demolition replaces only one tile.
        ui.suppressNextPastureChangedRefresh = true;
        if (!LandSystem.getInstance().clearBuildingSlot(slotId)) {
          ui.suppressNextPastureChangedRefresh = false;
          ui.toast("建筑拆除失败");
          return;
        }
        ui.suppressNextPastureChangedRefresh = false;
        refreshPastureSlot(ui, slotId);
        ui.setShovelMode(false);
        ui.toast(`${ui.itemName(buildingId)}已销毁`);
      },
    );
    return;
  }
  if (!LandSystem.getInstance().isPastureSlotUnlocked(slotId)) {
    closeBuildingBubble(ui);
    handleLockedPastureClick(ui, slotId);
    return;
  }
  if (slot.state === "empty") {
    if (ui.activePastureSlotId === slotId) {
      closeBuildingBubble(ui);
      return;
    }
    if (
      ui.activePastureSlotId >= 0 &&
      ui.bubbleRoot.getChildByName("BuildingBubble")
    ) {
      ui.activePastureSlotId = slotId;
      showSelectedPasture(ui, slotId);
      return;
    }
    openBuildingBubble(ui, slotId);
    return;
  }
  closeBuildingBubble(ui);
  ui.handleOccupiedBuilding(slotId);
}


export function handleLockedPastureClick(ui: any, slotId: number) {
  const land = LandSystem.getInstance();
  const nextSlotId = land.getNextPastureUnlockSlotId();
  if (nextSlotId === null) {
    ui.toast("牧场区域已全部解锁");
    return;
  }
  if (slotId !== nextSlotId) {
    ui.toast("请按木牌标记顺序解锁");
    return;
  }
  const unlockOrder = Math.max(0, land.getPastureUnlockedCount() - 4);
  const cost = 500 + unlockOrder * 250;
  ui.showDialog("扩建牧场", `消耗 ${cost} 金币解锁这块石板`, [
    { text: "稍后", image: "btnPastureExpandLater", cb: () => {} },
    {
      text: "扩建",
      image: "btnPastureExpandConfirm",
      cb: () => {
        const gm = GameManager.getInstance();
        if (!gm.spendGold(cost)) {
          ui.toast("金币不足");
          return;
        }
        ui.suppressNextPastureChangedRefresh = true;
        if (!land.expandPastureSlot(slotId)) {
          ui.suppressNextPastureChangedRefresh = false;
          gm.addGold(cost);
          ui.toast("这块石板已经解锁");
          return;
        }
        ui.refreshTopBar();
        ui.animateUnlockPasture(slotId);
        ui.toast("牧场石板扩建成功");
      },
    },
  ]);
}


export function showSelectedPasture(ui: any, slotId: number) {
  clearSelectedPasture(ui);
  const tile = ui.pastureTiles.find(
    (candidate: Node) => candidate.name === `Pasture_${slotId}`,
  );
  if (!tile) return;
  const border = new Node("PastureSelectedBorder");
  border.setPosition(0, 1);
  const graphics = border.addComponent(Graphics);
  graphics.strokeColor = new Color(255, 245, 157, 250);
  graphics.lineWidth = 4;
  graphics.roundRect(-43, -43, 86, 86, 15);
  graphics.stroke();
  graphics.strokeColor = new Color(89, 173, 87, 210);
  graphics.lineWidth = 1.5;
  graphics.roundRect(-38, -38, 76, 76, 12);
  graphics.stroke();
  tile.addChild(border);
  tween(border)
    .repeatForever(
      tween()
        .to(0.58, { scale: new Vec3(1.035, 1.035, 1) }, { easing: "quadInOut" })
        .to(0.58, { scale: new Vec3(0.97, 0.97, 1) }, { easing: "quadInOut" }),
    )
    .start();
}


export function clearSelectedPasture(ui: any) {
  for (const tile of ui.pastureTiles)
    tile.getChildByName("PastureSelectedBorder")?.destroy();
}


export function refreshLandBlock(
  ui: any,
  blockId: number,
  animateStage = false,
) {
  const index = ui.landTiles.findIndex(
    (tile) => tile.name === `Land_${blockId}`,
  );
  const block = LandSystem.getInstance().getBlock(blockId);
  if (index < 0 || !block) return;

  const oldTile = ui.landTiles[index];
  const newTile = ui.createLandTile(block);
  newTile.setPosition(oldTile.position);
  oldTile.removeFromParent();
  oldTile.destroy();
  ui.landRoot.addChild(newTile);
  newTile.setSiblingIndex(index);
  ui.landTiles[index] = newTile;
  if (animateStage) animateCropStageChange(newTile);
  if (ui.activeBubbleLandId === blockId) showSelectedLand(ui, blockId);
  updateHarvestAllButton(ui);
}


export function animateUnlockLand(ui: any, index: number) {
  const block = LandSystem.getInstance().getBlock(index);
  const oldTile = ui.landTiles[index];
  if (!block || !oldTile) {
    ui.refreshLand();
    return;
  }

  const newTile = ui.createLandTile(block);
  newTile.setPosition(oldTile.position);
  newTile.scale = new Vec3(0, 1, 1);
  oldTile.addComponent(Button).interactable = false;
  ui.landRoot.addChild(newTile);
  newTile.setSiblingIndex(index + 1);

  tween(oldTile)
    .to(0.16, { scale: new Vec3(0, 1, 1) }, { easing: "quadIn" })
    .call(() => {
      oldTile.removeFromParent();
      oldTile.destroy();
      ui.landTiles[index] = newTile;
      const nextBlockId = LandSystem.getInstance().getNextUnlockBlockId();
      if (nextBlockId !== null) refreshLockedExpansionBillboard(ui, nextBlockId);
    })
    .start();

  tween(newTile)
    .delay(0.12)
    .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
    .start();
}


export function updateGrowingProgress(
  ui: any,
  blockId: number,
  _progress: number,
) {
  const tile = ui.landTiles.find((tile) => tile.name === `Land_${blockId}`);
  if (!tile) {
    ui.refreshLandBlock(blockId);
    return;
  }
  const block = LandSystem.getInstance().getBlock(blockId);
  const marker = tile.getChildByName("GreenhouseMarker");
  if (!!marker !== LandSystem.getInstance().isGreenhouseActive(blockId)) {
    ui.refreshLandBlock(blockId);
    return;
  }
  const cropIcon = tile.getChildByName("CropIcon") as any;
  if (
    block?.cropType &&
    cropIcon &&
    cropIcon.__cropVisualId !== getCropVisualId(block)
  ) {
    ui.refreshLandBlock(blockId, true);
    return;
  }
  const progressBar = tile.getChildByName("CropProgressBar");
  if (block?.cropType && progressBar)
    drawCropProgressBar(progressBar, block.progress);
}


export function createLandTile(ui: any, block: LandBlock): Node {
  const tile = new Node(`Land_${block.id}`);
  tile
    .addComponent(UITransform)
    .setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);

  const stateColor: Record<string, Color> = {
    empty: new Color(193, 145, 96, 245),
    growing: new Color(193, 145, 96, 245),
    harvesting: new Color(193, 145, 96, 245),
    occupied: new Color(174, 134, 98, 245),
  };
  ui.drawTileBase(tile, stateColor[block.state] || stateColor.empty);

  if (LandSystem.getInstance().isGreenhouseActive(block.id)) {
    const marker = ui.makeLabel(
      "温室",
      9,
      new Color(48, 104, 62),
      true,
      25,
      31,
      34,
      14,
    );
    marker.name = "GreenhouseMarker";
    tile.addChild(marker);
  }

  if (
    (block.state === "growing" || block.state === "harvesting") &&
    block.cropType
  ) {
    const cropVisualId = getCropVisualId(block);
    const cropSize = getCropVisualSize(block);
    const cropIcon = ui.createItemIcon(cropVisualId, cropSize);
    cropIcon.name = "CropIcon";
    (cropIcon as any).__cropVisualId = cropVisualId;
    cropIcon.setPosition(0, getCropIconY(ui, block, cropSize));
    tile.addChild(cropIcon);
    cropIcon.setSiblingIndex(tile.children.length - 1);
    if (block.state === "growing") {
      tile.addChild(createCropProgressBar(block.progress));
    }
  } else if (block.state === "occupied") {
    ui.drawOccupiedMarker(tile, block);
  }

  tile
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, () => ui.handleLandClick(block.id));
  return tile;
}


export type CropVisualStage = "seed" | "middle" | "mature";


export const STAGED_CROPS = new Set([
  "wheat",
  "tomato",
  "corn",
  "carrot",
  "lettuce",
  "pumpkin",
  "strawberry",
  "cherry",
  "banana",
  "apple",
  "potato",
  "cucumber",
  "sweetPotato",
  "spinach",
  "pea",
  "asparagus",
  "rhubarb",
  "fennel",
  "artichoke",
  "eggplant",
  "sweetPepper",
  "watermelon",
  "okra",
  "peanut",
  "broccoli",
  "beetroot",
  "turnip",
  "celery",
  "ginger",
  "kale",
  "chineseCabbage",
  "garlic",
  "leek",
  "brusselsSprouts",
]);


export const CROP_STAGE_VISUAL: Record<
  string,
  Record<CropVisualStage, { size: number; y: number }>
> = {
  wheat: {
    seed: { size: 96, y: 0 },
    middle: { size: 90, y: 0 },
    mature: { size: 90, y: 0 },
  },
  tomato: {
    seed: { size: 96, y: 0 },
    middle: { size: 96, y: 0 },
    mature: { size: 96, y: 0 },
  },
  corn: {
    seed: { size: 96, y: 0 },
    middle: { size: 104, y: 0 },
    mature: { size: 104, y: 0 },
  },
  carrot: {
    seed: { size: 96, y: 0 },
    middle: { size: 96, y: 0 },
    mature: { size: 96, y: 0 },
  },
  lettuce: {
    seed: { size: 96, y: 0 },
    middle: { size: 96, y: 0 },
    mature: { size: 96, y: 0 },
  },
  pumpkin: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  strawberry: {
    seed: { size: 96, y: 0 },
    middle: { size: 96, y: 0 },
    mature: { size: 96, y: 0 },
  },
  cherry: {
    seed: { size: 96, y: 0 },
    middle: { size: 104, y: 0 },
    mature: { size: 108, y: 0 },
  },
  banana: {
    seed: { size: 96, y: 0 },
    middle: { size: 104, y: 0 },
    mature: { size: 108, y: 0 },
  },
  apple: {
    seed: { size: 96, y: 0 },
    middle: { size: 104, y: 0 },
    mature: { size: 108, y: 0 },
  },
  potato: {
    seed: { size: 96, y: 0 },
    middle: { size: 96, y: 0 },
    mature: { size: 100, y: 0 },
  },
  cucumber: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  sweetPotato: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  spinach: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  pea: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  asparagus: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  rhubarb: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  fennel: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  artichoke: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  eggplant: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  sweetPepper: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  watermelon: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  okra: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  peanut: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  broccoli: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  beetroot: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  turnip: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  celery: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  ginger: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  kale: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  chineseCabbage: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  garlic: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  leek: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
  brusselsSprouts: {
    seed: { size: 96, y: 0 },
    middle: { size: 100, y: 0 },
    mature: { size: 104, y: 0 },
  },
};


export const CROP_STAGE_ASSET_SIZE = 512;

export const CROP_STAGE_ASSET_DEFAULT_BOTTOM_PADDING = 32;

export const CROP_STAGE_ASSET_BOTTOM_PADDING: Partial<
  Record<string, Partial<Record<CropVisualStage, number>>>
> = {
  // Generated assets have different transparent padding below their contact
  // shadows. Use measured alpha bounds so every crop shares y=0 baseline.
  spinach: { middle: 66 },
  sweetPotato: { middle: 89 },
};


export function getCropVisualId(block: LandBlock): string {
  if (!block.cropType) return "";
  if (!STAGED_CROPS.has(block.cropType)) return block.cropType;
  const stageIndex =
    getCropVisualStage(block) === "seed"
      ? 1
      : getCropVisualStage(block) === "middle"
        ? 2
        : 3;
  return `${block.cropType}_stage_${stageIndex}_${getSeasonInfo().season}`;
}


export function getCropVisualStage(block: LandBlock): CropVisualStage {
  if (block.state === "harvesting" || block.progress >= 100) return "mature";
  return block.progress < 50 ? "seed" : "middle";
}


export function getCropVisualSize(block: LandBlock): number {
  if (!block.cropType) return 82;
  if (!STAGED_CROPS.has(block.cropType))
    return block.state === "harvesting" ? 92 : 82;
  return CROP_STAGE_VISUAL[block.cropType][getCropVisualStage(block)].size;
}


export function getCropIconY(ui: any, block: LandBlock, cropSize: number): number {
  if (block.cropType && STAGED_CROPS.has(block.cropType)) {
    const stage = getCropVisualStage(block);
    const bottomPadding =
      CROP_STAGE_ASSET_BOTTOM_PADDING[block.cropType]?.[stage] ??
      CROP_STAGE_ASSET_DEFAULT_BOTTOM_PADDING;
    return cropSize * (0.5 - bottomPadding / CROP_STAGE_ASSET_SIZE);
  }
  return (
    (block.state === "harvesting" ? 0 : -ui.constructor.TILE_SIZE / 2 - 3) +
    cropSize / 2
  );
}


export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
}


export function createCropProgressBar(progress: number): Node {
  const bar = new Node("CropProgressBar");
  bar.setPosition(0, -31);
  bar.addComponent(UITransform).setContentSize(48, 8);
  drawCropProgressBar(bar, progress);
  return bar;
}


export function drawCropProgressBar(bar: Node, progress: number) {
  let bg = bar.getChildByName("ProgressBg");
  if (!bg) {
    bg = new Node("ProgressBg");
    bar.addChild(bg);
  }
  fillRoundRect(bg, 48, 6, 3, new Color(88, 70, 42, 95));

  const pct = Math.max(0, Math.min(100, progress)) / 100;
  const fillW = Math.max(4, 44 * pct);
  let fill = bar.getChildByName("ProgressFill");
  if (!fill) {
    fill = new Node("ProgressFill");
    bar.addChild(fill);
  }
  fill.setPosition(-22 + fillW / 2, 0);
  fillRoundRect(fill, fillW, 4, 2, new Color(252, 211, 88, 235));
}


export function animateCropStageChange(tile: Node) {
  const cropIcon = tile.getChildByName("CropIcon");
  if (!cropIcon) return;
  const finalPosition = cropIcon.position.clone();
  cropIcon.setScale(new Vec3(0.58, 0.58, 1));
  cropIcon.setPosition(finalPosition.x, finalPosition.y - 8, finalPosition.z);
  tween(cropIcon)
    .to(
      0.14,
      {
        position: new Vec3(
          finalPosition.x,
          finalPosition.y + 4,
          finalPosition.z,
        ),
        scale: new Vec3(1.14, 1.14, 1),
      },
      { easing: "quadOut" },
    )
    .to(
      0.1,
      { position: finalPosition, scale: new Vec3(0.96, 0.96, 1) },
      { easing: "quadInOut" },
    )
    .to(
      0.12,
      { position: finalPosition, scale: new Vec3(1, 1, 1) },
      { easing: "backOut" },
    )
    .start();
}


export function showSelectedLand(ui: any, blockId: number) {
  clearSelectedLand(ui);
  const tile = ui.landTiles.find((tile) => tile.name === `Land_${blockId}`);
  if (!tile) return;

  const border = new Node("SelectedBorder");
  border.setPosition(0, 3);
  border.setScale(new Vec3(0.94, 0.94, 1));
  const g = border.addComponent(Graphics);
  g.strokeColor = new Color(255, 246, 158, 245);
  g.lineWidth = 3.5;
  g.roundRect(-34, -34, 68, 68, 10);
  g.stroke();
  g.strokeColor = new Color(72, 188, 92, 185);
  g.lineWidth = 1.5;
  g.roundRect(-29, -29, 58, 58, 8);
  g.stroke();
  tile.addChild(border);
  tween(border)
    .repeatForever(
      tween()
        .to(0.55, { scale: new Vec3(1.03, 1.03, 1) }, { easing: "quadInOut" })
        .to(0.55, { scale: new Vec3(0.94, 0.94, 1) }, { easing: "quadInOut" }),
    )
    .start();
}


export function clearSelectedLand(ui: any) {
  for (const tile of ui.landTiles) {
    const border = tile.getChildByName("SelectedBorder");
    if (border) border.destroy();
  }
}


export function createLockedTile(ui: any, index: number): Node {
  const tile = new Node(`Locked_${index}`);
  tile
    .addComponent(UITransform)
    .setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);
  ui.drawTileBase(tile, new Color(158, 202, 111, 225), true);
  const isNextUnlock = index === LandSystem.getInstance().getNextUnlockBlockId();
  if (isNextUnlock) {
    tile.addChild(createExpansionBillboard(ui));
    tile
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, () => ui.handleLockedLandClick(index));
  }
  return tile;
}


export function animateUnlockPasture(ui: any, slotId: number) {
  const slot = LandSystem.getInstance().getBuildingSlot(slotId);
  const tileIndex = ui.pastureTiles.findIndex(
    (tile: Node) => tile.name === `Pasture_${slotId}`,
  );
  const oldTile = tileIndex >= 0 ? ui.pastureTiles[tileIndex] : null;
  if (!slot || !oldTile) {
    ui.refreshPasture();
    return;
  }

  const newTile = createPastureTile(ui, slot);
  newTile.setPosition(oldTile.position);
  newTile.setScale(new Vec3(0, 1, 1));
  const oldButton = oldTile.getComponent(Button);
  if (oldButton) oldButton.interactable = false;
  ui.pastureRoot.addChild(newTile);
  newTile.setSiblingIndex(tileIndex + 1);

  tween(oldTile)
    .to(0.16, { scale: new Vec3(0, 1, 1) }, { easing: "quadIn" })
    .call(() => {
      oldTile.removeFromParent();
      oldTile.destroy();
      ui.pastureTiles[tileIndex] = newTile;
      const nextSlotId = LandSystem.getInstance().getNextPastureUnlockSlotId();
      if (nextSlotId !== null) refreshPastureSlot(ui, nextSlotId);
    })
    .start();

  tween(newTile)
    .delay(0.12)
    .to(0.18, { scale: Vec3.ONE }, { easing: "backOut" })
    .start();
}


export function createExpansionBillboard(ui: any): Node {
  const billboard = new Node("ExpansionBillboard");
  billboard
    .addComponent(UITransform)
    .setContentSize(EXPANSION_BILLBOARD_SIZE, EXPANSION_BILLBOARD_SIZE);
  billboard.setPosition(14, 20);
  ui.applyUiIcon("billboard", billboard);
  return billboard;
}


export function refreshLockedExpansionBillboard(ui: any, index: number) {
  if (index >= ui.landTiles.length) return;
  const tile = ui.landTiles[index];
  if (!tile || !tile.name.startsWith("Locked_")) return;
  const newTile = ui.createLockedTile(index);
  newTile.setPosition(tile.position);
  newTile.setScale(tile.scale);
  tile.removeFromParent();
  tile.destroy();
  ui.landRoot.addChild(newTile);
  newTile.setSiblingIndex(index);
  ui.landTiles[index] = newTile;
}


export function drawTileBase(
  ui: any,
  tile: Node,
  _color: Color,
  locked = false,
) {
  const season = getSeasonInfo().season;
  const fieldIcon = locked
    ? ({
        spring: "lockedFieldSpring",
        summer: "lockedFieldSummer",
        autumn: "lockedFieldAutumn",
        winter: "lockedFieldWinter",
      }[season])
    : {
        spring: "fieldSpring",
        summer: "fieldSummer",
        autumn: "fieldAutumn",
        winter: "fieldWinter",
      }[season];
  const field = new Node("FieldImage");
  const fieldSize = ui.constructor.TILE_SIZE + 22;
  field.addComponent(UITransform).setContentSize(fieldSize, fieldSize);
  field.setPosition(0, 0);
  ui.applyUiIcon(fieldIcon, field);
  tile.addChild(field);
}


export function drawOccupiedMarker(ui: any, tile: Node, block: LandBlock) {
  const marker = new Node("OccupiedMarker");
  marker.setPosition(0, 5);
  marker.addComponent(UITransform).setContentSize(74, 74);
  if (block.buildingId) {
    const icon = ui.createItemIcon(block.buildingId, 72, true);
    icon.setPosition(block.buildingId === "fence" ? 3 : 0, 0);
    marker.addChild(icon);
  }
  tile.addChild(marker);

  const land = LandSystem.getInstance();
  const production = land.getBuildingProduction(block.id);
  const greenhouseReady =
    block.buildingId === "fourSeasonGreenhouse" &&
    land
      .getGreenhouseBlocksForBuilding(block.id)
      .some((greenhouseBlock) => greenhouseBlock.state === "harvesting");
  if (production?.ready || greenhouseReady) {
    const ready = new Node("BuildingReady");
    ready.setPosition(25, 25);
    const g = ready.addComponent(Graphics);
    g.fillColor = new Color(247, 196, 69, 255);
    g.circle(0, 0, 8);
    g.fill();
    g.strokeColor = new Color(255, 250, 218, 255);
    g.lineWidth = 2;
    g.circle(0, 0, 8);
    g.stroke();
    tile.addChild(ready);
  }
}


export function updateHarvestAllButton(ui: any) {
  const button = ui.node.getChildByName("HarvestAllButton");
  if (!button) return;
  const count =
    ui.activeWorld === "farm"
      ? LandSystem.getInstance()
          .getAllBlocks()
          .filter((block) => block.state === "harvesting").length
      : 0;
  updateSideCollectButtonVisual(ui, button, ui.activeWorld === "farm", count > 0);
}


export function updateSideCollectButtonVisual(
  ui: any,
  button: Node,
  visible: boolean,
  enabled: boolean,
) {
  button.active = visible;
  if (!visible) return;
  const stateChanged = (button as any).__collectEnabled !== enabled;
  (button as any).__collectEnabled = enabled;
  const background = button.getChildByName("SideEntryBackground");
  if (background) {
    background.getComponent(Graphics)?.clear();
    if (enabled) {
      // Available actions use the same hierarchy as the daily sign-in entry:
      // white outer card plus a semantic green icon tile.
      fillRoundRect(button, 38, 46, 13, new Color(255, 255, 255, 255));
      strokeRoundRect(button, 38, 46, 13, new Color(105, 174, 86, 180), 2);
      fillRoundRect(background, 30, 32, 9, new Color(144, 210, 143, 255));
    } else {
      // Unavailable actions keep a neutral gray card and no colored inner tile.
      fillRoundRect(button, 38, 46, 13, new Color(194, 197, 190, 255));
      strokeRoundRect(button, 38, 46, 13, new Color(132, 137, 128, 230), 2);
    }
  }
  const action = button.getComponent(Button);
  if (action) action.interactable = enabled;
  for (const child of button.children) {
    if (child.name === "SideEntryBackground") continue;
    const opacity = child.getComponent(UIOpacity) || child.addComponent(UIOpacity);
    opacity.opacity = enabled ? 255 : 118;
  }
  button.scale = enabled ? new Vec3(0.82, 0.82, 1) : Vec3.ONE;
  if (enabled && stateChanged) {
    tween(button)
      .to(0.18, { scale: Vec3.ONE }, { easing: "backOut" })
      .start();
  }
}


export function animatePlanting(ui: any, blockId: number) {
  const tile = ui.landTiles.find((tile) => tile.name === `Land_${blockId}`);
  if (!tile) return;
  showSelectedLand(ui, blockId);
  ui.scheduleOnce(() => {
    if (ui.activeBubbleLandId !== blockId) clearSelectedLand(ui);
  }, 0.65);

  const face = tile.getChildByName("Face");
  if (face) {
    tween(face)
      .to(0.08, { scale: new Vec3(1.04, 0.96, 1) }, { easing: "quadOut" })
      .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();
  }

  const cropIcon = tile.getChildByName("CropIcon");
  playPlantingVisualAnimation(cropIcon);
}


export function playPlantingVisualAnimation(visual: Node | null | undefined) {
  if (!visual) return;
  const finalPosition = visual.position.clone();
  const finalScale = visual.scale.clone();
  visual.setScale(
    new Vec3(finalScale.x * 0.12, finalScale.y * 0.12, finalScale.z),
  );
  visual.setPosition(finalPosition.x, finalPosition.y - 24, finalPosition.z);
  tween(visual)
    .delay(0.18)
    .to(
      0.22,
      {
        position: finalPosition,
        scale: new Vec3(finalScale.x * 1.08, finalScale.y * 1.08, finalScale.z),
      },
      { easing: "backOut" },
    )
    .to(
      0.1,
      {
        position: finalPosition,
        scale: new Vec3(finalScale.x * 0.96, finalScale.y * 0.96, finalScale.z),
      },
      { easing: "quadOut" },
    )
    .to(
      0.12,
      { position: finalPosition, scale: finalScale },
      { easing: "backOut" },
    )
    .start();
}


export function animateHarvest(
  ui: any,
  blockId: number,
  cropId: string,
  count: number,
  onComplete?: () => void,
  lightweight = false,
) {
  const tile = ui.landTiles.find((tile) => tile.name === `Land_${blockId}`);
  if (!tile) {
    onComplete?.();
    return;
  }

  const button = tile.getComponent(Button);
  if (button) button.interactable = false;

  const cropIcon = tile.getChildByName("CropIcon");
  if (cropIcon) {
    tween(cropIcon)
      .to(
        0.1,
        { position: new Vec3(0, 14, 0), scale: new Vec3(1.18, 1.18, 1) },
        { easing: "quadOut" },
      )
      .to(
        0.18,
        { position: new Vec3(0, 34, 0), scale: new Vec3(0.72, 0.72, 1) },
        { easing: "quadIn" },
      )
      .call(() => {
        if (cropIcon.isValid) cropIcon.active = false;
      })
      .start();
  }

  if (lightweight) {
    tween(tile)
      .delay(0.24)
      .call(() => onComplete?.())
      .start();
    return;
  }

  const rewardIcon = ui.createItemIcon(cropId, 30);
  rewardIcon.name = "HarvestRewardIcon";
  rewardIcon.setPosition(-12, 12);
  rewardIcon.setScale(new Vec3(0.55, 0.55, 1));
  tile.addChild(rewardIcon);
  tween(rewardIcon)
    .to(
      0.14,
      { position: new Vec3(-16, 30, 0), scale: new Vec3(1, 1, 1) },
      { easing: "backOut" },
    )
    .to(
      0.26,
      { position: new Vec3(-22, 46, 0), scale: new Vec3(0.88, 0.88, 1) },
      { easing: "quadOut" },
    )
    .call(() => rewardIcon.destroy())
    .start();

  const amount = ui.makeLabel(
    `+${count}`,
    16,
    new Color(255, 246, 168),
    true,
    18,
    26,
    44,
    24,
  );
  amount.name = "HarvestAmount";
  tile.addChild(amount);
  tween(amount)
    .to(
      0.14,
      { position: new Vec3(18, 40, 0), scale: new Vec3(1.12, 1.12, 1) },
      { easing: "backOut" },
    )
    .to(
      0.28,
      { position: new Vec3(18, 58, 0), scale: new Vec3(0.92, 0.92, 1) },
      { easing: "quadOut" },
    )
    .call(() => amount.destroy())
    .start();

  const shine = new Node("HarvestShine");
  shine.setPosition(0, 4);
  shine.setScale(new Vec3(0.62, 0.62, 1));
  const sg = shine.addComponent(Graphics);
  sg.strokeColor = new Color(255, 238, 120, 220);
  sg.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const inner = 14;
    const outer = 28 + (i % 2) * 5;
    sg.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    sg.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
  }
  sg.stroke();
  tile.addChild(shine);
  tween(shine)
    .to(0.34, { scale: new Vec3(1.18, 1.18, 1) }, { easing: "quadOut" })
    .call(() => shine.destroy())
    .start();

  for (let i = 0; i < 10; i++) {
    const particle = new Node(`HarvestParticle_${i}`);
    particle.setPosition(0, 8);
    particle.setScale(new Vec3(0.8, 0.8, 1));
    const pg = particle.addComponent(Graphics);
    pg.fillColor =
      i % 2 === 0 ? new Color(255, 230, 92, 210) : new Color(126, 216, 92, 190);
    pg.circle(0, 0, 1.7 + (i % 3) * 0.45);
    pg.fill();
    tile.addChild(particle);

    const angle = -Math.PI * 0.1 - (Math.PI * 0.8 * i) / 9;
    const distance = 22 + (i % 4) * 7;
    const target = new Vec3(
      Math.cos(angle) * distance,
      12 + Math.sin(angle) * distance,
      0,
    );
    tween(particle)
      .delay(i * 0.015)
      .to(
        0.28,
        { position: target, scale: new Vec3(0.25, 0.25, 1) },
        { easing: "quadOut" },
      )
      .call(() => particle.destroy())
      .start();
  }

  const face = tile.getChildByName("Face");
  if (face) {
    tween(face)
      .to(0.08, { scale: new Vec3(1.04, 1.04, 1) }, { easing: "quadOut" })
      .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: "quadIn" })
      .start();
  }

  tween(tile)
    .delay(0.46)
    .call(() => onComplete?.())
    .start();
}


export function getLandPosition(
  ui: any,
  index: number,
): { x: number; y: number } {
  const col = index % ui.constructor.LAND_COLS;
  const row = Math.floor(index / ui.constructor.LAND_COLS);
  const totalW =
    ui.constructor.LAND_COLS * ui.constructor.TILE_SIZE +
    (ui.constructor.LAND_COLS - 1) * ui.constructor.TILE_GAP;
  const totalH =
    ui.constructor.LAND_ROWS * ui.constructor.TILE_SIZE +
    (ui.constructor.LAND_ROWS - 1) * ui.constructor.TILE_GAP;
  return {
    x:
      -totalW / 2 +
      col * (ui.constructor.TILE_SIZE + ui.constructor.TILE_GAP) +
      ui.constructor.TILE_SIZE / 2,
    y:
      totalH / 2 -
      row * (ui.constructor.TILE_SIZE + ui.constructor.TILE_GAP) -
      ui.constructor.TILE_SIZE / 2,
  };
}


export function createPastureExpansionBillboard(ui: any): Node {
  const billboard = new Node("PastureExpansionBillboard");
  billboard
    .addComponent(UITransform)
    .setContentSize(EXPANSION_BILLBOARD_SIZE, EXPANSION_BILLBOARD_SIZE);
  ui.applyUiIcon("pastureBillboard", billboard);
  return billboard;
}


export function getNextLandUnlockLevel(_ui: any, index: number): number {
  const levels = Object.keys(GameValues.LAND_UNLOCK)
    .map(Number)
    .sort((a, b) => a - b);
  let count = GameValues.INITIAL_LAND;
  for (const lv of levels) {
    count += GameValues.LAND_UNLOCK[lv];
    if (index < count) return lv;
  }
  return 99;
}
