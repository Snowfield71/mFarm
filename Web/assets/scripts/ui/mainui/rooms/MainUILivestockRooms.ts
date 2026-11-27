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
import { renderInteriorFillerLayer } from "./MainUIPlantRooms";
import { mountBarnRoom, playBarnFeedFlight, refreshBarnRoom } from "./MainUIBarnRoom";
import { createFlowerOptionScroller, createSceneInteractionBadge, productionRatio, updateSceneInteractionBadge } from "./MainUIRoomControls";
import { FARM_BUILDING_CHICKEN_ROW_Y, FARM_BUILDING_CONTENT_HEIGHT, FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_Y, FARM_BUILDING_DIALOG_CLOSE_HIT_SIZE, FARM_BUILDING_DIALOG_HEIGHT, FARM_BUILDING_DIALOG_TITLE_X, FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_X, FARM_BUILDING_OPTION_ROW_Y, FARM_BUILDING_TITLE_SHADOW_Y, FARM_BUILDING_TITLE_TEXT_Y, LIVESTOCK_FEEDS, LIVESTOCK_SCENES, SHOW_LEGACY_INTERIOR_CONTENT, attachSceneCloseArt, isLivestockBuilding } from "../farm/MainUILandShared";



export function closeLivestockDialog(ui: any) {
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


export function openLivestockDialog(ui: any, buildingSlotId: number) {
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
  dialog.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
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
  background.addComponent(UITransform).setContentSize(FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  background.setPosition(0, 0);
  ui.applyUiIcon(scene.background, background);
  dialog.addChild(background);
  // Barn cows are selected directly in the scene and controlled by one shared
  // bottom panel, so the legacy four generic action cards are omitted there.
  if (slot.buildingId !== "barn") {
    renderInteriorFillerLayer(ui, dialog, slot.buildingId, buildingSlotId);
  }

  const titleRoot = new Node("LivestockTitle");
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
    closeLivestockDialog(ui);
  });
  dialog.addChild(close);

  if (slot.buildingId === "barn") {
    mountBarnRoom(ui, dialog, buildingSlotId, (cowId, cowName) =>
      openChickenFeedDialog(ui, dialog, buildingSlotId, cowId, cowName),
    );
  } else if (SHOW_LEGACY_INTERIOR_CONTENT) {
    const content = new Node("LivestockDialogContent");
    content.addComponent(UITransform).setContentSize(FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_HEIGHT);
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


export function renderLivestockDialogContent(ui: any, content: Node) {
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
    if (productionSlot.unlocked && slot.buildingId !== "barn") {
      const sceneArt = new Node(`LivestockSceneArt_${productionSlot.id}`);
      const eggCount = Math.max(
        0,
        Math.min(5, Number(production?.producedCount || 0)),
      );
      sceneArt.addComponent(UITransform).setContentSize(92, 92);
      sceneArt.setPosition(area.x, area.y + 7);
      (sceneArt as any).__chickenEggCount = eggCount;
      ui.applyUiIcon(`chickenSceneNest${eggCount}`, sceneArt);
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
        // A barn cow click only changes selection. Milking is an explicit
        // operation in the bottom panel, matching the reference interaction.
        if (current?.ready && slot.buildingId !== "barn") {
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
    if (slot.buildingId !== "barn") createSceneInteractionBadge(ui, content, {
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


export function renderChickenFeedPanel(
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


export function updateChickenSlotSelection(
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


export function drawChickenEggProgress(progress: Node, production: any) {
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


export function openChickenFeedDialog(
  ui: any,
  content: Node,
  buildingSlotId: number,
  livestockSlotId: number,
  animalName = "小鸡",
) {
  if (ui.dialogRoot.getChildByName("DialogOverlay")) return;
  const barnDialog: Node | null = ui.dialogRoot.getChildByName("LivestockDialog");
  let confirming = false;
  let foodOrigin: Vec3 | undefined;
  const feedIcons = new Map<string, Node>();
  const feedButtonWidth = 106;
  const feedButtonHeight = 50;
  const inventory = InventorySystem.getInstance();
  const availableFeeds = LIVESTOCK_FEEDS.filter(
    (feed) => inventory.getItemCount(feed.itemId) > 0,
  );
  let selectedFeedId = availableFeeds[0]?.itemId || "";
  const feedDialogTitle = `选择${animalName}饲料`;
  ui.showDialog(
    feedDialogTitle,
    availableFeeds.length > 0 ? "选择一种背包内现有农作物" : "背包暂无可用饲料",
    [
      {
        text: "稍后",
        imageWidth: feedButtonWidth,
        imageHeight: feedButtonHeight,
        compactGap: 14,
        image: "barnFeedLaterGray",
        cb: () => {},
      },
      {
        text: "喂养",
        imageWidth: feedButtonWidth,
        imageHeight: feedButtonHeight,
        image: "barnFeedConfirmGreen",
        cb: () => {
          if (confirming) return;
          confirming = true;
          if (!selectedFeedId) {
            ui.toast("背包暂无可用饲料");
            return;
          }
          if (barnDialog && (ui.dialogRoot.getChildByName("LivestockDialog") !== barnDialog ||
            !barnDialog.isValid || (barnDialog as any).__closing ||
            ui.activeLivestockBuildingSlotId !== buildingSlotId)) return;
          (content as any).__selectedLivestockSlotId = livestockSlotId;
          const seconds = feedLivestockProduction(ui, buildingSlotId, livestockSlotId, selectedFeedId);
          if (seconds > 0 && barnDialog) {
            playBarnFeedFlight(barnDialog, buildingSlotId, livestockSlotId, selectedFeedId, foodOrigin);
          }
        },
      },
    ],
    true,
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
    .find((child) => child.getComponent(Label)?.string === feedDialogTitle)
    ?.setPosition(0, 86);
  popup.getChildByName("DialogMessage")?.setPosition(0, 54);
  // Both PNGs already contain their labels. Move only the raster and matching hit area.
  [0, 1].forEach((index) => {
    const x = index === 0 ? -60 : 60;
    popup.getChildByName(`ButtonArt_${index}`)?.setPosition(x, -80);
    popup.getChildByName(`Button_${index}`)?.setPosition(x, -80);
  });

  const viewport = new Node("ChickenFeedViewport");
  viewport.addComponent(UITransform).setContentSize(248, 82);
  viewport.setPosition(0, -5);
  viewport.addComponent(Mask);
  popup.addChild(viewport);
  const confirm = popup.getChildByName("Button_1");
  confirm?.on(Node.EventType.TOUCH_END, () => {
    const icon = feedIcons.get(selectedFeedId);
    const transform = viewport.getComponent(UITransform)!;
    if (icon?.isValid) {
      const world = icon.worldPosition.clone();
      const point = transform.convertToNodeSpaceAR(world);
      if (Math.abs(point.x) <= transform.width / 2 && Math.abs(point.y) <= transform.height / 2) {
        foodOrigin = world;
        return;
      }
    }
    foodOrigin = confirm.worldPosition.clone();
  });

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
    const icon: Node = ui.createItemIcon(feed.itemId, 35);
    feedIcons.set(feed.itemId, icon);
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


export function requestLivestockSlotUnlock(
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


export function feedLivestockProduction(
  ui: any,
  buildingSlotId: number,
  livestockSlotId: number,
  feedItemId: string,
): number {
  const land = LandSystem.getInstance();
  const production = land.getLivestockSlotProduction(
    buildingSlotId,
    livestockSlotId,
  );
  if (!production || production.ready) {
    ui.toast("当前产物已经可以收获");
    return 0;
  }
  if ((production.feedCount || 0) >= 3) {
    ui.toast("本轮最多投喂 3 次，请等待牛奶成熟");
    return 0;
  }
  const inventory = InventorySystem.getInstance();
  if (!inventory.hasItems(feedItemId, 1)) {
    ui.toast(`${ui.itemName(feedItemId)}不足`);
    return 0;
  }
  if (!inventory.removeItem(feedItemId, 1)) return 0;
  const seconds = land.feedLivestockSlot(
    buildingSlotId,
    livestockSlotId,
    feedItemId,
  );
  if (seconds <= 0) {
    inventory.addItem(feedItemId, 1);
    return 0;
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
  return seconds;
}


export function collectLivestockProduct(
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
  if (dialog && refreshBarnRoom(dialog)) return;
  const content = dialog?.getChildByName("LivestockDialogContent");
  if (content) renderLivestockDialogContent(ui, content);
}


export function updateLivestockDialogProgress(ui: any) {
  if (!ui.dialogRoot?.active || ui.activeLivestockBuildingSlotId < 0) return;
  const dialog = ui.dialogRoot.getChildByName("LivestockDialog");
  const now = Date.now();
  if (dialog && (dialog as any).__livestockBuildingId === "barn") {
    if (now - Number((dialog as any).__barnLastRefresh || 0) >= 500) {
      (dialog as any).__barnLastRefresh = now;
      refreshBarnRoom(dialog);
    }
    return;
  }
  const content = dialog?.getChildByName("LivestockDialogContent");
  if (!content) return;
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
