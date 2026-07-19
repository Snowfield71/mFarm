import {
  Button,
  Color,
  EditBox,
  Graphics,
  Label,
  LabelOutline,
  Mask,
  Node,
  ScrollView,
  UIOpacity,
  UITransform,
  Vec3,
  tween,
  view,
} from "cc";
import { Design, GameValues } from "../../config/GameConfig";
import { GameManager } from "../../core/GameManager";
import { EventManager } from "../../core/EventManager";
import { InventorySystem } from "../../systems/InventorySystem";
import { LandBlock, LandSystem } from "../../systems/LandSystem";
import { CraftSystem } from "../../systems/CraftSystem";
import { LevelSystem } from "../../systems/LevelSystem";
import {
  getItem,
  getPlantableCrops,
  ITEM_DB,
  ItemCategory,
  ItemDef,
} from "../../config/ItemConfig";
import {
  getRecipe,
  getRecipesByLevel,
  RecipeDef,
} from "../../config/RecipeConfig";
import { fillRect, fillRoundRect, strokeRoundRect } from "../utils/UIDraw";
import type { PanelName } from "./MainUITypes";
import {
  ENFORCE_FARM_SEASON_RESTRICTION,
  getSeasonInfo,
  isSeasonAllowed,
} from "../../config/SeasonConfig";
import { animateItemToInventory } from "./MainUIRewardAnimation";

export function refreshLand(ui: any) {
  ui.layoutLandArea();
  ui.ensureLandCountForLevel();
  ui.landTiles.forEach((tile) => tile.destroy());
  ui.landTiles = [];

  const blocks = LandSystem.getInstance().getAllBlocks();
  const totalSlots = Math.min(
    GameValues.MAX_LAND,
    ui.constructor.LAND_COLS * ui.constructor.LAND_ROWS,
  );
  for (let index = 0; index < totalSlots; index++) {
    const block = blocks[index];
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
  if (ui.activePastureSlotId === slotId) showSelectedPasture(ui, slotId);
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
  if (!unlocked) {
    const shade = new Node("PastureLockedShade");
    fillRoundRect(shade, 78, 78, 14, new Color(76, 70, 56, 70));
    tile.addChild(shade);
    const billboard = createPastureExpansionBillboard(ui);
    billboard.setPosition(0, 3);
    tile.addChild(billboard);
  } else if (slot.state === "occupied") {
    drawOccupiedMarker(ui, tile, slot);
  }
  tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    handlePastureClick(ui, slot.id);
  });
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
        if (!LandSystem.getInstance().clearBuildingSlot(slotId)) {
          ui.toast("建筑拆除失败");
          return;
        }
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

function handleLockedPastureClick(ui: any, slotId: number) {
  const land = LandSystem.getInstance();
  const unlockOrder = Math.max(0, land.getPastureUnlockedCount() - 4);
  const cost = 500 + unlockOrder * 250;
  ui.showDialog("扩建牧场", `消耗 ${cost} 金币解锁这块石板`, [
    { text: "稍后", cb: () => {} },
    {
      text: "扩建",
      cb: () => {
        const gm = GameManager.getInstance();
        if (!gm.spendGold(cost)) {
          ui.toast("金币不足");
          return;
        }
        if (!land.expandPastureSlot(slotId)) {
          gm.addGold(cost);
          ui.toast("这块石板已经解锁");
          return;
        }
        ui.refreshTopBar();
        ui.toast("牧场石板扩建成功");
      },
    },
  ]);
}

function showSelectedPasture(ui: any, slotId: number) {
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

function clearSelectedPasture(ui: any) {
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
      refreshLockedExpansionBillboard(ui, index + 1);
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
  progress: number,
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

function getRemainingSeconds(block: LandBlock): number {
  if (!block.plantTime || !block.growthDuration) return 0;
  const elapsed = Math.max(0, (Date.now() - block.plantTime) / 1000);
  return Math.max(0, Math.ceil(block.growthDuration - elapsed));
}

type CropVisualStage = "seed" | "middle" | "mature";

const STAGED_CROPS = new Set([
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
]);

const CROP_STAGE_VISUAL: Record<
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
};

const CROP_STAGE_ASSET_SIZE = 512;
const CROP_STAGE_ASSET_DEFAULT_BOTTOM_PADDING = 32;
const CROP_STAGE_ASSET_BOTTOM_PADDING: Partial<
  Record<string, Partial<Record<CropVisualStage, number>>>
> = {
  // Generated assets have different transparent padding below their contact
  // shadows. Use measured alpha bounds so every crop shares y=0 baseline.
  spinach: { middle: 66 },
  sweetPotato: { middle: 89 },
};

function getCropVisualId(block: LandBlock): string {
  if (!block.cropType) return "";
  if (!STAGED_CROPS.has(block.cropType)) return block.cropType;
  const stageIndex =
    getCropVisualStage(block) === "seed"
      ? 1
      : getCropVisualStage(block) === "middle"
        ? 2
        : 3;
  return `${block.cropType}_stage_${stageIndex}`;
}

function getCropVisualStage(block: LandBlock): CropVisualStage {
  if (block.state === "harvesting" || block.progress >= 100) return "mature";
  return block.progress < 50 ? "seed" : "middle";
}

function getCropVisualSize(block: LandBlock): number {
  if (!block.cropType) return 82;
  if (!STAGED_CROPS.has(block.cropType))
    return block.state === "harvesting" ? 92 : 82;
  return CROP_STAGE_VISUAL[block.cropType][getCropVisualStage(block)].size;
}

function getCropIconY(ui: any, block: LandBlock, cropSize: number): number {
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

function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
}

function createCropProgressBar(progress: number): Node {
  const bar = new Node("CropProgressBar");
  bar.setPosition(0, -31);
  bar.addComponent(UITransform).setContentSize(48, 8);
  drawCropProgressBar(bar, progress);
  return bar;
}

function drawCropProgressBar(bar: Node, progress: number) {
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

function animateCropStageChange(tile: Node) {
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

function showSelectedLand(ui: any, blockId: number) {
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

function clearSelectedLand(ui: any) {
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
  if (index === LandSystem.getInstance().getAllBlocks().length) {
    tile.addChild(createExpansionBillboard(ui));
  }

  tile
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, () => ui.handleLockedLandClick(index));
  return tile;
}

function createExpansionBillboard(ui: any): Node {
  const billboard = new Node("ExpansionBillboard");
  billboard.addComponent(UITransform).setContentSize(72, 72);
  billboard.setPosition(0, 3);
  ui.applyUiIcon("billboard", billboard);
  return billboard;
}

function refreshLockedExpansionBillboard(ui: any, index: number) {
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
  color: Color,
  locked = false,
) {
  const season = getSeasonInfo().season;
  const fieldIcon = locked
    ? "greenField"
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

  const production = LandSystem.getInstance().getBuildingProduction(block.id);
  if (production?.ready) {
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
  if (count <= 0) {
    if (button.active) {
      tween(button)
        .to(0.12, { scale: new Vec3(0.82, 0.82, 1) }, { easing: "quadIn" })
        .call(() => {
          button.active = false;
          button.scale = new Vec3(1, 1, 1);
        })
        .start();
    }
    return;
  }
  if (!button.active) {
    button.active = true;
    button.scale = new Vec3(0.72, 0.72, 1);
    tween(button)
      .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
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
  if (cropIcon) {
    cropIcon.setScale(new Vec3(0.12, 0.12, 1));
    const finalY = cropIcon.position.y;
    cropIcon.setPosition(0, -24);
    tween(cropIcon)
      .delay(0.18)
      .to(
        0.22,
        { position: new Vec3(0, finalY, 0), scale: new Vec3(1.08, 1.08, 1) },
        { easing: "backOut" },
      )
      .to(
        0.1,
        { position: new Vec3(0, finalY, 0), scale: new Vec3(0.96, 0.96, 1) },
        { easing: "quadOut" },
      )
      .to(
        0.12,
        { position: new Vec3(0, finalY, 0), scale: new Vec3(1, 1, 1) },
        { easing: "backOut" },
      )
      .start();
  }
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

export function ensureLandCountForLevel(ui: any) {
  const land = LandSystem.getInstance();
  const target = ui.getAutoUnlockedLandCount();
  if (land.getAllBlocks().length < target) land.expandBlocks(target);
}

export function getAutoUnlockedLandCount(ui: any): number {
  return LevelSystem.getInstance().getMaxLandBlocks(
    GameManager.getInstance().playerLevel,
  );
}

function createPastureExpansionBillboard(ui: any): Node {
  const billboard = new Node("PastureExpansionBillboard");
  billboard.addComponent(UITransform).setContentSize(72, 72);
  ui.applyUiIcon("pastureBillboard", billboard);
  return billboard;
}

export function getNextLandUnlockLevel(ui: any, index: number): number {
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
    ui.showDialog(
      "作物生长中",
      () => {
        const current = land.getBlock(blockId);
        const count =
          InventorySystem.getInstance().getItemCount("cropSpeedTicket");
        return `当前进度 ${Math.floor(current?.progress || 0)}%\n消耗 农作物加速券 x1（持有 ${count}）立即成熟`;
      },
      [
        { text: "取消", image: "btnSellCancel", cb: () => {} },
        {
          text: "加速",
          image: "btnCropSpeedUp",
          cb: () => {
            const inventory = InventorySystem.getInstance();
            if (!inventory.hasItems("cropSpeedTicket", 1)) {
              ui.toast("农作物加速券不足");
              return;
            }
            if (!land.speedUpCrop(blockId)) {
              ui.toast("该作物无法加速");
              return;
            }
            inventory.removeItem("cropSpeedTicket", 1);
            ui.refreshLandBlock(blockId);
            ui.toast("加速成功");
          },
        },
      ],
    );
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
    const count =
      (def?.harvestCount ?? 1) *
      GameManager.getInstance().consumeHarvestMultiplier();
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

function playDemolitionAnimation(
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
    .filter((block) => block.state === "harvesting" && block.cropType);
  if (matureBlocks.length === 0) {
    ui.toast("没有成熟作物");
    updateHarvestAllButton(ui);
    return;
  }

  const harvestMultiplier =
    GameManager.getInstance().consumeHarvestMultiplier();
  const ready = matureBlocks.map((block) => ({
    blockId: block.id,
    cropId: block.cropType as string,
    count:
      (getItem(block.cropType as string)?.harvestCount ?? 1) *
      harvestMultiplier,
  }));

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
  const currentCount = land.getAllBlocks().length;
  const unlockIndex = currentCount;
  const maxVisibleLand = Math.min(
    GameValues.MAX_LAND,
    ui.constructor.LAND_COLS * ui.constructor.LAND_ROWS,
  );

  if (unlockIndex >= maxVisibleLand) {
    ui.toast("田地已全部解锁");
    return;
  }

  const needLevel = ui.getNextLandUnlockLevel(unlockIndex);
  if (gm.playerLevel >= needLevel) {
    ui.suppressNextLandExpandedRefresh = true;
    land.expandBlocks(unlockIndex + 1);
    ui.toast("新田地解锁");
    ui.animateUnlockLand(unlockIndex);
    return;
  }

  ui.showDialog(
    "扩建田地",
    `Lv.${needLevel} 自动解锁\n也可消耗 ${ui.constructor.LAND_UNLOCK_DIAMOND} 钻石提前扩建`,
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
          ui.animateUnlockLand(unlockIndex);
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

export function ownedPlantableCrops(ui: any): ItemDef[] {
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
    ui.toast("没有种子，去商店购买");
    ui.showPanel("shop");
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

function getSeedBubblePosition(
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

function getTouchedPastureSlotId(ui: any, event: any): number {
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
  ui.refreshPastureSlot(slotId);
  ui.toast(`${item.name}放置完成`);
}

export function updatePastureCollectAllButton(ui: any) {
  const button = ui.node.getChildByName("PastureCollectAllButton");
  if (!button) return;
  const land = LandSystem.getInstance();
  const ready =
    ui.activeWorld === "pasture" &&
    land
      .getBuildingSlots()
      .some((slot) => land.getBuildingProduction(slot.id)?.ready);
  if (ready && !button.active) {
    button.active = true;
    button.scale = new Vec3(0.72, 0.72, 1);
    tween(button)
      .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();
  } else if (!ready) {
    button.active = false;
    button.scale = new Vec3(1, 1, 1);
  }
}

export function collectAllPastureProducts(ui: any) {
  const land = LandSystem.getInstance();
  const inventory = InventorySystem.getInstance();
  const collected = new Map<string, number>();
  let rewardAnimated = false;
  for (const slot of land.getBuildingSlots()) {
    const product = land.collectBuildingProduct(slot.id);
    if (!product) continue;
    inventory.addItem(product.itemId, product.count);
    const tile = ui.pastureTiles.find(
      (candidate: Node) => candidate.name === `Pasture_${slot.id}`,
    );
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

export function handleOccupiedBuilding(ui: any, slotId: number) {
  const land = LandSystem.getInstance();
  const block = land.getBuildingSlot(slotId);
  if (!block?.buildingId) return;
  const building = getItem(block.buildingId);
  if (block.buildingId === "fourSeasonGreenhouse") {
    openGreenhouseDialog(ui, slotId);
    return;
  }
  const production = land.getBuildingProduction(slotId);
  if (production?.ready) {
    const product = land.collectBuildingProduct(slotId);
    if (!product) return;
    InventorySystem.getInstance().addItem(product.itemId, product.count);
    const tile = ui.pastureTiles.find(
      (candidate: Node) => candidate.name === `Pasture_${slotId}`,
    );
    const rewardAnimated =
      !!tile &&
      animateItemToInventory(
        ui,
        product.itemId,
        product.count,
        tile.worldPosition.clone(),
      );
    ui.refreshPastureSlot(slotId);
    if (!rewardAnimated) {
      ui.toast(`收取 ${ui.itemName(product.itemId)} x${product.count}`);
    }
    return;
  }
  const status = production
    ? `距离下次产出还有 ${formatCountdown(production.remaining)}`
    : land.getPlacementEffectText(block.buildingId);
  ui.showDialog(building?.name || "农场建筑", status, [
    { text: "关闭", cb: () => {} },
  ]);
}

function closeGreenhouseDialog(ui: any) {
  const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
  if (!dialog || (dialog as any).__closing) return;
  (dialog as any).__closing = true;
  const dialogOpacity =
    dialog.getComponent(UIOpacity) || dialog.addComponent(UIOpacity);
  const mask = ui.dialogRoot.getChildByName("GreenhouseMask");
  const maskOpacity =
    mask?.getComponent(UIOpacity) || mask?.addComponent(UIOpacity);
  if (maskOpacity)
    tween(maskOpacity).to(0.14, { opacity: 0 }, { easing: "quadIn" }).start();
  tween(dialog)
    .to(0.14, { scale: new Vec3(0.88, 0.88, 1) }, { easing: "quadIn" })
    .start();
  tween(dialogOpacity)
    .to(0.14, { opacity: 0 }, { easing: "quadIn" })
    .call(() => {
      ui.dialogRoot.removeAllChildren();
      ui.dialogRoot.active = false;
      ui.activeGreenhouseBuildingSlotId = -1;
      ui.greenhouseDemolitionMode = false;
    })
    .start();
}

function openGreenhouseDialog(ui: any, buildingSlotId: number) {
  const seeds = getAvailableGreenhouseSeeds();
  if (
    !ui.greenhouseSelectedSeedId ||
    !seeds.some((seed) => seed.id === ui.greenhouseSelectedSeedId)
  ) {
    ui.greenhouseSelectedSeedId = seeds[0]?.id || "";
  }
  ui.dialogRoot.removeAllChildren();
  ui.dialogRoot.active = true;
  ui.activeGreenhouseBuildingSlotId = buildingSlotId;
  ui.greenhouseDemolitionMode = false;
  const vs = view.getVisibleSize();
  const mask = new Node("GreenhouseMask");
  mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
  fillRect(mask, Design.WIDTH, vs.height, new Color(42, 35, 25, 145));
  const maskOpacity = mask.addComponent(UIOpacity);
  maskOpacity.opacity = 0;
  mask
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, () => closeGreenhouseDialog(ui));
  ui.dialogRoot.addChild(mask);
  tween(maskOpacity).to(0.16, { opacity: 255 }, { easing: "quadOut" }).start();

  const dialog = new Node("GreenhouseDialog");
  dialog.addComponent(UITransform).setContentSize(336, 602);
  const dialogOpacity = dialog.addComponent(UIOpacity);
  dialogOpacity.opacity = 0;
  dialog
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) =>
      event?.stopPropagation?.(),
    );
  ui.dialogRoot.addChild(dialog);

  const background = new Node("GreenhouseDialogBackground");
  background.addComponent(UITransform).setContentSize(336, 602);
  ui.applyUiIcon("greenhouseDialogBg", background);
  dialog.addChild(background);

  const titleRoot = new Node("GreenhouseTitle");
  titleRoot.addComponent(UITransform).setContentSize(226, 48);
  titleRoot.setPosition(0, 238);
  const titleShadow = ui.makeLabel(
    "四季恒温温室",
    27,
    new Color(86, 40, 24, 150),
    true,
    2,
    5,
    226,
    48,
  );
  titleShadow.getComponent(Label)!.lineHeight = 34;
  titleRoot.addChild(titleShadow);
  const titleLabel = ui.makeLabel(
    "四季恒温温室",
    27,
    new Color(88, 45, 24),
    true,
    0,
    8,
    226,
    48,
  );
  titleLabel.getComponent(Label)!.lineHeight = 34;
  const titleOutline = titleLabel.addComponent(LabelOutline);
  titleOutline.color = new Color(255, 246, 225, 255);
  titleOutline.width = 4;
  titleRoot.addChild(titleLabel);
  dialog.addChild(titleRoot);

  const close = new Node("GreenhouseClose");
  close.addComponent(UITransform).setContentSize(38, 38);
  // The background leaves the top-right flower center clean for this glyph.
  close.setPosition(125, 226);
  close.addChild(
    ui.makeLabel("×", 27, new Color(105, 58, 31), true, 0, 1, 34, 34),
  );
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(close).stop();
    tween(close)
      .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(() => closeGreenhouseDialog(ui))
      .start();
  });
  close.on(Node.EventType.TOUCH_START, () => {
    tween(close).stop();
    tween(close)
      .to(0.06, { scale: new Vec3(0.84, 0.84, 1) }, { easing: "quadOut" })
      .start();
  });
  close.on(Node.EventType.TOUCH_CANCEL, () => {
    tween(close).stop();
    tween(close).to(0.1, { scale: Vec3.ONE }, { easing: "backOut" }).start();
  });
  dialog.addChild(close);

  const content = new Node("GreenhouseDialogContent");
  content.addComponent(UITransform).setContentSize(320, 520);
  content.setPosition(0, -9);
  dialog.addChild(content);
  renderGreenhouseDialogContent(ui, content);
  dialog.setScale(new Vec3(0.88, 0.88, 1));
  tween(dialog).to(0.18, { scale: Vec3.ONE }, { easing: "backOut" }).start();
  tween(dialogOpacity)
    .to(0.14, { opacity: 255 }, { easing: "quadOut" })
    .start();
}

function renderGreenhouseDialogContent(ui: any, content: Node) {
  [...content.children].forEach((child) => child.destroy());
  const land = LandSystem.getInstance();
  const blocks = land.getGreenhouseBlocksForBuilding(
    ui.activeGreenhouseBuildingSlotId,
  );
  blocks.forEach((block, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const slot = new Node(`GreenhouseSlot_${block.id}`);
    slot.addComponent(UITransform).setContentSize(78, 72);
    // Match the visual centres of the six floor mats in the background.
    slot.setPosition(-78 + col * 79, 80 - row * 131);
    (slot as any).__greenhouseState = block.state;
    (slot as any).__greenhouseVisualId = block.cropType
      ? getCropVisualId(block)
      : "";

    const pot = new Node("FlowerPot");
    pot.addComponent(UITransform).setContentSize(56, 42);
    pot.setPosition(0, 0);
    ui.applyUiIcon("greenhousePot", pot);
    slot.addChild(pot);
    if (block.cropType) {
      const cropIcon = ui.createItemIcon(getCropVisualId(block), 40);
      cropIcon.setPosition(0, 27);
      slot.addChild(cropIcon);
    }
    const status =
      block.state === "harvesting"
        ? "可收获"
        : block.state === "growing"
          ? `${Math.floor(block.progress)}%`
          : "";
    const statusLabel = ui.makeLabel(
      status,
      9,
      new Color(255, 246, 211),
      true,
      0,
      -36,
      68,
      14,
    );
    statusLabel.name = "GreenhouseProgress";
    if (status) {
      const outline = statusLabel.addComponent(LabelOutline);
      outline.color = new Color(91, 52, 29, 255);
      outline.width = 2;
    }
    slot.addChild(statusLabel);
    slot
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        handleGreenhouseSlotClick(ui, block.id);
      });
    content.addChild(slot);
  });

  const seedY = -165;
  content.addChild(
    ui.makeLabel(
      "选择非当季种子后点击空花盆",
      11,
      new Color(105, 67, 39),
      true,
      0,
      -118,
      220,
      18,
    ),
  );
  createGreenhouseSeedStrip(ui, content, seedY);
  createGreenhouseShovelButton(ui, content);
  createGreenhouseHarvestAllButton(ui, content);
}

function getAvailableGreenhouseSeeds(): ItemDef[] {
  return getPlantableCrops().filter(
    (seed) =>
      seed.unlockLevel <= GameManager.getInstance().playerLevel &&
      InventorySystem.getInstance().hasItems(seed.id, 1) &&
      !isSeasonAllowed(seed.seasons),
  );
}

function createGreenhouseShovelButton(ui: any, parent: Node) {
  const button = new Node("GreenhouseShovel");
  button.addComponent(UITransform).setContentSize(72, 30);
  button.setPosition(-42, -230);
  fillRoundRect(
    button,
    70,
    28,
    10,
    ui.greenhouseDemolitionMode
      ? new Color(255, 215, 120, 255)
      : new Color(255, 245, 207, 250),
  );
  strokeRoundRect(
    button,
    70,
    28,
    10,
    ui.greenhouseDemolitionMode
      ? new Color(213, 118, 42, 255)
      : new Color(151, 94, 45, 230),
    ui.greenhouseDemolitionMode ? 2.2 : 1.5,
  );
  const icon = new Node("ShovelIcon");
  icon.addComponent(UITransform).setContentSize(20, 20);
  icon.setPosition(-21, 0);
  ui.applyUiIcon("entryShovel", icon);
  button.addChild(icon);
  button.addChild(
    ui.makeLabel("铲子", 11, new Color(92, 50, 26), true, 10, 0, 36, 20),
  );
  button
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      ui.greenhouseDemolitionMode = !ui.greenhouseDemolitionMode;
      tween(button)
        .to(0.06, { scale: new Vec3(0.88, 0.88, 1) }, { easing: "quadOut" })
        .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
        .call(() => refreshGreenhouseDialog(ui))
        .start();
    });
  parent.addChild(button);
}

function createGreenhouseHarvestAllButton(ui: any, parent: Node) {
  const button = new Node("GreenhouseHarvestAll");
  button.addComponent(UITransform).setContentSize(72, 30);
  button.setPosition(42, -230);
  fillRoundRect(button, 70, 28, 10, new Color(255, 245, 207, 250));
  strokeRoundRect(button, 70, 28, 10, new Color(151, 94, 45, 230), 1.5);
  const icon = new Node("HarvestIcon");
  icon.addComponent(UITransform).setContentSize(20, 20);
  icon.setPosition(-21, 0);
  ui.applyUiIcon("entryHarvest", icon);
  button.addChild(icon);
  button.addChild(
    ui.makeLabel("收获", 11, new Color(92, 50, 26), true, 10, 0, 36, 20),
  );
  button
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      tween(button)
        .to(0.06, { scale: new Vec3(0.9, 0.9, 1) }, { easing: "quadOut" })
        .to(0.11, { scale: Vec3.ONE }, { easing: "backOut" })
        .call(() => harvestAllGreenhouseCrops(ui))
        .start();
    });
  parent.addChild(button);
}

function harvestAllGreenhouseCrops(ui: any) {
  const land = LandSystem.getInstance();
  const blocks = land
    .getGreenhouseBlocksForBuilding(ui.activeGreenhouseBuildingSlotId)
    .filter((block) => block.state === "harvesting");
  if (blocks.length === 0) {
    ui.toast("暂无可收获作物");
    return;
  }
  let total = 0;
  let rewardAnimated = false;
  for (const block of blocks) {
    const cropId = land.harvestGreenhouseCrop(block.id);
    if (!cropId) continue;
    const count = getItem(cropId)?.harvestCount ?? 1;
    InventorySystem.getInstance().addItem(cropId, count);
    const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
    const content = dialog?.getChildByName("GreenhouseDialogContent");
    const slot = content?.getChildByName(`GreenhouseSlot_${block.id}`);
    if (slot) {
      rewardAnimated =
        animateItemToInventory(ui, cropId, count, slot.worldPosition.clone()) ||
        rewardAnimated;
    }
    GameManager.getInstance().addExperience(land.getHarvestExperience());
    total += count;
  }
  ui.refreshTopBar();
  refreshGreenhouseDialog(ui);
  if (!rewardAnimated) ui.toast(`一键收获 ${total} 个作物`);
}

function createGreenhouseSeedStrip(ui: any, parent: Node, y: number) {
  const seeds = getAvailableGreenhouseSeeds();
  const viewport = new Node("GreenhouseSeedViewport");
  viewport.addComponent(UITransform).setContentSize(270, 82);
  viewport.setPosition(0, y);
  viewport.addComponent(Mask);
  parent.addChild(viewport);
  if (seeds.length === 0) {
    viewport.addChild(
      ui.makeLabel(
        "背包中没有可用的非当季种子",
        12,
        new Color(143, 103, 68),
        true,
        0,
        0,
        250,
        26,
      ),
    );
    return;
  }
  const cellW = 52;
  const contentW = Math.max(270, seeds.length * cellW);
  const strip = new Node("GreenhouseSeedContent");
  strip.addComponent(UITransform).setContentSize(contentW, 82);
  viewport.addChild(strip);
  seeds.forEach((seed, index) => {
    const selected = seed.id === ui.greenhouseSelectedSeedId;
    const cell = new Node(`GreenhouseSeed_${seed.id}`);
    cell.addComponent(UITransform).setContentSize(48, 76);
    cell.setPosition(-contentW / 2 + cellW / 2 + index * cellW, 0);
    fillRoundRect(
      cell,
      46,
      74,
      10,
      selected ? new Color(255, 220, 135, 255) : new Color(250, 241, 210, 245),
    );
    strokeRoundRect(
      cell,
      46,
      74,
      10,
      selected ? new Color(204, 112, 46, 255) : new Color(177, 129, 75, 210),
      selected ? 2.2 : 1.2,
    );
    const icon = ui.createItemIcon(seed.id, 35);
    icon.setPosition(0, 8);
    cell.addChild(icon);
    cell.addChild(
      ui.makeLabel(
        `x${InventorySystem.getInstance().getItemCount(seed.id)}`,
        8,
        new Color(82, 49, 29),
        true,
        0,
        -25,
        40,
        12,
      ),
    );
    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        ui.greenhouseSelectedSeedId = seed.id;
        refreshGreenhouseDialog(ui);
      });
    strip.addChild(cell);
  });
  if (contentW > 270) {
    const scroll = viewport.addComponent(ScrollView);
    scroll.horizontal = true;
    scroll.vertical = false;
    scroll.inertia = true;
    (scroll as any).elastic = false;
    scroll.content = strip;
  }
}

function handleGreenhouseSlotClick(ui: any, slotId: number) {
  const land = LandSystem.getInstance();
  const block = land.getGreenhouseBlock(slotId);
  if (!block) return;
  if (ui.greenhouseDemolitionMode) {
    if (block.state === "empty") {
      ui.toast("这个花盆中没有作物");
      return;
    }
    const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
    const content = dialog?.getChildByName("GreenhouseDialogContent");
    const slot = content?.getChildByName(`GreenhouseSlot_${slotId}`);
    const cropIcon = slot?.children.find(
      (child: Node) =>
        child.name !== "FlowerPot" && child.name !== "GreenhouseProgress",
    );
    const finishRemoval = () => {
      if (!land.removeGreenhouseCrop(slotId)) {
        ui.toast("该作物暂时无法铲除");
        return;
      }
      ui.greenhouseDemolitionMode = false;
      refreshGreenhouseDialog(ui);
      ui.toast("作物已铲除");
    };
    if (cropIcon) {
      tween(cropIcon)
        .to(
          0.08,
          { angle: -12, scale: new Vec3(1.08, 0.88, 1) },
          { easing: "quadOut" },
        )
        .to(0.14, { angle: 18, scale: new Vec3(0, 0, 1) }, { easing: "quadIn" })
        .call(finishRemoval)
        .start();
    } else {
      finishRemoval();
    }
    return;
  }
  if (block.state === "empty") {
    const seedId = ui.greenhouseSelectedSeedId;
    const inventory = InventorySystem.getInstance();
    if (!seedId || !inventory.hasItems(seedId, 1)) {
      ui.toast("请先选择背包中的种子");
      return;
    }
    if (!land.plantGreenhouseCrop(slotId, seedId)) {
      ui.toast("该花盆暂时无法种植");
      return;
    }
    inventory.removeItem(seedId, 1);
    if (!inventory.hasItems(seedId, 1)) ui.greenhouseSelectedSeedId = "";
    ui.toast("温室种植成功");
    refreshGreenhouseDialog(ui);
    return;
  }
  if (block.state === "growing") {
    ui.showDialog(
      "作物生长中",
      () => {
        const current = land.getGreenhouseBlock(slotId);
        const count =
          InventorySystem.getInstance().getItemCount("cropSpeedTicket");
        return `当前进度 ${Math.floor(current?.progress || 0)}%\n消耗 农作物加速券 x1（持有 ${count}）立即成熟`;
      },
      [
        { text: "取消", image: "btnSellCancel", cb: () => {} },
        {
          text: "加速",
          image: "btnCropSpeedUp",
          cb: () => {
            const inventory = InventorySystem.getInstance();
            if (!inventory.hasItems("cropSpeedTicket", 1)) {
              ui.toast("农作物加速券不足");
              return;
            }
            if (!land.speedUpGreenhouseCrop(slotId)) {
              ui.toast("该作物无法加速");
              return;
            }
            inventory.removeItem("cropSpeedTicket", 1);
            refreshGreenhouseDialog(ui);
            ui.toast("加速成功");
          },
        },
      ],
      false,
      true,
    );
    return;
  }
  if (block.state === "harvesting") {
    const cropId = land.harvestGreenhouseCrop(slotId);
    if (!cropId) return;
    const count = getItem(cropId)?.harvestCount ?? 1;
    InventorySystem.getInstance().addItem(cropId, count);
    const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
    const content = dialog?.getChildByName("GreenhouseDialogContent");
    const slot = content?.getChildByName(`GreenhouseSlot_${slotId}`);
    const rewardAnimated =
      !!slot &&
      animateItemToInventory(ui, cropId, count, slot.worldPosition.clone());
    GameManager.getInstance().addExperience(land.getHarvestExperience());
    if (!rewardAnimated) ui.toast(`收获 ${ui.itemName(cropId)} x${count}`);
    refreshGreenhouseDialog(ui);
  }
}

export function refreshGreenhouseDialog(ui: any) {
  if (!ui.dialogRoot?.active) return;
  const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
  const content = dialog?.getChildByName("GreenhouseDialogContent");
  if (content) renderGreenhouseDialogContent(ui, content);
}

export function updateGreenhouseDialogProgress(ui: any) {
  if (!ui.dialogRoot?.active) return;
  const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
  const content = dialog?.getChildByName("GreenhouseDialogContent");
  if (!content) return;
  for (const block of LandSystem.getInstance().getGreenhouseBlocksForBuilding(
    ui.activeGreenhouseBuildingSlotId,
  )) {
    const slot = content.getChildByName(`GreenhouseSlot_${block.id}`);
    if (!slot) continue;
    if ((slot as any).__greenhouseState !== block.state) {
      renderGreenhouseDialogContent(ui, content);
      return;
    }
    if (
      (slot as any).__greenhouseVisualId !==
      (block.cropType ? getCropVisualId(block) : "")
    ) {
      renderGreenhouseDialogContent(ui, content);
      return;
    }
    const label = slot
      .getChildByName("GreenhouseProgress")
      ?.getComponent(Label);
    if (label && block.state === "growing")
      label.string = `${Math.floor(block.progress)}%`;
  }
}

function getTouchedLandBlockId(ui: any, event: any): number {
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
