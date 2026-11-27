/** Extracted from MainUIPanels.ts; preserves the original UI behavior. */
import {
  Button,
  Color,
  Graphics,
  Label,
  LabelOutline,
  Mask,
  Node,
  ScrollView,
  UIOpacity,
  UITransform,
  Vec2,
  Vec3,
  Tween,
  tween,
  view,
} from "cc";
import { Design, GameValues } from "../../../config/GameConfig";
import { GameManager } from "../../../core/GameManager";
import { InventorySystem } from "../../../systems/InventorySystem";
import { LandSystem } from "../../../systems/LandSystem";
import { CraftSystem } from "../../../systems/CraftSystem";
import {
  getItem,
  getPlantableCrops,
  ITEM_DB,
  ItemCategory,
  ItemDef,
} from "../../../config/ItemConfig";
import { getAllRecipes, getRecipe, RecipeDef } from "../../../config/RecipeConfig";
import { isSeasonAllowed } from "../../../config/SeasonConfig";
import {
  bindTaskStylePressFeedback,
  drawCatalogStyleProgress,
  fillRoundRect,
  strokeRoundRect,
} from "../../utils/UIDraw";
import type { PanelName } from "../core/MainUITypes";
import {
  DAILY_SIGN_IN_REWARDS,
  DailySignInReward,
} from "../../../config/DailySignInConfig";
import {
  ACHIEVEMENTS,
  AchievementCategory,
  AchievementDefinition,
} from "../../../config/AchievementConfig";
import {
  getTaskCategoryLabel,
  TaskAction,
  TaskCategory,
} from "../../../config/TaskConfig";
import { PLAYER_TITLES, PlayerTitleCategory } from "../../../config/TitleConfig";
import { SEASONS } from "../../../config/SeasonConfig";
import { animateRewardsToInventory } from "../shared/MainUIRewardAnimation";



export const CATALOG_CATEGORY_ORDER = new Map<ItemCategory, number>([
  [ItemCategory.CROP, 0],
  [ItemCategory.PROCESSED, 1],
  [ItemCategory.FOOD, 2],
  [ItemCategory.BUILDING, 3],
  [ItemCategory.DECORATION, 4],
  [ItemCategory.TOOL, 5],
  [ItemCategory.SPECIAL, 6],
  [ItemCategory.AD_REWARD, 7],
]);


export const CATALOG_CONFIG_ORDER = new Map<string, number>(
  Object.keys(ITEM_DB).map((id, index) => [id, index]),
);


export const CATALOG_CROP_ORDER = new Map<string, number>(
  Object.keys(ITEM_DB)
    .map((id) => ITEM_DB[id])
    .filter((item) => item.category === ItemCategory.CROP && !item.isCrop)
    .map((item, index) => [item.id, index]),
);


export function compareCatalogItems(a: ItemDef, b: ItemDef): number {
  const categoryA = CATALOG_CATEGORY_ORDER.get(a.category) ?? 99;
  const categoryB = CATALOG_CATEGORY_ORDER.get(b.category) ?? 99;
  if (categoryA !== categoryB) return categoryA - categoryB;

  if (a.category === ItemCategory.CROP && b.category === ItemCategory.CROP) {
    const cropA = a.isCrop ? a.cropId || a.id : a.id;
    const cropB = b.isCrop ? b.cropId || b.id : b.id;
    const cropOrderA = CATALOG_CROP_ORDER.get(cropA) ?? 999;
    const cropOrderB = CATALOG_CROP_ORDER.get(cropB) ?? 999;
    if (cropOrderA !== cropOrderB) return cropOrderA - cropOrderB;
    // Keep each harvested crop immediately before its matching seed bag.
    if (!!a.isCrop !== !!b.isCrop) return a.isCrop ? 1 : -1;
  }

  if (a.unlockLevel !== b.unlockLevel) return a.unlockLevel - b.unlockLevel;
  if (a.rarity !== b.rarity) return a.rarity - b.rarity;
  return (
    (CATALOG_CONFIG_ORDER.get(a.id) ?? 9999) -
    (CATALOG_CONFIG_ORDER.get(b.id) ?? 9999)
  );
}


export function renderQuestPanel(ui: any, _enterDirection = 0) {
  const panel = ui.panels.quest!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const close = panel.getChildByName("Close");
  if (close) close.active = false;

  const items: ItemDef[] = [];
  for (const id in ITEM_DB) {
    if (Object.prototype.hasOwnProperty.call(ITEM_DB, id))
      items.push(ITEM_DB[id]);
  }
  items.sort(compareCatalogItems);

  const progress = gm.getCatalogProgress();
  ui.catalogRenderedUnlocked = progress.unlocked;
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const previousCatalogPage = Number.isInteger(ui.catalogRenderedPage)
    ? ui.catalogRenderedPage
    : ui.catalogPage || 0;
  ui.catalogPage = Math.max(0, Math.min(pageCount - 1, ui.catalogPage || 0));

  drawCatalogBackground(ui, body, ui.catalogPage, previousCatalogPage);
  drawRibbonTitle(ui, body, "物品图鉴");

  const pageItems = items.slice(
    ui.catalogPage * pageSize,
    ui.catalogPage * pageSize + pageSize,
  );
  pageItems.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const card = createCatalogCard(ui, gm, item);
    card.setPosition(CATALOG_CARD_COLUMN_X[col], CATALOG_CARD_ROW_Y[row]);
    body.addChild(card);
  });

  drawCatalogProgress(
    ui,
    body,
    progress.unlocked,
    progress.total,
    ui.catalogPage,
    pageCount,
    previousCatalogPage,
  );
  ui.catalogRenderedPage = ui.catalogPage;
  createCatalogCloseHitArea(ui, panel, body);
  createCatalogPageTurnHitArea(ui, body, ui.catalogPage, pageCount);
}


export function clearCatalogPanelChrome(panel: Node) {
  const graphics = panel.getComponents(Graphics);
  graphics.forEach((g) => g.clear());
}


export function drawCatalogBackground(
  ui: any,
  body: Node,
  pageIndex: number,
  previousPageIndex: number,
) {
  drawPanelImageBackground(ui, body, "catalogBg", "CatalogImageBackground");
  if (pageIndex <= 0) return;
  const arrow = drawCatalogPrevArrow(body);
  if (previousPageIndex !== 0) return;
  arrow.active = false;
  ui.scheduleOnce(() => {
    if (!body.isValid || !arrow.isValid) return;
    arrow.active = true;
    arrow.setScale(new Vec3(0.72, 0.72, 1));
    tween(arrow).to(0.12, { scale: Vec3.ONE }, { easing: "backOut" }).start();
  }, 0.25);
}


export function drawCommonPanelBackground(ui: any, body: Node) {
  drawPanelImageBackground(ui, body, "panelBg", "CommonPanelImageBackground");
}


export const CATALOG_BACKGROUND_IMAGE_WIDTH = Design.WIDTH + 10;

export const CATALOG_BACKGROUND_IMAGE_HEIGHT = 540;

export const CATALOG_BACKGROUND_IMAGE_X = 0;

export const CATALOG_BACKGROUND_IMAGE_Y = 0;

export const CATALOG_CARD_COLUMN_X = [-111, -1, 109] as const;

export const CATALOG_CARD_ROW_Y = [107, -32, -171] as const;

export const CATALOG_ICON_Y = 20;

export const CATALOG_NAME_Y = -45;


export function drawPanelImageBackground(
  ui: any,
  body: Node,
  iconName: string,
  nodeName: string,
) {
  const bg = new Node(nodeName);
  bg.addComponent(UITransform).setContentSize(
    CATALOG_BACKGROUND_IMAGE_WIDTH,
    CATALOG_BACKGROUND_IMAGE_HEIGHT,
  );
  bg.setPosition(CATALOG_BACKGROUND_IMAGE_X, CATALOG_BACKGROUND_IMAGE_Y);
  ui.applyUiIcon(iconName, bg);
  body.addChild(bg);
}


export function drawRibbonTitle(
  ui: any,
  parent: Node,
  title: string,
  x = 0,
  y = 228,
  width = 210,
  height = 48,
) {
  const root = new Node("RibbonTitle");
  root.setPosition(x, y);
  root.addComponent(UITransform).setContentSize(width, height);

  const shadow = ui.makeLabel(
    title,
    30,
    new Color(86, 40, 24, 150),
    true,
    2,
    -3,
    width,
    height,
  );
  shadow.getComponent(Label)!.lineHeight = 36;
  root.addChild(shadow);

  const label = ui.makeLabel(
    title,
    30,
    new Color(88, 45, 24),
    true,
    0,
    0,
    width,
    height,
  );
  const labelComp = label.getComponent(Label)!;
  labelComp.horizontalAlign = Label.HorizontalAlign.CENTER;
  labelComp.verticalAlign = Label.VerticalAlign.CENTER;
  labelComp.lineHeight = 36;
  const outline = label.addComponent(LabelOutline);
  outline.color = new Color(255, 246, 225, 255);
  outline.width = 4;
  root.addChild(label);

  parent.addChild(root);
  return root;
}


export const CATALOG_PREV_ARROW_X = -104;

export const CATALOG_PREV_ARROW_Y = -251;

export const CATALOG_PROGRESS_X = 7;

export const CATALOG_HOME_PROGRESS_X = -21;

export const CATALOG_PROGRESS_WIDTH = 148;

export const CATALOG_HOME_PROGRESS_WIDTH = 204;

export const CATALOG_PROGRESS_TEXT_X = 111;


export function drawCatalogPrevArrow(body: Node): Node {
  const arrow = new Node("CatalogPrevPageArrow");
  arrow.setPosition(CATALOG_PREV_ARROW_X, CATALOG_PREV_ARROW_Y);
  const g = arrow.addComponent(Graphics);
  g.fillColor = new Color(255, 182, 79, 255);
  g.strokeColor = new Color(132, 72, 32, 255);
  g.lineWidth = 2.4;
  g.moveTo(-18, 0);
  g.quadraticCurveTo(-18, 2, -16, 4);
  g.lineTo(-7, 13);
  g.quadraticCurveTo(-5, 15, -3, 14);
  g.quadraticCurveTo(-1, 13, -1, 10);
  g.lineTo(-1, 6);
  g.lineTo(15, 6);
  g.quadraticCurveTo(19, 6, 19, 2);
  g.lineTo(19, -2);
  g.quadraticCurveTo(19, -6, 15, -6);
  g.lineTo(-1, -6);
  g.lineTo(-1, -10);
  g.quadraticCurveTo(-1, -13, -3, -14);
  g.quadraticCurveTo(-5, -15, -7, -13);
  g.lineTo(-16, -4);
  g.quadraticCurveTo(-18, -2, -18, 0);
  g.close();
  g.fill();
  g.stroke();
  body.addChild(arrow);
  return arrow;
}


export function createCatalogCard(ui: any, gm: GameManager, item: ItemDef): Node {
  const discovered = gm.hasDiscoveredItem(item.id);
  const displayUnlockLevel = ui.catalogLevel(item);
  const levelUnlocked = displayUnlockLevel <= gm.playerLevel;
  const card = new Node(`CatalogCard_${item.id}`);
  card.addComponent(UITransform).setContentSize(100, 132);

  const icon = ui.createItemIcon(item.id, item.id === "pasta" ? 64 : 70, true);
  const iconOffsetX =
    item.id === "pasta"
      ? 3
      : item.id === "palmTree" || item.id === "fence"
        ? 3
        : 0;
  icon.setPosition(iconOffsetX, CATALOG_ICON_Y);
  if (!discovered) {
    const opacity = icon.addComponent(UIOpacity);
    opacity.opacity = levelUnlocked ? 120 : 72;
  }
  card.addChild(icon);

  const name = ui.makeLabel(
    ui.itemName(item.id),
    15,
    new Color(88, 45, 24),
    true,
    0,
    CATALOG_NAME_Y,
    96,
    24,
  );
  const nameLabel = name.getComponent(Label)!;
  nameLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
  nameLabel.verticalAlign = Label.VerticalAlign.CENTER;
  nameLabel.lineHeight = 18;
  card.addChild(name);

  if (!discovered || !levelUnlocked) {
    const lockFrame = getCatalogLockFrame();
    const lock = new Node("LockShade");
    lock.addComponent(UITransform).setContentSize(lockFrame.w, lockFrame.h);
    lock.setPosition(lockFrame.x, lockFrame.y);
    fillRoundRect(lock, lockFrame.w, lockFrame.h, 9, new Color(80, 68, 54, 38));
    if (!levelUnlocked) {
      lock.addChild(
        ui.makeLabel(
          `Lv.${displayUnlockLevel}`,
          11,
          new Color(255, 248, 218),
          true,
          0,
          0,
          46,
          16,
        ),
      );
    }
    card.addChild(lock);
  }

  return card;
}


export function getCatalogLockFrame() {
  return {
    w: 96,
    h: 128,
    x: 0,
    y: 0,
  };
}


export function drawCatalogProgress(
  ui: any,
  body: Node,
  unlocked: number,
  total: number,
  pageIndex: number,
  _pageCount: number,
  previousPageIndex: number,
) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, unlocked / total)) : 0;
  const isHomePage = pageIndex === 0;
  const trackW = isHomePage
    ? CATALOG_HOME_PROGRESS_WIDTH
    : CATALOG_PROGRESS_WIDTH;
  const trackX = isHomePage ? CATALOG_HOME_PROGRESS_X : CATALOG_PROGRESS_X;
  const track = new Node("CatalogProgressTrack");
  drawCatalogStyleProgress(
    track,
    trackW,
    ratio,
    new Color(154, 104, 80, 230),
    new Color(255, 203, 79, 255),
  );
  body.addChild(track);
  const previousWasHome = previousPageIndex === 0;
  if (previousPageIndex !== pageIndex) {
    const initialW = previousWasHome
      ? CATALOG_HOME_PROGRESS_WIDTH
      : CATALOG_PROGRESS_WIDTH;
    const initialX = previousWasHome
      ? CATALOG_HOME_PROGRESS_X
      : CATALOG_PROGRESS_X;
    track.setPosition(initialX, CATALOG_PREV_ARROW_Y);
    track.setScale(new Vec3(initialW / trackW, 1, 1));
    tween(track)
      .to(
        0.24,
        {
          position: new Vec3(trackX, CATALOG_PREV_ARROW_Y, 0),
          scale: Vec3.ONE,
        },
        { easing: "quadOut" },
      )
      .start();
  } else {
    track.setPosition(trackX, CATALOG_PREV_ARROW_Y);
  }

  body.addChild(
    ui.makeLabel(
      `${unlocked}/${total}`,
      18,
      new Color(88, 45, 24),
      true,
      CATALOG_PROGRESS_TEXT_X,
      CATALOG_PREV_ARROW_Y,
      70,
      24,
    ),
  );
}


export function createCatalogCloseHitArea(ui: any, panel: Node, body: Node) {
  const close = new Node("CatalogCloseHitArea");
  close.addComponent(UITransform).setContentSize(54, 54);
  close.setPosition(148, 212);
  const g = close.addComponent(Graphics);
  g.strokeColor = new Color(132, 72, 32, 255);
  g.lineWidth = 4;
  g.moveTo(-7.5, 7.5);
  g.lineTo(7.5, -7.5);
  g.moveTo(7.5, 7.5);
  g.lineTo(-7.5, -7.5);
  g.stroke();
  bindCatalogPressFeedback(close);
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    ui.closePanelWithAnimation(panel);
  });
  body.addChild(close);
}


export function createCatalogPageTurnHitArea(
  ui: any,
  body: Node,
  pageIndex: number,
  pageCount: number,
) {
  if (pageIndex > 0) {
    const prev = new Node("CatalogPrevPageHitArea");
    prev.addComponent(UITransform).setContentSize(74, 64);
    prev.setPosition(CATALOG_PREV_ARROW_X, CATALOG_PREV_ARROW_Y);
    const arrow = body.getChildByName("CatalogPrevPageArrow") || prev;
    bindCatalogPressFeedback(prev, arrow);
    prev
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        ui.catalogPage = Math.max(0, pageIndex - 1);
        ui.renderQuestPanel();
      });
    body.addChild(prev);
  }

  if (pageCount > 1 && pageIndex < pageCount - 1) {
    const next = new Node("CatalogNextPageHitArea");
    next.addComponent(UITransform).setContentSize(74, 64);
    next.setPosition(168, -228);
    next
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (pageIndex >= pageCount - 1) return;
        ui.catalogPage = Math.min(pageCount - 1, pageIndex + 1);
        ui.renderQuestPanel();
      });
    body.addChild(next);
  } else if (pageCount > 1) {
    const nextBlocker = new Node("CatalogNextPageBlocker");
    nextBlocker.addComponent(UITransform).setContentSize(74, 64);
    nextBlocker.setPosition(168, -228);
    nextBlocker
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
      });
    body.addChild(nextBlocker);
  }
}


export function bindCatalogPressFeedback(hitArea: Node, visual: Node = hitArea) {
  bindTaskStylePressFeedback(hitArea, visual);
}


export function setupCategoryTabVisual(icon: Node, label: Node, selected: boolean) {
  const targetScale = selected ? 1.08 : 1;
  const targetOpacity = selected ? 255 : 205;
  const iconOpacity =
    icon.getComponent(UIOpacity) || icon.addComponent(UIOpacity);
  const labelOpacity =
    label.getComponent(UIOpacity) || label.addComponent(UIOpacity);
  iconOpacity.opacity = targetOpacity;
  labelOpacity.opacity = targetOpacity;

  if (!selected) {
    icon.setScale(new Vec3(1, 1, 1));
    label.setScale(new Vec3(1, 1, 1));
    return;
  }

  icon.setScale(new Vec3(0.94, 0.94, 1));
  label.setScale(new Vec3(0.94, 0.94, 1));
  tween(icon)
    .to(
      0.18,
      { scale: new Vec3(targetScale, targetScale, 1) },
      { easing: "backOut" },
    )
    .start();
  tween(label)
    .to(
      0.18,
      { scale: new Vec3(targetScale, targetScale, 1) },
      { easing: "backOut" },
    )
    .start();
}


export function bindCategoryTabPressFeedback(
  hitArea: Node,
  icon: Node,
  label: Node,
  selected: boolean,
) {
  const targetScale = selected ? 1.08 : 1;
  const pressScale = targetScale * 0.9;
  const animateScale = (scale: number, duration: number, easing: any) => {
    for (const visual of [icon, label]) {
      if (!visual.isValid) continue;
      tween(visual).stop();
      tween(visual)
        .to(duration, { scale: new Vec3(scale, scale, 1) }, { easing })
        .start();
    }
  };
  hitArea.on(Node.EventType.TOUCH_START, () => {
    animateScale(pressScale, 0.06, "quadOut");
  });
  const restore = () => animateScale(targetScale, 0.14, "backOut");
  hitArea.on(Node.EventType.TOUCH_END, restore);
  hitArea.on(Node.EventType.TOUCH_CANCEL, restore);
}
