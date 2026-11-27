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
import {
  bindTaskStylePressFeedback,
  fillRect,
  fillRoundRect,
  strokeRoundRect,
} from "../../utils/UIDraw";
import {
  ENFORCE_FARM_SEASON_RESTRICTION,
  getSeasonInfo,
  isSeasonAllowed,
} from "../../../config/SeasonConfig";
import { animateItemToInventory } from "../shared/MainUIRewardAnimation";



export type LivestockBuildingId = "chickenCoop" | "barn";

export type ProductionSceneBuildingId = "garden" | "beehive";

export const FARM_BUILDING_SOURCE_WIDTH = 752;

export const FARM_BUILDING_SOURCE_HEIGHT = 1359;

export const FARM_BUILDING_DIALOG_WIDTH = 336;

export const FARM_BUILDING_DIALOG_HEIGHT = 602;

// The regenerated 752 x 1359 frame moved the title band and flower centre
// upward. Keep these anchors tied to the new raster rather than compensating
// individual dialogs after scaling them to 336 x 602.
export const FARM_BUILDING_TITLE_CENTER_SOURCE_Y = 90;

// The generated floral frames do not share an identical flower centre even
// after their outer cutout bounds are normalized. Keep one measured anchor per
// frame so the close glyph is optically centred in both axes.
export const FARM_BUILDING_CLOSE_CENTERS = {
  chickenCoop: { x: 660, y: 114 },
  barn: { x: 652, y: 114 },
  garden: { x: 659, y: 116 },
  greenhouse: { x: 658, y: 114 },
  beehive: { x: 661, y: 118 },
} as const;

export const FARM_BUILDING_BOTTOM_PANEL_CENTER_SOURCE_Y = 1180;


export function interiorSourceXToDialog(sourceX: number): number {
  return (
    (sourceX - FARM_BUILDING_SOURCE_WIDTH / 2) *
    (FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH)
  );
}


export function interiorSourceYToDialog(sourceY: number): number {
  return (
    (FARM_BUILDING_SOURCE_HEIGHT / 2 - sourceY) *
    (FARM_BUILDING_DIALOG_HEIGHT / FARM_BUILDING_SOURCE_HEIGHT)
  );
}


// All five normalized masters share one top geometry. Derive title and close
// positions from measured source pixels so image and interaction logic cannot
// drift independently.
export const FARM_BUILDING_DIALOG_TITLE_Y = interiorSourceYToDialog(
  FARM_BUILDING_TITLE_CENTER_SOURCE_Y,
);

export const FARM_BUILDING_DIALOG_TITLE_X = 2;

// Cocos labels have more visual weight below their typographic origin. Raise
// both layers together so the visible glyph bounds, rather than the font box,
// are vertically centred inside the cream title plaque.
export const FARM_BUILDING_TITLE_TEXT_Y = 4;

export const FARM_BUILDING_TITLE_SHADOW_Y = 1;

export function interiorCloseCenterToDialog(scene: keyof typeof FARM_BUILDING_CLOSE_CENTERS) {
  const center = FARM_BUILDING_CLOSE_CENTERS[scene];
  return {
    x: interiorSourceXToDialog(center.x),
    y: interiorSourceYToDialog(center.y),
  };
}

export const FARM_BUILDING_GREENHOUSE_CLOSE = interiorCloseCenterToDialog("greenhouse");

export const FARM_BUILDING_DIALOG_BOTTOM_PANEL_CENTER_Y = interiorSourceYToDialog(
  FARM_BUILDING_BOTTOM_PANEL_CENTER_SOURCE_Y,
);

// The flowerhouse and greenhouse lower cream recesses have different heights.
// Use their measured inner-fill centres rather than the generic action-panel
// baseline so each 98px horizontal seed viewport is vertically centred.
export const FLOWERHOUSE_SEED_PANEL_CENTER_Y = interiorSourceYToDialog(1164);

export const GREENHOUSE_SEED_PANEL_CENTER_Y = interiorSourceYToDialog(1179);

export const FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE = 40;

export const FARM_BUILDING_DIALOG_X = 0;

export const SHOW_LEGACY_INTERIOR_CONTENT = false;

export const EXPANSION_BILLBOARD_SIZE = 56;

// All image-led building dialogs share one geometry contract. Dynamic barn
// layers use these same values so they cannot render at a different scale.
export const FARM_BUILDING_CONTENT_WIDTH = 320;

export const FARM_BUILDING_CONTENT_HEIGHT = 520;

export function attachSceneCloseArt(close: Node) {
  const art = new Node("SceneCloseArt");
  art.addComponent(UITransform).setContentSize(26, 26);
  art.setPosition(0, 0);
  const graphics = art.addComponent(Graphics);
  graphics.lineWidth = 3.4;
  graphics.strokeColor = new Color(104, 52, 28, 255);
  const radius = 6;
  graphics.moveTo(-radius, radius);
  graphics.lineTo(radius, -radius);
  graphics.moveTo(radius, radius);
  graphics.lineTo(-radius, -radius);
  graphics.stroke();
  close.addChild(art);
  bindTaskStylePressFeedback(close);
}


export type InteriorFillerScene =
  | "chickenCoop"
  | "barn"
  | "beehive"
  | "garden"
  | "greenhouse";


/**
 * Shared geometry measured from the 752 x 1359 building-scene master and
 * converted to the 336 x 602 dialog coordinate system.
 *
 * Source measurements after the five scene rasters were normalized:
 * - title-band visual centre: y = 145 -> dialog y = 237
 * - right flower centre: (650, 185) -> dialog (122, 219)
 * - lower-panel outer top/base: y = 916..1278 -> dialog y = -105..-265
 * - lower-panel inner top/base: y = 950..1244 -> dialog y = -120..-250
 * - lower-panel inner sides: x = 50..702 -> dialog x = -146..146
 *
 * Every scene keeps the lower option strip at the same baseline. The primary
 * row above it is intentionally scene-specific, so the interfaces share
 * rhythm without becoming the same two scrolling rows with different art.
 */
export const FARM_BUILDING_CONTENT_Y = -9;

export const FARM_BUILDING_OPTION_ROW_Y = -224;

export const FARM_BUILDING_FLOWER_ROW_Y = -146;

export const FARM_BUILDING_HIVE_ROW_Y = -154;

export const FARM_BUILDING_CHICKEN_ROW_Y = -154;

export const FARM_BUILDING_BARN_ROW_Y = -148;


export const LIVESTOCK_FEEDS = [
  { itemId: "wheat", seconds: 30 },
  { itemId: "corn", seconds: 35 },
  { itemId: "carrot", seconds: 25 },
  { itemId: "beetroot", seconds: 45 },
  { itemId: "sweetPotato", seconds: 40 },
  { itemId: "pumpkin", seconds: 50 },
];


export const LIVESTOCK_SCENES: Record<
  LivestockBuildingId,
  {
    title: string;
    titleY: number;
    background: string;
    closeX: number;
    closeY: number;
    hotspots: Array<{ x: number; y: number; width: number; height: number }>;
  }
> = {
  chickenCoop: {
    title: "温馨鸡舍",
    titleY: FARM_BUILDING_DIALOG_TITLE_Y,
    background: "chickenCoopDialogBg",
    closeX: interiorCloseCenterToDialog("chickenCoop").x,
    closeY: interiorCloseCenterToDialog("chickenCoop").y,
    hotspots: [
      { x: -58, y: 52, width: 78, height: 82 },
      { x: 68, y: 8, width: 82, height: 86 },
      { x: 0, y: -38, width: 92, height: 76 },
    ],
  },
  barn: {
    title: "阳光牛棚",
    titleY: FARM_BUILDING_DIALOG_TITLE_Y,
    background: "barnDialogBg",
    closeX: interiorCloseCenterToDialog("barn").x,
    closeY: interiorCloseCenterToDialog("barn").y,
    hotspots: [
      // Measured from the completely redrawn 752 x 1359 barn master. The
      // wider hit areas follow each adult cow while staying clear of the
      // central aisle, so selection belongs to the animal that was tapped.
      { x: -72, y: 18, width: 130, height: 150 },
      { x: 74, y: 18, width: 130, height: 150 },
    ],
  },
};


export const PRODUCTION_SCENES: Record<
  ProductionSceneBuildingId,
  {
    title: string;
    titleY: number;
    background: string;
    closeX: number;
    closeY: number;
  }
> = {
  garden: {
    title: "缤纷花房",
    titleY: FARM_BUILDING_DIALOG_TITLE_Y,
    background: "flowerHouseDialogBg",
    closeX: interiorCloseCenterToDialog("garden").x,
    closeY: interiorCloseCenterToDialog("garden").y,
  },
  beehive: {
    title: "甜蜜蜂窝",
    titleY: FARM_BUILDING_DIALOG_TITLE_Y,
    background: "beehiveDialogBg",
    closeX: interiorCloseCenterToDialog("beehive").x,
    closeY: interiorCloseCenterToDialog("beehive").y,
  },
};


export function isLivestockBuilding(
  buildingId: string | undefined,
): buildingId is LivestockBuildingId {
  return buildingId === "chickenCoop" || buildingId === "barn";
}


export function isProductionSceneBuilding(
  buildingId: string | undefined,
): buildingId is ProductionSceneBuildingId {
  return buildingId === "garden" || buildingId === "beehive";
}
