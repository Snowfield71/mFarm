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
import { showCropMaturityDialog } from "../farm/MainUICropSpeedUp";
import { formatCountdown } from "../farm/MainUILandView";
import { openLivestockDialog } from "./MainUILivestockRooms";
import { openGreenhouseDialog, renderInteriorFillerLayer } from "./MainUIPlantRooms";
import { BEEHIVE_FEED_CARD_WIDTH, BEEHIVE_FEED_GAP, BEEHIVE_FEED_ICONS, BEEHIVE_FEED_PANEL_WIDTH, BEEHIVE_FEED_VIEWPORT_WIDTH, BEEHIVE_SLOT_NAMES, FLOWER_HOUSE_FLOWERS, FLOWER_HOUSE_GROWTH_ICONS, FLOWER_HOUSE_SEED_ICONS, createFlowerHouseSeedShelf, createFlowerOptionScroller, drawBeehiveCardProgress, drawBeehiveFeedCard, getBeehiveFeedLayout, getBeehiveHoneyIconKey, productionRatio, rebuildBeehiveSceneControls, rebuildFlowerHouseSceneControls, refreshVisibleBeehiveHarvestAnimations, setFlowerHarvestAnimation, updateSceneInteractionBadge } from "./MainUIRoomControls";
import { FARM_BUILDING_CONTENT_HEIGHT, FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_Y, FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE, FARM_BUILDING_DIALOG_HEIGHT, FARM_BUILDING_DIALOG_TITLE_X, FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_X, FARM_BUILDING_FLOWER_ROW_Y, FARM_BUILDING_HIVE_ROW_Y, FARM_BUILDING_OPTION_ROW_Y, FARM_BUILDING_TITLE_SHADOW_Y, FARM_BUILDING_TITLE_TEXT_Y, PRODUCTION_SCENES, SHOW_LEGACY_INTERIOR_CONTENT, attachSceneCloseArt, isLivestockBuilding, isProductionSceneBuilding } from "../farm/MainUILandShared";



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


export function closeProductionSceneDialog(ui: any) {
  const dialog = ui.dialogRoot.getChildByName("ProductionSceneDialog");
  if (!dialog || (dialog as any).__closing) return;
  const closingBuildingSlotId = ui.activeProductionBuildingSlotId;
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
      if (closingBuildingSlotId >= 0) ui.refreshPastureSlot(closingBuildingSlotId);
    })
    .start();
}


export function openProductionSceneDialog(ui: any, buildingSlotId: number) {
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
  dialog.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
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
  background.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  ui.applyUiIcon(scene.background, background);
  dialog.addChild(background);
  renderInteriorFillerLayer(ui, dialog, slot.buildingId, buildingSlotId);
  if (slot.buildingId === "garden") createFlowerHouseSeedShelf(ui, dialog);

  const titleRoot = new Node("ProductionSceneTitle");
  titleRoot.addComponent(UITransform).setContentSize(226, 48);
  titleRoot.setPosition(FARM_BUILDING_DIALOG_TITLE_X, scene.titleY);
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
    content.addComponent(UITransform).setContentSize(FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_HEIGHT);
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


export function drawProductionSceneProgress(root: Node, ratio: number) {
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


export function renderProductionSceneContent(
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


export function renderBeehiveContent(ui: any, content: Node, buildingSlotId: number) {
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


export function animateBeehiveFeedRemoval(ui: any, content: Node, flowerId: string) {
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
export function playProductionStartAnimation(visual: Node | null | undefined) {
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


export function updateBeehiveDynamicContent(
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
export function updateBeehiveCardDynamicContent(
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


export function drawFlowerHouseCardProgress(progress: Node, production: any) {
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


export function flowerHouseGrowthIconKey(flowerId: string, production: any): string {
  const stages = FLOWER_HOUSE_GROWTH_ICONS[flowerId];
  if (!stages) return FLOWER_HOUSE_SEED_ICONS[flowerId] || "flowerSeedFlower";
  const ratio = productionRatio(production);
  return stages[ratio >= 2 / 3 ? 2 : ratio >= 1 / 3 ? 1 : 0];
}


export function createFlowerHouseIcon(ui: any, flowerId: string, production: any) {
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


export function createEmptyFlowerHouseSlot(ui: any) {
  const empty = new Node("EmptyFlowerSlot");
  empty.addComponent(UITransform).setContentSize(38, 38);
  empty.setPosition(0, 4);
  fillRoundRect(empty, 36, 36, 11, new Color(243, 223, 179, 120));
  empty.addChild(
    ui.makeLabel("+", 26, new Color(178, 118, 55), true, 0, 1, 36, 36),
  );
  return empty;
}


export function syncFlowerHouseCardVisual(
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


export function updateFlowerHouseDynamicContent(
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


export function renderFlowerHouseContent(
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


export function openBeehiveSpeedUpDialog(
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


export function collectBeehiveSlot(
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


export function openFlowerHouseSpeedUpDialog(
  ui: any,
  content: Node,
  buildingSlotId: number,
  flowerSlotId: number,
  production: any,
) {
  const land = LandSystem.getInstance();
  showCropMaturityDialog(ui, {
    title: "花卉加速",
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
    refresh: () =>
      updateFlowerHouseDynamicContent(ui, content, buildingSlotId),
    successText: "鲜花已成熟",
    preserveExisting: true,
  });
}


export function collectFlowerHouseSlot(
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
  if (!animated)
    ui.toast(`收获 ${ui.itemName(product.itemId)} x${product.count}`);
}


export function collectProductionSceneProduct(
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
