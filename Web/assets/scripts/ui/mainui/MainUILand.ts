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
import { Design, GameValues } from "../../config/GameConfig";
import { GameManager } from "../../core/GameManager";
import { InventorySystem } from "../../systems/InventorySystem";
import { LandBlock, LandSystem } from "../../systems/LandSystem";
import {
  getItem,
  getPlantableCrops,
  ITEM_DB,
  ItemCategory,
  ItemDef,
} from "../../config/ItemConfig";
import { fillRect, fillRoundRect, strokeRoundRect } from "../utils/UIDraw";
import {
  ENFORCE_FARM_SEASON_RESTRICTION,
  getSeasonInfo,
  isSeasonAllowed,
} from "../../config/SeasonConfig";
import { animateItemToInventory } from "./MainUIRewardAnimation";

type LivestockBuildingId = "chickenCoop" | "barn";
type ProductionSceneBuildingId = "garden" | "beehive";
const FARM_BUILDING_SOURCE_WIDTH = 752;
const FARM_BUILDING_SOURCE_HEIGHT = 1359;
const FARM_BUILDING_DIALOG_WIDTH = 336;
const FARM_BUILDING_DIALOG_HEIGHT = 602;
const FARM_BUILDING_TITLE_CENTER_SOURCE_Y = 115;
const FARM_BUILDING_CLOSE_CENTER_SOURCE_X = 658;
const FARM_BUILDING_CLOSE_CENTER_SOURCE_Y = 151;

function interiorSourceXToDialog(sourceX: number): number {
  return (
    (sourceX - FARM_BUILDING_SOURCE_WIDTH / 2) *
    (FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH)
  );
}

function interiorSourceYToDialog(sourceY: number): number {
  return (
    (FARM_BUILDING_SOURCE_HEIGHT / 2 - sourceY) *
    (FARM_BUILDING_DIALOG_HEIGHT / FARM_BUILDING_SOURCE_HEIGHT)
  );
}

// All five normalized masters share one top geometry. Derive title and close
// positions from measured source pixels so image and interaction logic cannot
// drift independently.
const FARM_BUILDING_DIALOG_TITLE_Y = interiorSourceYToDialog(
  FARM_BUILDING_TITLE_CENTER_SOURCE_Y,
);
const FARM_BUILDING_TITLE_TEXT_Y = 0;
const FARM_BUILDING_TITLE_SHADOW_Y = -3;
const FARM_BUILDING_DIALOG_CLOSE_X = interiorSourceXToDialog(
  FARM_BUILDING_CLOSE_CENTER_SOURCE_X,
);
const FARM_BUILDING_DIALOG_CLOSE_Y = interiorSourceYToDialog(
  FARM_BUILDING_CLOSE_CENTER_SOURCE_Y,
);
const FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE = 40;
const FARM_BUILDING_DIALOG_X = 0;
const SHOW_LEGACY_INTERIOR_CONTENT = false;

function attachSceneCloseArt(close: Node) {
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
}

type InteriorFillerScene =
  | "chickenCoop"
  | "barn"
  | "beehive"
  | "garden"
  | "greenhouse";

const INTERIOR_ACTION_FILLERS: Partial<
  Record<InteriorFillerScene, Array<{ icon: string; label: string }>>
> = {
  chickenCoop: [
    { icon: "sceneChickenEggs", label: "\u6536\u53d6\u9e21\u86cb" },
    { icon: "sceneChickenChick", label: "\u5b75\u5316\u5c0f\u9e21" },
    { icon: "sceneChickenExpand", label: "\u6269\u5efa\u680f\u4f4d" },
    { icon: "sceneChickenFeed", label: "\u50a8\u5907\u9972\u6599" },
  ],
  barn: [
    { icon: "sceneBarnMilk", label: "\u6324\u5976\u6536\u83b7" },
    { icon: "sceneBarnHay", label: "\u9972\u6599\u5b58\u50a8" },
    { icon: "sceneBarnWheat", label: "\u6574\u7406\u5c0f\u9ea6" },
    { icon: "sceneBarnCowStatus", label: "\u725b\u53ea\u72b6\u6001" },
  ],
  beehive: [
    { icon: "sceneBeehiveHoney", label: "\u6536\u53d6\u8702\u871c" },
    { icon: "sceneBeehiveComb", label: "\u8702\u8721\u52a0\u5de5" },
    { icon: "sceneBeehiveBeeStatus", label: "\u8702\u7fa4\u72b6\u6001" },
    { icon: "sceneBeehiveFlowers", label: "\u82b1\u6e90\u7ba1\u7406" },
  ],
};

function addInteriorFillerIcon(
  ui: any,
  parent: Node,
  name: string,
  icon: string,
  x: number,
  y: number,
  width: number,
  height = width,
  rotation = 0,
): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  node.setPosition(x, y);
  node.setRotationFromEuler(0, 0, rotation);
  ui.applyUiIcon(icon, node);
  parent.addChild(node);
  return node;
}

function renderInteriorActionFillers(
  ui: any,
  layer: Node,
  scene: "chickenCoop" | "barn" | "beehive",
) {
  const actions = INTERIOR_ACTION_FILLERS[scene] || [];
  // Measured from the common lower-panel inner bounds in the 752 x 1359
  // rasters: x=58..694, y=1000..1235. Four 66 px cards with 4 px gaps map
  // to these dialog-space centres without touching the ornamental border.
  const centers = [-105, -35, 35, 105];
  actions.forEach((action, index) => {
    const card = new Node(`InteriorAction_${scene}_${index}`);
    card.addComponent(UITransform).setContentSize(68, 94);
    card.setPosition(centers[index], -184);
    fillRoundRect(card, 66, 92, 8, new Color(255, 238, 196, 238));
    strokeRoundRect(card, 66, 92, 8, new Color(211, 126, 38, 255), 1.8);
    layer.addChild(card);

    addInteriorFillerIcon(
      ui,
      card,
      `InteriorActionIcon_${index}`,
      action.icon,
      0,
      12,
      52,
      52,
    );
    const label = ui.makeLabel(
      action.label,
      12,
      new Color(94, 48, 24, 255),
      true,
      0,
      -31,
      64,
      20,
    );
    label.getComponent(Label)!.lineHeight = 16;
    card.addChild(label);
  });
}

function renderPlantRoomFillers(
  ui: any,
  layer: Node,
  scene: "garden" | "greenhouse",
  buildingSlotId: number,
) {
  const isFlowerhouse = scene === "garden";
  const land = LandSystem.getInstance();
  const flowerSlots = isFlowerhouse ? land.getFlowerHouseSlots(buildingSlotId) : [];
  const greenhouseSlots = !isFlowerhouse
    ? land.getGreenhouseBlocksForBuilding(buildingSlotId)
    : [];
  const sourcePlacements = isFlowerhouse
    ? [
        // marker x/y, reserved width/height, marker rotation, pot y, pot x.
        [200, 572, 108, 38, 0, 537, 204], [374, 572, 108, 38, 0, 537, 374], [538, 572, 108, 38, 0, 537, 534],
        [180, 738, 108, 38, -3, 713, 180], [140, 825, 108, 38, -3, 803, 144],
        [375, 824, 92, 40, 0, 796, 379],
        [572, 738, 108, 38, 3, 713, 576], [600, 825, 108, 38, 3, 803, 600],
      ]
    : [
        [188.5, 502, 112, 106, 0], [376, 532.5, 108, 38, 0], [566.5, 532.5, 108, 38, 0],
        [188.5, 749.5, 108, 38, 0], [377, 749.5, 108, 38, 0], [566.5, 749.5, 108, 38, 0],
      ];
  const slots: any[] = isFlowerhouse ? flowerSlots : greenhouseSlots;
  sourcePlacements.forEach((placement, index) => {
    const [sourceX, sourceY, sourceWidth, sourceHeight, rotation, potSourceY, potSourceX] = placement;
    const unlocked = isFlowerhouse
      ? !!slots[index]?.unlocked
      : !!slots[index]?.greenhouseUnlocked;
    const isPot = unlocked;
    const renderSourceWidth = isPot
      ? 112
      : sourceWidth;
    const renderSourceHeight = isPot
      ? 106
      : sourceHeight;
    const renderSourceY = isPot
      ? (potSourceY ?? sourceY + sourceHeight / 2 - renderSourceHeight / 2)
      : sourceY;
    const renderRotation = isPot ? 0 : rotation;
    // Standalone 256px assets include transparent padding. Compensate from the
    // measured alpha bounds so the visible art retains the calibrated footprint
    // used by the former baked overlay (pot 213x175, plus marker 220x220).
    const alphaWidth = isPot ? 213 : 220;
    const alphaHeight = isPot ? 175 : 220;
    const node = addInteriorFillerIcon(
      ui, layer, `PlantRoomSlot_${index}`,
      unlocked ? (isFlowerhouse ? "sceneFlowerhousePot" : "sceneGreenhousePot")
        : (isFlowerhouse ? "sceneFlowerhouseSlotPlus" : "sceneGreenhouseSlotPlus"),
      interiorSourceXToDialog(isPot ? (potSourceX ?? sourceX) : sourceX),
      interiorSourceYToDialog(renderSourceY),
      renderSourceWidth * 256 / alphaWidth * FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH,
      renderSourceHeight * 256 / alphaHeight * FARM_BUILDING_DIALOG_HEIGHT / FARM_BUILDING_SOURCE_HEIGHT,
      renderRotation,
    );
    if (unlocked) {
      if (isFlowerhouse) {
        const flowerSlot = slots[index];
        const production = land.getFlowerHouseSlotProduction(buildingSlotId, index);
        if (flowerSlot?.flowerId) {
          // The normalized growth sprites end their visible plant at y=480.
          // With the 58px display box, placing its centre 85 source pixels
          // above the pot centre aligns that visible baseline with the centre
          // of the pot's soil opening (27 source pixels above pot centre).
          // Reusing potSourceX keeps the plant horizontally centred in the rim.
          const growth = addInteriorFillerIcon(
            ui,
            layer,
            `FlowerHousePotGrowth_${index}`,
            flowerHouseGrowthIconKey(flowerSlot.flowerId, production),
            interiorSourceXToDialog(potSourceX ?? sourceX),
            interiorSourceYToDialog((potSourceY ?? sourceY) - 85),
            58,
            58,
          );
          growth.setSiblingIndex(layer.children.length - 1);
          growth.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            plantSelectedFlowerInPot(ui, buildingSlotId, index, growth);
          });
        }
        node.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
          event?.stopPropagation?.();
          plantSelectedFlowerInPot(ui, buildingSlotId, index, node);
        });
      } else {
        const greenhouseBlock = slots[index] as LandBlock | undefined;
        if (greenhouseBlock?.cropType) {
          // Crop growth stages live in the item texture cache, not UI_ASSETS.
          // createItemIcon resolves `${crop}_stage_1/2/3` correctly and returns
          // the node with its SpriteFrame attached.
          const crop = ui.createItemIcon(getCropVisualId(greenhouseBlock), 58);
          crop.name = `GreenhousePotCrop_${greenhouseBlock.id}`;
          (crop as any).__greenhouseVisualId = getCropVisualId(greenhouseBlock);
          crop.setPosition(
            interiorSourceXToDialog(potSourceX ?? sourceX),
            // Stage canvases include a compact contact patch at their bottom.
            // Keep the contact patch inside the pot opening, then raise the
            // complete crop by about 6 dialog pixels for the requested visual
            // centre. All three stages continue to share this baseline.
            interiorSourceYToDialog(renderSourceY - 80.5),
          );
          crop.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            handleGreenhouseScenePotClick(
              ui,
              buildingSlotId,
              greenhouseBlock.id,
              crop,
            );
          });
          layer.addChild(crop);
        }
        if (greenhouseBlock) {
          node.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            handleGreenhouseScenePotClick(
              ui,
              buildingSlotId,
              greenhouseBlock.id,
              node,
            );
          });
        }
      }
      return;
    }
    node.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      if (isFlowerhouse) handleFlowerHouseSlotUnlock(ui, buildingSlotId, index);
      else if (slots[index]) handleGreenhouseSlotUnlock(ui, slots[index].id);
    });
  });

}

function plantSelectedFlowerInPot(
  ui: any,
  buildingSlotId: number,
  flowerSlotId: number,
  potNode: Node,
) {
  const land = LandSystem.getInstance();
  const slot = land.getFlowerHouseSlots(buildingSlotId)[flowerSlotId];
  if (!slot?.unlocked) return;
  if (slot.flowerId) {
    const production = land.getFlowerHouseSlotProduction(buildingSlotId, flowerSlotId);
    if (production?.ready) {
      collectFlowerHouseSlot(ui, buildingSlotId, flowerSlotId, potNode);
      refreshPlantRoomFillerLayer(
        ui,
        ui.dialogRoot.getChildByName("ProductionSceneDialog"),
        "garden",
        buildingSlotId,
      );
      return;
    }
    ui.toast("这个花盆正在生长");
    return;
  }
  const selected = ui.flowerHouseSelectedFlowerId;
  if (FLOWER_HOUSE_FLOWERS.indexOf(selected) < 0) {
    ui.toast("请先选择花卉种子");
    return;
  }
  const cost = land.getFlowerHousePlantCost(selected);
  const gm = GameManager.getInstance();
  if (!gm.spendGold(cost)) {
    ui.toast(`金币不足，种植鲜花需要 ${cost} 金币`);
    return;
  }
  if (!land.plantFlowerHouseSlot(buildingSlotId, flowerSlotId, selected)) {
    gm.addGold(cost);
    ui.toast("花盆当前不可种植");
    return;
  }
  ui.refreshTopBar();
  tween(potNode)
    .to(0.07, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
    .to(0.11, { scale: Vec3.ONE }, { easing: "backOut" })
    .call(() => {
      refreshPlantRoomFillerLayer(
        ui,
        ui.dialogRoot.getChildByName("ProductionSceneDialog"),
        "garden",
        buildingSlotId,
      );
    })
    .start();
  ui.toast(`已种下${ui.itemName(selected)}`);
}

function refreshGreenhouseScene(ui: any, buildingSlotId: number) {
  const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
  if (!dialog?.isValid) return;
  refreshPlantRoomFillerLayer(ui, dialog, "greenhouse", buildingSlotId);
  dialog.getChildByName("GreenhouseSeedViewport")?.destroy();
  createGreenhouseSeedStrip(ui, dialog, -190);
}

function handleGreenhouseScenePotClick(
  ui: any,
  buildingSlotId: number,
  greenhouseSlotId: number,
  source: Node,
) {
  const land = LandSystem.getInstance();
  const block = land.getGreenhouseBlock(greenhouseSlotId);
  if (!block?.greenhouseUnlocked) return;
  if (block.state === "empty") {
    const seedId = ui.greenhouseSelectedSeedId;
    const inventory = InventorySystem.getInstance();
    if (!seedId || !inventory.hasItems(seedId, 1)) {
      ui.toast("请先选择底部的非当季种子");
      return;
    }
    if (!land.plantGreenhouseCrop(greenhouseSlotId, seedId)) {
      ui.toast("该花盆暂时无法种植");
      return;
    }
    inventory.removeItem(seedId, 1);
    if (!inventory.hasItems(seedId, 1)) {
      const remainingSeeds = getAvailableGreenhouseSeeds();
      ui.greenhouseSelectedSeedId = remainingSeeds[0]?.id || "";
    }
    tween(source)
      .to(0.07, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
      .to(0.11, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(() => refreshGreenhouseScene(ui, buildingSlotId))
      .start();
    ui.toast(`已种下${ui.itemName(seedId)}`);
    return;
  }
  if (block.state === "growing") {
    ui.toast(`作物生长中 ${Math.floor(block.progress)}%`);
    return;
  }
  if (block.state === "harvesting") {
    const cropId = land.harvestGreenhouseCrop(greenhouseSlotId);
    if (!cropId) return;
    const count = getItem(cropId)?.harvestCount ?? 1;
    InventorySystem.getInstance().addItem(cropId, count);
    const animated = animateItemToInventory(
      ui,
      cropId,
      count,
      source.worldPosition.clone(),
    );
    GameManager.getInstance().addExperience(land.getHarvestExperience());
    ui.refreshPastureSlot(buildingSlotId);
    refreshGreenhouseScene(ui, buildingSlotId);
    if (!animated) ui.toast(`收获 ${ui.itemName(cropId)} x${count}`);
  }
}

function renderInteriorFillerLayer(
  ui: any,
  dialog: Node,
  scene: InteriorFillerScene,
  buildingSlotId = -1,
) {
  const layer = new Node("InteriorFillerLayer");
  layer.addComponent(UITransform).setContentSize(336, 602);
  dialog.addChild(layer);
  if (scene === "garden" || scene === "greenhouse") {
    renderPlantRoomFillers(ui, layer, scene, buildingSlotId);
  } else {
    renderInteriorActionFillers(ui, layer, scene);
  }
}

function refreshPlantRoomFillerLayer(
  ui: any,
  dialog: Node | null | undefined,
  scene: "garden" | "greenhouse",
  buildingSlotId: number,
) {
  if (!dialog?.isValid) return;
  dialog.getChildByName("InteriorFillerLayer")?.destroy();
  renderInteriorFillerLayer(ui, dialog, scene, buildingSlotId);
  const title = scene === "greenhouse"
    ? dialog.getChildByName("GreenhouseTitle")
    : dialog.getChildByName("ProductionSceneTitle");
  const close = scene === "greenhouse"
    ? dialog.getChildByName("GreenhouseClose")
    : dialog.getChildByName("ProductionSceneClose");
  title?.setSiblingIndex(dialog.children.length - 1);
  close?.setSiblingIndex(dialog.children.length - 1);
}

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
const FARM_BUILDING_CONTENT_Y = -9;
const FARM_BUILDING_OPTION_ROW_Y = -224;
const FARM_BUILDING_FLOWER_ROW_Y = -146;
const FARM_BUILDING_HIVE_ROW_Y = -154;
const FARM_BUILDING_CHICKEN_ROW_Y = -154;
const FARM_BUILDING_BARN_ROW_Y = -148;

const LIVESTOCK_FEEDS = [
  { itemId: "wheat", seconds: 30 },
  { itemId: "corn", seconds: 35 },
  { itemId: "carrot", seconds: 25 },
  { itemId: "beetroot", seconds: 45 },
  { itemId: "sweetPotato", seconds: 40 },
  { itemId: "pumpkin", seconds: 50 },
];

const LIVESTOCK_SCENES: Record<
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
    closeX: FARM_BUILDING_DIALOG_CLOSE_X,
    closeY: FARM_BUILDING_DIALOG_CLOSE_Y,
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
    closeX: FARM_BUILDING_DIALOG_CLOSE_X,
    closeY: FARM_BUILDING_DIALOG_CLOSE_Y,
    hotspots: [
      { x: -76, y: 30, width: 94, height: 106 },
      { x: 76, y: 30, width: 94, height: 106 },
    ],
  },
};

const PRODUCTION_SCENES: Record<
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
    closeX: FARM_BUILDING_DIALOG_CLOSE_X,
    closeY: FARM_BUILDING_DIALOG_CLOSE_Y,
  },
  beehive: {
    title: "甜蜜蜂窝",
    titleY: FARM_BUILDING_DIALOG_TITLE_Y,
    background: "beehiveDialogBg",
    closeX: FARM_BUILDING_DIALOG_CLOSE_X,
    closeY: FARM_BUILDING_DIALOG_CLOSE_Y,
  },
};

function productionRatio(production: {
  duration?: number;
  remaining?: number;
  ready?: boolean;
} | null | undefined): number {
  if (!production) return 0;
  if (production.ready) return 1;
  const duration = Math.max(1, Number(production.duration || 1));
  return Math.max(
    0,
    Math.min(1, 1 - Number(production.remaining || duration) / duration),
  );
}

function createSceneInteractionBadge(
  ui: any,
  parent: Node,
  options: {
    name: string;
    x: number;
    y: number;
    width?: number;
    label: string;
    ratio?: number;
    ready?: boolean;
    locked?: boolean;
    onClick: () => void;
  },
): Node {
  const width = options.width || 70;
  const badge = new Node(options.name);
  badge.addComponent(UITransform).setContentSize(width, 24);
  badge.setPosition(options.x, options.y);
  const badgeBackground = new Node("SceneBadgeBackground");
  badgeBackground.addComponent(UITransform).setContentSize(width, 24);
  ui.applyUiIcon(options.ready ? "feedCardSelectedBg" : "feedCardBg", badgeBackground);
  if (options.locked) {
    badgeBackground.addComponent(UIOpacity).opacity = 155;
  }
  badge.addChild(badgeBackground);
  badge.addChild(
    ui.makeLabel(
      options.label,
      9,
      new Color(94, 55, 29),
      true,
      0,
      4,
      width - 8,
      13,
    ),
  );
  const progress = new Node("SceneBadgeProgress");
  progress.addComponent(UITransform).setContentSize(width - 14, 4);
  progress.setPosition(0, -7);
  fillRoundRect(progress, width - 14, 4, 2, new Color(166, 119, 75, 105));
  const ratio = Math.max(0, Math.min(1, Number(options.ratio || 0)));
  const fillWidth = (width - 16) * ratio;
  if (fillWidth > 0) {
    const fill = new Node("Fill");
    fill.addComponent(UITransform).setContentSize(fillWidth, 3);
    fill.setPosition(-(width - 16) / 2 + fillWidth / 2, 0);
    fillRoundRect(
      fill,
      fillWidth,
      3,
      1.5,
      options.ready
        ? new Color(255, 171, 45, 255)
        : new Color(117, 189, 75, 255),
    );
    progress.addChild(fill);
  }
  badge.addChild(progress);
  badge.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(badge)
      .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
      .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(options.onClick)
      .start();
  });
  parent.addChild(badge);
  return badge;
}

function emitSceneCardClick(card: Node | null | undefined) {
  if (!card?.isValid) return;
  card.emit(Node.EventType.TOUCH_END, { stopPropagation() {} });
}

function updateSceneInteractionBadge(
  badge: Node | null | undefined,
  labelText: string,
  ratioValue: number,
  ready = false,
) {
  if (!badge?.isValid) return;
  const label = badge.children.find((child) => child.getComponent(Label))?.getComponent(Label);
  if (label) label.string = labelText;
  const progress = badge.getChildByName("SceneBadgeProgress");
  if (!progress) return;
  [...progress.children].forEach((child) => child.destroy());
  const progressWidth = Math.max(
    0,
    (progress.getComponent(UITransform)?.contentSize.width || 0) - 2,
  );
  const fillWidth = progressWidth * Math.max(0, Math.min(1, ratioValue));
  if (fillWidth <= 0) return;
  const fill = new Node("Fill");
  fill.addComponent(UITransform).setContentSize(fillWidth, 3);
  fill.setPosition(-progressWidth / 2 + fillWidth / 2, 0);
  fillRoundRect(
    fill,
    fillWidth,
    3,
    1.5,
    ready ? new Color(255, 171, 45, 255) : new Color(117, 189, 75, 255),
  );
  progress.addChild(fill);
}

function rebuildFlowerHouseSceneControls(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  content.children
    .filter(
      (child) =>
        child.name.startsWith("FlowerSceneControl_") ||
        child.name.startsWith("FlowerSceneVisual_"),
    )
    .forEach((child) => child.destroy());
  const land = LandSystem.getInstance();
  const positions = [
    [-91, 78],
    [91, 78],
    [-91, -4],
    [91, -4],
  ];
  land.getFlowerHouseSlots(buildingSlotId).forEach((slot, index) => {
    const point = positions[index];
    if (!point) return;
    const production = land.getFlowerHouseSlotProduction(buildingSlotId, slot.id);
    if (slot.flowerId) {
      const visual = ui.createItemIcon(slot.flowerId, 46);
      visual.name = `FlowerSceneVisual_${slot.id}`;
      visual.setPosition(point[0], point[1] + 13);
      content.addChild(visual);
    }
    createSceneInteractionBadge(ui, content, {
      name: `FlowerSceneControl_${slot.id}`,
      x: point[0],
      y: point[1] - 24,
      width: 74,
      label: !slot.flowerId
        ? "点击种植"
        : production?.ready
          ? "点击收获"
          : `生长 ${Math.round(productionRatio(production) * 100)}%`,
      ratio: productionRatio(production),
      ready: !!production?.ready,
      onClick: () =>
        emitSceneCardClick(content.getChildByName(`FlowerHouseCard_${slot.id}`)),
    });
  });
}

function handleFlowerHouseSlotUnlock(
  ui: any,
  buildingSlotId: number,
  flowerSlotId: number,
) {
  const land = LandSystem.getInstance();
  const slot = land.getFlowerHouseSlots(buildingSlotId)[flowerSlotId];
  if (!slot || slot.unlocked) return;
  const cost = land.getFlowerHouseSlotUnlockCost(flowerSlotId);
  ui.showDialog("解锁花房花盆", `消耗 ${cost} 金币解锁这个花盆位置`, [
    { text: "稍后", image: "btnGreenhouseUnlockLater", cb: () => {} },
    {
      text: "解锁",
      image: "btnGreenhouseUnlockConfirm",
      cb: () => {
        const gm = GameManager.getInstance();
        if (!gm.spendGold(cost)) {
          ui.toast("金币不足");
          return;
        }
        if (!land.unlockFlowerHouseSlot(buildingSlotId, flowerSlotId)) {
          gm.addGold(cost);
          ui.toast("请先解锁前一个花盆");
          return;
        }
        ui.refreshTopBar();
        refreshPlantRoomFillerLayer(
          ui,
          ui.dialogRoot.getChildByName("ProductionSceneDialog"),
          "garden",
          buildingSlotId,
        );
        ui.toast("花房花盆已解锁");
      },
    },
  ], true, true);
}

function rebuildBeehiveSceneControls(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  content.children
    .filter(
      (child) =>
        child.name.startsWith("BeehiveSceneControl_") ||
        child.name.startsWith("BeehiveSceneVisual_"),
    )
    .forEach((child) => child.destroy());
  const land = LandSystem.getInstance();
  const positions = [
    [-88, 142], [0, 142], [88, 142],
    [-88, 78], [0, 78], [88, 78],
    [-88, 14], [0, 14], [88, 14],
  ];
  land.getBeehiveSlots(buildingSlotId).forEach((slot, index) => {
    const point = positions[index];
    if (!point) return;
    const production = land.getBeehiveSlotProduction(buildingSlotId, slot.id);
    if (slot.unlocked) {
      const visual = new Node(`BeehiveSceneVisual_${slot.id}`);
      visual.addComponent(UITransform).setContentSize(34, 34);
      visual.setPosition(point[0], point[1] + 8);
      ui.applyUiIcon(getBeehiveHoneyIconKey(production), visual);
      content.addChild(visual);
    }
    createSceneInteractionBadge(ui, content, {
      name: `BeehiveSceneControl_${slot.id}`,
      x: point[0],
      y: point[1] - 21,
      width: 44,
      label: !slot.unlocked
        ? "待解锁"
        : production?.ready
          ? "收蜜"
          : production
            ? `${Math.round(productionRatio(production) * 100)}%`
            : "选花",
      ratio: productionRatio(production),
      ready: !!production?.ready,
      locked: !slot.unlocked,
      onClick: () =>
        emitSceneCardClick(
          content
            .getChildByName("BeehiveCardViewport")
            ?.getChildByName("BeehiveCardContent")
            ?.getChildByName(`BeehiveCard_${slot.id}`),
        ),
    });
  });
}

const FLOWER_HOUSE_FLOWERS = ["sunflower", "flower", "tulip", "rose"];
const FLOWER_HOUSE_SEED_ICONS: Record<string, string> = {
  sunflower: "flowerSeedSunflower",
  flower: "flowerSeedFlower",
  tulip: "flowerSeedTulip",
  rose: "flowerSeedRose",
};
const FLOWER_HOUSE_GROWTH_ICONS: Record<string, [string, string, string]> = {
  sunflower: ["flowerGrowthSunflowerStage1", "flowerGrowthSunflowerStage2", "flowerGrowthSunflowerStage3"],
  flower: ["flowerGrowthFlowerStage1", "flowerGrowthFlowerStage2", "flowerGrowthFlowerStage3"],
  tulip: ["flowerGrowthTulipStage1", "flowerGrowthTulipStage2", "flowerGrowthTulipStage3"],
  rose: ["flowerGrowthRoseStage1", "flowerGrowthRoseStage2", "flowerGrowthRoseStage3"],
};

function drawFlowerHouseSeedPriceBand(node: Node, selected: boolean) {
  const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = selected
    ? new Color(255, 220, 139, 255)
    : new Color(255, 224, 157, 255);
  // Start with a bottom-rounded block, then fill its upper arc notches with a
  // rectangle. The resulting price strip has square upper corners while its
  // lower corners follow the card's rounded silhouette, matching the reference.
  graphics.roundRect(-28.5, -12, 57, 24, 6);
  graphics.fill();
  graphics.rect(-28.5, 0, 57, 12);
  graphics.fill();
}

function drawGreenhouseSeedCountBand(node: Node, selected: boolean) {
  const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = selected
    ? new Color(255, 220, 139, 255)
    : new Color(255, 224, 157, 255);
  // Same reference geometry as the flower-house price strip: square upper
  // corners and lower corners following the enclosing seed card.
  graphics.roundRect(-28.5, -12, 57, 24, 6);
  graphics.fill();
  graphics.rect(-28.5, 0, 57, 12);
  graphics.fill();
}

function createFlowerHouseSeedShelf(ui: any, dialog: Node) {
  const items = FLOWER_HOUSE_FLOWERS.map((id) => ({
    id,
    name: ui.itemName(id),
    price: LandSystem.getInstance().getFlowerHousePlantCost(id),
    iconKey: FLOWER_HOUSE_SEED_ICONS[id],
  }));
  const shelf = new Node("FlowerHouseSeedShelf");
  // The background already provides the ornamental lower panel. This node is
  // only a clipped interaction host and must not paint over its border.
  // Keep the shelf centre fixed while expanding equally upward/downward inside
  // the ornamental lower panel.
  shelf.addComponent(UITransform).setContentSize(286, 104);
  shelf.setPosition(0, -190);
  dialog.addChild(shelf);

  const viewport = new Node("FlowerHouseSeedViewport");
  viewport.addComponent(UITransform).setContentSize(278, 98);
  viewport.addComponent(Mask);
  shelf.addChild(viewport);
  const cardWidth = 62;
  const gap = 7;
  const contentWidth = Math.max(278, items.length * cardWidth + Math.max(0, items.length - 1) * gap);
  const content = new Node("FlowerHouseSeedContent");
  content.addComponent(UITransform).setContentSize(contentWidth, 98);
  viewport.addChild(content);
  const scroll = viewport.addComponent(ScrollView);
  scroll.content = content;
  scroll.horizontal = true;
  scroll.vertical = false;

  const startX = -contentWidth / 2 + cardWidth / 2;
  items.forEach((item, index) => {
    const selected = ui.flowerHouseSelectedFlowerId === item.id;
    const card = new Node(`FlowerHouseSeedCard_${item.id}`);
    card.addComponent(UITransform).setContentSize(cardWidth, 94);
    card.setPosition(startX + index * (cardWidth + gap), 0);
    fillRoundRect(card, 60, 92, 7, selected
      ? new Color(255, 241, 196, 255)
      : new Color(255, 235, 196, 250));
    strokeRoundRect(card, 60, 92, 7, selected
      ? new Color(220, 111, 29, 255)
      : new Color(208, 137, 66, 255), selected ? 2.5 : 1.4);
    const priceBand = new Node("FlowerHouseSeedPriceBand");
    priceBand.addComponent(UITransform).setContentSize(57, 24);
    priceBand.setPosition(0, -33);
    drawFlowerHouseSeedPriceBand(priceBand, selected);
    card.addChild(priceBand);
    const icon = new Node(`FlowerHouseSeedIcon_${item.id}`);
    icon.addComponent(UITransform).setContentSize(42, 42);
    icon.setPosition(0, 23);
    ui.applyUiIcon(item.iconKey, icon);
    card.addChild(icon);
    card.addChild(ui.makeLabel(item.name, 9, new Color(91, 52, 26), true, 0, -9, 56, 14));
    const coin = new Node(`FlowerHouseSeedGold_${item.id}`);
    coin.addComponent(UITransform).setContentSize(16, 16);
    coin.setPosition(-16, -34);
    ui.applyUiIcon("gold", coin);
    card.addChild(coin);
    card.addChild(ui.makeLabel(`${item.price}金币`, 8, new Color(102, 60, 30), true, 9, -34, 42, 14));
    card.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      ui.flowerHouseSelectedFlowerId = item.id;
      content.children.forEach((child) => {
        const active = child.name === `FlowerHouseSeedCard_${item.id}`;
        fillRoundRect(child, 60, 92, 7, active
          ? new Color(255, 241, 196, 255)
          : new Color(255, 235, 196, 250));
        strokeRoundRect(child, 60, 92, 7, active
          ? new Color(220, 111, 29, 255)
          : new Color(208, 137, 66, 255), active ? 2.5 : 1.4);
        const childPriceBand = child.getChildByName("FlowerHouseSeedPriceBand");
        if (childPriceBand) drawFlowerHouseSeedPriceBand(childPriceBand, active);
      });
    });
    content.addChild(card);
  });
}
const BEEHIVE_FEED_ICONS: Record<string, string> = {
  sunflower: "beehiveFeedSunflower",
  flower: "beehiveFeedFlower",
  tulip: "beehiveFeedTulip",
  rose: "beehiveFeedRose",
};
const BEEHIVE_SLOT_NAMES = [
  "嗡嗡",
  "蜜蜜",
  "花花",
  "甜甜",
  "团团",
  "朵朵",
  "暖暖",
  "乐乐",
  "圆圆",
];
const BEEHIVE_FEED_PANEL_WIDTH = 282;
const BEEHIVE_FEED_VIEWPORT_WIDTH = 270;
const BEEHIVE_FEED_CARD_WIDTH = 74;
const BEEHIVE_FEED_GAP = 6;

function getBeehiveFeedLayout(itemCount: number) {
  const rowWidth =
    itemCount > 0
      ? itemCount * BEEHIVE_FEED_CARD_WIDTH + (itemCount - 1) * BEEHIVE_FEED_GAP
      : 0;
  const contentWidth = Math.max(BEEHIVE_FEED_VIEWPORT_WIDTH, rowWidth);
  const startX =
    itemCount <= 0
      ? 0
      : rowWidth <= BEEHIVE_FEED_VIEWPORT_WIDTH
        ? -rowWidth / 2 + BEEHIVE_FEED_CARD_WIDTH / 2
        : -contentWidth / 2 + BEEHIVE_FEED_CARD_WIDTH / 2;
  return { rowWidth, contentWidth, startX };
}

function drawBeehiveFeedCard(ui: any, cell: Node, selected: boolean) {
  let background = cell.getChildByName("FeedCardBackground");
  if (!background) {
    background = new Node("FeedCardBackground");
    background
      .addComponent(UITransform)
      .setContentSize(BEEHIVE_FEED_CARD_WIDTH, 32);
    cell.addChild(background);
    background.setSiblingIndex(0);
  }
  ui.applyUiIcon(selected ? "feedCardSelectedBg" : "feedCardBg", background);
}

interface FlowerOptionItem {
  id: string;
  iconKey: string;
  label: string;
  subLabel?: string;
}

interface FlowerOptionScrollerOptions {
  panelName: string;
  viewportName: string;
  contentName: string;
  cellPrefix: string;
  iconPrefix: string;
  panelY: number;
  items: FlowerOptionItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  scrollStateKey?: string;
  labelName?: string;
  createIcon?: (id: string, size: number) => Node;
}

/**
 * Shared horizontal flower selector used by the beehive feed row and the
 * flower-house seed row. Keeping panel, viewport, card geometry and scrolling
 * in one implementation prevents the two interfaces from drifting apart.
 */
function createFlowerOptionScroller(
  ui: any,
  parent: Node,
  options: FlowerOptionScrollerOptions,
) {
  const panel = new Node(options.panelName);
  panel.addComponent(UITransform).setContentSize(BEEHIVE_FEED_PANEL_WIDTH, 48);
  panel.setPosition(0, options.panelY);
  ui.applyUiIcon("beehiveBottomPanelBg", panel);
  parent.addChild(panel);

  const viewport = new Node(options.viewportName);
  viewport
    .addComponent(UITransform)
    .setContentSize(BEEHIVE_FEED_VIEWPORT_WIDTH, 32);
  viewport.setPosition(0, options.panelY);
  viewport.addComponent(Mask);
  parent.addChild(viewport);

  const layout = getBeehiveFeedLayout(options.items.length);
  const optionContent = new Node(options.contentName);
  optionContent
    .addComponent(UITransform)
    .setContentSize(layout.contentWidth, 32);
  viewport.addChild(optionContent);

  const scroll = viewport.addComponent(ScrollView);
  scroll.content = optionContent;
  scroll.horizontal = true;
  scroll.vertical = false;

  const restoreScrollX = options.scrollStateKey
    ? Math.max(0, (parent as any)[options.scrollStateKey] || 0)
    : 0;
  if (options.scrollStateKey) {
    const rememberScroll = () => {
      if (
        !scroll.isValid ||
        !optionContent.isValid ||
        scroll.content !== optionContent
      ) {
        return;
      }
      (parent as any)[options.scrollStateKey!] = Math.max(
        0,
        scroll.getScrollOffset().x,
      );
    };
    scroll.node.on(ScrollView.EventType.SCROLLING, rememberScroll);
    scroll.node.on(ScrollView.EventType.SCROLL_ENDED, rememberScroll);
  }

  options.items.forEach((option, index) => {
    const cell = new Node(`${options.cellPrefix}_${option.id}`);
    cell.addComponent(UITransform).setContentSize(BEEHIVE_FEED_CARD_WIDTH, 32);
    cell.setPosition(
      layout.startX + index * (BEEHIVE_FEED_CARD_WIDTH + BEEHIVE_FEED_GAP),
      0,
    );
    drawBeehiveFeedCard(ui, cell, options.selectedId === option.id);

    const icon =
      options.createIcon?.(option.id, 26)
      || new Node(`${options.iconPrefix}_${option.id}`);
    icon.name = `${options.iconPrefix}_${option.id}`;
    if (!icon.getComponent(UITransform)) {
      icon.addComponent(UITransform).setContentSize(26, 26);
    } else {
      icon.getComponent(UITransform)!.setContentSize(26, 26);
    }
    icon.setPosition(-22, 0);
    if (!options.createIcon) ui.applyUiIcon(option.iconKey, icon);
    cell.addChild(icon);

    const label = ui.makeLabel(
      option.label,
      option.subLabel ? 7 : 8,
      new Color(92, 50, 26),
      true,
      15,
      option.subLabel ? 6 : 0,
      52,
      option.subLabel ? 13 : 18,
    );
    label.name = options.labelName || `${options.cellPrefix}Label`;
    cell.addChild(label);
    if (option.subLabel) {
      const subLabel = ui.makeLabel(
        option.subLabel,
        7,
        new Color(133, 78, 39),
        true,
        15,
        -7,
        52,
        12,
      );
      subLabel.name = `${options.cellPrefix}SubLabel`;
      cell.addChild(subLabel);
    }

    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        options.onSelect(option.id);
        if (!optionContent.isValid) return;
        optionContent.children.forEach((candidate) => {
          drawBeehiveFeedCard(
            ui,
            candidate,
            candidate.name === `${options.cellPrefix}_${option.id}`,
          );
        });
      });
    optionContent.addChild(cell);
  });

  ui.scheduleOnce(() => {
    if (
      !parent.isValid ||
      !viewport.isValid ||
      !optionContent.isValid ||
      !scroll.isValid ||
      viewport.parent !== parent ||
      optionContent.parent !== viewport ||
      scroll.content !== optionContent
    ) {
      return;
    }
    const maxOffset = Math.max(
      0,
      layout.contentWidth - BEEHIVE_FEED_VIEWPORT_WIDTH,
    );
    scroll.scrollToOffset(new Vec2(Math.min(restoreScrollX, maxOffset), 0), 0);
  }, 0.02);

  return { panel, viewport, content: optionContent, scroll };
}

const BEEHIVE_HONEY_ICON_KEYS: Record<string, [string, string, string]> = {
  sunflower: [
    "beehiveHoneySunflowerStage1",
    "beehiveHoneySunflowerStage2",
    "beehiveHoneySunflowerStage3",
  ],
  flower: [
    "beehiveHoneyFlowerStage1",
    "beehiveHoneyFlowerStage2",
    "beehiveHoneyFlowerStage3",
  ],
  tulip: [
    "beehiveHoneyTulipStage1",
    "beehiveHoneyTulipStage2",
    "beehiveHoneyTulipStage3",
  ],
  rose: [
    "beehiveHoneyRoseStage1",
    "beehiveHoneyRoseStage2",
    "beehiveHoneyRoseStage3",
  ],
};

function getBeehiveHoneyIconKey(production: any): string {
  if (!production?.sourceFlowerId) return "beehiveHoneyEmpty";
  const keys = BEEHIVE_HONEY_ICON_KEYS[production.sourceFlowerId];
  if (!keys) return "beehiveHoneyEmpty";
  if (production.ready) return keys[2];
  const progress = Math.max(
    0,
    Math.min(1, 1 - production.remaining / production.duration),
  );
  return progress < 0.5 ? keys[0] : keys[1];
}

function drawBeehiveCardProgress(progress: Node, production: any) {
  fillRoundRect(progress, 52, 7, 4, new Color(190, 135, 80, 115));
  let fill = progress.getChildByName("Fill");
  if (!fill) {
    fill = new Node("Fill");
    fill.addComponent(UITransform);
    progress.addChild(fill);
  }
  const ratio = !production
    ? 0
    : production.ready
      ? 1
      : Math.max(
          0,
          Math.min(1, 1 - production.remaining / production.duration),
        );
  const width = 50 * ratio;
  fill.active = width > 0;
  if (!fill.active) return;
  fill.getComponent(UITransform)!.setContentSize(width, 5);
  fill.setPosition(-25 + width / 2, 0);
  fillRoundRect(
    fill,
    width,
    5,
    3,
    production.ready ? new Color(255, 166, 43) : new Color(255, 190, 56),
  );
}

function stopBeehiveHarvestAnimation(card: Node) {
  if (!(card as any).__beehiveHarvestAnimating) return;
  (card as any).__beehiveHarvestAnimating = false;
  Tween.stopAllByTarget(card);
  card.setPosition(card.position.x, 0, card.position.z);
}

function refreshVisibleBeehiveHarvestAnimations(
  content: Node,
  buildingSlotId: number,
) {
  const viewport = content.getChildByName("BeehiveCardViewport");
  const cardContent = viewport?.getChildByName("BeehiveCardContent");
  const scroll = viewport?.getComponent(ScrollView);
  if (!viewport || !cardContent || !scroll || scroll.content !== cardContent)
    return;

  const contentWidth = cardContent.getComponent(UITransform)?.width || 0;
  const viewportWidth = viewport.getComponent(UITransform)?.width || 0;
  const offsetX = Math.max(0, scroll.getScrollOffset().x);
  const left = -contentWidth / 2 + offsetX;
  const right = left + viewportWidth;
  const land = LandSystem.getInstance();
  const readyVisibleCards: Node[] = [];

  land.getBeehiveSlots(buildingSlotId).forEach((slot) => {
    const card = cardContent.getChildByName(`BeehiveCard_${slot.id}`);
    if (!card) return;
    const production = slot.unlocked
      ? land.getBeehiveSlotProduction(buildingSlotId, slot.id)
      : null;
    const centerX = card.position.x;
    const cardHalfWidth = (card.getComponent(UITransform)?.width || 68) / 2;
    const isVisible =
      centerX - cardHalfWidth >= left && centerX + cardHalfWidth <= right;
    if (production?.ready && isVisible) {
      readyVisibleCards.push(card);
    } else {
      stopBeehiveHarvestAnimation(card);
    }
  });

  readyVisibleCards
    .sort((a, b) => a.position.x - b.position.x)
    .forEach((card, index) => {
      if ((card as any).__beehiveHarvestAnimating) return;
      (card as any).__beehiveHarvestAnimating = true;
      const basePosition = card.position.clone();
      const raisedPosition = new Vec3(
        basePosition.x,
        basePosition.y + 3,
        basePosition.z,
      );
      tween(card)
        .delay(index * 0.14)
        .repeatForever(
          tween()
            .to(0.12, { position: raisedPosition }, { easing: "quadOut" })
            .to(0.12, { position: basePosition }, { easing: "quadIn" })
            .delay(0.72),
        )
        .start();
    });
}

function setFlowerHarvestAnimation(
  icon: Node | null | undefined,
  ready: boolean,
) {
  if (!icon) return;
  if (!ready) {
    if ((icon as any).__flowerHarvestAnimating) {
      (icon as any).__flowerHarvestAnimating = false;
      Tween.stopAllByTarget(icon);
    }
    icon.angle = 0;
    return;
  }
  if ((icon as any).__flowerHarvestAnimating) return;
  (icon as any).__flowerHarvestAnimating = true;
  Tween.stopAllByTarget(icon);
  icon.angle = 0;
  tween(icon)
    .repeatForever(
      tween()
        .to(0.28, { angle: 5 }, { easing: "sineInOut" })
        .to(0.56, { angle: -5 }, { easing: "sineInOut" })
        .to(0.28, { angle: 0 }, { easing: "sineInOut" })
        .delay(0.4),
    )
    .start();
}

function isLivestockBuilding(
  buildingId: string | undefined,
): buildingId is LivestockBuildingId {
  return buildingId === "chickenCoop" || buildingId === "barn";
}

function isProductionSceneBuilding(
  buildingId: string | undefined,
): buildingId is ProductionSceneBuildingId {
  return buildingId === "garden" || buildingId === "beehive";
}

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
      billboard.setPosition(14, 20);
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

function createExpansionBillboard(ui: any): Node {
  const billboard = new Node("ExpansionBillboard");
  billboard.addComponent(UITransform).setContentSize(46, 46);
  billboard.setPosition(14, 20);
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

function updateSideCollectButtonVisual(
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

function playPlantingVisualAnimation(visual: Node | null | undefined) {
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

function createPastureExpansionBillboard(ui: any): Node {
  const billboard = new Node("PastureExpansionBillboard");
  billboard.addComponent(UITransform).setContentSize(46, 46);
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

export function handleOccupiedBuilding(ui: any, slotId: number) {
  const land = LandSystem.getInstance();
  const block = land.getBuildingSlot(slotId);
  if (!block?.buildingId) return;
  const building = getItem(block.buildingId);
  if (block.buildingId === "fourSeasonGreenhouse") {
    openGreenhouseDialog(ui, slotId);
    return;
  }
  if (isLivestockBuilding(block.buildingId)) {
    openLivestockDialog(ui, slotId);
    return;
  }
  if (isProductionSceneBuilding(block.buildingId)) {
    openProductionSceneDialog(ui, slotId);
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

function closeProductionSceneDialog(ui: any) {
  const dialog = ui.dialogRoot.getChildByName("ProductionSceneDialog");
  if (!dialog || (dialog as any).__closing) return;
  (dialog as any).__closing = true;
  const opacity =
    dialog.getComponent(UIOpacity) || dialog.addComponent(UIOpacity);
  const mask = ui.dialogRoot.getChildByName("ProductionSceneMask");
  const maskOpacity = mask?.getComponent(UIOpacity);
  if (maskOpacity) {
    tween(maskOpacity).to(0.14, { opacity: 0 }, { easing: "quadIn" }).start();
  }
  tween(dialog)
    .to(0.14, { scale: new Vec3(0.88, 0.88, 1) }, { easing: "quadIn" })
    .start();
  tween(opacity)
    .to(0.14, { opacity: 0 }, { easing: "quadIn" })
    .call(() => {
      ui.dialogRoot.removeAllChildren();
      ui.dialogRoot.active = false;
      ui.activeProductionBuildingSlotId = -1;
      ui.flowerHouseShovelMode = false;
    })
    .start();
}

function openProductionSceneDialog(ui: any, buildingSlotId: number) {
  const land = LandSystem.getInstance();
  const slot = land.getBuildingSlot(buildingSlotId);
  if (!slot || !isProductionSceneBuilding(slot.buildingId)) return;
  const scene = PRODUCTION_SCENES[slot.buildingId];
  ui.dialogRoot.removeAllChildren();
  ui.dialogRoot.active = true;
  ui.dialogRoot.setSiblingIndex(ui.node.children.length - 1);
  ui.activeProductionBuildingSlotId = buildingSlotId;
  if (slot.buildingId === "garden") {
    if (FLOWER_HOUSE_FLOWERS.indexOf(ui.flowerHouseSelectedFlowerId) < 0) {
      ui.flowerHouseSelectedFlowerId = FLOWER_HOUSE_FLOWERS[0];
    }
    ui.flowerHouseShovelMode = false;
  } else if (slot.buildingId === "beehive") {
    const inventory = InventorySystem.getInstance();
    if (
      FLOWER_HOUSE_FLOWERS.indexOf(ui.beehiveSelectedFlowerId) < 0 ||
      inventory.getItemCount(ui.beehiveSelectedFlowerId) <= 0
    ) {
      ui.beehiveSelectedFlowerId =
        FLOWER_HOUSE_FLOWERS.find(
          (flowerId) => inventory.getItemCount(flowerId) > 0,
        ) || "";
    }
  }

  const vs = view.getVisibleSize();
  const mask = new Node("ProductionSceneMask");
  mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
  fillRect(mask, Design.WIDTH, vs.height, new Color(42, 35, 25, 145));
  const maskOpacity = mask.addComponent(UIOpacity);
  maskOpacity.opacity = 0;
  mask
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, () => closeProductionSceneDialog(ui));
  ui.dialogRoot.addChild(mask);
  tween(maskOpacity).to(0.16, { opacity: 255 }, { easing: "quadOut" }).start();

  const dialog = new Node("ProductionSceneDialog");
  dialog.addComponent(UITransform).setContentSize(336, 602);
  dialog.setPosition(FARM_BUILDING_DIALOG_X, 0);
  const dialogOpacity = dialog.addComponent(UIOpacity);
  dialogOpacity.opacity = 0;
  dialog
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) =>
      event?.stopPropagation?.(),
    );
  (dialog as any).__buildingSlotId = buildingSlotId;
  ui.dialogRoot.addChild(dialog);

  const background = new Node("ProductionSceneBackground");
  background.addComponent(UITransform).setContentSize(336, 602);
  ui.applyUiIcon(scene.background, background);
  dialog.addChild(background);
  renderInteriorFillerLayer(ui, dialog, slot.buildingId, buildingSlotId);
  if (slot.buildingId === "garden") createFlowerHouseSeedShelf(ui, dialog);

  const titleRoot = new Node("ProductionSceneTitle");
  titleRoot.addComponent(UITransform).setContentSize(226, 48);
  titleRoot.setPosition(0, scene.titleY);
  const titleShadow = ui.makeLabel(
    scene.title,
    27,
    new Color(86, 40, 24, 150),
    true,
    2,
    FARM_BUILDING_TITLE_SHADOW_Y,
    226,
    48,
  );
  titleShadow.getComponent(Label)!.lineHeight = 34;
  titleRoot.addChild(titleShadow);
  const titleLabel = ui.makeLabel(
    scene.title,
    27,
    new Color(88, 45, 24),
    true,
    0,
    FARM_BUILDING_TITLE_TEXT_Y,
    226,
    48,
  );
  titleLabel.getComponent(Label)!.lineHeight = 34;
  const outline = titleLabel.addComponent(LabelOutline);
  outline.color = new Color(255, 246, 225, 255);
  outline.width = 4;
  titleRoot.addChild(titleLabel);
  dialog.addChild(titleRoot);

  const close = new Node("ProductionSceneClose");
  close
    .addComponent(UITransform)
    .setContentSize(
      FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE,
      FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE,
    );
  close.setPosition(scene.closeX, scene.closeY);
  attachSceneCloseArt(close);
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    closeProductionSceneDialog(ui);
  });
  dialog.addChild(close);

  if (SHOW_LEGACY_INTERIOR_CONTENT) {
    const content = new Node("ProductionSceneContent");
    content.addComponent(UITransform).setContentSize(320, 520);
    content.setPosition(0, FARM_BUILDING_CONTENT_Y);
    dialog.addChild(content);
    renderProductionSceneContent(ui, content, buildingSlotId);
  }
  titleRoot.setSiblingIndex(dialog.children.length - 1);
  close.setSiblingIndex(dialog.children.length - 1);

  dialog.setScale(new Vec3(0.88, 0.88, 1));
  tween(dialog).to(0.18, { scale: Vec3.ONE }, { easing: "backOut" }).start();
  tween(dialogOpacity)
    .to(0.14, { opacity: 255 }, { easing: "quadOut" })
    .start();
}

function drawProductionSceneProgress(root: Node, ratio: number) {
  fillRoundRect(root, 210, 12, 6, new Color(185, 127, 73, 105));
  const width = Math.max(0, Math.min(206, 206 * ratio));
  let fill = root.getChildByName("Fill");
  if (!fill) {
    fill = new Node("Fill");
    root.addChild(fill);
  }
  fill.active = width > 0;
  if (!fill.active) return;
  const transform =
    fill.getComponent(UITransform) || fill.addComponent(UITransform);
  transform.setContentSize(width, 8);
  fill.setPosition(-103 + width / 2, 0);
  fillRoundRect(fill, width, 8, 4, new Color(255, 194, 60, 255));
}

function renderProductionSceneContent(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  // Bee production is refreshed every second. Preserve both horizontal
  // positions before rebuilding the content so a user can keep browsing the
  // nine hives or flower feed row without being snapped back to the left.
  const previousHiveScroll = content
    .getChildByName("BeehiveCardViewport")
    ?.getComponent(ScrollView);
  const previousFeedScroll = content
    .getChildByName("BeehiveFeedViewport")
    ?.getComponent(ScrollView);
  if (previousHiveScroll) {
    (content as any).__beehiveCardScrollX = Math.max(
      0,
      previousHiveScroll.getScrollOffset().x,
    );
  }
  if (previousFeedScroll) {
    (content as any).__beehiveFeedScrollX = Math.max(
      0,
      previousFeedScroll.getScrollOffset().x,
    );
  }
  [...content.children].forEach((child) => child.destroy());
  const building = LandSystem.getInstance().getBuildingSlot(buildingSlotId);
  if (building?.buildingId === "garden") {
    renderFlowerHouseContent(ui, content, buildingSlotId);
    return;
  }
  if (building?.buildingId === "beehive") {
    renderBeehiveContent(ui, content, buildingSlotId);
    return;
  }
  const production =
    LandSystem.getInstance().getBuildingProduction(buildingSlotId);
  if (!production) return;

  const productIcon = ui.createItemIcon(production.itemId, 64, true);
  productIcon.setPosition(-78, 39);
  content.addChild(productIcon);

  const productName = ui.makeLabel(
    ui.itemName(production.itemId),
    18,
    new Color(92, 50, 26),
    true,
    28,
    52,
    170,
    30,
  );
  content.addChild(productName);

  const status = ui.makeLabel(
    production.ready
      ? `${ui.itemName(production.itemId)}已经准备好了`
      : `距离产出还有 ${formatCountdown(production.remaining)}`,
    13,
    new Color(132, 82, 45),
    true,
    28,
    18,
    190,
    26,
  );
  status.name = "ProductionStatus";
  content.addChild(status);

  const progress = new Node("ProductionProgress");
  progress.addComponent(UITransform).setContentSize(210, 12);
  progress.setPosition(0, -15);
  drawProductionSceneProgress(
    progress,
    production.ready
      ? 1
      : Math.max(
          0,
          Math.min(1, 1 - production.remaining / production.duration),
        ),
  );
  content.addChild(progress);

  const harvest = new Node("ProductionHarvest");
  harvest.addComponent(UITransform).setContentSize(108, 34);
  harvest.setPosition(0, -66);
  fillRoundRect(
    harvest,
    106,
    32,
    11,
    production.ready
      ? new Color(255, 245, 207, 255)
      : new Color(232, 217, 184, 225),
  );
  strokeRoundRect(harvest, 106, 32, 11, new Color(151, 94, 45, 230), 1.5);
  const harvestIcon = new Node("HarvestIcon");
  harvestIcon.addComponent(UITransform).setContentSize(20, 20);
  harvestIcon.setPosition(-34, 0);
  ui.applyUiIcon("entryHarvest", harvestIcon);
  harvest.addChild(harvestIcon);
  harvest.addChild(
    ui.makeLabel("收获", 13, new Color(92, 50, 26), true, 9, 0, 62, 22),
  );
  harvest
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      collectProductionSceneProduct(ui, buildingSlotId, harvest);
    });
  content.addChild(harvest);
}

function renderBeehiveContent(ui: any, content: Node, buildingSlotId: number) {
  const land = LandSystem.getInstance();
  const inventory = InventorySystem.getInstance();
  const beehiveSlots = land.getBeehiveSlots(buildingSlotId);
  const cardCellWidth = 72;
  const cardViewportWidth = 286;

  const cardViewport = new Node("BeehiveCardViewport");
  cardViewport.addComponent(UITransform).setContentSize(cardViewportWidth, 88);
  cardViewport.setPosition(0, FARM_BUILDING_HIVE_ROW_Y);
  cardViewport.addComponent(Mask);
  content.addChild(cardViewport);

  const cardContent = new Node("BeehiveCardContent");
  const cardContentWidth = Math.max(
    cardViewportWidth,
    beehiveSlots.length * cardCellWidth,
  );
  cardContent.addComponent(UITransform).setContentSize(cardContentWidth, 88);
  cardViewport.addChild(cardContent);
  const cardScroll = cardViewport.addComponent(ScrollView);
  cardScroll.content = cardContent;
  cardScroll.horizontal = true;
  cardScroll.vertical = false;
  const restoreCardScrollX = Math.max(
    0,
    (content as any).__beehiveCardScrollX || 0,
  );
  const rememberCardScroll = () => {
    (content as any).__beehiveCardScrollX = Math.max(
      0,
      cardScroll.getScrollOffset().x,
    );
    refreshVisibleBeehiveHarvestAnimations(content, buildingSlotId);
  };
  cardScroll.node.on(ScrollView.EventType.SCROLLING, rememberCardScroll);
  cardScroll.node.on(ScrollView.EventType.SCROLL_ENDED, rememberCardScroll);

  beehiveSlots.forEach((beehiveSlot, index) => {
    const production = land.getBeehiveSlotProduction(
      buildingSlotId,
      beehiveSlot.id,
    );
    const card = new Node(`BeehiveCard_${beehiveSlot.id}`);
    card.addComponent(UITransform).setContentSize(68, 88);
    card.setPosition(
      -cardContentWidth / 2 + cardCellWidth / 2 + index * cardCellWidth,
      0,
    );

    // Both states share the same illustrated card background. A locked hive
    // only changes the contents of that card, never its visual container.
    const cardBackground = new Node("BeehiveSlotCardBackground");
    cardBackground.addComponent(UITransform).setContentSize(66, 88);
    ui.applyUiIcon("beehiveSlotCardBg", cardBackground);
    card.addChild(cardBackground);

    if (!beehiveSlot.unlocked) {
      card.addChild(
        ui.makeLabel("蜂巢", 11, new Color(92, 50, 26), true, -5, 25, 48, 18),
      );
      const lockIcon = new Node("BeehiveSlotLock");
      lockIcon.addComponent(UITransform).setContentSize(15, 15);
      lockIcon.setPosition(23, 25);
      ui.applyUiIcon("chickenSlotLock", lockIcon);
      card.addChild(lockIcon);
      const unlockCost = land.getBeehiveSlotUnlockCost(beehiveSlot.id);
      const goldIcon = new Node("BeehiveUnlockGold");
      goldIcon.addComponent(UITransform).setContentSize(14, 14);
      goldIcon.setPosition(-17, 2);
      ui.applyUiIcon("gold", goldIcon);
      card.addChild(goldIcon);
      card.addChild(
        ui.makeLabel(
          `${unlockCost}`,
          9,
          new Color(112, 70, 37),
          true,
          8,
          2,
          34,
          16,
        ),
      );
      card.addChild(
        ui.makeLabel(
          "解锁蜂巢",
          9,
          new Color(112, 70, 37),
          true,
          0,
          -22,
          60,
          16,
        ),
      );
      card
        .addComponent(Button)
        .node.on(Node.EventType.TOUCH_END, (event: any) => {
          event?.stopPropagation?.();
          ui.showDialog(
            "解锁蜂巢",
            `消耗 ${unlockCost} 金币解锁新蜂巢`,
            [
              { text: "稍后", cb: () => {} },
              {
                text: "解锁",
                cb: () => {
                  const gm = GameManager.getInstance();
                  if (!gm.spendGold(unlockCost)) {
                    ui.toast("金币不足");
                    return;
                  }
                  if (!land.unlockBeehiveSlot(buildingSlotId, beehiveSlot.id)) {
                    gm.addGold(unlockCost);
                    ui.toast("该蜂巢暂时无法解锁");
                    return;
                  }
                  ui.refreshTopBar();
                  renderProductionSceneContent(ui, content, buildingSlotId);
                  ui.toast(`${BEEHIVE_SLOT_NAMES[index]}已解锁`);
                },
              },
            ],
            true,
            true,
          );
        });
      cardContent.addChild(card);
      return;
    }

    card.addChild(
      ui.makeLabel(
        BEEHIVE_SLOT_NAMES[index],
        11,
        new Color(92, 50, 26),
        true,
        0,
        25,
        60,
        18,
      ),
    );

    const honeyIcon = new Node("BeehiveHoneyIcon");
    honeyIcon.addComponent(UITransform).setContentSize(30, 30);
    honeyIcon.name = "BeehiveHoneyIcon";
    const honeyIconKey = getBeehiveHoneyIconKey(production);
    (honeyIcon as any).__beehiveHoneyIconKey = honeyIconKey;
    ui.applyUiIcon(honeyIconKey, honeyIcon);
    honeyIcon.setPosition(0, 2);
    card.addChild(honeyIcon);

    const statusText = !production
      ? "选择花朵"
      : production.ready
        ? "蜂蜜已备好"
        : "采蜜中";
    const status = ui.makeLabel(
      statusText,
      9,
      new Color(112, 70, 37),
      true,
      0,
      -16,
      62,
      14,
    );
    status.name = "BeehiveStatus";
    card.addChild(status);

    const progress = new Node("BeehiveProgress");
    progress.addComponent(UITransform).setContentSize(52, 7);
    progress.setPosition(0, -30);
    drawBeehiveCardProgress(progress, production);
    card.addChild(progress);

    card
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        const current = land.getBeehiveSlotProduction(
          buildingSlotId,
          beehiveSlot.id,
        );
        if (current?.ready) {
          collectBeehiveSlot(ui, content, buildingSlotId, beehiveSlot.id, card);
          return;
        }
        if (current) {
          openBeehiveSpeedUpDialog(ui, content, buildingSlotId, beehiveSlot.id);
          return;
        }
        const flowerId = ui.beehiveSelectedFlowerId;
        if (FLOWER_HOUSE_FLOWERS.indexOf(flowerId) < 0) {
          ui.toast("请先选择用于喂养蜜蜂的花朵");
          return;
        }
        if (inventory.getItemCount(flowerId) <= 0) {
          ui.toast(`背包中没有${ui.itemName(flowerId)}`);
          return;
        }
        if (!inventory.removeItem(flowerId, 1)) return;
        if (!land.feedBeehiveSlot(buildingSlotId, beehiveSlot.id, flowerId)) {
          inventory.addItem(flowerId, 1);
          ui.toast("当前蜂巢无法开始采蜜");
          return;
        }
        updateBeehiveCardDynamicContent(
          ui,
          content,
          buildingSlotId,
          beehiveSlot.id,
        );
        const nextCard = content
          .getChildByName("BeehiveCardViewport")
          ?.getChildByName("BeehiveCardContent")
          ?.getChildByName(`BeehiveCard_${beehiveSlot.id}`);
        playProductionStartAnimation(
          nextCard?.getChildByName("BeehiveHoneyIcon"),
        );
        const remainingCount = inventory.getItemCount(flowerId);
        if (remainingCount <= 0) {
          animateBeehiveFeedRemoval(ui, content, flowerId);
        } else {
          const countLabel = content
            .getChildByName("BeehiveFeedViewport")
            ?.getChildByName("BeehiveFeedContent")
            ?.getChildByName(`BeehiveFeed_${flowerId}`)
            ?.getChildByName("BeehiveFeedCount")
            ?.getComponent(Label);
          if (countLabel) {
            countLabel.string = `${ui.itemName(flowerId)} ×${remainingCount}`;
          }
        }
      });
    cardContent.addChild(card);
  });
  // ScrollView clamps offsets before its content has completed its first
  // layout pass. Restore one tick later, otherwise every timer refresh turns
  // a valid right-side offset into zero and looks like a forced jump home.
  ui.scheduleOnce(() => {
    if (
      !cardViewport.isValid ||
      !cardContent.isValid ||
      !cardScroll.isValid ||
      cardContent.parent !== cardViewport ||
      cardScroll.content !== cardContent
    ) {
      return;
    }
    const maxOffset = Math.max(0, cardContentWidth - cardViewportWidth);
    cardScroll.scrollToOffset(
      new Vec2(Math.min(restoreCardScrollX, maxOffset), 0),
      0,
    );
    refreshVisibleBeehiveHarvestAnimations(content, buildingSlotId);
  }, 0.02);

  const feedPanelY = FARM_BUILDING_OPTION_ROW_Y;
  const availableFlowerIds = FLOWER_HOUSE_FLOWERS.filter(
    (flowerId) => inventory.getItemCount(flowerId) > 0,
  );
  if (availableFlowerIds.indexOf(ui.beehiveSelectedFlowerId) < 0) {
    ui.beehiveSelectedFlowerId = availableFlowerIds[0] || "";
  }
  createFlowerOptionScroller(ui, content, {
    panelName: "BeehiveBottomPanelBackground",
    viewportName: "BeehiveFeedViewport",
    contentName: "BeehiveFeedContent",
    cellPrefix: "BeehiveFeed",
    iconPrefix: "BeehiveFeedIcon",
    panelY: feedPanelY,
    items: availableFlowerIds.map((flowerId) => ({
      id: flowerId,
      iconKey: BEEHIVE_FEED_ICONS[flowerId],
      label: `${ui.itemName(flowerId)} ×${inventory.getItemCount(flowerId)}`,
    })),
    selectedId: ui.beehiveSelectedFlowerId,
    onSelect: (flowerId) => {
      ui.beehiveSelectedFlowerId = flowerId;
    },
    scrollStateKey: "__beehiveFeedScrollX",
    labelName: "BeehiveFeedCount",
  });
  rebuildBeehiveSceneControls(ui, content, buildingSlotId);
}

function animateBeehiveFeedRemoval(ui: any, content: Node, flowerId: string) {
  const viewport = content.getChildByName("BeehiveFeedViewport");
  const feedContent = viewport?.getChildByName("BeehiveFeedContent");
  const cell = feedContent?.getChildByName(`BeehiveFeed_${flowerId}`);
  if (!viewport || !feedContent || !cell) return;

  const opacity = cell.getComponent(UIOpacity) || cell.addComponent(UIOpacity);
  const originalScale = cell.scale.clone();
  tween(cell)
    .to(
      0.18,
      {
        scale: new Vec3(
          originalScale.x * 0.82,
          originalScale.y * 0.82,
          originalScale.z,
        ),
      },
      { easing: "quadIn" },
    )
    .start();
  tween(opacity)
    .to(0.18, { opacity: 0 }, { easing: "quadIn" })
    .call(() => {
      cell.active = false;
      cell.destroy();
      const inventory = InventorySystem.getInstance();
      const remainingFlowerIds = FLOWER_HOUSE_FLOWERS.filter(
        (candidateId) => inventory.getItemCount(candidateId) > 0,
      );
      if (remainingFlowerIds.indexOf(ui.beehiveSelectedFlowerId) < 0) {
        ui.beehiveSelectedFlowerId = remainingFlowerIds[0] || "";
      }
      const layout = getBeehiveFeedLayout(remainingFlowerIds.length);
      feedContent
        .getComponent(UITransform)!
        .setContentSize(layout.contentWidth, 32);
      remainingFlowerIds.forEach((candidateId, index) => {
        const candidate = feedContent.getChildByName(
          `BeehiveFeed_${candidateId}`,
        );
        if (!candidate) return;
        const targetPosition = new Vec3(
          layout.startX + index * (BEEHIVE_FEED_CARD_WIDTH + BEEHIVE_FEED_GAP),
          0,
          candidate.position.z,
        );
        drawBeehiveFeedCard(
          ui,
          candidate,
          candidateId === ui.beehiveSelectedFlowerId,
        );
        tween(candidate)
          .to(0.2, { position: targetPosition }, { easing: "quadOut" })
          .start();
      });

      const scroll = viewport.getComponent(ScrollView);
      if (scroll) {
        const currentOffset = Math.max(0, scroll.getScrollOffset().x);
        const maxOffset = Math.max(
          0,
          layout.contentWidth - BEEHIVE_FEED_VIEWPORT_WIDTH,
        );
        ui.scheduleOnce(() => {
          if (
            !viewport.isValid ||
            !feedContent.isValid ||
            !scroll.isValid ||
            feedContent.parent !== viewport ||
            scroll.content !== feedContent
          ) {
            return;
          }
          scroll.scrollToOffset(
            new Vec2(Math.min(currentOffset, maxOffset), 0),
            0.16,
          );
        }, 0.02);
      }
    })
    .start();
}

/** Production scenes use a fixed-card layout, so their start animation must
 * never change a child node's position or make the row look as if it reflowed. */
function playProductionStartAnimation(visual: Node | null | undefined) {
  if (!visual) return;
  const finalScale = visual.scale.clone();
  const opacity =
    visual.getComponent(UIOpacity) || visual.addComponent(UIOpacity);
  visual.setScale(
    new Vec3(finalScale.x * 0.72, finalScale.y * 0.72, finalScale.z),
  );
  opacity.opacity = 0;
  tween(opacity).to(0.14, { opacity: 255 }, { easing: "quadOut" }).start();
  tween(visual)
    .to(
      0.18,
      {
        scale: new Vec3(finalScale.x * 1.06, finalScale.y * 1.06, finalScale.z),
      },
      { easing: "backOut" },
    )
    .to(0.12, { scale: finalScale }, { easing: "quadOut" })
    .start();
}

function updateBeehiveDynamicContent(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  const land = LandSystem.getInstance();
  land.getBeehiveSlots(buildingSlotId).forEach((beehiveSlot) => {
    if (!beehiveSlot.unlocked) return;
    updateBeehiveCardDynamicContent(
      ui,
      content,
      buildingSlotId,
      beehiveSlot.id,
      false,
    );
  });
  refreshVisibleBeehiveHarvestAnimations(content, buildingSlotId);
}

/** Updates one existing card without rebuilding or repositioning the row. */
function updateBeehiveCardDynamicContent(
  ui: any,
  content: Node,
  buildingSlotId: number,
  beehiveSlotId: number,
  refreshHarvestAnimations = true,
) {
  const card = content
    .getChildByName("BeehiveCardViewport")
    ?.getChildByName("BeehiveCardContent")
    ?.getChildByName(`BeehiveCard_${beehiveSlotId}`);
  if (!card) return;

  const production = LandSystem.getInstance().getBeehiveSlotProduction(
    buildingSlotId,
    beehiveSlotId,
  );
  const honeyIcon = card.getChildByName("BeehiveHoneyIcon");
  if (honeyIcon) {
    const nextIconKey = getBeehiveHoneyIconKey(production);
    if ((honeyIcon as any).__beehiveHoneyIconKey !== nextIconKey) {
      (honeyIcon as any).__beehiveHoneyIconKey = nextIconKey;
      ui.applyUiIcon(nextIconKey, honeyIcon);
    }
  }

  const status = card.getChildByName("BeehiveStatus")?.getComponent(Label);
  if (status) {
    status.string = !production
      ? "选择花朵"
      : production.ready
        ? "蜂蜜已备好"
        : "采蜜中";
  }

  const progress = card.getChildByName("BeehiveProgress");
  if (progress) drawBeehiveCardProgress(progress, production);
  if (refreshHarvestAnimations) {
    refreshVisibleBeehiveHarvestAnimations(content, buildingSlotId);
  }
  updateSceneInteractionBadge(
    content.getChildByName(`BeehiveSceneControl_${beehiveSlotId}`),
    production?.ready
      ? "收蜜"
      : production
        ? `${Math.round(productionRatio(production) * 100)}%`
        : "选花",
    productionRatio(production),
    !!production?.ready,
  );
}

function drawFlowerHouseCardProgress(progress: Node, production: any) {
  fillRoundRect(progress, 50, 7, 4, new Color(190, 135, 80, 115));
  let fill = progress.getChildByName("Fill");
  if (!fill) {
    fill = new Node("Fill");
    fill.addComponent(UITransform);
    progress.addChild(fill);
  }
  const ratio = !production
    ? 0
    : production.ready
      ? 1
      : Math.max(
          0,
          Math.min(1, 1 - production.remaining / production.duration),
        );
  const width = 48 * ratio;
  fill.active = width > 0;
  if (!fill.active) return;
  fill.getComponent(UITransform)!.setContentSize(width, 5);
  fill.setPosition(-24 + width / 2, 0);
  fillRoundRect(
    fill,
    width,
    5,
    3,
    production.ready ? new Color(255, 166, 43) : new Color(255, 190, 56),
  );
}

function flowerHouseGrowthIconKey(flowerId: string, production: any): string {
  const stages = FLOWER_HOUSE_GROWTH_ICONS[flowerId];
  if (!stages) return FLOWER_HOUSE_SEED_ICONS[flowerId] || "flowerSeedFlower";
  const ratio = productionRatio(production);
  return stages[ratio >= 2 / 3 ? 2 : ratio >= 1 / 3 ? 1 : 0];
}

function createFlowerHouseIcon(ui: any, flowerId: string, production: any) {
  const icon = new Node("FlowerIcon");
  icon.addComponent(UITransform).setContentSize(42, 42);
  const growthIconKey = flowerHouseGrowthIconKey(flowerId, production);
  (icon as any).__flowerGrowthIconKey = growthIconKey;
  ui.applyUiIcon(growthIconKey, icon);
  icon.name = "FlowerIcon";
  const transform = icon.getComponent(UITransform);
  if (transform) transform.anchorY = 0;
  // Keep the image's original visual bounds while making its lower centre the
  // rotation pivot for the mature-flower pendulum animation.
  icon.setPosition(0, -15);
  return icon;
}

function createEmptyFlowerHouseSlot(ui: any) {
  const empty = new Node("EmptyFlowerSlot");
  empty.addComponent(UITransform).setContentSize(38, 38);
  empty.setPosition(0, 4);
  fillRoundRect(empty, 36, 36, 11, new Color(243, 223, 179, 120));
  empty.addChild(
    ui.makeLabel("+", 26, new Color(178, 118, 55), true, 0, 1, 36, 36),
  );
  return empty;
}

function syncFlowerHouseCardVisual(
  ui: any,
  card: Node,
  flowerSlot: any,
  production: any,
  animatePlanting = false,
) {
  const title = card.getChildByName("FlowerSlotTitle")?.getComponent(Label);
  if (title) {
    title.string = flowerSlot?.flowerId
      ? ui.itemName(flowerSlot.flowerId)
      : "空花位";
  }

  let flowerIcon = card.getChildByName("FlowerIcon");
  const emptySlot = card.getChildByName("EmptyFlowerSlot");
  if (flowerSlot?.flowerId) {
    if (emptySlot) emptySlot.destroy();
    const expectedIconKey = flowerHouseGrowthIconKey(flowerSlot.flowerId, production);
    if (flowerIcon && (flowerIcon as any).__flowerGrowthIconKey !== expectedIconKey) {
      flowerIcon.destroy();
      flowerIcon = null;
    }
    if (!flowerIcon) {
      const nextIcon = createFlowerHouseIcon(ui, flowerSlot.flowerId, production);
      card.addChild(nextIcon);
      if (animatePlanting) playProductionStartAnimation(nextIcon);
    }
  } else {
    if (flowerIcon) flowerIcon.destroy();
    if (!emptySlot) card.addChild(createEmptyFlowerHouseSlot(ui));
  }

  const status = card.getChildByName("FlowerStatus")?.getComponent(Label);
  if (status) {
    status.string = !flowerSlot?.flowerId
      ? "点击种植"
      : production?.ready
        ? "已成熟"
        : "生长中";
  }
  const progress = card.getChildByName("FlowerProgress");
  if (progress) drawFlowerHouseCardProgress(progress, production);
  setFlowerHarvestAnimation(
    card.getChildByName("FlowerIcon"),
    !!production?.ready,
  );
}

function updateFlowerHouseDynamicContent(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  const land = LandSystem.getInstance();
  land.getFlowerHouseSlots(buildingSlotId).forEach((flowerSlot) => {
    const card = content.getChildByName(`FlowerHouseCard_${flowerSlot.id}`);
    if (!card) return;
    const production = land.getFlowerHouseSlotProduction(
      buildingSlotId,
      flowerSlot.id,
    );
    syncFlowerHouseCardVisual(ui, card, flowerSlot, production);
    updateSceneInteractionBadge(
      content.getChildByName(`FlowerSceneControl_${flowerSlot.id}`),
      !flowerSlot.flowerId
        ? "点击种植"
        : production?.ready
          ? "点击收获"
          : `生长 ${Math.round(productionRatio(production) * 100)}%`,
      productionRatio(production),
      !!production?.ready,
    );
  });
}

function renderFlowerHouseContent(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  const land = LandSystem.getInstance();
  const flowerSlots = land.getFlowerHouseSlots(buildingSlotId);
  const flowerCardWidth = 68;
  const flowerCardGap =
    (BEEHIVE_FEED_PANEL_WIDTH - flowerCardWidth * flowerSlots.length) /
    Math.max(1, flowerSlots.length - 1);
  const flowerCardStartX = -BEEHIVE_FEED_PANEL_WIDTH / 2 + flowerCardWidth / 2;

  flowerSlots.forEach((flowerSlot, index) => {
    const production = land.getFlowerHouseSlotProduction(
      buildingSlotId,
      flowerSlot.id,
    );
    const card = new Node(`FlowerHouseCard_${flowerSlot.id}`);
    // Keep the card at the source image's native aspect ratio (68:100).
    // Stretching it to the old 68:92 ratio flattened the upper corners.
    card.addComponent(UITransform).setContentSize(70, 100);
    // Match the beehive geometry: the planting-card row and the lower panel
    // share the same 282 px outside width, and their vertical gap is 5 px.
    card.setPosition(
      flowerCardStartX + index * (flowerCardWidth + flowerCardGap),
      FARM_BUILDING_FLOWER_ROW_Y,
    );
    let harvesting = false;
    const collectReadyFlower = (source: Node) => {
      if (harvesting) return;
      harvesting = true;
      // The card is updated in place after harvesting. Block the remainder of
      // this touch so it cannot hit the newly-created empty slot and plant the
      // currently selected seed immediately.
      (card as any).__flowerPlantBlockedUntil = Date.now() + 350;
      collectFlowerHouseSlot(ui, buildingSlotId, flowerSlot.id, source);
      const currentSlot = land
        .getFlowerHouseSlots(buildingSlotId)
        .find((candidate) => candidate.id === flowerSlot.id);
      syncFlowerHouseCardVisual(ui, card, currentSlot, null);
      ui.scheduleOnce(() => {
        harvesting = false;
      }, 0);
    };
    const cardBackground = new Node("FlowerSlotCardBackground");
    cardBackground.addComponent(UITransform).setContentSize(68, 100);
    ui.applyUiIcon("flowerSlotCardBg", cardBackground);
    card.addChild(cardBackground);

    const title = ui.makeLabel(
      flowerSlot.flowerId ? ui.itemName(flowerSlot.flowerId) : "空花位",
      11,
      new Color(92, 50, 26),
      true,
      0,
      27,
      60,
      18,
    );
    title.name = "FlowerSlotTitle";
    card.addChild(title);

    if (flowerSlot.flowerId) {
      const flowerIcon = createFlowerHouseIcon(ui, flowerSlot.flowerId, production);
      if (production?.ready) {
        flowerIcon
          .addComponent(Button)
          .node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            collectReadyFlower(flowerIcon);
          });
      }
      card.addChild(flowerIcon);
    } else {
      card.addChild(createEmptyFlowerHouseSlot(ui));
    }

    const status = ui.makeLabel(
      !flowerSlot.flowerId
        ? "点击种植"
        : production?.ready
          ? "已成熟"
          : "生长中",
      9,
      new Color(112, 70, 37),
      true,
      0,
      -17,
      60,
      14,
    );
    status.name = "FlowerStatus";
    card.addChild(status);

    const progress = new Node("FlowerProgress");
    progress.addComponent(UITransform).setContentSize(50, 7);
    progress.setPosition(0, -32);
    drawFlowerHouseCardProgress(progress, production);
    card.addChild(progress);
    setFlowerHarvestAnimation(
      card.getChildByName("FlowerIcon"),
      !!production?.ready,
    );

    card
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (Date.now() < ((card as any).__flowerPlantBlockedUntil || 0)) {
          return;
        }
        const currentProduction = land.getFlowerHouseSlotProduction(
          buildingSlotId,
          flowerSlot.id,
        );
        const currentSlot = land
          .getFlowerHouseSlots(buildingSlotId)
          .find((candidate) => candidate.id === flowerSlot.id);
        if (!currentSlot?.flowerId) {
          const selected = ui.flowerHouseSelectedFlowerId;
          const gm = GameManager.getInstance();
          const plantCost = land.getFlowerHousePlantCost(selected);
          if (!gm.spendGold(plantCost)) {
            ui.toast(`金币不足，种植鲜花需要 ${plantCost} 金币`);
            return;
          }
          if (
            !land.plantFlowerHouseSlot(buildingSlotId, flowerSlot.id, selected)
          ) {
            gm.addGold(plantCost);
            ui.toast("无法种植到该花位");
            return;
          }
          const plantedSlot = land
            .getFlowerHouseSlots(buildingSlotId)
            .find((candidate) => candidate.id === flowerSlot.id);
          const plantedProduction = land.getFlowerHouseSlotProduction(
            buildingSlotId,
            flowerSlot.id,
          );
          syncFlowerHouseCardVisual(
            ui,
            card,
            plantedSlot,
            plantedProduction,
            true,
          );
          return;
        } else if (currentProduction && !currentProduction.ready) {
          openFlowerHouseSpeedUpDialog(
            ui,
            content,
            buildingSlotId,
            flowerSlot.id,
            currentProduction,
          );
          return;
        } else if (currentProduction?.ready) {
          // A mature flower can be collected from anywhere on its card.
          collectReadyFlower(card.getChildByName("FlowerIcon") ?? card);
          return;
        } else {
          return;
        }
        renderProductionSceneContent(ui, content, buildingSlotId);
      });
    content.addChild(card);
  });

  createFlowerOptionScroller(ui, content, {
    panelName: "FlowerSelectorPanelBackground",
    viewportName: "FlowerSelectorViewport",
    contentName: "FlowerSelectorContent",
    cellPrefix: "FlowerSelector",
    iconPrefix: "FlowerSeed",
    panelY: FARM_BUILDING_OPTION_ROW_Y,
    items: FLOWER_HOUSE_FLOWERS.map((flowerId) => ({
      id: flowerId,
      iconKey: FLOWER_HOUSE_SEED_ICONS[flowerId],
      label: `${land.getFlowerHousePlantCost(flowerId)}金`,
    })),
    selectedId: ui.flowerHouseSelectedFlowerId,
    onSelect: (flowerId) => {
      ui.flowerHouseSelectedFlowerId = flowerId;
      ui.flowerHouseShovelMode = false;
    },
    scrollStateKey: "__flowerSelectorScrollX",
  });
  rebuildFlowerHouseSceneControls(ui, content, buildingSlotId);
}

function openBeehiveSpeedUpDialog(
  ui: any,
  content: Node,
  buildingSlotId: number,
  beehiveSlotId: number,
) {
  const land = LandSystem.getInstance();
  const diamondCost = GameValues.SPEEDUP_DIAMOND;
  const complete = () => {
    if (!land.finishBeehiveSlot(buildingSlotId, beehiveSlotId)) {
      ui.toast("该蜂巢当前无法加速");
      return;
    }
    updateBeehiveCardDynamicContent(ui, content, buildingSlotId, beehiveSlotId);
    ui.toast("蜂蜜已经准备好了");
  };
  ui.showDialog(
    "加速采蜜",
    () => {
      const current = land.getBeehiveSlotProduction(
        buildingSlotId,
        beehiveSlotId,
      );
      const ratio = current
        ? Math.max(0, Math.min(1, 1 - current.remaining / current.duration))
        : 0;
      return `当前进度 ${Math.floor(ratio * 100)}%\n消耗钻石即可立即完成采蜜`;
    },
    [
      {
        text: "",
        image: "btnFlowerCancel",
        imageWidth: 104,
        imageHeight: 52,
        compactGap: 18,
        cb: () => {},
      },
      {
        text: "",
        image: "btnFlowerDiamondSpeedUp",
        imageWidth: 136,
        imageHeight: 52,
        imageOffsetX: -6,
        inlineIconEmbedded: true,
        inlineText: `钻石加速 x${diamondCost}`,
        cb: () => {
          if (!GameManager.getInstance().spendDiamond(diamondCost)) {
            ui.toast("钻石不足");
            return;
          }
          complete();
        },
      },
    ],
    true,
    true,
    true,
  );
}

function collectBeehiveSlot(
  ui: any,
  content: Node,
  buildingSlotId: number,
  beehiveSlotId: number,
  source: Node,
) {
  const product = LandSystem.getInstance().collectBeehiveSlot(
    buildingSlotId,
    beehiveSlotId,
  );
  if (!product) return;
  InventorySystem.getInstance().addItem(product.itemId, product.count);
  const animated = animateItemToInventory(
    ui,
    product.itemId,
    product.count,
    source.worldPosition.clone(),
  );
  ui.refreshPastureSlot(buildingSlotId);
  // Collecting only changes this hive's jar, status and progress. Rebuilding
  // the entire horizontal row resets its layout for one frame and causes the
  // visible sideways jump.
  updateBeehiveCardDynamicContent(ui, content, buildingSlotId, beehiveSlotId);
  if (!animated)
    ui.toast(`收获 ${ui.itemName(product.itemId)} x${product.count}`);
}

function openFlowerHouseSpeedUpDialog(
  ui: any,
  content: Node,
  buildingSlotId: number,
  flowerSlotId: number,
  production: any,
) {
  const land = LandSystem.getInstance();
  const diamondCost = GameValues.SPEEDUP_DIAMOND;
  const complete = () => {
    if (!land.finishFlowerHouseSlot(buildingSlotId, flowerSlotId)) {
      ui.toast("该鲜花当前无法加速");
      return;
    }
    updateFlowerHouseDynamicContent(ui, content, buildingSlotId);
    ui.toast("鲜花已成熟");
  };
  ui.showDialog(
    "加速花卉",
    () => {
      const current = land.getFlowerHouseSlotProduction(
        buildingSlotId,
        flowerSlotId,
      );
      const ratio = current
        ? Math.max(0, Math.min(1, 1 - current.remaining / current.duration))
        : 0;
      return `当前进度 ${Math.floor(ratio * 100)}%\n消耗钻石即可立即成熟`;
    },
    [
      {
        text: "",
        image: "btnFlowerCancel",
        imageWidth: 104,
        imageHeight: 52,
        compactGap: 18,
        cb: () => {},
      },
      {
        text: "",
        image: "btnFlowerDiamondSpeedUp",
        imageWidth: 136,
        imageHeight: 52,
        imageOffsetX: -6,
        inlineIconEmbedded: true,
        inlineText: `钻石加速 x${diamondCost}`,
        cb: () => {
          if (!GameManager.getInstance().spendDiamond(diamondCost)) {
            ui.toast("钻石不足");
            return;
          }
          complete();
        },
      },
    ],
    true,
    true,
    true,
  );
}

function collectFlowerHouseSlot(
  ui: any,
  buildingSlotId: number,
  flowerSlotId: number,
  source: Node,
) {
  const product = LandSystem.getInstance().collectFlowerHouseSlot(
    buildingSlotId,
    flowerSlotId,
  );
  if (!product) return;
  InventorySystem.getInstance().addItem(product.itemId, product.count);
  const animated = animateItemToInventory(
    ui,
    product.itemId,
    product.count,
    source.worldPosition.clone(),
  );
  ui.refreshPastureSlot(buildingSlotId);
  if (!animated)
    ui.toast(`收获 ${ui.itemName(product.itemId)} x${product.count}`);
}

function collectProductionSceneProduct(
  ui: any,
  buildingSlotId: number,
  source: Node,
) {
  const land = LandSystem.getInstance();
  const product = land.collectBuildingProduct(buildingSlotId);
  if (!product) {
    const production = land.getBuildingProduction(buildingSlotId);
    ui.toast(
      production
        ? `还需等待 ${formatCountdown(production.remaining)}`
        : "当前没有可收获产物",
    );
    return;
  }
  InventorySystem.getInstance().addItem(product.itemId, product.count);
  const animated = animateItemToInventory(
    ui,
    product.itemId,
    product.count,
    source.worldPosition.clone(),
  );
  ui.refreshPastureSlot(buildingSlotId);
  const dialog = ui.dialogRoot.getChildByName("ProductionSceneDialog");
  const content = dialog?.getChildByName("ProductionSceneContent");
  if (content) renderProductionSceneContent(ui, content, buildingSlotId);
  if (!animated)
    ui.toast(`收获 ${ui.itemName(product.itemId)} x${product.count}`);
}

export function updateProductionSceneDialog(ui: any) {
  const dialog = ui.dialogRoot?.getChildByName("ProductionSceneDialog");
  const content = dialog?.getChildByName("ProductionSceneContent");
  const buildingSlotId = (dialog as any)?.__buildingSlotId;
  if (!content || typeof buildingSlotId !== "number") return;
  const building = LandSystem.getInstance().getBuildingSlot(buildingSlotId);
  if (building?.buildingId === "garden") {
    const currentSecond = Math.floor(Date.now() / 1000);
    if ((content as any).__lastProductionRefreshSecond !== currentSecond) {
      (content as any).__lastProductionRefreshSecond = currentSecond;
      updateFlowerHouseDynamicContent(ui, content, buildingSlotId);
    }
    return;
  }
  if (building?.buildingId === "beehive") {
    const currentSecond = Math.floor(Date.now() / 1000);
    if ((content as any).__lastProductionRefreshSecond !== currentSecond) {
      (content as any).__lastProductionRefreshSecond = currentSecond;
      updateBeehiveDynamicContent(ui, content, buildingSlotId);
    }
    return;
  }
  const production =
    LandSystem.getInstance().getBuildingProduction(buildingSlotId);
  if (!production) return;
  const status = content
    .getChildByName("ProductionStatus")
    ?.getComponent(Label);
  if (status) {
    status.string = production.ready
      ? `${ui.itemName(production.itemId)}已经准备好了`
      : `距离产出还有 ${formatCountdown(production.remaining)}`;
  }
  const progress = content.getChildByName("ProductionProgress");
  if (progress) {
    drawProductionSceneProgress(
      progress,
      production.ready
        ? 1
        : Math.max(
            0,
            Math.min(1, 1 - production.remaining / production.duration),
          ),
    );
  }
}

function closeLivestockDialog(ui: any) {
  const dialog = ui.dialogRoot.getChildByName("LivestockDialog");
  if (!dialog || (dialog as any).__closing) return;
  (dialog as any).__closing = true;
  const dialogOpacity =
    dialog.getComponent(UIOpacity) || dialog.addComponent(UIOpacity);
  const mask = ui.dialogRoot.getChildByName("LivestockMask");
  const maskOpacity =
    mask?.getComponent(UIOpacity) || mask?.addComponent(UIOpacity);
  if (maskOpacity) {
    tween(maskOpacity).to(0.14, { opacity: 0 }, { easing: "quadIn" }).start();
  }
  tween(dialog)
    .to(0.14, { scale: new Vec3(0.88, 0.88, 1) }, { easing: "quadIn" })
    .start();
  tween(dialogOpacity)
    .to(0.14, { opacity: 0 }, { easing: "quadIn" })
    .call(() => {
      ui.dialogRoot.removeAllChildren();
      ui.dialogRoot.active = false;
      ui.activeLivestockBuildingSlotId = -1;
    })
    .start();
}

function openLivestockDialog(ui: any, buildingSlotId: number) {
  const slot = LandSystem.getInstance().getBuildingSlot(buildingSlotId);
  if (!slot || !isLivestockBuilding(slot.buildingId)) return;
  const scene = LIVESTOCK_SCENES[slot.buildingId];
  ui.dialogRoot.removeAllChildren();
  ui.dialogRoot.active = true;
  ui.dialogRoot.setSiblingIndex(ui.node.children.length - 1);
  ui.activeLivestockBuildingSlotId = buildingSlotId;

  const vs = view.getVisibleSize();
  const mask = new Node("LivestockMask");
  mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
  fillRect(mask, Design.WIDTH, vs.height, new Color(42, 35, 25, 145));
  const maskOpacity = mask.addComponent(UIOpacity);
  maskOpacity.opacity = 0;
  mask
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, () => closeLivestockDialog(ui));
  ui.dialogRoot.addChild(mask);
  tween(maskOpacity).to(0.16, { opacity: 255 }, { easing: "quadOut" }).start();

  const dialog = new Node("LivestockDialog");
  dialog.addComponent(UITransform).setContentSize(336, 602);
  // Keep the livestock scenes on the exact same modal Y axis as greenhouse.
  dialog.setPosition(FARM_BUILDING_DIALOG_X, 0);
  const dialogOpacity = dialog.addComponent(UIOpacity);
  dialogOpacity.opacity = 0;
  dialog
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) =>
      event?.stopPropagation?.(),
    );
  (dialog as any).__livestockBuildingId = slot.buildingId;
  ui.dialogRoot.addChild(dialog);

  const background = new Node("LivestockDialogBackground");
  background.addComponent(UITransform).setContentSize(336, 602);
  background.setPosition(0, 0);
  ui.applyUiIcon(scene.background, background);
  dialog.addChild(background);
  renderInteriorFillerLayer(ui, dialog, slot.buildingId);

  const titleRoot = new Node("LivestockTitle");
  titleRoot.addComponent(UITransform).setContentSize(226, 48);
  titleRoot.setPosition(0, scene.titleY);
  const titleShadow = ui.makeLabel(
    scene.title,
    27,
    new Color(86, 40, 24, 150),
    true,
    0,
    FARM_BUILDING_TITLE_SHADOW_Y,
    226,
    48,
  );
  titleShadow.getComponent(Label)!.lineHeight = 34;
  titleRoot.addChild(titleShadow);
  const titleLabel = ui.makeLabel(
    scene.title,
    27,
    new Color(88, 45, 24),
    true,
    0,
    FARM_BUILDING_TITLE_TEXT_Y,
    226,
    48,
  );
  titleLabel.getComponent(Label)!.lineHeight = 34;
  const titleOutline = titleLabel.addComponent(LabelOutline);
  titleOutline.color = new Color(255, 246, 225, 255);
  titleOutline.width = 4;
  titleRoot.addChild(titleLabel);
  dialog.addChild(titleRoot);

  const close = new Node("LivestockClose");
  close
    .addComponent(UITransform)
    .setContentSize(
      FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE,
      FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE,
    );
  close.setPosition(scene.closeX, scene.closeY);
  // The floral artwork stays clean; all livestock close symbols are rendered
  // by code in the same position and style as the greenhouse close symbol.
  attachSceneCloseArt(close);
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(close).stop();
    tween(close)
      .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(() => closeLivestockDialog(ui))
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

  if (SHOW_LEGACY_INTERIOR_CONTENT) {
    const content = new Node("LivestockDialogContent");
    content.addComponent(UITransform).setContentSize(320, 520);
    content.setPosition(0, FARM_BUILDING_CONTENT_Y);
    dialog.addChild(content);
    renderLivestockDialogContent(ui, content);
  }
  // Keep title and close glyph above the dynamic content; this also makes the
  // shared greenhouse/livestock title baseline visually deterministic.
  titleRoot.setSiblingIndex(dialog.children.length - 1);
  close.setSiblingIndex(dialog.children.length - 1);

  dialog.setScale(new Vec3(0.88, 0.88, 1));
  tween(dialog).to(0.18, { scale: Vec3.ONE }, { easing: "backOut" }).start();
  tween(dialogOpacity)
    .to(0.14, { opacity: 255 }, { easing: "quadOut" })
    .start();
}

function renderLivestockDialogContent(ui: any, content: Node) {
  [...content.children].forEach((child) => child.destroy());
  const buildingSlotId = ui.activeLivestockBuildingSlotId;
  const land = LandSystem.getInstance();
  const slot = land.getBuildingSlot(buildingSlotId);
  if (!slot || !isLivestockBuilding(slot.buildingId)) {
    closeLivestockDialog(ui);
    return;
  }
  const scene = LIVESTOCK_SCENES[slot.buildingId];
  const livestockSlots = land.getLivestockSlots(buildingSlotId);
  const selectedId = Math.max(
    0,
    Math.min(
      livestockSlots.length - 1,
      Number((content as any).__selectedLivestockSlotId || 0),
    ),
  );
  (content as any).__selectedLivestockSlotId = selectedId;
  (content as any).__livestockSignature = livestockSlots
    .map((productionSlot) => {
      if (slot.buildingId === "chickenCoop") {
        return `${Number(productionSlot.unlocked)}`;
      }
      const production = land.getLivestockSlotProduction(
        buildingSlotId,
        productionSlot.id,
      );
      return `${Number(productionSlot.unlocked)}${Number(
        !!production?.ready,
      )}:${Number(production?.producedCount || 0)}`;
    })
    .join("");
  (content as any).__livestockBuildingId = slot.buildingId;

  scene.hotspots.forEach((area, index) => {
    const productionSlot = livestockSlots[index];
    if (!productionSlot) return;
    const production = land.getLivestockSlotProduction(
      buildingSlotId,
      productionSlot.id,
    );
    if (productionSlot.unlocked) {
      const sceneArt = new Node(`LivestockSceneArt_${productionSlot.id}`);
      if (slot.buildingId === "barn") {
        sceneArt.addComponent(UITransform).setContentSize(106, 106);
        sceneArt.setPosition(area.x, area.y + 12);
        ui.applyUiIcon(
          index === 0 ? "barnSceneCowMoomoo" : "barnSceneCowDada",
          sceneArt,
        );
      } else {
        const eggCount = Math.max(
          0,
          Math.min(5, Number(production?.producedCount || 0)),
        );
        sceneArt.addComponent(UITransform).setContentSize(92, 92);
        sceneArt.setPosition(area.x, area.y + 7);
        (sceneArt as any).__chickenEggCount = eggCount;
        ui.applyUiIcon(`chickenSceneNest${eggCount}`, sceneArt);
      }
      content.addChild(sceneArt);
    }
    const hotspot = new Node(`LivestockAnimalHotspot_${index}`);
    hotspot.addComponent(UITransform).setContentSize(area.width, area.height);
    hotspot.setPosition(area.x, area.y);
    hotspot
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (!productionSlot.unlocked) {
          requestLivestockSlotUnlock(ui, buildingSlotId, productionSlot.id);
          return;
        }
        const current = land.getLivestockSlotProduction(
          buildingSlotId,
          productionSlot.id,
        );
        (content as any).__selectedLivestockSlotId = productionSlot.id;
        if (current?.ready) {
          collectLivestockProduct(
            ui,
            buildingSlotId,
            productionSlot.id,
            hotspot,
          );
          return;
        }
        if (slot.buildingId === "chickenCoop") {
          (content as any).__chickenFeedExpanded = true;
        }
        renderLivestockDialogContent(ui, content);
      });
    content.addChild(hotspot);
    createSceneInteractionBadge(ui, content, {
      name: `LivestockSceneControl_${productionSlot.id}`,
      x: area.x,
      y: area.y - area.height / 2 + 8,
      width: slot.buildingId === "barn" ? 78 : 68,
      label: !productionSlot.unlocked
        ? "待解锁"
        : production?.ready
          ? slot.buildingId === "barn"
            ? "收取牛奶"
            : "收取鸡蛋"
          : `${Math.round(productionRatio(production) * 100)}%`,
      ratio: productionRatio(production),
      ready: !!production?.ready,
      locked: !productionSlot.unlocked,
      onClick: () =>
        hotspot.emit(Node.EventType.TOUCH_END, { stopPropagation() {} }),
    });
  });

  if (slot.buildingId === "barn") {
    renderBarnProductionContent(
      ui,
      content,
      buildingSlotId,
      livestockSlots,
      selectedId,
    );
    return;
  }

  const viewport = new Node("LivestockSlotViewport");
  const isBarn = false;
  const viewportWidth = 286;
  const viewportHeight = 88;
  viewport
    .addComponent(UITransform)
    .setContentSize(viewportWidth, viewportHeight);
  // Match the requested coop composition while preserving the existing card size.
  viewport.setPosition(0, FARM_BUILDING_CHICKEN_ROW_Y);
  viewport.addComponent(Mask);
  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = true;
  scrollView.vertical = false;
  scrollView.inertia = true;
  (scrollView as any).elastic = false;
  (scrollView as any).cancelInnerEvents = true;
  content.addChild(viewport);

  const slotContent = new Node("LivestockSlotContent");
  const cellWidth = isBarn ? 82 : 88;
  const cellHeight = isBarn ? 76 : 82;
  const cellVisualWidth = isBarn ? 69 : 78;
  const cellVisualHeight = isBarn ? 74 : 78;
  const slotContentWidth = Math.max(
    viewportWidth,
    livestockSlots.length * cellWidth,
  );
  const totalSlotWidth = livestockSlots.length * cellWidth;
  slotContent
    .addComponent(UITransform)
    .setContentSize(slotContentWidth, viewportHeight);
  viewport.addChild(slotContent);
  scrollView.content = slotContent;

  livestockSlots.forEach((productionSlot, index) => {
    const production = land.getLivestockSlotProduction(
      buildingSlotId,
      productionSlot.id,
    );
    const cell = new Node(`LivestockProductionSlot_${productionSlot.id}`);
    cell.addComponent(UITransform).setContentSize(isBarn ? 71 : 82, cellHeight);
    cell.setPosition(
      -totalSlotWidth / 2 + cellWidth / 2 + index * cellWidth,
      0,
    );
    const cardBackground = new Node("CardBackground");
    cardBackground
      .addComponent(UITransform)
      .setContentSize(cellVisualWidth, cellVisualHeight);
    ui.applyUiIcon(
      !productionSlot.unlocked
        ? "interactionCardLockedBg"
        : productionSlot.id === selectedId
          ? "interactionCardSelectedBg"
          : "interactionCardBg",
      cardBackground,
    );
    cell.addChild(cardBackground);

    if (productionSlot.unlocked) {
      const slotArt = new Node("SlotArt");
      const slotArtSize = 68;
      slotArt
        .addComponent(UITransform)
        .setContentSize(slotArtSize, slotArtSize);
      slotArt.setPosition(0, 5);
      const eggCount = Math.max(
        0,
        Math.min(5, Number(production?.producedCount || 0)),
      );
      (slotArt as any).__chickenEggCount = eggCount;
      ui.applyUiIcon(`chickenNestSlot${eggCount}`, slotArt);
      cell.addChild(slotArt);
      const slotCaption = ui.makeLabel(
        eggCount > 0 ? `${eggCount}/5 可收获` : "生产中",
        9,
        eggCount > 0 ? new Color(184, 86, 28) : new Color(104, 76, 49),
        true,
        0,
        -24,
        70,
        13,
      );
      slotCaption.name = `LivestockSlotCaption_${productionSlot.id}`;
      cell.addChild(slotCaption);
      const progress = new Node(`ChickenEggProgress_${productionSlot.id}`);
      progress.addComponent(UITransform).setContentSize(52, 6);
      progress.setPosition(0, -35);
      drawChickenEggProgress(progress, production);
      cell.addChild(progress);
    } else {
      const chickArt = new Node("LockedChick");
      chickArt.addComponent(UITransform).setContentSize(28, 28);
      chickArt.setPosition(0, 4);
      ui.applyUiIcon("chickenLockedChick", chickArt);
      cell.addChild(chickArt);
      const lockArt = new Node("LockedSlotLock");
      lockArt.addComponent(UITransform).setContentSize(14, 14);
      lockArt.setPosition(29, 29);
      ui.applyUiIcon("chickenSlotLock", lockArt);
      cell.addChild(lockArt);
      cell.addChild(
        ui.makeLabel(
          "扩建栏位",
          10,
          new Color(98, 67, 43),
          true,
          -4,
          28,
          58,
          16,
        ),
      );
      cell.addChild(
        ui.makeLabel(
          `${land.getLivestockSlotUnlockCost(productionSlot.id)} 金`,
          9,
          new Color(113, 72, 35),
          true,
          0,
          -17,
          64,
          15,
        ),
      );
      cell.addChild(
        ui.makeLabel(
          "解锁新鸡位",
          9,
          new Color(113, 72, 35),
          true,
          0,
          -32,
          68,
          14,
        ),
      );
    }
    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (!productionSlot.unlocked) {
          requestLivestockSlotUnlock(ui, buildingSlotId, productionSlot.id);
          return;
        }
        (content as any).__selectedLivestockSlotId = productionSlot.id;
        if (production?.ready) {
          collectLivestockProduct(ui, buildingSlotId, productionSlot.id, cell);
          return;
        }
        (content as any).__chickenFeedExpanded = true;
        updateChickenSlotSelection(ui, content, productionSlot.id);
        renderChickenFeedPanel(ui, content, buildingSlotId);
      });
    slotContent.addChild(cell);
  });

  renderChickenFeedPanel(ui, content, buildingSlotId);
}

function renderChickenFeedPanel(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  [
    "ChickenFeedPromptPanel",
    "ChickenFeedPrompt",
    "ChickenFeedPanelBackground",
    "ChickenFeedViewport",
  ].forEach((name) => content.getChildByName(name)?.destroy());

  if (!(content as any).__chickenFeedExpanded) {
    const panel = new Node("ChickenFeedPromptPanel");
    panel.addComponent(UITransform).setContentSize(196, 34);
    panel.setPosition(0, FARM_BUILDING_OPTION_ROW_Y);
    ui.applyUiIcon("feedCardBg", panel);
    content.addChild(panel);
    const prompt = ui.makeLabel(
      "点击鸡窝展开喂养",
      11,
      new Color(122, 76, 41),
      true,
      0,
      FARM_BUILDING_OPTION_ROW_Y,
      240,
      24,
    );
    prompt.name = "ChickenFeedPrompt";
    content.addChild(prompt);
    return;
  }

  const inventory = InventorySystem.getInstance();
  const availableFeeds = LIVESTOCK_FEEDS.filter(
    (feed) => inventory.getItemCount(feed.itemId) > 0,
  );
  const feedScroller = createFlowerOptionScroller(ui, content, {
    panelName: "ChickenFeedPanelBackground",
    viewportName: "ChickenFeedViewport",
    contentName: "ChickenFeedContent",
    cellPrefix: "ChickenFeed",
    iconPrefix: "ChickenFeedIcon",
    panelY: FARM_BUILDING_OPTION_ROW_Y,
    items: availableFeeds.map((feed) => ({
      id: feed.itemId,
      iconKey: "",
      label: `${ui.itemName(feed.itemId)} ×${inventory.getItemCount(feed.itemId)}`,
      subLabel: `-${feed.seconds}秒`,
    })),
    selectedId: "",
    onSelect: (feedItemId) => {
      const livestockSlotId = Number(
        (content as any).__selectedLivestockSlotId || 0,
      );
      feedLivestockProduction(
        ui,
        buildingSlotId,
        livestockSlotId,
        feedItemId,
      );
    },
    scrollStateKey: "__chickenFeedScrollX",
    labelName: "ChickenFeedCount",
    createIcon: (itemId, size) => ui.createItemIcon(itemId, size),
  });
  if (availableFeeds.length === 0) {
    feedScroller.viewport.addChild(
      ui.makeLabel(
        "背包暂无可用饲料",
        11,
        new Color(137, 91, 55),
        true,
        0,
        0,
        220,
        24,
      ),
    );
  }
}

function updateChickenSlotSelection(
  ui: any,
  content: Node,
  livestockSlotId: number,
) {
  (content as any).__selectedLivestockSlotId = livestockSlotId;
  const slotContent = content
    .getChildByName("LivestockSlotViewport")
    ?.getChildByName("LivestockSlotContent");
  slotContent?.children.forEach((cell) => {
    const id = Number(cell.name.replace("LivestockProductionSlot_", ""));
    if (!Number.isFinite(id)) return;
    const selected = id === livestockSlotId;
    const background = cell.getChildByName("CardBackground");
    if (background) {
      ui.applyUiIcon(
        selected ? "interactionCardSelectedBg" : "interactionCardBg",
        background,
      );
    }
  });
}

function drawChickenEggProgress(progress: Node, production: any) {
  fillRoundRect(progress, 52, 6, 3, new Color(190, 135, 80, 115));
  let fill = progress.getChildByName("Fill");
  if (!fill) {
    fill = new Node("Fill");
    fill.addComponent(UITransform);
    progress.addChild(fill);
  }
  const eggCount = Math.max(
    0,
    Math.min(5, Number(production?.producedCount || 0)),
  );
  const interval = Math.max(1, Number(production?.duration || 1) / 5);
  const ratio =
    eggCount >= 5
      ? 1
      : Math.max(
          0,
          Math.min(1, 1 - Number(production?.remaining || interval) / interval),
        );
  const width = 50 * ratio;
  fill.active = width > 0;
  if (!fill.active) return;
  fill.getComponent(UITransform)!.setContentSize(width, 4);
  fill.setPosition(-25 + width / 2, 0);
  fillRoundRect(fill, width, 4, 2, new Color(255, 183, 49));
}

function openChickenFeedDialog(
  ui: any,
  content: Node,
  buildingSlotId: number,
  livestockSlotId: number,
) {
  const inventory = InventorySystem.getInstance();
  const availableFeeds = LIVESTOCK_FEEDS.filter(
    (feed) => inventory.getItemCount(feed.itemId) > 0,
  );
  let selectedFeedId = availableFeeds[0]?.itemId || "";
  ui.showDialog(
    "选择小鸡饲料",
    availableFeeds.length > 0 ? "选择一种背包内现有农作物" : "背包暂无可用饲料",
    [
      {
        text: "稍后",
        image: "btnGreenhouseUnlockLater",
        cb: () => {},
      },
      {
        text: "喂食",
        image: "btnChickenFeedConfirm",
        cb: () => {
          if (!selectedFeedId) {
            ui.toast("背包暂无可用饲料");
            return;
          }
          (content as any).__selectedLivestockSlotId = livestockSlotId;
          feedLivestockProduction(
            ui,
            buildingSlotId,
            livestockSlotId,
            selectedFeedId,
          );
        },
      },
    ],
    true,
    true,
  );

  const popup = ui.dialogRoot.getChildByName("DialogOverlay");
  if (!popup) return;
  popup.getComponent(UITransform)?.setContentSize(286, 232);
  popup
    .getChildByName("DialogBackground")
    ?.getComponent(UITransform)
    ?.setContentSize(286, 232);
  popup.children
    .find((child) => child.getComponent(Label)?.string === "选择小鸡饲料")
    ?.setPosition(0, 86);
  popup.getChildByName("DialogMessage")?.setPosition(0, 54);
  popup.getChildByName("ButtonArt_0")?.setPosition(-49, -88);
  popup.getChildByName("ButtonArt_1")?.setPosition(49, -88);
  popup.getChildByName("Button_0")?.setPosition(-49, -88);
  popup.getChildByName("Button_1")?.setPosition(49, -88);
  popup
    .getChildByName("ButtonArt_0")
    ?.getComponent(UITransform)
    ?.setContentSize(82, 82);
  popup
    .getChildByName("ButtonArt_1")
    ?.getComponent(UITransform)
    ?.setContentSize(82, 82);

  const viewport = new Node("ChickenFeedViewport");
  viewport.addComponent(UITransform).setContentSize(248, 82);
  viewport.setPosition(0, -5);
  viewport.addComponent(Mask);
  popup.addChild(viewport);

  const cellWidth = 52;
  const contentWidth = Math.max(248, availableFeeds.length * cellWidth);
  const feedContent = new Node("ChickenFeedContent");
  feedContent.addComponent(UITransform).setContentSize(contentWidth, 82);
  viewport.addChild(feedContent);

  if (availableFeeds.length === 0) return;

  const selectedBorder = new Node("SelectedFeedBorder");
  selectedBorder.addComponent(UITransform).setContentSize(48, 76);
  strokeRoundRect(
    selectedBorder,
    48,
    76,
    10,
    new Color(205, 126, 42, 255),
    2.4,
  );
  const updateSelection = (index: number) => {
    selectedFeedId = availableFeeds[index].itemId;
    selectedBorder.setPosition(
      -contentWidth / 2 + cellWidth / 2 + index * cellWidth,
      0,
    );
  };

  availableFeeds.forEach((feed, index) => {
    const cell = new Node(`ChickenFeed_${feed.itemId}`);
    cell.addComponent(UITransform).setContentSize(48, 76);
    cell.setPosition(-contentWidth / 2 + cellWidth / 2 + index * cellWidth, 0);
    fillRoundRect(cell, 46, 74, 10, new Color(250, 241, 210, 245));
    strokeRoundRect(cell, 46, 74, 10, new Color(177, 129, 75, 210), 1.2);
    const icon = ui.createItemIcon(feed.itemId, 35);
    icon.setPosition(0, 8);
    cell.addChild(icon);
    cell.addChild(
      ui.makeLabel(
        `−${feed.seconds}秒`,
        8,
        new Color(82, 49, 29),
        true,
        0,
        -25,
        42,
        12,
      ),
    );
    cell.addChild(
      ui.makeLabel(
        `x${inventory.getItemCount(feed.itemId)}`,
        8,
        new Color(126, 75, 38),
        true,
        15,
        23,
        26,
        12,
      ),
    );
    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        updateSelection(index);
      });
    feedContent.addChild(cell);
  });
  feedContent.addChild(selectedBorder);
  updateSelection(0);

  if (contentWidth > 248) {
    const feedScroll = viewport.addComponent(ScrollView);
    feedScroll.horizontal = true;
    feedScroll.vertical = false;
    feedScroll.inertia = true;
    (feedScroll as any).elastic = false;
    feedScroll.content = feedContent;
  }
}

function renderBarnProductionContent(
  ui: any,
  content: Node,
  buildingSlotId: number,
  livestockSlots: Array<{ id: number; unlocked: boolean }>,
  selectedId: number,
) {
  const land = LandSystem.getInstance();
  const cows = livestockSlots.slice(0, 2);
  const cowNames = ["哞哞", "哒哒"];
  const cowIcons = ["barnCowMoomooAvatar", "barnCowDadaAvatar"];

  cows.forEach((cow, index) => {
    if (!cow.unlocked) return;
    const production = land.getLivestockSlotProduction(buildingSlotId, cow.id);
    const isLeft = index === 0;
    const card = new Node(`BarnCowCard_${cow.id}`);
    card.addComponent(UITransform).setContentSize(140, 82);
    card.setPosition(isLeft ? -72 : 72, FARM_BUILDING_BARN_ROW_Y);
    const cardBackground = new Node("CowCardBackground");
    cardBackground.addComponent(UITransform).setContentSize(140, 82);
    ui.applyUiIcon("barnCowStatusPanel", cardBackground);
    card.addChild(cardBackground);
    if (cow.id === selectedId) {
      card.setScale(new Vec3(1.025, 1.025, 1));
      const selectedTint = new Node("SelectedTint");
      selectedTint.addComponent(UITransform).setContentSize(124, 64);
      fillRoundRect(selectedTint, 124, 64, 9, new Color(255, 196, 72, 82));
      card.addChild(selectedTint);
    }

    // The two cards mirror one another: avatars stay on the outside, while
    // names and milk status face the centre just like the cows in the scene.
    const avatar = new Node("CowAvatar");
    avatar.addComponent(UITransform).setContentSize(58, 58);
    avatar.setPosition(isLeft ? -38 : 38, 0);
    ui.applyUiIcon(cowIcons[index], avatar);
    card.addChild(avatar);

    const infoX = isLeft ? 27 : -27;
    card.addChild(
      ui.makeLabel(
        cowNames[index],
        14,
        new Color(101, 56, 31),
        true,
        infoX,
        21,
        51,
        20,
      ),
    );
    const status = new Node(`BarnCowProgress_${cow.id}`);
    status.addComponent(UITransform).setContentSize(58, 24);
    status.setPosition(infoX, -8);
    const milk = new Node("MilkCup");
    milk.addComponent(UITransform).setContentSize(25, 25);
    milk.setPosition(-15, 0);
    ui.applyUiIcon("barnMilkCup", milk);
    status.addChild(milk);
    if (production?.ready) {
      const milkOpacity = milk.addComponent(UIOpacity);
      tween(milk)
        .repeatForever(
          tween()
            .to(
              0.62,
              { scale: new Vec3(1.16, 1.16, 1) },
              { easing: "quadInOut" },
            )
            .to(0.62, { scale: Vec3.ONE }, { easing: "quadInOut" }),
        )
        .start();
      tween(milkOpacity)
        .repeatForever(
          tween()
            .to(0.62, { opacity: 178 }, { easing: "quadInOut" })
            .to(0.62, { opacity: 255 }, { easing: "quadInOut" }),
        )
        .start();
    }
    const progressRoot = new Node("ProgressBar");
    progressRoot.addComponent(UITransform).setContentSize(28, 7);
    progressRoot.setPosition(14, 0);
    drawBarnCowProgress(progressRoot, production, 28);
    status.addChild(progressRoot);
    card.addChild(status);

    card
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        (content as any).__selectedLivestockSlotId = cow.id;
        renderLivestockDialogContent(ui, content);
      });
    content.addChild(card);
  });

  const inventory = InventorySystem.getInstance();
  const visibleFeedDefinitions = LIVESTOCK_FEEDS.filter(
    (feed) => inventory.getItemCount(feed.itemId) > 0,
  );
  const feedScroller = createFlowerOptionScroller(ui, content, {
    panelName: "BarnFeedPanelBackground",
    viewportName: "BarnFeedViewport",
    contentName: "BarnFeedContent",
    cellPrefix: "BarnFeed",
    iconPrefix: "BarnFeedIcon",
    panelY: FARM_BUILDING_OPTION_ROW_Y,
    items: visibleFeedDefinitions.map((feed) => ({
      id: feed.itemId,
      iconKey: "",
      label: `${ui.itemName(feed.itemId)} ×${inventory.getItemCount(feed.itemId)}`,
      subLabel: `-${feed.seconds}秒`,
    })),
    selectedId: "",
    onSelect: (feedItemId) => {
      feedLivestockProduction(
        ui,
        buildingSlotId,
        Number((content as any).__selectedLivestockSlotId || 0),
        feedItemId,
      );
    },
    scrollStateKey: "__barnFeedScrollX",
    labelName: "BarnFeedCount",
    createIcon: (itemId, size) => ui.createItemIcon(itemId, size),
  });

  if (visibleFeedDefinitions.length === 0) {
    feedScroller.viewport.addChild(
      ui.makeLabel(
        "背包暂无可用饲料",
        11,
        new Color(137, 91, 55),
        true,
        0,
        0,
        220,
        28,
      ),
    );
  }

}

function drawBarnCowProgress(
  root: Node,
  production: { duration: number; remaining: number; ready: boolean } | null,
  barWidth = 18,
) {
  [...root.children].forEach((child) => child.destroy());
  const ratio = production
    ? Math.max(
        0,
        Math.min(
          1,
          production.ready ? 1 : 1 - production.remaining / production.duration,
        ),
      )
    : 0;
  fillRoundRect(root, barWidth, 7, 4, new Color(135, 83, 50, 205));
  const width = Math.max(2, (barWidth - 2) * ratio);
  const fill = new Node("ProgressFill");
  fill.addComponent(UITransform).setContentSize(width, 5);
  fill.setPosition(-(barWidth - 2) / 2 + width / 2, 0);
  fillRoundRect(
    fill,
    width,
    5,
    3,
    production?.ready
      ? new Color(255, 192, 62, 255)
      : new Color(255, 213, 91, 255),
  );
  root.addChild(fill);
}

function requestLivestockSlotUnlock(
  ui: any,
  buildingSlotId: number,
  livestockSlotId: number,
) {
  const land = LandSystem.getInstance();
  const cost = land.getLivestockSlotUnlockCost(livestockSlotId);
  ui.showDialog(
    "扩建生产槽",
    `消耗 ${cost} 金币解锁第 ${livestockSlotId + 1} 个生产槽`,
    [
      { text: "稍后", image: "btnGreenhouseUnlockLater", cb: () => {} },
      {
        text: "解锁",
        image: "btnGreenhouseUnlockConfirm",
        cb: () => {
          const gm = GameManager.getInstance();
          if (!gm.spendGold(cost)) {
            ui.toast("金币不足");
            return;
          }
          if (!land.unlockLivestockSlot(buildingSlotId, livestockSlotId)) {
            gm.addGold(cost);
            ui.toast("请按顺序解锁槽位");
            return;
          }
          ui.refreshTopBar();
          refreshLivestockDialog(ui);
          ui.toast("新生产槽已解锁");
        },
      },
    ],
    true,
    true,
  );
}

function feedLivestockProduction(
  ui: any,
  buildingSlotId: number,
  livestockSlotId: number,
  feedItemId: string,
) {
  const land = LandSystem.getInstance();
  const production = land.getLivestockSlotProduction(
    buildingSlotId,
    livestockSlotId,
  );
  if (!production || production.ready) {
    ui.toast("当前产物已经可以收获");
    return;
  }
  if ((production.feedCount || 0) >= 3) {
    ui.toast("本轮最多投喂 3 次，请等待牛奶成熟");
    return;
  }
  const inventory = InventorySystem.getInstance();
  if (!inventory.hasItems(feedItemId, 1)) {
    ui.toast(`${ui.itemName(feedItemId)}不足`);
    return;
  }
  if (!inventory.removeItem(feedItemId, 1)) return;
  const seconds = land.feedLivestockSlot(
    buildingSlotId,
    livestockSlotId,
    feedItemId,
  );
  if (seconds <= 0) {
    inventory.addItem(feedItemId, 1);
    return;
  }
  const dialog = ui.dialogRoot.getChildByName("LivestockDialog");
  const content = dialog?.getChildByName("LivestockDialogContent");
  const building = land.getBuildingSlot(buildingSlotId);
  if (content && building?.buildingId === "chickenCoop") {
    const countLabel = content
      .getChildByName("ChickenFeedViewport")
      ?.getChildByName("ChickenFeedContent")
      ?.getChildByName(`ChickenFeed_${feedItemId}`)
      ?.getChildByName("ChickenFeedCount")
      ?.getComponent(Label);
    if (countLabel) {
      countLabel.string = `${ui.itemName(feedItemId)} ×${inventory.getItemCount(feedItemId)}`;
    }
    if (inventory.getItemCount(feedItemId) <= 0) {
      renderChickenFeedPanel(ui, content, buildingSlotId);
    }
    (content as any).__livestockLastRefresh = 0;
    updateLivestockDialogProgress(ui);
  } else {
    refreshLivestockDialog(ui);
  }
  ui.toast(`喂食成功，缩短 ${seconds} 秒`);
}

function collectLivestockProduct(
  ui: any,
  buildingSlotId: number,
  livestockSlotId: number,
  source: Node,
) {
  const dialog = ui.dialogRoot.getChildByName("LivestockDialog");
  if (!dialog || (dialog as any).__collecting) return;
  const production = LandSystem.getInstance().getLivestockSlotProduction(
    buildingSlotId,
    livestockSlotId,
  );
  if (!production?.ready) {
    refreshLivestockDialog(ui);
    return;
  }
  (dialog as any).__collecting = true;
  const rewardOrigin = source.worldPosition.clone();
  const feedback = new Node("LivestockTapFeedback");
  feedback.addComponent(UITransform).setContentSize(58, 58);
  feedback.setScale(new Vec3(0.42, 0.42, 1));
  const feedbackOpacity = feedback.addComponent(UIOpacity);
  const sparkle = feedback.addComponent(Graphics);
  sparkle.strokeColor = new Color(255, 240, 142, 245);
  sparkle.lineWidth = 3;
  sparkle.circle(0, 0, 20);
  sparkle.stroke();
  for (let index = 0; index < 8; index++) {
    const angle = (Math.PI * 2 * index) / 8;
    sparkle.moveTo(Math.cos(angle) * 24, Math.sin(angle) * 24);
    sparkle.lineTo(Math.cos(angle) * 29, Math.sin(angle) * 29);
  }
  sparkle.stroke();
  source.addChild(feedback);
  tween(feedbackOpacity).to(0.16, { opacity: 0 }, { easing: "quadIn" }).start();
  tween(feedback)
    .to(0.16, { scale: new Vec3(1.35, 1.35, 1) }, { easing: "quadOut" })
    .call(() => {
      const product = LandSystem.getInstance().collectLivestockSlotProduct(
        buildingSlotId,
        livestockSlotId,
      );
      if (!product) {
        (dialog as any).__collecting = false;
        refreshLivestockDialog(ui);
        return;
      }
      (dialog as any).__collecting = false;
      InventorySystem.getInstance().addItem(product.itemId, product.count);
      const rewardAnimated = animateItemToInventory(
        ui,
        product.itemId,
        product.count,
        rewardOrigin,
      );
      ui.refreshPastureSlot(buildingSlotId);
      refreshLivestockDialog(ui);
      if (!rewardAnimated) {
        ui.toast(`收获 ${ui.itemName(product.itemId)} x${product.count}`);
      }
    })
    .start();
}

export function refreshLivestockDialog(ui: any) {
  if (!ui.dialogRoot?.active || ui.activeLivestockBuildingSlotId < 0) return;
  const dialog = ui.dialogRoot.getChildByName("LivestockDialog");
  const content = dialog?.getChildByName("LivestockDialogContent");
  if (content) renderLivestockDialogContent(ui, content);
}

export function updateLivestockDialogProgress(ui: any) {
  if (!ui.dialogRoot?.active || ui.activeLivestockBuildingSlotId < 0) return;
  const dialog = ui.dialogRoot.getChildByName("LivestockDialog");
  const content = dialog?.getChildByName("LivestockDialogContent");
  if (!content) return;
  const now = Date.now();
  if (now - Number((content as any).__livestockLastRefresh || 0) < 500) return;
  (content as any).__livestockLastRefresh = now;
  const slot = LandSystem.getInstance().getBuildingSlot(
    ui.activeLivestockBuildingSlotId,
  );
  if (!slot || !isLivestockBuilding(slot.buildingId)) {
    closeLivestockDialog(ui);
    return;
  }
  const land = LandSystem.getInstance();
  const slots = land.getLivestockSlots(slot.id);
  const signature = slots
    .map((productionSlot) => {
      if (slot.buildingId === "chickenCoop") {
        return `${Number(productionSlot.unlocked)}`;
      }
      const production = land.getLivestockSlotProduction(
        slot.id,
        productionSlot.id,
      );
      return `${Number(productionSlot.unlocked)}${Number(
        !!production?.ready,
      )}:${Number(production?.producedCount || 0)}`;
    })
    .join("");
  if (
    (content as any).__livestockSignature !== signature ||
    (content as any).__livestockBuildingId !== slot.buildingId
  ) {
    renderLivestockDialogContent(ui, content);
    return;
  }
  slots.forEach((productionSlot) => {
    const production = land.getLivestockSlotProduction(
      slot.id,
      productionSlot.id,
    );
    updateSceneInteractionBadge(
      content.getChildByName(`LivestockSceneControl_${productionSlot.id}`),
      !productionSlot.unlocked
        ? "待解锁"
        : production?.ready
          ? slot.buildingId === "barn"
            ? "收取牛奶"
            : "收取鸡蛋"
          : `${Math.round(productionRatio(production) * 100)}%`,
      productionRatio(production),
      !!production?.ready,
    );
  });
  if (slot.buildingId === "barn") {
    slots.slice(0, 2).forEach((productionSlot) => {
      const production = land.getLivestockSlotProduction(
        slot.id,
        productionSlot.id,
      );
      const progressStatus = content
        .getChildByName(`BarnCowCard_${productionSlot.id}`)
        ?.getChildByName(`BarnCowProgress_${productionSlot.id}`);
      const progressRoot = progressStatus?.getChildByName("ProgressBar");
      if (progressRoot) drawBarnCowProgress(progressRoot, production, 28);
    });
    return;
  }
  const slotContent = content
    .getChildByName("LivestockSlotViewport")
    ?.getChildByName("LivestockSlotContent");
  slots.forEach((productionSlot) => {
    if (!productionSlot.unlocked) return;
    const production = land.getLivestockSlotProduction(
      slot.id,
      productionSlot.id,
    );
    const card = slotContent?.getChildByName(
      `LivestockProductionSlot_${productionSlot.id}`,
    );
    const eggCount = Math.max(
      0,
      Math.min(5, Number(production?.producedCount || 0)),
    );
    const slotArt = card?.getChildByName("SlotArt");
    if (slotArt && (slotArt as any).__chickenEggCount !== eggCount) {
      (slotArt as any).__chickenEggCount = eggCount;
      ui.applyUiIcon(`chickenNestSlot${eggCount}`, slotArt);
    }
    const sceneArt = content.getChildByName(
      `LivestockSceneArt_${productionSlot.id}`,
    );
    if (sceneArt && (sceneArt as any).__chickenEggCount !== eggCount) {
      (sceneArt as any).__chickenEggCount = eggCount;
      ui.applyUiIcon(`chickenSceneNest${eggCount}`, sceneArt);
    }
    const caption = card
      ?.getChildByName(`LivestockSlotCaption_${productionSlot.id}`)
      ?.getComponent(Label);
    if (caption) {
      caption.string = eggCount > 0 ? `${eggCount}/5 可收获` : "生产中";
    }
    const progress = card?.getChildByName(
      `ChickenEggProgress_${productionSlot.id}`,
    );
    if (progress) drawChickenEggProgress(progress, production);
  });
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
  ui.dialogRoot.setSiblingIndex(ui.node.children.length - 1);
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
  dialog.setPosition(FARM_BUILDING_DIALOG_X, 0);
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
  renderInteriorFillerLayer(ui, dialog, "greenhouse", buildingSlotId);
  // The legacy content layer is disabled for image-led interiors, so mount the
  // off-season seed scroller directly in the background's lower reserved panel.
  createGreenhouseSeedStrip(ui, dialog, -190);

  const titleRoot = new Node("GreenhouseTitle");
  titleRoot.addComponent(UITransform).setContentSize(226, 48);
  titleRoot.setPosition(0, FARM_BUILDING_DIALOG_TITLE_Y);
  const titleShadow = ui.makeLabel(
    "恒温温室",
    27,
    new Color(86, 40, 24, 150),
    true,
    2,
    FARM_BUILDING_TITLE_SHADOW_Y,
    226,
    48,
  );
  titleShadow.getComponent(Label)!.lineHeight = 34;
  titleRoot.addChild(titleShadow);
  const titleLabel = ui.makeLabel(
    "恒温温室",
    27,
    new Color(88, 45, 24),
    true,
    0,
    FARM_BUILDING_TITLE_TEXT_Y,
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
  close
    .addComponent(UITransform)
    .setContentSize(
      FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE,
      FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE,
    );
  // The background leaves the top-right flower center clean for this glyph.
  close.setPosition(FARM_BUILDING_DIALOG_CLOSE_X, FARM_BUILDING_DIALOG_CLOSE_Y);
  attachSceneCloseArt(close);
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

  if (SHOW_LEGACY_INTERIOR_CONTENT) {
    const content = new Node("GreenhouseDialogContent");
    content.addComponent(UITransform).setContentSize(320, 520);
    content.setPosition(0, FARM_BUILDING_CONTENT_Y);
    dialog.addChild(content);
    renderGreenhouseDialogContent(ui, content);
  }
  titleRoot.setSiblingIndex(dialog.children.length - 1);
  close.setSiblingIndex(dialog.children.length - 1);
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
    // Pixel-calibrated centres of the six perspective mats in the 752x1359
    // background, converted into the dialog content coordinate system.
    const matX = [-76, 1, 77];
    const matY = [78, -52];
    // Pot, crop and unlock marker all inherit this shared anchor.
    slot.setPosition(matX[col], matY[row]);
    (slot as any).__greenhouseState = block.state;
    (slot as any).__greenhouseVisualId = block.cropType
      ? getCropVisualId(block)
      : "";

    if (!land.isGreenhouseSlotUnlocked(block.id)) {
      const unlockMarker = new Node("LockedPot");
      unlockMarker.addComponent(UITransform).setContentSize(58, 44);
      unlockMarker.setPosition(0, 0);
      ui.applyUiIcon("greenhouseSlotUnlock", unlockMarker);
      slot.addChild(unlockMarker);
      slot
        .addComponent(Button)
        .node.on(Node.EventType.TOUCH_END, (event: any) => {
          event?.stopPropagation?.();
          handleGreenhouseSlotUnlock(ui, block.id);
        });
      content.addChild(slot);
      return;
    }

    const pot = new Node("FlowerPot");
    pot.addComponent(UITransform).setContentSize(56, 42);
    pot.setPosition(0, 5);
    ui.applyUiIcon("greenhousePot", pot);
    slot.addChild(pot);
    if (block.cropType) {
      const cropIcon = ui.createItemIcon(getCropVisualId(block), 40);
      cropIcon.setPosition(0, 32);
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
      -31,
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
  ui.refreshPastureSlot(ui.activeGreenhouseBuildingSlotId);
  refreshGreenhouseDialog(ui);
  if (!rewardAnimated) ui.toast(`一键收获 ${total} 个作物`);
}

function createGreenhouseSeedStrip(ui: any, parent: Node, y: number) {
  const seeds = getAvailableGreenhouseSeeds();
  const viewport = new Node("GreenhouseSeedViewport");
  viewport.addComponent(UITransform).setContentSize(278, 98);
  viewport.setPosition(0, y);
  viewport.addComponent(Mask);
  parent.addChild(viewport);
  if (seeds.length === 0) {
    const emptyLabel = ui.makeLabel(
      "背包中没有可用的非当季种子",
      11,
      new Color(143, 103, 68),
      true,
      -28,
      0,
      190,
      26,
    );
    viewport.addChild(emptyLabel);
    const goButton = new Node("GreenhouseSeedShopButton");
    goButton.addComponent(UITransform).setContentSize(56, 28);
    goButton.setPosition(98, 0);
    const goVisual = new Node("GreenhouseSeedShopVisual");
    goVisual.addComponent(UITransform).setContentSize(62, 62);
    // The opaque artwork sits 5.5px above the source canvas centre.
    goVisual.setPosition(0, -2);
    ui.applyUiIcon("btnGo", goVisual);
    goButton.addChild(goVisual);
    goButton.on(Node.EventType.TOUCH_START, () => {
      tween(goVisual).stop();
      tween(goVisual)
        .to(0.06, { scale: new Vec3(0.9, 0.9, 1) }, { easing: "quadOut" })
        .start();
    });
    const restoreGoButton = () => {
      tween(goVisual).stop();
      tween(goVisual)
        .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
        .start();
    };
    goButton.on(Node.EventType.TOUCH_CANCEL, restoreGoButton);
    goButton
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        restoreGoButton();
        closeGreenhouseDialog(ui);
        ui.scheduleOnce(() => {
          ui.nextShopCategory = "seeds";
          ui.showPanel("shop");
        }, 0.16);
      });
    viewport.addChild(goButton);
    return;
  }
  const cellW = 62;
  const gap = 7;
  const contentW = Math.max(
    278,
    seeds.length * cellW + Math.max(0, seeds.length - 1) * gap,
  );
  const strip = new Node("GreenhouseSeedContent");
  strip.addComponent(UITransform).setContentSize(contentW, 98);
  viewport.addChild(strip);
  const startX = -contentW / 2 + cellW / 2;
  seeds.forEach((seed, index) => {
    const selected = seed.id === ui.greenhouseSelectedSeedId;
    const cell = new Node(`GreenhouseSeed_${seed.id}`);
    cell.addComponent(UITransform).setContentSize(cellW, 94);
    cell.setPosition(startX + index * (cellW + gap), 0);
    fillRoundRect(
      cell,
      60,
      92,
      7,
      selected ? new Color(255, 241, 196, 255) : new Color(255, 235, 196, 250),
    );
    strokeRoundRect(
      cell,
      60,
      92,
      7,
      selected ? new Color(220, 111, 29, 255) : new Color(208, 137, 66, 255),
      selected ? 2.5 : 1.4,
    );
    const countBand = new Node("GreenhouseSeedCountBand");
    countBand.addComponent(UITransform).setContentSize(57, 24);
    countBand.setPosition(0, -33);
    drawGreenhouseSeedCountBand(countBand, selected);
    cell.addChild(countBand);
    const icon = ui.createItemIcon(seed.id, 42);
    icon.setPosition(0, 23);
    cell.addChild(icon);
    cell.addChild(
      ui.makeLabel(ui.itemName(seed.id), 9, new Color(91, 52, 26), true, 0, -9, 56, 14),
    );
    cell.addChild(
      ui.makeLabel(
        `x${InventorySystem.getInstance().getItemCount(seed.id)}`,
        8,
        new Color(102, 60, 30),
        true,
        0,
        -34,
        52,
        14,
      ),
    );
    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        ui.greenhouseSelectedSeedId = seed.id;
        strip.children.forEach((child) => {
          const active = child.name === `GreenhouseSeed_${seed.id}`;
          fillRoundRect(
            child,
            60,
            92,
            7,
            active ? new Color(255, 241, 196, 255) : new Color(255, 235, 196, 250),
          );
          strokeRoundRect(
            child,
            60,
            92,
            7,
            active ? new Color(220, 111, 29, 255) : new Color(208, 137, 66, 255),
            active ? 2.5 : 1.4,
          );
          const band = child.getChildByName("GreenhouseSeedCountBand");
          if (band) drawGreenhouseSeedCountBand(band, active);
        });
      });
    strip.addChild(cell);
  });
  if (contentW > 278) {
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
      ui.refreshPastureSlot(ui.activeGreenhouseBuildingSlotId);
      refreshGreenhouseDialog(ui);
      ui.toast("作物已铲除");
    };
    playDemolitionAnimation(ui, slot, cropIcon, finishRemoval);
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
    const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
    const content = dialog?.getChildByName("GreenhouseDialogContent");
    const plantedSlot = content?.getChildByName(`GreenhouseSlot_${slotId}`);
    const plantedIcon = plantedSlot?.children.find(
      (child: Node) =>
        child.name !== "FlowerPot" && child.name !== "GreenhouseProgress",
    );
    playPlantingVisualAnimation(plantedIcon);
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
    ui.refreshPastureSlot(ui.activeGreenhouseBuildingSlotId);
    refreshGreenhouseDialog(ui);
  }
}

function handleGreenhouseSlotUnlock(ui: any, slotId: number) {
  const land = LandSystem.getInstance();
  if (land.isGreenhouseSlotUnlocked(slotId)) return;
  const cost = land.getGreenhouseSlotUnlockCost(slotId);
  ui.showDialog(
    "解锁温室花盆",
    `消耗 ${cost} 金币解锁这个花盆位置`,
    [
      { text: "稍后", image: "btnGreenhouseUnlockLater", cb: () => {} },
      {
        text: "解锁",
        image: "btnGreenhouseUnlockConfirm",
        cb: () => {
          const gm = GameManager.getInstance();
          if (!gm.spendGold(cost)) {
            ui.toast("金币不足");
            return;
          }
          if (!land.unlockGreenhouseSlot(slotId)) {
            gm.addGold(cost);
            ui.toast("请先解锁前一个花盆");
            return;
          }
          ui.refreshTopBar();
          refreshGreenhouseDialog(ui);
          refreshPlantRoomFillerLayer(
            ui,
            ui.dialogRoot.getChildByName("GreenhouseDialog"),
            "greenhouse",
            ui.activeGreenhouseBuildingSlotId,
          );
          ui.toast("温室花盆已解锁");
        },
      },
    ],
    true,
    true,
  );
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
  if (!dialog) return;
  // The current image-led greenhouse has no legacy content node. Refresh only
  // its filler layer when a plant crosses a stage or state boundary.
  const fillerLayer = dialog.getChildByName("InteriorFillerLayer");
  if (!content) {
    const blocks = LandSystem.getInstance().getGreenhouseBlocksForBuilding(
      ui.activeGreenhouseBuildingSlotId,
    );
    const needsRefresh = blocks.some((block, index) => {
      const visible = fillerLayer?.getChildByName(`GreenhousePotCrop_${block.id}`);
      const expected = block.cropType ? getCropVisualId(block) : "";
      return expected
        ? !visible || (visible as any).__greenhouseVisualId !== expected
        : !!visible;
    });
    if (needsRefresh) {
      refreshPlantRoomFillerLayer(
        ui,
        dialog,
        "greenhouse",
        ui.activeGreenhouseBuildingSlotId,
      );
    }
    return;
  }
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
