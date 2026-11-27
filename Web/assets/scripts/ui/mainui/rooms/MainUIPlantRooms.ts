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
  ENFORCE_GREENHOUSE_OFF_SEASON_ONLY,
  getSeasonInfo,
  isSeasonAllowed,
} from "../../../config/SeasonConfig";
import { animateItemToInventory } from "../shared/MainUIRewardAnimation";
import { showCropMaturityDialog } from "../farm/MainUICropSpeedUp";
import { addInteriorFillerIcon, renderInteriorActionFillers } from "./MainUIInteriorFillers";
import { playDemolitionAnimation } from "../farm/MainUILandActions";
import { getCropVisualId, playPlantingVisualAnimation } from "../farm/MainUILandView";
import { collectFlowerHouseSlot, flowerHouseGrowthIconKey } from "./MainUIProductionRooms";
import { FLOWER_HOUSE_FLOWERS, drawGreenhouseSeedCountBand } from "./MainUIRoomControls";
import { FARM_BUILDING_CONTENT_HEIGHT, FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_Y, FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE, FARM_BUILDING_DIALOG_HEIGHT, FARM_BUILDING_DIALOG_TITLE_X, FARM_BUILDING_DIALOG_TITLE_Y, FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_X, FARM_BUILDING_GREENHOUSE_CLOSE, FARM_BUILDING_SOURCE_HEIGHT, FARM_BUILDING_SOURCE_WIDTH, FARM_BUILDING_TITLE_SHADOW_Y, FARM_BUILDING_TITLE_TEXT_Y, GREENHOUSE_SEED_PANEL_CENTER_Y, InteriorFillerScene, SHOW_LEGACY_INTERIOR_CONTENT, attachSceneCloseArt, interiorCloseCenterToDialog, interiorSourceXToDialog, interiorSourceYToDialog } from "../farm/MainUILandShared";



export function renderPlantRoomFillers(
  ui: any,
  layer: Node,
  scene: "garden" | "greenhouse",
  buildingSlotId: number,
  onlySlotIndex?: number,
) {
  const isFlowerhouse = scene === "garden";
  const land = LandSystem.getInstance();
  const flowerSlots = isFlowerhouse ? land.getFlowerHouseSlots(buildingSlotId) : [];
  const greenhouseSlots = !isFlowerhouse
    ? land.getGreenhouseBlocksForBuilding(buildingSlotId)
    : [];
  type PlantRoomPlacement = {
    x: number;
    centerY: number;
    potCenterY: number;
    markerWidth: number;
    markerHeight: number;
    potWidth: number;
    potHeight: number;
    growthSize: number;
    rotation: number;
  };
  // Measured from the *inside* of each dark reserved bed in the normalized
  // 752 x 1359 interiors. Plus artwork stays fully inset from the frame. Pots
  // retain their established display size and rise above shallow rear beds,
  // while their visible lower edge remains inside the bed instead of crossing
  // its gold/green border.
  const sourcePlacements: PlantRoomPlacement[] = isFlowerhouse
    ? [
        { x: 228, centerY: 595, potCenterY: 571, markerWidth: 78, markerHeight: 24, potWidth: 100, potHeight: 72, growthSize: 130, rotation: 0 },
        { x: 372, centerY: 595, potCenterY: 571, markerWidth: 82, markerHeight: 26, potWidth: 100, potHeight: 72, growthSize: 130, rotation: 0 },
        { x: 515, centerY: 595, potCenterY: 571, markerWidth: 78, markerHeight: 24, potWidth: 100, potHeight: 72, growthSize: 130, rotation: 0 },
        { x: 177, centerY: 748, potCenterY: 738, markerWidth: 104, markerHeight: 32, potWidth: 88, potHeight: 64, growthSize: 114, rotation: 0 },
        { x: 139, centerY: 864, potCenterY: 861, markerWidth: 116, markerHeight: 40, potWidth: 100, potHeight: 72, growthSize: 130, rotation: 0 },
        { x: 372, centerY: 864, potCenterY: 862, markerWidth: 100, markerHeight: 38, potWidth: 100, potHeight: 72, growthSize: 130, rotation: 0 },
        { x: 564, centerY: 748, potCenterY: 738, markerWidth: 104, markerHeight: 32, potWidth: 88, potHeight: 64, growthSize: 114, rotation: 0 },
        { x: 602, centerY: 864, potCenterY: 861, markerWidth: 116, markerHeight: 40, potWidth: 100, potHeight: 72, growthSize: 130, rotation: 0 },
      ]
    : [
        { x: 233, centerY: 649, potCenterY: 629, markerWidth: 88, markerHeight: 28, potWidth: 100, potHeight: 72, growthSize: 128, rotation: 0 },
        { x: 375, centerY: 649, potCenterY: 629, markerWidth: 84, markerHeight: 28, potWidth: 100, potHeight: 72, growthSize: 128, rotation: 0 },
        { x: 513, centerY: 649, potCenterY: 629, markerWidth: 84, markerHeight: 26, potWidth: 100, potHeight: 72, growthSize: 128, rotation: 0 },
        { x: 189, centerY: 815, potCenterY: 820, markerWidth: 120, markerHeight: 42, potWidth: 100, potHeight: 72, growthSize: 128, rotation: 0 },
        { x: 371, centerY: 815, potCenterY: 820, markerWidth: 102, markerHeight: 40, potWidth: 100, potHeight: 72, growthSize: 128, rotation: 0 },
        { x: 558, centerY: 815, potCenterY: 820, markerWidth: 116, markerHeight: 42, potWidth: 100, potHeight: 72, growthSize: 128, rotation: 0 },
      ];
  const slots: any[] = isFlowerhouse ? flowerSlots : greenhouseSlots;
  sourcePlacements.forEach((placement, index) => {
    if (onlySlotIndex !== undefined && index !== onlySlotIndex) return;
    const unlocked = isFlowerhouse
      ? !!slots[index]?.unlocked
      : !!slots[index]?.greenhouseUnlocked;
    const isPot = unlocked;
    const renderSourceWidth = isPot ? placement.potWidth : placement.markerWidth;
    const renderSourceHeight = isPot ? placement.potHeight : placement.markerHeight;
    // Pot, locked filler and their hit target all share the recess's exact
    // geometric center. This keeps both horizontal and vertical alignment
    // stable when the artwork changes between locked and unlocked states.
    const renderSourceY = isPot ? placement.potCenterY : placement.centerY;
    const recessRotation = placement.rotation;
    // All flower and seasonal crop stage canvases are 512 px tall and share a
    // visible bottom at y=480. Align that visible bottom with the centre of the
    // pot's painted soil opening (y=102 inside its 175 px visible-alpha box),
    // so stages 1/2/3 use one contact line instead of appearing to float.
    const potSoilContactY =
      placement.potCenterY + placement.potHeight * (102 - 127.5) / 175;
    const growthSourceY =
      potSoilContactY - placement.growthSize * (480 - 256) / 512;
    // Lift both room types by three dialog pixels: the visible stage bottom now
    // sits in the vertical middle of the painted soil instead of on its rim.
    const growthDialogY = interiorSourceYToDialog(growthSourceY) + 3;
    // Pot footprints preserve the 213:175 visible-art ratio while using the
    // same calibrated display box in the top and front rows.
    // Standalone 256px assets include transparent padding. Compensate from the
    // measured alpha bounds so the visible art retains the calibrated footprint
    // used by the former baked overlay (pot 213x175, plus marker 218x220).
    const alphaWidth = isPot ? 213 : 218;
    const alphaHeight = isPot ? 175 : 220;
    const node = addInteriorFillerIcon(
      ui, layer, `PlantRoomSlot_${index}`,
      unlocked ? (isFlowerhouse ? "sceneFlowerhousePot" : "sceneGreenhousePot")
        : (isFlowerhouse ? "sceneFlowerhouseSlotPlus" : "sceneGreenhouseSlotPlus"),
      interiorSourceXToDialog(placement.x),
      interiorSourceYToDialog(renderSourceY),
      renderSourceWidth * 256 / alphaWidth * FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH,
      renderSourceHeight * 256 / alphaHeight * FARM_BUILDING_DIALOG_HEIGHT / FARM_BUILDING_SOURCE_HEIGHT,
      recessRotation,
    );
    if (unlocked) {
      if (isFlowerhouse) {
        const flowerSlot = slots[index];
        const production = land.getFlowerHouseSlotProduction(buildingSlotId, index);
        if (flowerSlot?.flowerId) {
          // Each perspective row supplies its own growth size and centre. The
          // visible plant baseline lands in the matching pot opening while the
          // plant remains horizontally centred on that pot.
          const growth = addInteriorFillerIcon(
            ui,
            layer,
            `FlowerHousePotGrowth_${index}`,
            flowerHouseGrowthIconKey(flowerSlot.flowerId, production),
            interiorSourceXToDialog(placement.x),
            growthDialogY,
            placement.growthSize * FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH,
            placement.growthSize * FARM_BUILDING_DIALOG_HEIGHT / FARM_BUILDING_SOURCE_HEIGHT,
            recessRotation,
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
          const cropDisplaySize =
            placement.growthSize * FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH;
          const crop = ui.createItemIcon(getCropVisualId(greenhouseBlock), cropDisplaySize);
          crop.name = `GreenhousePotCrop_${greenhouseBlock.id}`;
          (crop as any).__greenhouseVisualId = getCropVisualId(greenhouseBlock);
          crop.setPosition(
            interiorSourceXToDialog(placement.x),
            growthDialogY,
          );
          crop.setRotationFromEuler(0, 0, recessRotation);
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
        // The complete pot is the back layer. Repaint only its front rim/body
        // above the crop so broad plants stay in front of the soil/back rim
        // while their grounded base is tucked naturally inside the pot.
        addInteriorFillerIcon(
          ui,
          layer,
          `GreenhousePotFront_${greenhouseBlock?.id ?? index}`,
          "sceneGreenhousePotFront",
          interiorSourceXToDialog(placement.x),
          interiorSourceYToDialog(renderSourceY),
          renderSourceWidth * 256 / alphaWidth * FARM_BUILDING_DIALOG_WIDTH / FARM_BUILDING_SOURCE_WIDTH,
          renderSourceHeight * 256 / alphaHeight * FARM_BUILDING_DIALOG_HEIGHT / FARM_BUILDING_SOURCE_HEIGHT,
          recessRotation,
        );
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


export function plantSelectedFlowerInPot(
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
      refreshPlantRoomSlot(
        ui,
        ui.dialogRoot.getChildByName("ProductionSceneDialog"),
        "garden",
        buildingSlotId,
        flowerSlotId,
      );
      return;
    }
    showCropMaturityDialog(ui, {
      title: "加速成熟",
      progress: () => {
        const current = land.getFlowerHouseSlotProduction(
          buildingSlotId,
          flowerSlotId,
        );
        const ratio = current
          ? Math.max(0, Math.min(1, 1 - current.remaining / current.duration))
          : 0;
        return ratio * 100;
      },
      complete: () =>
        land.finishFlowerHouseSlot(buildingSlotId, flowerSlotId),
      refresh: () => {
        refreshPlantRoomSlot(
          ui,
          ui.dialogRoot.getChildByName("ProductionSceneDialog"),
          "garden",
          buildingSlotId,
          flowerSlotId,
        );
      },
      successText: "鲜花已成熟",
      preserveExisting: true,
    });
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
      refreshPlantRoomSlot(
        ui,
        ui.dialogRoot.getChildByName("ProductionSceneDialog"),
        "garden",
        buildingSlotId,
        flowerSlotId,
      );
    })
    .start();
  ui.toast(`已种下${ui.itemName(selected)}`);
}


export function refreshGreenhouseScene(ui: any, buildingSlotId: number) {
  const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
  if (!dialog?.isValid) return;
  refreshPlantRoomFillerLayer(ui, dialog, "greenhouse", buildingSlotId);
  dialog.getChildByName("GreenhouseSeedViewport")?.destroy();
  createGreenhouseSeedStrip(ui, dialog, GREENHOUSE_SEED_PANEL_CENTER_Y);
}


function refreshGreenhouseSeedStrip(ui: any, dialog: Node) {
  const previous = dialog.getChildByName("GreenhouseSeedViewport");
  const previousScroll = previous?.getComponent(ScrollView);
  const previousOffset = previousScroll?.getScrollOffset().clone();
  if (previous) {
    previous.removeFromParent();
    previous.destroy();
  }
  createGreenhouseSeedStrip(ui, dialog, GREENHOUSE_SEED_PANEL_CENTER_Y);
  const nextScroll = dialog
    .getChildByName("GreenhouseSeedViewport")
    ?.getComponent(ScrollView);
  if (previousOffset && nextScroll) nextScroll.scrollToOffset(previousOffset, 0);
}


function updateGreenhouseSeedStrip(ui: any, dialog: Node, changedSeedId: string) {
  const viewport = dialog.getChildByName("GreenhouseSeedViewport");
  const strip = viewport?.getChildByName("GreenhouseSeedContent");
  if (!viewport?.isValid || !strip?.isValid) return;

  const availableSeeds = getAvailableGreenhouseSeeds();
  const expectedNames = availableSeeds.map((seed) => `GreenhouseSeed_${seed.id}`);
  const currentNames = strip.children.map((child) => child.name);
  const structureChanged =
    expectedNames.length !== currentNames.length ||
    expectedNames.some((name, index) => currentNames[index] !== name);
  if (structureChanged) {
    // The consumed stack disappeared (or the available set otherwise changed),
    // so rebuild only the lower seed viewport. The room scene stays untouched.
    refreshGreenhouseSeedStrip(ui, dialog);
    return;
  }

  strip.children.forEach((child) => {
    const seedId = child.name.slice("GreenhouseSeed_".length);
    const active = seedId === ui.greenhouseSelectedSeedId;
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
    const count = child.getChildByName("GreenhouseSeedCount")?.getComponent(Label);
    if (count && (seedId === changedSeedId || active)) {
      count.string = `x${InventorySystem.getInstance().getItemCount(seedId)}`;
    }
  });
}


export function handleGreenhouseScenePotClick(
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
      ui.toast(
        ENFORCE_GREENHOUSE_OFF_SEASON_ONLY
          ? "请先选择底部的非当季种子"
          : "请先选择底部种子",
      );
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
      .call(() => {
        const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
        refreshPlantRoomSlot(
          ui,
          dialog,
          "greenhouse",
          buildingSlotId,
          greenhouseSlotId,
        );
        if (dialog?.isValid) updateGreenhouseSeedStrip(ui, dialog, seedId);
      })
      .start();
    ui.toast(`已种下${ui.itemName(seedId)}`);
    return;
  }
  if (block.state === "growing") {
    showCropMaturityDialog(ui, {
      title: "加速成熟",
      progress: () =>
        land.getGreenhouseBlock(greenhouseSlotId)?.progress || 0,
      complete: () => land.speedUpGreenhouseCrop(greenhouseSlotId),
      refresh: () => {
        ui.refreshPastureSlot(buildingSlotId);
        refreshPlantRoomSlot(
          ui,
          ui.dialogRoot.getChildByName("GreenhouseDialog"),
          "greenhouse",
          buildingSlotId,
          greenhouseSlotId,
        );
      },
      successText: "作物已成熟",
      preserveExisting: true,
    });
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
    refreshPlantRoomSlot(
      ui,
      ui.dialogRoot.getChildByName("GreenhouseDialog"),
      "greenhouse",
      buildingSlotId,
      greenhouseSlotId,
    );
    if (!animated) ui.toast(`收获 ${ui.itemName(cropId)} x${count}`);
  }
}


export function renderInteriorFillerLayer(
  ui: any,
  dialog: Node,
  scene: InteriorFillerScene,
  buildingSlotId = -1,
) {
  const layer = new Node("InteriorFillerLayer");
  layer.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  dialog.addChild(layer);
  if (scene === "garden" || scene === "greenhouse") {
    renderPlantRoomFillers(ui, layer, scene, buildingSlotId);
  } else {
    renderInteriorActionFillers(ui, layer, scene, buildingSlotId);
  }
}


export function refreshPlantRoomFillerLayer(
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


export function refreshPlantRoomSlot(
  ui: any,
  dialog: Node | null | undefined,
  scene: "garden" | "greenhouse",
  buildingSlotId: number,
  roomSlotId: number,
) {
  if (!dialog?.isValid) return;
  const layer = dialog.getChildByName("InteriorFillerLayer");
  if (!layer?.isValid) return;

  const slotIndex = scene === "garden"
    ? roomSlotId
    : LandSystem.getInstance()
        .getGreenhouseBlocksForBuilding(buildingSlotId)
        .findIndex((block) => block.id === roomSlotId);
  if (slotIndex < 0) return;

  const targetNames = new Set([
    `PlantRoomSlot_${slotIndex}`,
    scene === "garden"
      ? `FlowerHousePotGrowth_${slotIndex}`
      : `GreenhousePotCrop_${roomSlotId}`,
  ]);
  if (scene === "greenhouse") {
    targetNames.add(`GreenhousePotFront_${roomSlotId}`);
  }
  const previousNodes = layer.children.filter((child) => targetNames.has(child.name));
  const insertionIndex = previousNodes.length > 0
    ? Math.min(...previousNodes.map((child) => child.getSiblingIndex()))
    : layer.children.length;

  // Render only the requested slot into a detached staging node, then move its
  // pot and plant into the live room. Building every other slot here still
  // invalidated the scene graph even though those temporary nodes were never
  // inserted, which made planting look like a full-room redraw.
  const staging = new Node("PlantRoomSlotStaging");
  renderPlantRoomFillers(ui, staging, scene, buildingSlotId, slotIndex);
  const replacementNodes = [...staging.children].filter((child) =>
    targetNames.has(child.name),
  );

  previousNodes.forEach((child) => {
    child.removeFromParent();
    child.destroy();
  });
  replacementNodes.forEach((child, offset) => {
    child.removeFromParent();
    layer.addChild(child);
    child.setSiblingIndex(Math.min(insertionIndex + offset, layer.children.length - 1));
  });
  staging.destroy();
}


export function handleFlowerHouseSlotUnlock(
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


export function closeGreenhouseDialog(ui: any) {
  const dialog = ui.dialogRoot.getChildByName("GreenhouseDialog");
  if (!dialog || (dialog as any).__closing) return;
  const closingBuildingSlotId = ui.activeGreenhouseBuildingSlotId;
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
      if (closingBuildingSlotId >= 0) ui.refreshPastureSlot(closingBuildingSlotId);
    })
    .start();
}


export function openGreenhouseDialog(ui: any, buildingSlotId: number) {
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
  dialog.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
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
  background.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  ui.applyUiIcon("greenhouseDialogBg", background);
  dialog.addChild(background);
  renderInteriorFillerLayer(ui, dialog, "greenhouse", buildingSlotId);
  // The legacy content layer is disabled for image-led interiors, so mount the
  // off-season seed scroller directly in the background's lower reserved panel.
  createGreenhouseSeedStrip(ui, dialog, GREENHOUSE_SEED_PANEL_CENTER_Y);

  const titleRoot = new Node("GreenhouseTitle");
  titleRoot.addComponent(UITransform).setContentSize(226, 48);
  titleRoot.setPosition(FARM_BUILDING_DIALOG_TITLE_X, FARM_BUILDING_DIALOG_TITLE_Y);
  const titleShadow = ui.makeLabel(
    "恒温温室",
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
  close.setPosition(
    FARM_BUILDING_GREENHOUSE_CLOSE.x,
    FARM_BUILDING_GREENHOUSE_CLOSE.y,
  );
  attachSceneCloseArt(close);
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    closeGreenhouseDialog(ui);
  });
  dialog.addChild(close);

  if (SHOW_LEGACY_INTERIOR_CONTENT) {
    const content = new Node("GreenhouseDialogContent");
    content.addComponent(UITransform).setContentSize(FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_HEIGHT);
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


export function renderGreenhouseDialogContent(ui: any, content: Node) {
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
      ENFORCE_GREENHOUSE_OFF_SEASON_ONLY
        ? "选择非当季种子后点击空花盆"
        : "选择种子后点击空花盆",
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


export function getAvailableGreenhouseSeeds(): ItemDef[] {
  return getPlantableCrops().filter(
    (seed) =>
      seed.unlockLevel <= GameManager.getInstance().playerLevel &&
      InventorySystem.getInstance().hasItems(seed.id, 1) &&
      (!ENFORCE_GREENHOUSE_OFF_SEASON_ONLY ||
        !isSeasonAllowed(seed.seasons)),
  );
}


export function createGreenhouseShovelButton(ui: any, parent: Node) {
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


export function createGreenhouseHarvestAllButton(ui: any, parent: Node) {
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


export function harvestAllGreenhouseCrops(ui: any) {
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


export function createGreenhouseSeedStrip(ui: any, parent: Node, y: number) {
  const seeds = getAvailableGreenhouseSeeds();
  const viewport = new Node("GreenhouseSeedViewport");
  viewport.addComponent(UITransform).setContentSize(278, 98);
  viewport.setPosition(0, y);
  viewport.addComponent(Mask);
  parent.addChild(viewport);
  if (seeds.length === 0) {
    const emptyLabel = ui.makeLabel(
      ENFORCE_GREENHOUSE_OFF_SEASON_ONLY
        ? "背包中没有可用的非当季种子"
        : "背包中没有可用种子",
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
  const occupiedW = seeds.length * cellW + Math.max(0, seeds.length - 1) * gap;
  const contentW = Math.max(278, occupiedW);
  const strip = new Node("GreenhouseSeedContent");
  strip.addComponent(UITransform).setContentSize(contentW, 98);
  viewport.addChild(strip);
  // Match the flower-house strip: viewport padding must be symmetric when the
  // available seed cards do not fill the whole 278px reserved area.
  const startX = -occupiedW / 2 + cellW / 2;
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
    const countLabel = ui.makeLabel(
      `x${InventorySystem.getInstance().getItemCount(seed.id)}`,
      8,
      new Color(102, 60, 30),
      true,
      0,
      -34,
      52,
      14,
    );
    countLabel.name = "GreenhouseSeedCount";
    cell.addChild(countLabel);
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


export function handleGreenhouseSlotClick(ui: any, slotId: number) {
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
    showCropMaturityDialog(ui, {
      title: "加速成熟",
      progress: () => land.getGreenhouseBlock(slotId)?.progress || 0,
      complete: () => land.speedUpGreenhouseCrop(slotId),
      refresh: () => refreshGreenhouseDialog(ui),
      successText: "作物已成熟",
      preserveExisting: true,
    });
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


export function handleGreenhouseSlotUnlock(ui: any, slotId: number) {
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
