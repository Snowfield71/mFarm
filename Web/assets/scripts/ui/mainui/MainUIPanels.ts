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
  Vec2,
  Vec3,
  Tween,
  tween,
  view,
} from "cc";
import { Design, GameValues } from "../../config/GameConfig";
import { GameManager } from "../../core/GameManager";
import { EventManager } from "../../core/EventManager";
import { InventorySystem } from "../../systems/InventorySystem";
import { LandBlock, LandSystem } from "../../systems/LandSystem";
import { CraftSystem } from "../../systems/CraftSystem";
import {
  getItem,
  getPlantableCrops,
  ITEM_DB,
  ItemCategory,
  ItemDef,
} from "../../config/ItemConfig";
import {
  getAllRecipes,
  getRecipe,
  getRecipesByLevel,
  RecipeDef,
} from "../../config/RecipeConfig";
import {
  drawCatalogStyleProgress,
  fillRoundRect,
  strokeRoundRect,
} from "../utils/UIDraw";
import type { PanelName } from "./MainUITypes";
import { ImageCache } from "../../utils/ImageCache";
import {
  DAILY_SIGN_IN_REWARDS,
  DailySignInReward,
} from "../../config/DailySignInConfig";
import {
  ACHIEVEMENTS,
  AchievementCategory,
  AchievementDefinition,
} from "../../config/AchievementConfig";
import {
  getTaskCategoryLabel,
  TaskAction,
  TaskCategory,
} from "../../config/TaskConfig";
import { PLAYER_TITLES, PlayerTitleCategory } from "../../config/TitleConfig";

export function showPanel(ui: any, name: PanelName) {
  ui.closeSeedBubble();
  if (ui.panels[name]?.active) {
    closeActivePanel(ui, name);
    return;
  }
  if (name === "shop") {
    ui.shopCategory = ui.activeWorld === "pasture" ? "tools" : "seeds";
    ui.shopScrollOffset = 0;
  }
  if (ui.panels.inventory) ui.panels.inventory.active = name === "inventory";
  if (ui.panels.craft) ui.panels.craft.active = name === "craft";
  if (ui.panels.shop) ui.panels.shop.active = name === "shop";
  if (ui.panels.quest) ui.panels.quest.active = name === "quest";
  if (ui.panels.task) ui.panels.task.active = name === "task";
  if (ui.panels.signIn) ui.panels.signIn.active = name === "signIn";
  if (ui.panels.achievement)
    ui.panels.achievement.active = name === "achievement";
  if (ui.panels.title) ui.panels.title.active = name === "title";
  updateBottomNavState(ui, name);

  if (name === "inventory") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "taskTabsMain",
      "taskTabsDaily",
      "taskTabsBranch",
      "taskTabsSpecial",
      "inventoryAll",
      "inventorySeeds",
      "inventoryMaterials",
      "inventoryProducts",
      "inventorySellDialogBg",
      "inventorySellResultBg",
      "btnSellCancel",
      "btnSellConfirm",
      "btnSellMinus",
      "btnSellPlus",
      "btnSellMax",
    ]);
    ui.renderInventoryPanel();
  }
  if (name === "craft") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "craftChefTools",
      "craftArrow",
      "btnCraft",
    ]);
    ui.renderCraftPanel();
  }
  if (name === "shop") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "shopTabsSeeds",
      "shopTabsTools",
      "shopSeeds",
      "shopTools",
      "btnBuy",
    ]);
    ui.renderShopPanel();
  }
  if (name === "quest") {
    ImageCache.getInstance().preloadUiIcons(["catalogBg"]);
    ui.renderQuestPanel();
  }
  if (name === "task") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "taskMain",
      "taskDaily",
      "taskBranch",
      "taskSpecial",
      "taskTabsMain",
      "taskTabsDaily",
      "taskTabsBranch",
      "taskTabsSpecial",
      "btnGo",
      "btnDetail",
      "btnClaim",
      "btnClaimed",
      "task1",
      "task2",
      "task3",
      "rewardGold",
      "rewardSeed",
    ]);
    ui.renderTaskPanel();
  }
  if (name === "signIn") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "gold",
      "diamond",
      "signInClaim",
      "signInClaimed",
    ]);
    ui.renderDailySignInPanel();
  }
  if (name === "achievement") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "gold",
      "diamond",
      "taskTabsMain",
      "taskTabsDaily",
      "taskTabsBranch",
      "taskTabsSpecial",
      "achievementCategoryPlanting",
      "achievementCategoryCrafting",
      "achievementCategoryGrowth",
      "achievementCategoryCollection",
      "achievementMedalWallEntry",
      "achievementMedalWallBg",
      ...ACHIEVEMENTS.map((item) => item.icon),
      ...ACHIEVEMENTS.map((item) => item.lockedIcon).filter(
        (icon): icon is string => !!icon,
      ),
    ]);
    ui.renderAchievementPanel();
  }
  if (name === "title") {
    ImageCache.getInstance().preloadUiIcons([
      "panelBg",
      "shopTabsSeeds",
      "shopTabsTools",
      "btnTitleEquip",
      "btnTitleUnequip",
      "titleCategoryLevel",
      "titleCategoryAchievement",
      "titleUnlocked",
      "titleLocked",
    ]);
    ui.renderTitlePanel();
  }
}

function closeActivePanel(ui: any, name: PanelName) {
  const panel = ui.panels[name];
  if (panel) ui.closePanelWithAnimation(panel);
}

/** Preload image-heavy panel assets in small batches after the main scene settles. */
export function prewarmHeavyPanelImages(ui: any) {
  const cache = ImageCache.getInstance();
  const uiIcons = Array.from(
    new Set([
      "panelBg",
      "taskTabsMain",
      "taskTabsDaily",
      "taskTabsBranch",
      "taskTabsSpecial",
      "inventoryAll",
      "inventorySeeds",
      "inventoryMaterials",
      "inventoryProducts",
      "shopTabsSeeds",
      "shopTabsTools",
      "shopSeeds",
      "shopTools",
      "craftChefTools",
      "craftArrow",
      "btnCraft",
      "taskMain",
      "taskDaily",
      "taskBranch",
      "taskSpecial",
      "btnGo",
      "btnDetail",
      "btnClaim",
      "btnClaimed",
      "task1",
      "task2",
      "task3",
      "rewardGold",
      "rewardSeed",
      "achievementCategoryPlanting",
      "achievementCategoryCrafting",
      "achievementCategoryGrowth",
      "achievementCategoryCollection",
      "achievementMedalWallEntry",
      "achievementMedalWallBg",
      ...ACHIEVEMENTS.map((item) => item.icon),
      ...ACHIEVEMENTS.map((item) => item.lockedIcon).filter(
        (icon): icon is string => !!icon,
      ),
    ]),
  );
  const itemIds = Object.keys(ITEM_DB);
  const jobs: Array<() => Promise<number>> = [];
  for (let i = 0; i < uiIcons.length; i += 6) {
    const batch = uiIcons.slice(i, i + 6);
    jobs.push(() => cache.preloadUiIcons(batch));
  }
  for (let i = 0; i < itemIds.length; i += 6) {
    const batch = itemIds.slice(i, i + 6);
    jobs.push(() => cache.preload(batch));
  }

  let jobIndex = 0;
  const runNext = () => {
    if (!ui.node?.isValid || jobIndex >= jobs.length) return;
    const scheduleNext = () => {
      if (ui.node?.isValid) ui.scheduleOnce(runNext, 0.03);
    };
    jobs[jobIndex++]().then(scheduleNext, scheduleNext);
  };
  ui.scheduleOnce(runNext, 0.25);
}

function updateBottomNavState(ui: any, active: PanelName) {
  const nav = ui.node.getChildByName("BottomNav");
  if (!nav) return;

  const panels: PanelName[] = ["inventory", "craft", "task", "quest"];
  for (const panel of panels) {
    const btn = nav.getChildByName(`Nav_${panel}`);
    if (!btn) continue;
    const isActive = panel === active;
    fillRoundRect(
      btn,
      76,
      59,
      13,
      isActive ? new Color(255, 238, 174, 255) : new Color(255, 247, 210, 255),
    );
    strokeRoundRect(
      btn,
      76,
      59,
      13,
      isActive ? new Color(102, 55, 34, 235) : new Color(126, 78, 48, 225),
      isActive ? 2.6 : 2.2,
    );

    const halo = btn.getChildByName("Halo");
    if (halo) {
      fillRoundRect(
        halo,
        isActive ? 44 : 38,
        isActive ? 34 : 30,
        14,
        isActive
          ? new Color(255, 219, 126, 160)
          : new Color(255, 234, 170, 120),
      );
    }
    const shade = btn.getChildByName("Shade");
    if (shade) {
      fillRoundRect(
        shade,
        isActive ? 52 : 46,
        8,
        4,
        new Color(118, 70, 42, isActive ? 92 : 70),
      );
    }
    const icon = btn.getChildByName("Icon");
    if (icon) {
      const baseIconY = (icon as any).__bottomNavBaseY ?? icon.position.y;
      icon.setPosition(0, isActive ? baseIconY + 2 : baseIconY);
      tween(icon)
        .to(
          0.12,
          { scale: new Vec3(isActive ? 1.08 : 1, isActive ? 1.08 : 1, 1) },
          { easing: "backOut" },
        )
        .start();
    }
  }
}

function clearBottomNavState(ui: any) {
  const nav = ui.node.getChildByName("BottomNav");
  if (!nav) return;

  const panels: PanelName[] = ["inventory", "craft", "task", "quest"];
  for (const panel of panels) {
    const btn = nav.getChildByName(`Nav_${panel}`);
    if (!btn) continue;
    fillRoundRect(btn, 76, 59, 13, new Color(255, 247, 210, 255));
    strokeRoundRect(btn, 76, 59, 13, new Color(126, 78, 48, 225), 2.2);

    const icon = btn.getChildByName("Icon");
    if (icon) {
      icon.setScale(new Vec3(1, 1, 1));
      icon.setPosition(0, (icon as any).__bottomNavBaseY ?? icon.position.y);
    }
  }
}

export function clearPanelBody(ui: any, panel: Node): Node {
  const old = panel.getChildByName("Body");
  if (old) {
    old.removeFromParent();
    old.destroy();
  }
  const body = new Node("Body");
  body.addComponent(UITransform).setContentSize(288, 360);
  body.setPosition(0, -8);
  panel.addChild(body);
  return body;
}

export function renderInventoryPanel(ui: any) {
  const panel = ui.panels.inventory!;
  const body = ui.clearPanelBody(panel);
  const inv = InventorySystem.getInstance();
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const defaultClose = panel.getChildByName("Close");
  if (defaultClose) defaultClose.active = false;

  drawCommonPanelBackground(ui, body);
  drawRibbonTitle(ui, body, "\u50a8\u7269\u80cc\u5305");
  createCatalogCloseHitArea(ui, panel, body);

  const frame = new Node("InventoryGridFrame");
  frame.setPosition(0, -58);
  const frameShadow = new Node("InventoryGridFrameBottomShadow");
  frameShadow.addComponent(UITransform).setContentSize(300, 360);
  frameShadow.setPosition(0, -62);
  fillRoundRect(frameShadow, 300, 360, 13, new Color(111, 68, 38, 35));
  body.addChild(frameShadow);
  fillRoundRect(frame, 300, 360, 14, new Color(255, 253, 242, 242));
  strokeRoundRect(frame, 300, 360, 14, new Color(139, 91, 53, 220), 2.2);
  body.addChild(frame);
  drawInventoryCategoryTabs(ui, body);

  const entries = inv.slots
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot }) =>
      inventorySlotMatchesCategory(slot.itemId, ui.inventoryCategory),
    );
  while (entries.length < 16) {
    entries.push({ slot: { itemId: "", count: 0 }, slotIndex: -1 });
  }
  drawInventoryGrid(ui, body, entries);
}

function drawInventoryCategoryTabs(ui: any, body: Node) {
  const tabs = [
    {
      id: "all",
      text: "\u5168\u90e8",
      width: 84,
      visualX: -121,
      image: "taskTabsMain",
      icon: "inventoryAll",
      iconSize: 31,
    },
    {
      id: "seeds",
      text: "\u79cd\u5b50",
      width: 88,
      visualX: -36,
      image: "taskTabsDaily",
      icon: "inventorySeeds",
      iconSize: 29,
    },
    {
      id: "materials",
      text: "\u6750\u6599",
      width: 84,
      visualX: 47,
      image: "taskTabsBranch",
      icon: "inventoryMaterials",
      iconSize: 31,
    },
    {
      id: "products",
      text: "\u6210\u54c1",
      width: 88,
      visualX: 128,
      image: "taskTabsSpecial",
      icon: "inventoryProducts",
      iconSize: 27,
      iconOffsetX: 4,
    },
  ];
  if (!ui.inventoryCategory) ui.inventoryCategory = "all";
  const baselineY = 126;
  const imageH = 60;
  const tabGap = 5;
  const selected =
    tabs.find((tab) => tab.id === ui.inventoryCategory) || tabs[0];
  const image = new Node("InventoryCategoryTabsImage");
  image.addComponent(UITransform).setContentSize(360, imageH);
  image.setPosition(0, baselineY + imageH / 2 - 1);
  ui.applyUiIcon(selected.image, image);
  const tabVisuals: Array<{ icon: Node; label: Node }> = [];

  tabs.forEach((tab, index) => {
    const icon = new Node(`InventoryTabIcon_${index}`);
    icon.addComponent(UITransform).setContentSize(tab.iconSize, tab.iconSize);
    icon.setPosition(tab.visualX - 21 + (tab.iconOffsetX || 0), 0);
    ui.applyUiIcon(tab.icon, icon);
    image.addChild(icon);
    const label = ui.makeLabel(
      tab.text,
      13,
      new Color(67, 30, 14, 255),
      true,
      tab.visualX + 13,
      0,
      42,
      22,
    );
    label.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    image.addChild(label);
    setupCategoryTabVisual(icon, label, tab.id === ui.inventoryCategory);
    tabVisuals.push({ icon, label });
  });
  body.addChild(image);

  const totalW =
    tabs.reduce((sum, tab) => sum + tab.width, 0) + tabGap * (tabs.length - 1);
  let cursorX = -totalW / 2;
  tabs.forEach((tab, index) => {
    const node = new Node(`InventoryTabHit_${index}`);
    node.addComponent(UITransform).setContentSize(tab.width, imageH);
    node.setPosition(cursorX + tab.width / 2, baselineY + imageH / 2);
    cursorX += tab.width + tabGap;
    bindCategoryTabPressFeedback(
      node,
      tabVisuals[index].icon,
      tabVisuals[index].label,
      tab.id === ui.inventoryCategory,
    );
    node
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (ui.inventoryCategory === tab.id) return;
        ui.inventoryCategory = tab.id;
        ui.inventoryScrollOffset = 0;
        ui.renderInventoryPanel();
      });
    body.addChild(node);
  });
}

function inventorySlotMatchesCategory(itemId: string, category: string) {
  if (category === "all") return true;
  if (!itemId) return false;
  const item = getItem(itemId);
  if (!item) return false;
  if (category === "seeds") return item.isCrop === true;
  if (category === "materials") {
    return (
      (item.category === ItemCategory.CROP && !item.isCrop) ||
      item.category === ItemCategory.PROCESSED ||
      item.category === ItemCategory.TOOL
    );
  }
  return (
    item.category === ItemCategory.FOOD ||
    item.category === ItemCategory.BUILDING ||
    item.category === ItemCategory.DECORATION ||
    item.category === ItemCategory.SPECIAL ||
    item.category === ItemCategory.AD_REWARD
  );
}

function drawInventoryGrid(
  ui: any,
  body: Node,
  entries: Array<{
    slot: { itemId: string; count: number };
    slotIndex: number;
  }>,
) {
  const viewportW = 284;
  const viewportH = 328;
  const viewport = new Node("InventoryViewport");
  viewport.addComponent(UITransform).setContentSize(viewportW, viewportH);
  viewport.setPosition(0, -58);
  viewport.addComponent(Mask);
  body.addChild(viewport);

  const cols = 4;
  const cellW = 64;
  const cellH = 72;
  const gapX = 6;
  const gapY = 6;
  const rows = Math.max(1, Math.ceil(entries.length / cols));
  const gridW = cols * cellW + (cols - 1) * gapX;
  const gridH = rows * cellH + Math.max(0, rows - 1) * gapY;
  const gridPaddingY = 8;
  const contentH = Math.max(viewportH, gridH + gridPaddingY * 2);
  const content = new Node("InventoryContent");
  content.addComponent(UITransform).setContentSize(viewportW, contentH);
  viewport.addChild(content);

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  (scrollView as any).elastic = false;
  scrollView.content = content;

  entries.forEach(({ slot, slotIndex }, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cell = new Node(`InventorySlot_${slotIndex}`);
    cell.addComponent(UITransform).setContentSize(cellW, cellH);
    cell.setScale(1, 1, 1);
    cell.setPosition(
      -gridW / 2 + cellW / 2 + col * (cellW + gapX),
      contentH / 2 - gridPaddingY - cellH / 2 - row * (cellH + gapY),
    );
    const cellBackground = new Node("InventorySlotBackground");
    cellBackground.addComponent(UITransform).setContentSize(cellW, cellH);
    fillRoundRect(
      cellBackground,
      cellW,
      cellH,
      9,
      slot.itemId
        ? new Color(239, 207, 159, 238)
        : new Color(239, 222, 191, 130),
    );
    strokeRoundRect(
      cellBackground,
      cellW,
      cellH,
      9,
      new Color(202, 161, 108, 180),
      1.4,
    );
    cell.addChild(cellBackground);

    if (slot.itemId) {
      const icon = ui.createItemIcon(slot.itemId, 43, true);
      icon.setPosition(0, 8);
      cell.addChild(icon);
      cell.addChild(
        ui.makeLabel(
          `x${slot.count}`,
          11,
          new Color(63, 31, 20),
          true,
          17,
          -5,
          34,
          16,
        ),
      );
      cell.addChild(
        ui.makeLabel(
          ui.itemName(slot.itemId),
          10,
          new Color(70, 38, 23),
          true,
          0,
          -26,
          60,
          16,
        ),
      );
      cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
        ui.inventoryScrollOffset = scrollView.getScrollOffset().y;
        const item = getItem(slot.itemId);
        if (item?.category === ItemCategory.TOOL)
          ui.useInventoryTool(slotIndex);
        else if (item?.category === ItemCategory.BUILDING)
          ui.openSellDialog(slotIndex);
        else if (item?.id === "mysteryBox") ui.useSpecialItem(slotIndex);
        else ui.openSellDialog(slotIndex);
      });
    }
    content.addChild(cell);
  });

  attachPanelScrollState(
    ui,
    body,
    scrollView,
    content,
    contentH,
    viewportH,
    "inventoryScrollOffset",
    "Inventory",
    150,
    -58,
    false,
  );
}

function attachPanelScrollState(
  ui: any,
  body: Node,
  scrollView: ScrollView,
  content: Node,
  contentH: number,
  viewportH: number,
  offsetKey: "inventoryScrollOffset" | "shopScrollOffset",
  name: string,
  trackX: number,
  trackY: number,
  showScrollbar = true,
) {
  const maxOffset = Math.max(0, contentH - viewportH);
  const restored = Math.max(0, Math.min(ui[offsetKey] || 0, maxOffset));
  content.setPosition(0, -maxOffset / 2 + restored);

  const thumbH = Math.max(
    32,
    (viewportH * viewportH) / Math.max(viewportH, contentH),
  );
  let thumb: Node | null = null;
  if (showScrollbar) {
    const track = new Node(`${name}ScrollTrack`);
    track.setPosition(trackX, trackY);
    fillRoundRect(track, 4, viewportH, 2, new Color(186, 150, 105, 95));
    body.addChild(track);
    thumb = new Node(`${name}ScrollThumb`);
    fillRoundRect(thumb, 4, thumbH, 2, new Color(154, 103, 57, 205));
    track.addChild(thumb);
  }

  const sync = () => {
    const currentMax = Math.max(0, scrollView.getMaxScrollOffset().y);
    const offset =
      currentMax > 0
        ? Math.max(0, Math.min(currentMax, scrollView.getScrollOffset().y))
        : 0;
    ui[offsetKey] = offset;
    if (!thumb?.isValid) return;
    const ratio = currentMax > 0 ? offset / currentMax : 0;
    thumb.setPosition(
      0,
      (viewportH - thumbH) / 2 - ratio * (viewportH - thumbH),
    );
  };
  scrollView.node.on(ScrollView.EventType.SCROLLING, sync);
  scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, sync);
  ui.scheduleOnce(() => {
    if (!content.isValid) return;
    scrollView.scrollToOffset(new Vec2(0, restored), 0);
    sync();
  }, 0);
}

export function renderShopPanel(ui: any) {
  renderMarketplacePanel(ui);
  return;

  const panel = ui.panels.shop!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  const crops = getPlantableCrops()
    .filter((c) => c.unlockLevel <= gm.playerLevel + 2)
    .slice(0, 8);

  crops.forEach((crop, index) => {
    const y = 128 - index * 38;
    const row = new Node(`Shop_${crop.id}`);
    row.addComponent(UITransform).setContentSize(276, 34);
    row.setPosition(0, y);
    const unlocked = crop.unlockLevel <= gm.playerLevel;
    fillRoundRect(
      row,
      276,
      34,
      8,
      unlocked ? new Color(248, 252, 238, 245) : new Color(222, 226, 216, 235),
    );
    strokeRoundRect(row, 276, 34, 8, new Color(154, 196, 138, 120), 1);

    const icon = ui.createItemIcon(crop.id, 28);
    icon.setPosition(-120, 0);
    row.addChild(icon);
    const name = ui.makeLabel(
      `${ui.itemName(crop.id)} Lv.${crop.unlockLevel}`,
      13,
      new Color(54, 72, 46),
      true,
      -60,
      7,
      105,
      16,
    );
    name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(name);
    const price = ui.makeLabel(
      `${Math.max(5, Math.floor(crop.sellPrice * 0.8))}金`,
      11,
      new Color(194, 132, 20),
      false,
      -60,
      -9,
      86,
      14,
    );
    price.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(price);

    const buy = new Node("Buy");
    buy.addComponent(UITransform).setContentSize(62, 26);
    buy.setPosition(103, 0);
    fillRoundRect(
      buy,
      62,
      26,
      9,
      unlocked ? new Color(76, 188, 83) : new Color(165, 170, 160),
    );
    buy.addChild(
      ui.makeLabel(
        unlocked ? "购买" : "未解锁",
        12,
        new Color(255, 255, 255),
        true,
        0,
        0,
        60,
        22,
      ),
    );
    buy
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, () => ui.buySeed(crop));
    row.addChild(buy);
    body.addChild(row);
  });
}

function renderMarketplacePanel(ui: any) {
  const panel = ui.panels.shop!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const defaultClose = panel.getChildByName("Close");
  if (defaultClose) defaultClose.active = false;

  drawCommonPanelBackground(ui, body);
  drawRibbonTitle(ui, body, "\u597d\u7269\u96c6\u5e02");
  createCatalogCloseHitArea(ui, panel, body);

  const frame = new Node("MarketplaceGridFrame");
  frame.setPosition(0, -58);
  const frameShadow = new Node("MarketplaceGridFrameBottomShadow");
  frameShadow.addComponent(UITransform).setContentSize(300, 360);
  frameShadow.setPosition(0, -62);
  fillRoundRect(frameShadow, 300, 360, 13, new Color(111, 68, 38, 35));
  body.addChild(frameShadow);
  fillRoundRect(frame, 300, 360, 14, new Color(255, 253, 242, 242));
  strokeRoundRect(frame, 300, 360, 14, new Color(139, 91, 53, 220), 2.2);
  body.addChild(frame);
  drawMarketplaceTabs(ui, body);

  const items = getMarketplaceItems(ui.shopCategory);
  drawMarketplaceGrid(ui, body, gm, items);
}

export function showTitlePanel(
  ui: any,
  requestedCategory?: PlayerTitleCategory,
) {
  if (requestedCategory) ui.titleDialogCategory = requestedCategory;
  if (ui.panels.title?.active) {
    ui.renderTitlePanel();
    return;
  }
  showPanel(ui, "title");
}

export function renderTitlePanel(ui: any) {
  const panel = ui.panels.title!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  const category: PlayerTitleCategory = ui.titleDialogCategory || "level";
  const visibleTitles = PLAYER_TITLES.filter(
    (title) => title.category === category,
  );
  if (!visibleTitles.some((title) => title.id === ui.titleDialogSelectedId)) {
    const equipped = visibleTitles.find(
      (title) => title.id === gm.equippedTitleId,
    );
    const firstUnlocked = visibleTitles.find((title) =>
      gm.isPlayerTitleUnlocked(title),
    );
    ui.titleDialogSelectedId = equipped?.id || firstUnlocked?.id || "";
  }

  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const defaultClose = panel.getChildByName("Close");
  if (defaultClose) defaultClose.active = false;
  drawCommonPanelBackground(ui, body);
  drawRibbonTitle(ui, body, "我的称号");
  createCatalogCloseHitArea(ui, panel, body);

  const frameShadow = new Node("TitleListFrameBottomShadow");
  frameShadow.addComponent(UITransform).setContentSize(300, 360);
  frameShadow.setPosition(0, -62);
  fillRoundRect(frameShadow, 300, 360, 13, new Color(111, 68, 38, 35));
  body.addChild(frameShadow);
  const frame = new Node("TitleListFrame");
  frame.addComponent(UITransform).setContentSize(300, 360);
  frame.setPosition(0, -58);
  fillRoundRect(frame, 300, 360, 14, new Color(255, 253, 242, 242));
  strokeRoundRect(frame, 300, 360, 14, new Color(139, 91, 53, 220), 2.2);
  body.addChild(frame);

  drawTitleCategoryTabs(ui, body, category);

  const viewportH = 260;
  const viewport = new Node("TitleListViewport");
  viewport.addComponent(UITransform).setContentSize(278, viewportH);
  viewport.setPosition(0, 25);
  viewport.addComponent(Mask);
  frame.addChild(viewport);
  const rowH = 70;
  const gap = 8;
  const topPadding = 4;
  const bottomPadding = 4;
  const contentH = Math.max(
    viewportH,
    visibleTitles.length * rowH +
      Math.max(0, visibleTitles.length - 1) * gap +
      topPadding +
      bottomPadding,
  );
  const content = new Node("TitleListContent");
  const contentTransform = content.addComponent(UITransform);
  contentTransform.setContentSize(278, contentH);
  contentTransform.setAnchorPoint(0.5, 1);
  content.setPosition(0, viewportH / 2);
  viewport.addChild(content);
  let y = -topPadding - rowH / 2;
  visibleTitles.forEach((title) => {
    const unlocked = gm.isPlayerTitleUnlocked(title);
    const selected = ui.titleDialogSelectedId === title.id;
    const row = new Node(`PlayerTitle_${title.id}`);
    row.addComponent(UITransform).setContentSize(270, rowH);
    row.setPosition(0, y);
    (row as any).__titleId = title.id;
    (row as any).__titleUnlocked = unlocked;
    updateTitleItemVisual(ui, row, selected);
    const name = ui.makeLabel(
      `【${title.fullName}】`,
      16,
      unlocked ? new Color(77, 40, 22) : new Color(130, 119, 105),
      true,
      -130,
      15,
      186,
      23,
    );
    name.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
    name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(name);
    const condition = ui.makeLabel(
      title.condition,
      12,
      unlocked ? new Color(155, 105, 68) : new Color(145, 136, 123),
      false,
      -122,
      -14,
      178,
      19,
    );
    condition.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
    condition.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(condition);
    const status = new Node("TitleStatusVisual");
    status.addComponent(UITransform).setContentSize(78, 78);
    status.setPosition(90, 0);
    ui.applyUiIcon(unlocked ? "titleUnlocked" : "titleLocked", status);
    row.addChild(status);
    row.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      if (!unlocked) {
        ui.toast(title.condition);
        return;
      }
      ui.titleDialogSelectedId = title.id;
      refreshTitleItemVisuals(ui, content);
    });
    content.addChild(row);
    y -= rowH + gap;
  });
  const scroll = viewport.addComponent(ScrollView);
  scroll.horizontal = false;
  scroll.vertical = true;
  scroll.inertia = true;
  (scroll as any).elastic = false;
  scroll.content = content;
  const rememberOffset = () => {
    ui.titleDialogScrollOffsets[category] = scroll.getScrollOffset().y;
  };
  scroll.node.on(ScrollView.EventType.SCROLLING, rememberOffset);
  scroll.node.on(ScrollView.EventType.SCROLL_ENDED, rememberOffset);
  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    const maxOffset = Math.max(0, scroll.getMaxScrollOffset().y);
    const offset = Math.max(
      0,
      Math.min(ui.titleDialogScrollOffsets[category] || 0, maxOffset),
    );
    scroll.scrollToOffset(new Vec2(0, offset), 0);
  }, 0);

  const makeImageAction = (
    name: string,
    icon: string,
    x: number,
    onTap: () => void,
  ) => {
    const art = new Node(`${name}Art`);
    art.addComponent(UITransform).setContentSize(104, 104);
    art.setPosition(x, -154);
    ui.applyUiIcon(icon, art);
    frame.addChild(art);
    const hit = new Node(name);
    hit.addComponent(UITransform).setContentSize(90, 42);
    hit.setPosition(x, -146);
    hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      tween(art)
        .to(0.07, { scale: new Vec3(0.94, 0.94, 1) })
        .to(0.1, { scale: Vec3.ONE })
        .call(onTap)
        .start();
    });
    frame.addChild(hit);
  };
  makeImageAction("EquipTitle", "btnTitleEquip", -52, () => {
    if (
      !ui.titleDialogSelectedId ||
      !gm.equipPlayerTitle(ui.titleDialogSelectedId)
    ) {
      ui.toast("请选择已解锁称号");
      return;
    }
    ui.toast("称号佩戴成功");
    ui.closePanelWithAnimation(panel);
  });
  makeImageAction("UnequipTitle", "btnTitleUnequip", 52, () => {
    gm.unequipPlayerTitle();
    ui.toast("已卸下称号");
    refreshTitleItemVisuals(ui, content);
  });
}

function updateTitleItemVisual(ui: any, row: Node, selected: boolean) {
  const unlocked = !!(row as any).__titleUnlocked;
  fillRoundRect(
    row,
    270,
    70,
    13,
    selected
      ? new Color(255, 238, 191, 255)
      : unlocked
        ? new Color(255, 253, 242, 252)
        : new Color(232, 228, 216, 245),
  );
  strokeRoundRect(
    row,
    270,
    70,
    13,
    selected
      ? new Color(202, 111, 45, 245)
      : new Color(139, 91, 53, unlocked ? 205 : 135),
    selected ? 2.2 : 1.5,
  );
  const status = row.getChildByName("TitleStatusVisual");
  if (status) {
    ui.applyUiIcon(unlocked ? "titleUnlocked" : "titleLocked", status);
  }
}

function refreshTitleItemVisuals(ui: any, content: Node) {
  content.children.forEach((row) => {
    updateTitleItemVisual(
      ui,
      row,
      (row as any).__titleId === ui.titleDialogSelectedId,
    );
  });
}

function drawTitleCategoryTabs(
  ui: any,
  body: Node,
  category: PlayerTitleCategory,
) {
  const tabs: Array<{
    type: PlayerTitleCategory;
    text: string;
    x: number;
    image: string;
    icon: string;
  }> = [
    {
      type: "level",
      text: "等级成长",
      x: -57.5,
      image: "shopTabsSeeds",
      icon: "titleCategoryLevel",
    },
    {
      type: "achievement",
      text: "成就限定",
      x: 56.5,
      image: "shopTabsTools",
      icon: "titleCategoryAchievement",
    },
  ];
  const selected = tabs.find((tab) => tab.type === category) || tabs[0];
  const baselineY = 126;
  const imageH = 60;
  const image = new Node("TitleCategoryTabsImage");
  image.addComponent(UITransform).setContentSize(360, imageH);
  image.setPosition(0, baselineY + imageH / 2 - 1);
  ui.applyUiIcon(selected.image, image);
  const visuals: Array<{ icon: Node; label: Node }> = [];
  tabs.forEach((tab, index) => {
    const icon = new Node(`TitleTabIcon_${index}`);
    const iconSize = index === 0 ? 27 : 26;
    icon.addComponent(UITransform).setContentSize(iconSize, iconSize);
    icon.setPosition(tab.x - 28, 0);
    ui.applyUiIcon(tab.icon, icon);
    image.addChild(icon);
    const label = ui.makeLabel(
      tab.text,
      13,
      new Color(67, 30, 14, 255),
      true,
      tab.x + 13,
      0,
      52,
      22,
    );
    label.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    image.addChild(label);
    setupCategoryTabVisual(icon, label, tab.type === category);
    visuals.push({ icon, label });
  });
  body.addChild(image);
  tabs.forEach((tab, index) => {
    const hit = new Node(`TitleTabHit_${index}`);
    hit.addComponent(UITransform).setContentSize(112, imageH);
    hit.setPosition(tab.x, baselineY + imageH / 2);
    bindCategoryTabPressFeedback(
      hit,
      visuals[index].icon,
      visuals[index].label,
      tab.type === category,
    );
    hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      if (tab.type === category) return;
      ui.titleDialogScrollOffsets[tab.type] = 0;
      ui.titleDialogCategory = tab.type;
      ui.titleDialogSelectedId = "";
      ui.renderTitlePanel();
    });
    body.addChild(hit);
  });
}

function drawMarketplaceTabs(ui: any, body: Node) {
  const tabs = [
    {
      id: "seeds",
      text: "\u79cd\u5b50",
      x: -57.5,
      image: "shopTabsSeeds",
      icon: "shopSeeds",
      iconSize: 31,
    },
    {
      id: "tools",
      text: "\u5de5\u5177",
      x: 56.5,
      image: "shopTabsTools",
      icon: "shopTools",
      iconSize: 32,
    },
  ];
  if (!ui.shopCategory) ui.shopCategory = "seeds";
  const selected = tabs.find((tab) => tab.id === ui.shopCategory) || tabs[0];
  const baselineY = 126;
  const imageH = 60;
  const image = new Node("MarketplaceCategoryTabsImage");
  image.addComponent(UITransform).setContentSize(360, imageH);
  image.setPosition(0, baselineY + imageH / 2 - 1);
  ui.applyUiIcon(selected.image, image);
  const tabVisuals: Array<{ icon: Node; label: Node }> = [];

  tabs.forEach((tab, index) => {
    const icon = new Node(`MarketplaceTabIcon_${index}`);
    icon.addComponent(UITransform).setContentSize(tab.iconSize, tab.iconSize);
    icon.setPosition(tab.x - 24, 0);
    ui.applyUiIcon(tab.icon, icon);
    image.addChild(icon);
    const label = ui.makeLabel(
      tab.text,
      15,
      new Color(67, 30, 14, 255),
      true,
      tab.x + 17,
      0,
      52,
      24,
    );
    label.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    image.addChild(label);
    setupCategoryTabVisual(icon, label, tab.id === ui.shopCategory);
    tabVisuals.push({ icon, label });
  });
  body.addChild(image);

  tabs.forEach((tab, index) => {
    const hit = new Node(`MarketplaceTabHit_${index}`);
    hit.addComponent(UITransform).setContentSize(110, imageH);
    hit.setPosition(tab.x, baselineY + imageH / 2);
    bindCategoryTabPressFeedback(
      hit,
      tabVisuals[index].icon,
      tabVisuals[index].label,
      tab.id === ui.shopCategory,
    );
    hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      if (ui.shopCategory === tab.id) return;
      ui.shopCategory = tab.id;
      ui.shopScrollOffset = 0;
      ui.renderShopPanel();
    });
    body.addChild(hit);
  });
}

function getMarketplaceItems(category: string) {
  if (category === "seeds") {
    return getPlantableCrops().sort((a, b) => a.unlockLevel - b.unlockLevel);
  }
  const items: ItemDef[] = [];
  for (const id in ITEM_DB) {
    if (!Object.prototype.hasOwnProperty.call(ITEM_DB, id)) continue;
    const item = ITEM_DB[id];
    if (
      item.category === ItemCategory.TOOL ||
      item.category === ItemCategory.BUILDING ||
      item.category === ItemCategory.DECORATION
    ) {
      items.push(item);
    }
  }
  return items.sort((a, b) => a.unlockLevel - b.unlockLevel);
}

function drawMarketplaceGrid(
  ui: any,
  body: Node,
  gm: GameManager,
  items: ItemDef[],
) {
  const viewportW = 284;
  const viewportH = 329;
  const viewport = new Node("MarketplaceViewport");
  viewport.addComponent(UITransform).setContentSize(viewportW, viewportH);
  viewport.setPosition(0, -58);
  viewport.addComponent(Mask);
  body.addChild(viewport);

  const cols = 3;
  const cellW = 86;
  const cellH = 136;
  const gapX = 8;
  const gapY = 9;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const gridW = cols * cellW + (cols - 1) * gapX;
  const gridH = rows * cellH + Math.max(0, rows - 1) * gapY;
  const contentH = Math.max(viewportH, gridH + 16);
  const paddingY = (contentH - gridH) / 2;
  const content = new Node("MarketplaceContent");
  content.addComponent(UITransform).setContentSize(viewportW, contentH);
  viewport.addChild(content);

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  (scrollView as any).elastic = false;
  scrollView.content = content;

  items.forEach((item, index) => {
    const unlocked = item.unlockLevel <= gm.playerLevel;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const card = new Node(`MarketplaceItem_${item.id}`);
    card.addComponent(UITransform).setContentSize(cellW, cellH);
    card.setPosition(
      -gridW / 2 + cellW / 2 + col * (cellW + gapX),
      contentH / 2 - paddingY - cellH / 2 - row * (cellH + gapY),
    );
    fillRoundRect(
      card,
      cellW,
      cellH,
      11,
      unlocked ? new Color(255, 250, 232, 248) : new Color(225, 216, 198, 225),
    );
    strokeRoundRect(card, cellW, cellH, 11, new Color(177, 119, 66, 195), 1.8);

    const iconPlate = new Node("MarketplaceIconPlate");
    iconPlate.setPosition(0, 32);
    fillRoundRect(iconPlate, 66, 60, 9, new Color(239, 207, 159, 215));
    const icon = ui.createItemIcon(item.id, 50, true);
    iconPlate.addChild(icon);
    card.addChild(iconPlate);
    card.addChild(
      ui.makeLabel(
        unlocked ? ui.itemName(item.id) : `Lv.${item.unlockLevel}`,
        12,
        new Color(65, 34, 21),
        true,
        0,
        -7,
        82,
        18,
      ),
    );
    const price = ui.getSeedBuyPrice(item);
    card.addChild(
      ui.makeLabel(
        `${price}\u91d1`,
        10,
        new Color(113, 65, 26),
        true,
        0,
        -22,
        76,
        16,
      ),
    );
    const buy = new Node("MarketplaceBuy");
    buy.addComponent(UITransform).setContentSize(78, 30);
    buy.setPosition(0, -49);
    if (unlocked) {
      const visual = new Node("MarketplaceBuyImage");
      visual.addComponent(UITransform).setContentSize(80, 80);
      ui.applyUiIcon("btnBuy", visual);
      buy.addChild(visual);
      bindCatalogPressFeedback(buy, visual);
    } else {
      fillRoundRect(buy, 72, 24, 9, new Color(178, 170, 158, 235));
      strokeRoundRect(buy, 72, 24, 9, new Color(126, 106, 91, 190), 1.5);
      buy.addChild(
        ui.makeLabel(
          "\u672a\u89e3\u9501",
          12,
          new Color(78, 36, 28),
          true,
          0,
          0,
          66,
          20,
        ),
      );
      bindCatalogPressFeedback(buy);
    }
    buy
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, () => ui.buySeed(item));
    card.addChild(buy);
    if (!unlocked) card.addComponent(UIOpacity).opacity = 160;
    content.addChild(card);
  });

  attachPanelScrollState(
    ui,
    body,
    scrollView,
    content,
    contentH,
    viewportH,
    "shopScrollOffset",
    "Marketplace",
    150,
    -58,
    false,
  );
}

export function renderShopPanelScrollable(ui: any) {
  const panel = ui.panels.shop!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  const crops = getPlantableCrops()
    .filter((c) => c.unlockLevel <= gm.playerLevel + 5)
    .sort((a, b) =>
      a.unlockLevel === b.unlockLevel
        ? a.sellPrice - b.sellPrice
        : a.unlockLevel - b.unlockLevel,
    );

  const viewportH = 336;
  const viewport = new Node("ShopViewport");
  viewport.addComponent(UITransform).setContentSize(284, viewportH);
  viewport.setPosition(0, -4);
  viewport.addComponent(Mask);
  body.addChild(viewport);

  const rowH = 48;
  const gap = 6;
  const contentH = Math.max(viewportH, crops.length * (rowH + gap) - gap + 8);
  const content = new Node("ShopContent");
  content.addComponent(UITransform).setContentSize(274, contentH);
  content.setPosition(0, 0);
  viewport.addChild(content);

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.content = content;

  crops.forEach((crop, index) => {
    const y = contentH / 2 - 4 - rowH / 2 - index * (rowH + gap);
    const row = new Node(`Shop_${crop.id}`);
    row.addComponent(UITransform).setContentSize(266, rowH);
    row.setPosition(-4, y);
    const unlocked = crop.unlockLevel <= gm.playerLevel;
    fillRoundRect(
      row,
      266,
      rowH,
      8,
      unlocked ? new Color(248, 252, 238, 245) : new Color(224, 228, 216, 232),
    );
    strokeRoundRect(row, 266, rowH, 8, new Color(154, 196, 138, 120), 1);

    const icon = ui.createItemIcon(crop.id, 34);
    icon.setPosition(-112, 0);
    row.addChild(icon);

    const name = ui.makeLabel(
      `${ui.itemName(crop.id)} Lv.${crop.unlockLevel}`,
      12,
      new Color(54, 72, 46),
      true,
      -52,
      8,
      124,
      16,
    );
    name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(name);

    const price = ui.getSeedBuyPrice(crop);
    const priceLabel = ui.makeLabel(
      `${price} 金`,
      10,
      new Color(194, 132, 20),
      false,
      -52,
      -9,
      90,
      14,
    );
    priceLabel.getComponent(Label)!.horizontalAlign =
      Label.HorizontalAlign.LEFT;
    row.addChild(priceLabel);

    const buy = new Node("Buy");
    buy.addComponent(UITransform).setContentSize(58, 26);
    buy.setPosition(101, 0);
    fillRoundRect(
      buy,
      58,
      26,
      9,
      unlocked ? new Color(76, 188, 83) : new Color(165, 170, 160),
    );
    buy.addChild(
      ui.makeLabel(
        unlocked ? "购买" : "未解锁",
        11,
        new Color(255, 255, 255),
        true,
        0,
        0,
        54,
        22,
      ),
    );
    buy
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, () => ui.buySeed(crop));
    row.addChild(buy);
    content.addChild(row);
  });

  const track = new Node("ShopScrollTrack");
  track.setPosition(140, -4);
  fillRoundRect(track, 4, viewportH, 2, new Color(167, 192, 145, 100));
  body.addChild(track);

  const thumbH = Math.max(34, (viewportH * viewportH) / contentH);
  const thumb = new Node("ShopScrollThumb");
  thumb.setPosition(0, (viewportH - thumbH) / 2);
  fillRoundRect(thumb, 4, thumbH, 2, new Color(105, 174, 86, 210));
  track.addChild(thumb);

  const syncThumb = () => {
    if (!thumb.isValid) return;
    const maxOffset = scrollView.getMaxScrollOffset().y;
    if (maxOffset <= 0) return;
    const ratio = Math.max(
      0,
      Math.min(1, scrollView.getScrollOffset().y / maxOffset),
    );
    thumb.setPosition(
      0,
      (viewportH - thumbH) / 2 - ratio * (viewportH - thumbH),
    );
  };
  scrollView.node.on(ScrollView.EventType.SCROLLING, syncThumb);
  scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, syncThumb);
  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    scrollView.scrollToTop(0);
    syncThumb();
  }, 0);
}

export function renderCraftPanel(ui: any) {
  const panel = ui.panels.craft!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  const craft = CraftSystem.getInstance();
  const inv = InventorySystem.getInstance();
  const allRecipes = getAllRecipes();
  const unlockedRecipeIds = new Set<string>(gm.unlockedRecipes || []);
  const unlockedRecipes = allRecipes.filter(
    (recipe) =>
      recipe.requiredLevel <= gm.playerLevel &&
      unlockedRecipeIds.has(recipe.id),
  );

  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const defaultClose = panel.getChildByName("Close");
  if (defaultClose) defaultClose.active = false;

  drawCommonPanelBackground(ui, body);
  drawRibbonTitle(ui, body, "\u5408\u6210\u5de5\u574a");
  createCatalogCloseHitArea(ui, panel, body);

  if (
    !ui.selectedCraftRecipeId ||
    !unlockedRecipes.some((recipe) => recipe.id === ui.selectedCraftRecipeId)
  ) {
    ui.selectedCraftRecipeId = unlockedRecipes[0]?.id || "";
  }
  const selected = unlockedRecipes.find(
    (recipe) => recipe.id === ui.selectedCraftRecipeId,
  );
  if (!selected) return;

  drawCraftRecipeSection(ui, body, selected, inv);
  drawCraftProgressSection(ui, body, craft.getAllActiveCrafts());
  drawCraftOperationsSection(ui, body, allRecipes, selected, gm.playerLevel);
}

export function refreshCraftPanelDynamicSections(ui: any) {
  const body = ui.panels.craft?.getChildByName("Body");
  if (!body) return;

  const removable = body.children.filter(
    (child) =>
      child.name === "CraftRecipeSection" ||
      child.name === "CraftRecipeSectionBottomShadow" ||
      child.name === "CraftingEmpty" ||
      child.name === "CraftingEmptyBottomShadow" ||
      child.name.startsWith("Crafting_"),
  );
  removable.forEach((child) => {
    child.removeFromParent();
    child.destroy();
  });

  const recipe = getRecipe(ui.selectedCraftRecipeId);
  if (recipe) {
    drawCraftRecipeSection(ui, body, recipe, InventorySystem.getInstance());
  }
  drawCraftProgressSection(
    ui,
    body,
    CraftSystem.getInstance().getAllActiveCrafts(),
  );
}

function drawCraftSectionFrame(
  ui: any,
  parent: Node,
  name: string,
  title: string,
  y: number,
  h: number,
) {
  const shadow = new Node(`${name}BottomShadow`);
  shadow.addComponent(UITransform).setContentSize(300, h);
  shadow.setPosition(0, y - 4);
  fillRoundRect(shadow, 300, h, 13, new Color(111, 68, 38, 35));
  parent.addChild(shadow);

  const section = new Node(name);
  section.addComponent(UITransform).setContentSize(300, h);
  section.setPosition(0, y);
  fillRoundRect(section, 300, h, 14, new Color(255, 253, 242, 246));
  const headingW = Math.max(92, title.length * 21 + 18);
  const halfW = 150;
  const halfH = h / 2;
  const radius = 14;
  const gapHalf = headingW / 2 + 8;
  const border = section.getComponent(Graphics)!;
  border.strokeColor = new Color(139, 91, 53, 225);
  border.lineWidth = 2.2;
  border.moveTo(-gapHalf, halfH);
  border.lineTo(-halfW + radius, halfH);
  border.quadraticCurveTo(-halfW, halfH, -halfW, halfH - radius);
  border.lineTo(-halfW, -halfH + radius);
  border.quadraticCurveTo(-halfW, -halfH, -halfW + radius, -halfH);
  border.lineTo(halfW - radius, -halfH);
  border.quadraticCurveTo(halfW, -halfH, halfW, -halfH + radius);
  border.lineTo(halfW, halfH - radius);
  border.quadraticCurveTo(halfW, halfH, halfW - radius, halfH);
  border.lineTo(gapHalf, halfH);
  border.stroke();

  const headingBg = new Node("SectionHeadingBackground");
  headingBg.setPosition(0, halfH);
  const headingGraphics = headingBg.addComponent(Graphics);
  const headingHalfW = headingW / 2;
  const headingHalfH = 14;
  const headingRadius = 9;
  headingGraphics.fillColor = new Color(255, 253, 242, 246);
  headingGraphics.moveTo(-headingHalfW, -headingHalfH);
  headingGraphics.lineTo(-headingHalfW, headingHalfH - headingRadius);
  headingGraphics.quadraticCurveTo(
    -headingHalfW,
    headingHalfH,
    -headingHalfW + headingRadius,
    headingHalfH,
  );
  headingGraphics.lineTo(headingHalfW - headingRadius, headingHalfH);
  headingGraphics.quadraticCurveTo(
    headingHalfW,
    headingHalfH,
    headingHalfW,
    headingHalfH - headingRadius,
  );
  headingGraphics.lineTo(headingHalfW, -headingHalfH);
  headingGraphics.close();
  headingGraphics.fill();
  section.addChild(headingBg);

  const heading = ui.makeLabel(
    title,
    20,
    new Color(63, 31, 20),
    true,
    0,
    halfH,
    headingW,
    28,
  );
  heading.name = "SectionHeading";
  section.addChild(heading);
  parent.addChild(section);
  return section;
}

function drawCraftRecipeSection(
  ui: any,
  body: Node,
  recipe: RecipeDef,
  inv: InventorySystem,
) {
  const section = drawCraftSectionFrame(
    ui,
    body,
    "CraftRecipeSection",
    "\u5236\u4f5c\u914d\u65b9",
    102,
    120,
  );
  const materialCount = recipe.materials.length;
  const materialGap = materialCount >= 3 ? 44 : 54;
  const materialCenterX =
    materialCount >= 3 ? -80 : materialCount === 2 ? -94 : -100;
  const materialStartX =
    materialCenterX - ((materialCount - 1) * materialGap) / 2;
  const materialCardSize =
    materialCount >= 3 ? 42 : materialCount === 2 ? 46 : 50;
  const materialIconSize = 36;

  recipe.materials.forEach((material, index) => {
    const x = materialStartX + index * materialGap;
    const owned = inv.getItemCount(material.itemId);
    const enough = owned >= material.count;
    const plate = new Node(`CraftMaterial_${material.itemId}`);
    plate.setPosition(x, 14);
    fillRoundRect(
      plate,
      materialCardSize,
      materialCardSize,
      9,
      enough ? new Color(238, 207, 161, 205) : new Color(211, 205, 190, 190),
    );
    const icon = ui.createItemIcon(material.itemId, materialIconSize, true);
    plate.addChild(icon);
    section.addChild(plate);
    section.addChild(
      ui.makeLabel(
        ui.itemName(material.itemId),
        materialCount >= 3 ? 8 : 10,
        enough ? new Color(65, 36, 22) : new Color(164, 72, 54),
        true,
        x,
        -20,
        materialCount >= 3 ? 42 : 52,
        16,
      ),
    );
  });

  const arrow = new Node("CraftRecipeArrow");
  const rightmostMaterialCenter =
    materialStartX + (materialCount - 1) * materialGap;
  const materialGroupRight = rightmostMaterialCenter + materialCardSize / 2;
  const productGroupLeft = 105 - 58 / 2;
  const targetArrowX = Math.round((materialGroupRight + productGroupLeft) / 2);
  const startArrowX =
    typeof ui.craftArrowX === "number" ? ui.craftArrowX : targetArrowX;
  arrow.setPosition(startArrowX, 14);
  arrow.addComponent(UITransform).setContentSize(58, 58);
  drawAnimatedCraftArrow(
    arrow,
    CraftSystem.getInstance().getActiveCraftCount() > 0,
  );
  section.addChild(arrow);
  if (startArrowX !== targetArrowX) {
    tween(arrow)
      .to(
        0.24,
        { position: new Vec3(targetArrowX, 14, 0) },
        { easing: "sineOut" },
      )
      .start();
  }
  ui.craftArrowX = targetArrowX;

  const productPlate = new Node("CraftProduct");
  productPlate.setPosition(105, 14);
  fillRoundRect(productPlate, 58, 58, 10, new Color(234, 197, 148, 210));
  const productIcon = ui.createItemIcon(recipe.product.itemId, 44, true);
  productPlate.addChild(productIcon);
  section.addChild(productPlate);
  section.addChild(
    ui.makeLabel(
      `${ui.itemName(recipe.product.itemId)} x${recipe.product.count}`,
      10,
      new Color(65, 36, 22),
      true,
      105,
      -23,
      68,
      16,
    ),
  );

  const requirement =
    recipe.materials
      .map((material) => `${ui.itemName(material.itemId)} x${material.count}`)
      .join("、") + (recipe.cost > 0 ? ` 和 ${recipe.cost}金币` : "");
  const requirementPrefix = ui.makeLabel(
    "\u9700\u8981\uff1a",
    12,
    new Color(68, 36, 22),
    true,
    -120,
    -46,
    48,
    20,
  );
  requirementPrefix.getComponent(Label)!.horizontalAlign =
    Label.HorizontalAlign.LEFT;
  section.addChild(requirementPrefix);

  const requirementLabel = ui.makeLabel(
    requirement,
    12,
    new Color(68, 36, 22),
    true,
    10,
    -46,
    210,
    20,
  );
  requirementLabel.getComponent(Label)!.horizontalAlign =
    Label.HorizontalAlign.LEFT;
  requirementLabel.getComponent(Label)!.overflow = Label.Overflow.SHRINK;
  requirementLabel.getComponent(Label)!.enableWrapText = false;
  section.addChild(requirementLabel);
}

function traceCraftArrow(graphics: Graphics) {
  graphics.moveTo(-20, -11);
  graphics.quadraticCurveTo(-25, -11, -25, -6);
  graphics.lineTo(-25, 6);
  graphics.quadraticCurveTo(-25, 11, -20, 11);
  graphics.lineTo(-4, 11);
  graphics.lineTo(-4, 20);
  graphics.quadraticCurveTo(-4, 24, 0, 24);
  graphics.quadraticCurveTo(2, 24, 4, 22);
  graphics.lineTo(26, 3);
  graphics.quadraticCurveTo(29, 0, 26, -3);
  graphics.lineTo(4, -22);
  graphics.quadraticCurveTo(2, -24, 0, -24);
  graphics.quadraticCurveTo(-4, -24, -4, -20);
  graphics.lineTo(-4, -11);
  graphics.close();
}

function drawAnimatedCraftArrow(root: Node, active: boolean) {
  const base = new Node("CraftArrowBase");
  const baseGraphics = base.addComponent(Graphics);
  baseGraphics.fillColor = new Color(255, 244, 218, 255);
  traceCraftArrow(baseGraphics);
  baseGraphics.fill();
  root.addChild(base);

  const maskNode = new Node("CraftArrowFillMask");
  maskNode.addComponent(UITransform).setContentSize(58, 58);
  const maskGraphics = maskNode.addComponent(Graphics);
  maskGraphics.fillColor = new Color(255, 255, 255, 255);
  traceCraftArrow(maskGraphics);
  maskGraphics.fill();
  const mask = maskNode.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_STENCIL;

  const fill = new Node("CraftArrowAnimatedFill");
  const fillTransform = fill.addComponent(UITransform);
  fillTransform.setContentSize(58, 58);
  fillTransform.setAnchorPoint(0, 0.5);
  fill.setPosition(-29, 0);
  const fillGraphics = fill.addComponent(Graphics);
  fillGraphics.fillColor = new Color(245, 177, 74, 235);
  fillGraphics.rect(0, -29, 58, 58);
  fillGraphics.fill();
  fill.setScale(new Vec3(0, 1, 1));
  fill.active = active;
  maskNode.addChild(fill);
  root.addChild(maskNode);

  const outline = new Node("CraftArrowOutline");
  const outlineGraphics = outline.addComponent(Graphics);
  outlineGraphics.strokeColor = new Color(139, 91, 53, 255);
  outlineGraphics.lineWidth = 3;
  outlineGraphics.lineJoin = Graphics.LineJoin.ROUND;
  traceCraftArrow(outlineGraphics);
  outlineGraphics.stroke();
  root.addChild(outline);
}

function drawCraftProgressSection(
  ui: any,
  body: Node,
  active: ReturnType<CraftSystem["getAllActiveCrafts"]>,
) {
  const process = active[0];
  const recipe = process ? getRecipe(process.recipeId) : undefined;
  const section = drawCraftSectionFrame(
    ui,
    body,
    process ? `Crafting_${process.craftId}` : "CraftingEmpty",
    "\u5236\u4f5c\u8fdb\u7a0b",
    -20,
    92,
  );
  if (!process || !recipe) {
    section.addChild(
      ui.makeLabel(
        "\u5f53\u524d\u6ca1\u6709\u8fdb\u884c\u4e2d\u7684\u5408\u6210",
        14,
        new Color(112, 88, 68),
        true,
        0,
        -4,
        200,
        26,
      ),
    );
    drawCraftChefIcon(ui, section, 120, -4);
    return;
  }

  const progress = Math.max(0, Math.min(100, process.progress));
  const barW = 190;
  const bar = new Node("CraftProgressBg");
  bar.setPosition(-22, 7);
  (bar as any).craftProgressWidth = barW;
  (bar as any).craftProgressPercent = Math.floor(progress);
  drawCatalogStyleProgress(
    bar,
    barW,
    progress / 100,
    new Color(220, 190, 153, 245),
    new Color(148, 210, 112, 245),
    "CraftProgressFill",
    "CraftProgressKnob",
    false,
  );
  section.addChild(bar);

  const progressText = ui.makeLabel(
    `${Math.floor(progress)}%`,
    11,
    new Color(55, 30, 20),
    true,
    -22,
    7,
    barW,
    16,
  );
  progressText.name = "CraftProgressText";
  section.addChild(progressText);
  section.addChild(
    ui.makeLabel(
      `\u8fdb\u884c\u4e2d\uff1a${ui.recipeName(recipe)}`,
      11,
      new Color(78, 54, 38),
      true,
      -73,
      -24,
      116,
      16,
    ),
  );
  drawCraftChefIcon(ui, section, 112, -2);

  const inventory = InventorySystem.getInstance();
  const speedTicketCount = inventory.getItemCount("speedTicket");
  if (speedTicketCount > 0) {
    const speedButton = new Node("CraftSpeedTicketButton");
    speedButton.addComponent(UITransform).setContentSize(92, 24);
    speedButton.setPosition(42, -24);
    fillRoundRect(speedButton, 90, 22, 8, new Color(247, 222, 166, 250));
    strokeRoundRect(speedButton, 90, 22, 8, new Color(153, 101, 58, 220), 1.4);
    const ticketIcon = ui.createItemIcon("speedTicket", 20, true);
    ticketIcon.setPosition(-32, 0);
    speedButton.addChild(ticketIcon);
    const ticketLabel = ui.makeLabel(
      `加速30秒 x${speedTicketCount}`,
      9,
      new Color(82, 45, 28),
      true,
      10,
      0,
      66,
      16,
    );
    ticketLabel.name = "CraftSpeedTicketCount";
    speedButton.addChild(ticketLabel);
    bindCatalogPressFeedback(speedButton);
    speedButton
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (!CraftSystem.getInstance().useSpeedTicket(process.craftId)) {
          ui.toast("当前无法使用加速券");
          return;
        }
        ui.toast("制作时间减少30秒");
        if (!speedButton.isValid) return;
        const remaining =
          InventorySystem.getInstance().getItemCount("speedTicket");
        if (remaining <= 0) {
          speedButton.active = false;
        } else {
          ticketLabel.getComponent(Label)!.string = `加速30秒 x${remaining}`;
        }
      });
    section.addChild(speedButton);
  }

  if (active.length > 1) {
    section.addChild(
      ui.makeLabel(
        `+${active.length - 1}`,
        10,
        new Color(92, 62, 42),
        true,
        124,
        -24,
        28,
        16,
      ),
    );
  }
}

function drawCraftChefIcon(ui: any, parent: Node, x: number, y: number) {
  const root = new Node("CraftChefIcon");
  root.setPosition(x, y);
  root.addComponent(UITransform).setContentSize(58, 58);
  ui.applyUiIcon("craftChefTools", root);
  parent.addChild(root);
}

function drawCraftOperationsSection(
  ui: any,
  body: Node,
  recipes: RecipeDef[],
  selected: RecipeDef,
  playerLevel: number,
) {
  const section = drawCraftSectionFrame(
    ui,
    body,
    "CraftOperationsSection",
    "\u53ef\u7528\u914d\u65b9\u4e0e\u64cd\u4f5c",
    -160,
    156,
  );
  const viewport = new Node("CraftRecipeGridViewport");
  viewport.addComponent(UITransform).setContentSize(174, 112);
  viewport.setPosition(-56, -4);
  viewport.addComponent(Mask);
  section.addChild(viewport);

  const cellW = 52;
  const cellH = 62;
  const gapX = 4;
  const gapY = 4;
  const cols = 3;
  const rows = Math.ceil(recipes.length / cols);
  const contentH = Math.max(112, rows * cellH + Math.max(0, rows - 1) * gapY);
  const content = new Node("CraftRecipeGridContent");
  content.addComponent(UITransform).setContentSize(174, contentH);
  const maxScrollOffset = Math.max(0, contentH - 112);
  const restoredScrollOffset = Math.max(
    0,
    Math.min(ui.craftRecipeScrollOffset || 0, maxScrollOffset),
  );
  content.setPosition(0, -maxScrollOffset / 2 + restoredScrollOffset);
  viewport.addChild(content);

  recipes.forEach((recipe, index) => {
    const unlocked = recipe.requiredLevel <= playerLevel;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cell = new Node(`CraftRecipe_${recipe.id}`);
    cell.addComponent(UITransform).setContentSize(cellW, cellH);
    cell.setPosition(
      -56 + col * (cellW + gapX),
      contentH / 2 - cellH / 2 - row * (cellH + gapY),
    );
    const isSelected = recipe.id === selected.id;
    fillRoundRect(
      cell,
      cellW,
      cellH,
      9,
      isSelected
        ? new Color(255, 235, 176, 255)
        : new Color(234, 197, 148, unlocked ? 205 : 135),
    );
    strokeRoundRect(
      cell,
      cellW,
      cellH,
      9,
      isSelected ? new Color(173, 118, 55, 255) : new Color(207, 170, 115, 150),
      isSelected ? 2.4 : 1,
    );
    const icon = ui.createItemIcon(recipe.product.itemId, 34, true);
    icon.setPosition(0, 8);
    cell.addChild(icon);
    cell.addChild(
      ui.makeLabel(
        unlocked
          ? ui.itemName(recipe.product.itemId)
          : `Lv.${recipe.requiredLevel}`,
        9,
        unlocked ? new Color(65, 36, 22) : new Color(115, 105, 92),
        true,
        0,
        -22,
        48,
        14,
      ),
    );
    if (!unlocked) cell.addComponent(UIOpacity).opacity = 145;
    bindCatalogPressFeedback(cell);
    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (!unlocked) {
          ui.toast(`Lv.${recipe.requiredLevel} \u89e3\u9501`);
          return;
        }
        ui.craftRecipeScrollOffset = scrollView.getScrollOffset().y;
        ui.selectedCraftRecipeId = recipe.id;
        ui.renderCraftPanel();
      });
    content.addChild(cell);
  });

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  (scrollView as any).elastic = false;
  scrollView.content = content;
  const rememberScroll = () => {
    ui.craftRecipeScrollOffset = scrollView.getScrollOffset().y;
  };
  scrollView.node.on(ScrollView.EventType.SCROLLING, rememberScroll);
  scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, rememberScroll);
  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    const max = Math.max(0, scrollView.getMaxScrollOffset().y);
    scrollView.scrollToOffset(
      new Vec2(0, Math.max(0, Math.min(ui.craftRecipeScrollOffset || 0, max))),
      0,
    );
  }, 0);

  const startButton = createCraftActionButton(ui, 96, -4, () =>
    ui.startCraft(selected.id),
  );
  section.addChild(startButton);

  const craft = CraftSystem.getInstance();
  const tableButton = new Node("CraftTableUpgradeButton");
  tableButton.addComponent(UITransform).setContentSize(104, 24);
  tableButton.setPosition(96, 38);
  const atMax = craft.getMaxCraftTables() >= GameValues.MAX_CRAFT_TABLES;
  fillRoundRect(
    tableButton,
    104,
    22,
    8,
    atMax ? new Color(224, 211, 187, 235) : new Color(247, 222, 166, 245),
  );
  strokeRoundRect(tableButton, 104, 22, 8, new Color(153, 101, 58, 210), 1.4);
  tableButton.addChild(
    ui.makeLabel(
      atMax
        ? `制作队列 ${craft.getMaxCraftTables()}/${GameValues.MAX_CRAFT_TABLES}`
        : `制作队列 ${craft.getMaxCraftTables()}/${GameValues.MAX_CRAFT_TABLES}  +${craft.getCraftTableUpgradeCost()}金`,
      10,
      new Color(82, 45, 28),
      true,
      0,
      0,
      100,
      18,
    ),
  );
  if (!atMax) {
    bindCatalogPressFeedback(tableButton);
    tableButton
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (!craft.upgradeMaxTables()) {
          ui.toast("金币不足");
          return;
        }
        ui.toast(`制作队列扩充至 ${craft.getMaxCraftTables()} 个`);
      });
  }
  section.addChild(tableButton);
}

function createCraftActionButton(
  ui: any,
  x: number,
  y: number,
  action: () => void,
) {
  const button = new Node("CraftActionButton");
  const buttonW = 94;
  const buttonH = 40;
  button.addComponent(UITransform).setContentSize(buttonW, buttonH);
  button.setPosition(x, y);
  const visual = new Node("CraftActionVisual");
  visual.addComponent(UITransform).setContentSize(112, 112);
  ui.applyUiIcon("btnCraft", visual);
  button.addChild(visual);
  bindCatalogPressFeedback(button, visual);
  button
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      action();
    });
  return button;
}

export function renderQuestPanel(ui: any, enterDirection = 0) {
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
  items.sort((a, b) => {
    const levelA = ui.catalogLevel(a);
    const levelB = ui.catalogLevel(b);
    if (levelA !== levelB) return levelA - levelB;
    if (a.rarity !== b.rarity) return a.rarity - b.rarity;
    return a.category - b.category;
  });

  const progress = gm.getCatalogProgress();
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  ui.catalogPage = Math.max(0, Math.min(pageCount - 1, ui.catalogPage || 0));

  drawCatalogBackground(ui, body, ui.catalogPage);
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
    ui.catalogPage + 1,
    pageCount,
  );
  createCatalogCloseHitArea(ui, panel, body);
  createCatalogPageTurnHitArea(ui, body, ui.catalogPage, pageCount);
}

function clearCatalogPanelChrome(panel: Node) {
  const graphics = panel.getComponents(Graphics);
  graphics.forEach((g) => g.clear());
}

function drawCatalogBackground(ui: any, body: Node, pageIndex: number) {
  drawPanelImageBackground(ui, body, "catalogBg", "CatalogImageBackground");
  if (pageIndex > 0) drawCatalogPrevArrow(body);
}

function drawCommonPanelBackground(ui: any, body: Node) {
  drawPanelImageBackground(ui, body, "panelBg", "CommonPanelImageBackground");
}

const CATALOG_BACKGROUND_IMAGE_WIDTH = Design.WIDTH + 10;
const CATALOG_BACKGROUND_IMAGE_HEIGHT = 540;
const CATALOG_BACKGROUND_IMAGE_X = 0;
const CATALOG_BACKGROUND_IMAGE_Y = 0;
const CATALOG_CARD_COLUMN_X = [-111, -1, 109] as const;
const CATALOG_CARD_ROW_Y = [107, -32, -171] as const;
const CATALOG_ICON_Y = 20;
const CATALOG_NAME_Y = -45;

function drawPanelImageBackground(
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

const CATALOG_PREV_ARROW_X = -104;
const CATALOG_PREV_ARROW_Y = -251;
const CATALOG_PROGRESS_X = 7;
const CATALOG_PROGRESS_TEXT_X = 111;

function drawCatalogPrevArrow(body: Node) {
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
}

function createCatalogCard(ui: any, gm: GameManager, item: ItemDef): Node {
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

function getCatalogLockFrame() {
  return {
    w: 96,
    h: 128,
    x: 0,
    y: 0,
  };
}

function drawCatalogProgress(
  ui: any,
  body: Node,
  unlocked: number,
  total: number,
  page: number,
  pageCount: number,
) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, unlocked / total)) : 0;
  const trackW = 148;
  const track = new Node("CatalogProgressTrack");
  track.setPosition(CATALOG_PROGRESS_X, CATALOG_PREV_ARROW_Y);
  drawCatalogStyleProgress(
    track,
    trackW,
    ratio,
    new Color(154, 104, 80, 230),
    new Color(255, 203, 79, 255),
  );
  body.addChild(track);

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

function createCatalogCloseHitArea(ui: any, panel: Node, body: Node) {
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

function createCatalogPageTurnHitArea(
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

function bindCatalogPressFeedback(hitArea: Node, visual: Node = hitArea) {
  hitArea.on(Node.EventType.TOUCH_START, () => {
    tween(visual).stop();
    tween(visual)
      .to(0.06, { scale: new Vec3(0.9, 0.9, 1) }, { easing: "quadOut" })
      .start();
  });
  const restore = () => {
    tween(visual).stop();
    tween(visual)
      .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();
  };
  hitArea.on(Node.EventType.TOUCH_END, restore);
  hitArea.on(Node.EventType.TOUCH_CANCEL, restore);
}

function setupCategoryTabVisual(icon: Node, label: Node, selected: boolean) {
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

function bindCategoryTabPressFeedback(
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

function renderQuestPanelLegacy(ui: any) {
  const panel = ui.panels.quest!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  const inv = InventorySystem.getInstance();
  const land = LandSystem.getInstance();
  const items: ItemDef[] = [];
  for (const id in ITEM_DB) {
    if (Object.prototype.hasOwnProperty.call(ITEM_DB, id))
      items.push(ITEM_DB[id]);
  }
  items.sort((a, b) => {
    const levelA = ui.catalogLevel(a);
    const levelB = ui.catalogLevel(b);
    if (levelA !== levelB) return levelA - levelB;
    if (a.rarity !== b.rarity) return a.rarity - b.rarity;
    return a.category - b.category;
  });

  const progress = gm.getCatalogProgress();
  const summary = ui.makeLabel(
    `收集 ${progress.unlocked}/${progress.total}  成就 ${gm.achievements.length}`,
    12,
    new Color(92, 104, 82),
    false,
    -94,
    152,
    190,
    20,
  );
  summary.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  body.addChild(summary);

  const viewportH = 316;
  const viewport = new Node("CatalogViewport");
  viewport.addComponent(UITransform).setContentSize(284, viewportH);
  viewport.setPosition(0, -12);
  viewport.addComponent(Mask);
  body.addChild(viewport);

  const rowH = 52;
  const gap = 6;
  const contentH = Math.max(viewportH, items.length * (rowH + gap) - gap + 8);
  const content = new Node("CatalogContent");
  content.addComponent(UITransform).setContentSize(274, contentH);
  viewport.addChild(content);

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.content = content;

  items.forEach((item, index) => {
    const y = contentH / 2 - 4 - rowH / 2 - index * (rowH + gap);
    const discovered = gm.hasDiscoveredItem(item.id);
    const levelUnlocked = item.unlockLevel <= gm.playerLevel;
    const row = new Node(`Catalog_${item.id}`);
    row.addComponent(UITransform).setContentSize(266, rowH);
    row.setPosition(-4, y);
    fillRoundRect(
      row,
      266,
      rowH,
      8,
      discovered
        ? new Color(248, 252, 238, 245)
        : new Color(224, 228, 216, 232),
    );
    strokeRoundRect(row, 266, rowH, 8, new Color(154, 196, 138, 120), 1);

    const icon = ui.createItemIcon(item.id, 32);
    icon.setPosition(-112, 0);
    row.addChild(icon);
    if (!discovered) icon.setScale(0.75, 0.75, 1);

    const name = ui.makeLabel(
      `${discovered ? ui.itemName(item.id) : "未发现"} Lv.${ui.catalogLevel(item)}`,
      12,
      new Color(54, 72, 46),
      true,
      -52,
      11,
      140,
      16,
    );
    name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(name);

    const own = inv.getItemCount(item.id);
    const plantText = item.isCrop
      ? ` 种植 ${land.getPlantCount(item.id)} 次`
      : "";
    const info = ui.makeLabel(
      `拥有 ${own}${plantText}`,
      10,
      new Color(108, 112, 96),
      false,
      -52,
      -6,
      160,
      14,
    );
    info.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(info);

    const rarity = ui.makeLabel(
      discovered ? `${item.rarity}星` : levelUnlocked ? "待获得" : "未解锁",
      10,
      discovered ? new Color(194, 132, 20) : new Color(150, 156, 140),
      true,
      104,
      0,
      56,
      18,
    );
    row.addChild(rarity);
    content.addChild(row);
  });

  const track = new Node("CatalogScrollTrack");
  track.setPosition(140, -12);
  fillRoundRect(track, 4, viewportH, 2, new Color(167, 192, 145, 100));
  body.addChild(track);

  const thumbH = Math.max(34, (viewportH * viewportH) / contentH);
  const thumb = new Node("CatalogScrollThumb");
  thumb.setPosition(0, (viewportH - thumbH) / 2);
  fillRoundRect(thumb, 4, thumbH, 2, new Color(105, 174, 86, 210));
  track.addChild(thumb);

  const syncThumb = () => {
    if (!thumb.isValid) return;
    const maxOffset = scrollView.getMaxScrollOffset().y;
    if (maxOffset <= 0) return;
    const ratio = Math.max(
      0,
      Math.min(1, scrollView.getScrollOffset().y / maxOffset),
    );
    thumb.setPosition(
      0,
      (viewportH - thumbH) / 2 - ratio * (viewportH - thumbH),
    );
  };
  scrollView.node.on(ScrollView.EventType.SCROLLING, syncThumb);
  scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, syncThumb);
  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    scrollView.scrollToTop(0);
    syncThumb();
  }, 0);
}

export function renderTaskPanel(ui: any) {
  const panel = ui.panels.task!;
  const body = ui.clearPanelBody(panel);
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const close = panel.getChildByName("Close");
  if (close) close.active = false;

  drawCommonPanelBackground(ui, body);
  drawRibbonTitle(ui, body, "\u4efb\u52a1\u4e2d\u5fc3");
  createCatalogCloseHitArea(ui, panel, body);
  refreshTaskCategoryContent(ui, body);
}

function refreshTaskCategoryContent(ui: any, body: Node) {
  const removable = body.children.filter(
    (child) =>
      child.name === "TaskCategoryTabsImage" ||
      child.name === "TaskListViewport" ||
      child.name.startsWith("TaskTabHit_"),
  );
  removable.forEach((child) => {
    child.removeFromParent();
    child.destroy();
  });

  if (!ui.taskCategory) ui.taskCategory = "main";
  const gm = GameManager.getInstance();
  const cards = createTaskCardData(gm.getTasks(ui.taskCategory));
  if (ui.taskDetailId === undefined) ui.taskDetailId = "";
  if (!cards.some((task) => task.id === ui.taskDetailId)) ui.taskDetailId = "";
  drawTaskCategoryTabs(ui, body);
  drawTaskListScroll(ui, gm, body, cards);
}

export function renderDailySignInPanel(ui: any) {
  const panel = ui.panels.signIn!;
  const body = ui.clearPanelBody(panel);
  const gm = GameManager.getInstance();
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const close = panel.getChildByName("Close");
  if (close) close.active = false;

  drawCommonPanelBackground(ui, body);
  const signInTint = new Node("SignInPaperTint");
  signInTint.addComponent(UITransform).setContentSize(Design.WIDTH, 540);
  const tintGraphics = signInTint.addComponent(Graphics);
  tintGraphics.fillColor = new Color(224, 244, 211, 46);
  tintGraphics.rect(-Design.WIDTH / 2, -270, Design.WIDTH, 540);
  tintGraphics.fill();
  body.addChild(signInTint);
  drawRibbonTitle(ui, body, "每日签到");
  createCatalogCloseHitArea(ui, panel, body);

  const summary = new Node("SignInSummary");
  summary.setPosition(0, 152);
  fillRoundRect(summary, 306, 52, 12, new Color(255, 242, 205, 245));
  strokeRoundRect(summary, 306, 52, 12, new Color(218, 171, 100, 205), 1.8);
  const missedDay = gm.getMissedDailySignInDay();
  const summaryTextX = missedDay ? -34 : 0;
  const summaryTextW = missedDay ? 208 : 280;
  const summaryValue = ui.makeLabel(
    `本轮已签到 ${gm.dailySignInDay}/7 天`,
    17,
    new Color(103, 55, 29),
    true,
    summaryTextX,
    9,
    summaryTextW,
    24,
  );
  summaryValue.name = "SignInSummaryValue";
  summary.addChild(summaryValue);
  summary.addChild(
    ui.makeLabel(
      "每天登录农场，好礼不间断",
      12,
      new Color(154, 100, 58),
      false,
      summaryTextX,
      -12,
      summaryTextW,
      20,
    ),
  );
  body.addChild(summary);
  if (missedDay) addDailySignInMakeUpAction(ui, body, summary, missedDay);

  const claimable = gm.isDailySignInClaimable();
  const displayDay = gm.getDailySignInDisplayDay();
  DAILY_SIGN_IN_REWARDS.forEach((reward, index) => {
    const row = index < 4 ? 0 : 1;
    const count = row === 0 ? 4 : 3;
    const rowWidth = count * 72 + (count - 1) * 8;
    const col = row === 0 ? index : index - 4;
    const x = -rowWidth / 2 + 36 + col * 80;
    const y = row === 0 ? 58 : -69;
    const claimed = claimable
      ? reward.day < (missedDay || displayDay)
      : reward.day <= gm.dailySignInDay;
    const current = reward.day === (missedDay || displayDay);
    body.addChild(
      createDailySignInCard(
        ui,
        reward,
        x,
        y,
        claimed,
        current,
        claimable && current,
      ),
    );
  });

  const button = new Node("DailySignInClaimButton");
  button.setPosition(0, -178);
  button.addComponent(UITransform).setContentSize(154, 62);
  const buttonVisual = new Node("DailySignInButtonVisual");
  buttonVisual.addComponent(UITransform).setContentSize(168, 168);
  ui.applyUiIcon(claimable ? "signInClaim" : "signInClaimed", buttonVisual);
  button.addChild(buttonVisual);
  if (claimable) {
    button
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        const reward = gm.claimDailySignIn();
        if (!reward) return;
        tween(button)
          .to(0.08, { scale: new Vec3(0.94, 0.94, 1) }, { easing: "quadOut" })
          .to(0.16, { scale: new Vec3(1.06, 1.06, 1) }, { easing: "backOut" })
          .call(() => {
            ui.toast(`签到成功：${reward.label} x${reward.count}`);
            updateDailySignInClaimedState(ui, body, reward.day, button);
          })
          .start();
      });
  }
  body.addChild(button);

  const footer = new Node("SignInFooterHint");
  footer.setPosition(0, -226);
  const footerLineLeft = new Node("FooterLineLeft");
  footerLineLeft.setPosition(-111, 0);
  fillRoundRect(footerLineLeft, 58, 2, 1, new Color(215, 170, 105, 145));
  footer.addChild(footerLineLeft);
  const footerLineRight = new Node("FooterLineRight");
  footerLineRight.setPosition(111, 0);
  fillRoundRect(footerLineRight, 58, 2, 1, new Color(215, 170, 105, 145));
  footer.addChild(footerLineRight);
  footer.addChild(
    ui.makeLabel(
      "第7天随机获得神秘礼物",
      12,
      new Color(151, 96, 55),
      false,
      0,
      0,
      170,
      20,
    ),
  );
  body.addChild(footer);
}

function createDailySignInCard(
  ui: any,
  reward: DailySignInReward,
  x: number,
  y: number,
  claimed: boolean,
  current: boolean,
  animateCurrent: boolean,
): Node {
  const card = new Node(`SignInDay_${reward.day}`);
  card.setPosition(x, y);
  (card as any).restingX = x;
  (card as any).restingY = y;
  card.addComponent(UITransform).setContentSize(72, 116);
  const fill = claimed
    ? new Color(225, 240, 191, 250)
    : current
      ? new Color(255, 225, 153, 255)
      : new Color(247, 218, 169, 245);
  const border = current
    ? new Color(205, 126, 48, 255)
    : new Color(201, 151, 83, 220);
  fillRoundRect(card, 72, 112, 9, fill);
  strokeRoundRect(card, 72, 112, 9, border, current ? 2.6 : 1.8);

  card.addChild(
    ui.makeLabel(
      `第${reward.day}天`,
      13,
      new Color(102, 55, 30),
      true,
      0,
      42,
      66,
      20,
    ),
  );

  const iconFrame = new Node("RewardFrame");
  iconFrame.setPosition(0, 4);
  fillRoundRect(iconFrame, 50, 50, 9, new Color(255, 247, 215, 225));
  card.addChild(iconFrame);
  const icon = reward.itemId
    ? ui.createItemIcon(reward.itemId, 42, true)
    : new Node("CurrencyIcon");
  icon.name = "RewardIcon";
  if (!reward.itemId) {
    icon.addComponent(UITransform).setContentSize(38, 38);
    ui.applyUiIcon(reward.type, icon);
  }
  iconFrame.addChild(icon);

  card.addChild(
    ui.makeLabel(
      `${reward.label} x${reward.count}`,
      12,
      new Color(91, 49, 29),
      true,
      0,
      -40,
      68,
      22,
    ),
  );

  if (claimed) {
    const mark = new Node("ClaimedMark");
    mark.setPosition(23, 36);
    const g = mark.addComponent(Graphics);
    g.fillColor = new Color(105, 180, 79, 255);
    g.circle(0, 0, 9);
    g.fill();
    g.strokeColor = new Color(255, 250, 225, 255);
    g.lineWidth = 2;
    g.moveTo(-4, 0);
    g.lineTo(-1, -3);
    g.lineTo(5, 4);
    g.stroke();
    card.addChild(mark);
  }
  if (current) {
    const glow = new Node("CurrentDayGlow");
    const glowGraphics = glow.addComponent(Graphics);
    glowGraphics.strokeColor = new Color(255, 196, 71, 175);
    glowGraphics.lineWidth = 4;
    glowGraphics.roundRect(-38, -58, 76, 116, 11);
    glowGraphics.stroke();
    card.addChild(glow);
    if (animateCurrent) {
      tween(card)
        .repeatForever(
          tween()
            .to(
              0.9,
              { position: new Vec3(x, y + 4, 0) },
              { easing: "quadInOut" },
            )
            .to(0.9, { position: new Vec3(x, y, 0) }, { easing: "quadInOut" }),
        )
        .start();
      tween(glow)
        .repeatForever(
          tween()
            .to(
              0.9,
              { scale: new Vec3(1.04, 1.04, 1) },
              { easing: "quadInOut" },
            )
            .to(
              0.9,
              { scale: new Vec3(0.98, 0.98, 1) },
              { easing: "quadInOut" },
            ),
        )
        .start();
    }
  }
  return card;
}

function addDailySignInMakeUpAction(
  ui: any,
  body: Node,
  summary: Node,
  missedDay: number,
) {
  const action = new Node("DailySignInMakeUpAction");
  action.setPosition(108, 0);
  action.addComponent(UITransform).setContentSize(82, 38);
  fillRoundRect(action, 82, 38, 10, new Color(242, 190, 132, 255));
  strokeRoundRect(action, 82, 38, 10, new Color(159, 91, 47, 235), 1.8);
  const icon = ui.createItemIcon("makeUpSignInCard", 29, true);
  icon.setPosition(-23, 0);
  action.addChild(icon);
  const count = InventorySystem.getInstance().getItemCount("makeUpSignInCard");
  action.addChild(
    ui.makeLabel(
      `补签\nx${count}`,
      11,
      new Color(91, 46, 27),
      true,
      14,
      0,
      43,
      31,
    ),
  );
  action
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      const gm = GameManager.getInstance();
      if (InventorySystem.getInstance().getItemCount("makeUpSignInCard") <= 0) {
        ui.toast("补签卡不足");
        return;
      }
      const reward = gm.claimMissedDailySignIn();
      if (!reward) return;
      ui.toast(`补签成功：${reward.label} x${reward.count}`);
      updateDailySignInAfterMakeUp(ui, body, summary, missedDay);
    });
  summary.addChild(action);
}

function replaceDailySignInCardState(
  ui: any,
  body: Node,
  day: number,
  claimed: boolean,
  current: boolean,
  animateCurrent: boolean,
) {
  const oldCard = body.getChildByName(`SignInDay_${day}`);
  const reward = DAILY_SIGN_IN_REWARDS[day - 1];
  if (!oldCard || !reward) return;
  Tween.stopAllByTarget(oldCard);
  const oldGlow = oldCard.getChildByName("CurrentDayGlow");
  if (oldGlow) Tween.stopAllByTarget(oldGlow);
  const x = (oldCard as any).restingX ?? oldCard.position.x;
  const y = (oldCard as any).restingY ?? oldCard.position.y;
  const replacement = createDailySignInCard(
    ui,
    reward,
    x,
    y,
    claimed,
    current,
    animateCurrent,
  );
  const index = oldCard.getSiblingIndex();
  oldCard.removeFromParent();
  oldCard.destroy();
  body.addChild(replacement);
  replacement.setSiblingIndex(index);
}

function updateDailySignInAfterMakeUp(
  ui: any,
  body: Node,
  summary: Node,
  missedDay: number,
) {
  replaceDailySignInCardState(ui, body, missedDay, true, false, false);
  const nextDay = GameManager.getInstance().getDailySignInDisplayDay();
  if (nextDay !== missedDay) {
    replaceDailySignInCardState(ui, body, nextDay, false, true, true);
  }
  const action = summary.getChildByName("DailySignInMakeUpAction");
  if (action) {
    action.removeFromParent();
    action.destroy();
  }
  const summaryValue = summary.getChildByName("SignInSummaryValue");
  if (summaryValue) {
    summaryValue.setPosition(0, 9);
    summaryValue.getComponent(UITransform)!.setContentSize(280, 24);
    summaryValue.getComponent(Label)!.string =
      `本轮已签到 ${GameManager.getInstance().dailySignInDay}/7 天`;
  }
  const subtitle = summary.children.find((child) => child !== summaryValue);
  if (subtitle) {
    subtitle.setPosition(0, -12);
    subtitle.getComponent(UITransform)?.setContentSize(280, 20);
  }
}

function updateDailySignInClaimedState(
  ui: any,
  body: Node,
  day: number,
  button: Node,
) {
  const gm = GameManager.getInstance();
  const oldCard = body.getChildByName(`SignInDay_${day}`);
  if (oldCard) {
    Tween.stopAllByTarget(oldCard);
    const oldGlow = oldCard.getChildByName("CurrentDayGlow");
    if (oldGlow) Tween.stopAllByTarget(oldGlow);
    const x = (oldCard as any).restingX ?? oldCard.position.x;
    const y = (oldCard as any).restingY ?? oldCard.position.y;
    const reward = DAILY_SIGN_IN_REWARDS[day - 1];
    const replacement = createDailySignInCard(
      ui,
      reward,
      x,
      y,
      true,
      true,
      false,
    );
    const index = oldCard.getSiblingIndex();
    oldCard.removeFromParent();
    oldCard.destroy();
    body.addChild(replacement);
    replacement.setSiblingIndex(index);
  }

  const summary = body
    .getChildByName("SignInSummary")
    ?.children.find((child) => child.name === "SignInSummaryValue");
  if (summary) {
    summary.getComponent(Label)!.string =
      `本轮已签到 ${gm.dailySignInDay}/7 天`;
  }

  const oldVisual = button.getChildByName("DailySignInButtonVisual");
  if (oldVisual) {
    oldVisual.removeFromParent();
    oldVisual.destroy();
  }
  const claimedVisual = new Node("DailySignInButtonVisual");
  claimedVisual.addComponent(UITransform).setContentSize(168, 168);
  ui.applyUiIcon("signInClaimed", claimedVisual);
  button.addChild(claimedVisual);
  const buttonComponent = button.getComponent(Button);
  if (buttonComponent) buttonComponent.interactable = false;
  button.setScale(new Vec3(1, 1, 1));
}

const ACHIEVEMENT_CATEGORY_TABS: Array<{
  type: AchievementCategory;
  text: string;
  image: string;
  icon: string;
  iconSize: number;
  iconOffsetX: number;
  width: number;
  visualX: number;
}> = [
  {
    type: "planting",
    text: "种植成就",
    image: "taskTabsMain",
    icon: "achievementCategoryPlanting",
    iconSize: 31,
    iconOffsetX: 0,
    width: 84,
    visualX: -121,
  },
  {
    type: "crafting",
    text: "合成成就",
    image: "taskTabsDaily",
    icon: "achievementCategoryCrafting",
    iconSize: 30,
    iconOffsetX: 1,
    width: 88,
    visualX: -36,
  },
  {
    type: "growth",
    text: "经营成长",
    image: "taskTabsBranch",
    icon: "achievementCategoryGrowth",
    iconSize: 29,
    iconOffsetX: 1,
    width: 84,
    visualX: 47,
  },
  {
    type: "collection",
    text: "收集牧场",
    image: "taskTabsSpecial",
    icon: "achievementCategoryCollection",
    iconSize: 27,
    iconOffsetX: 3,
    width: 88,
    visualX: 128,
  },
];

function getAchievementProgress(
  gm: GameManager,
  definition: AchievementDefinition,
  unlocked: boolean,
): { current: number; target: number } {
  let current = 0;
  let target = Math.max(1, definition.target || 1);
  switch (definition.progressKind) {
    case "plants":
      current = LandSystem.getInstance().getTotalPlantCount();
      break;
    case "crafts":
      current = gm.totalCraftCount;
      break;
    case "gold":
      current = gm.gold;
      break;
    case "diamonds":
      current = gm.diamond;
      break;
    case "level":
      current = gm.playerLevel;
      break;
    case "recipes":
      current = gm.unlockedRecipes.length;
      target = getAllRecipes().length;
      break;
    case "catalog": {
      const catalog = gm.getCatalogProgress();
      current = catalog.unlocked;
      target = definition.target || catalog.total;
      break;
    }
    case "pastureCollections":
      current = gm.totalPastureCollectCount;
      break;
  }
  if (unlocked) current = Math.max(current, target);
  return { current: Math.min(current, target), target };
}

export function renderAchievementPanel(ui: any) {
  const panel = ui.panels.achievement!;
  const body = ui.clearPanelBody(panel);
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const close = panel.getChildByName("Close");
  if (close) close.active = false;
  drawCommonPanelBackground(ui, body);
  drawRibbonTitle(ui, body, "成就手册");
  createCatalogCloseHitArea(ui, panel, body);
  refreshAchievementCategoryContent(ui, body);
  drawAchievementMedalWallEntry(ui, body);
}

function refreshAchievementCategoryContent(ui: any, body: Node) {
  body.children
    .filter(
      (child) =>
        child.name === "AchievementCategoryTabsImage" ||
        child.name === "AchievementListViewport" ||
        child.name.startsWith("AchievementTabHit_"),
    )
    .forEach((child) => {
      child.removeFromParent();
      child.destroy();
    });
  if (
    !ACHIEVEMENT_CATEGORY_TABS.some(
      (tab) => tab.type === ui.achievementCategory,
    )
  ) {
    ui.achievementCategory = "planting";
  }
  drawAchievementCategoryTabs(ui, body);
  drawAchievementList(ui, body);
}

function drawAchievementCategoryTabs(ui: any, body: Node) {
  const baselineY = 126;
  const imageW = 360;
  const imageH = 60;
  const hitH = 60;
  const tabGap = 5;
  const totalW =
    ACHIEVEMENT_CATEGORY_TABS.reduce((sum, tab) => sum + tab.width, 0) +
    tabGap * (ACHIEVEMENT_CATEGORY_TABS.length - 1);
  let cursorX = -totalW / 2;
  const selected = ACHIEVEMENT_CATEGORY_TABS.find(
    (tab) => tab.type === ui.achievementCategory,
  )!;
  const image = new Node("AchievementCategoryTabsImage");
  image.addComponent(UITransform).setContentSize(imageW, imageH);
  image.setPosition(0, baselineY + imageH / 2 - 1);
  ui.applyUiIcon(selected.image, image);
  const tabVisuals: Array<{ icon: Node; label: Node }> = [];

  ACHIEVEMENT_CATEGORY_TABS.forEach((tab, index) => {
    const icon = new Node(`AchievementTabIcon_${index}`);
    icon.addComponent(UITransform).setContentSize(tab.iconSize, tab.iconSize);
    icon.setPosition(tab.visualX - 28 + tab.iconOffsetX, 0);
    ui.applyUiIcon(tab.icon, icon);
    image.addChild(icon);
    const label = ui.makeLabel(
      tab.text,
      12,
      new Color(67, 30, 14),
      true,
      tab.visualX + 10,
      0,
      52,
      22,
    );
    label.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    image.addChild(label);
    setupCategoryTabVisual(icon, label, tab.type === ui.achievementCategory);
    tabVisuals.push({ icon, label });
  });
  body.addChild(image);

  ACHIEVEMENT_CATEGORY_TABS.forEach((tab, index) => {
    const hit = new Node(`AchievementTabHit_${index}`);
    const centerX = cursorX + tab.width / 2;
    cursorX += tab.width + tabGap;
    hit.addComponent(UITransform).setContentSize(tab.width, hitH);
    hit.setPosition(centerX, baselineY + hitH / 2);
    bindCategoryTabPressFeedback(
      hit,
      tabVisuals[index].icon,
      tabVisuals[index].label,
      tab.type === ui.achievementCategory,
    );
    hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      if (ui.achievementCategory === tab.type) return;
      ui.achievementCategory = tab.type;
      ui.achievementScrollOffset = 0;
      refreshAchievementCategoryContent(ui, body);
    });
    body.addChild(hit);
  });
}

function drawAchievementList(ui: any, body: Node) {
  const gm = GameManager.getInstance();
  const definitions = ACHIEVEMENTS.filter(
    (item) => item.category === ui.achievementCategory,
  );
  const viewportW = 326;
  const viewportH = 338;
  const viewport = new Node("AchievementListViewport");
  viewport.addComponent(UITransform).setContentSize(viewportW, viewportH);
  viewport.setPosition(0, -51);
  viewport.addComponent(Mask);
  body.addChild(viewport);

  const cardH = 76;
  const gap = 9;
  const topPadding = 13;
  const bottomPadding = 5;
  const contentH = Math.max(
    viewportH,
    definitions.length * cardH +
      Math.max(0, definitions.length - 1) * gap +
      topPadding +
      bottomPadding,
  );
  const content = new Node("AchievementListContent");
  content.addComponent(UITransform).setContentSize(viewportW, contentH);
  viewport.addChild(content);
  const maxScrollOffset = Math.max(0, contentH - viewportH);
  const restoredScrollOffset = Math.max(
    0,
    Math.min(ui.achievementScrollOffset || 0, maxScrollOffset),
  );
  content.setPosition(0, -maxScrollOffset / 2 + restoredScrollOffset);

  let y = contentH / 2 - topPadding - cardH / 2;
  definitions.forEach((definition, index) => {
    drawAchievementCard(ui, gm, body, content, definition, index, y, cardH);
    y -= cardH + gap;
  });

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  (scrollView as any).elastic = false;
  scrollView.content = content;
  const rememberScroll = () => {
    ui.achievementScrollOffset = scrollView.getScrollOffset().y;
  };
  scrollView.node.on(ScrollView.EventType.SCROLLING, rememberScroll);
  scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, rememberScroll);
  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    scrollView.scrollToOffset(new Vec2(0, restoredScrollOffset), 0);
  }, 0);
}

function drawAchievementMedalWallEntry(ui: any, body: Node) {
  const entry = new Node("AchievementMedalWallEntry");
  entry.addComponent(UITransform).setContentSize(56, 56);
  entry.setPosition(0, -242);
  const icon = new Node("AchievementMedalWallEntryIcon");
  icon.addComponent(UITransform).setContentSize(56, 56);
  icon.setPosition(0, 0);
  ui.applyUiIcon("achievementMedalWallEntry", icon);
  entry.addChild(icon);
  entry.addChild(
    ui.makeLabel("勋章墙", 14, new Color(88, 45, 24), true, 29, 0, 78, 24),
  );
  entry.children.forEach((child) => {
    if (child !== icon) child.active = false;
  });
  entry.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(icon)
      .to(0.07, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
      .to(0.11, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(() => showAchievementMedalWall(ui, body))
      .start();
  });
  body.addChild(entry);
}

function showAchievementMedalWall(ui: any, body: Node) {
  if (ui.node.getChildByName("AchievementMedalWallOverlay")) return;
  const gm = GameManager.getInstance();
  const visibleSize = view.getVisibleSize();
  const overlay = new Node("AchievementMedalWallOverlay");
  overlay
    .addComponent(UITransform)
    .setContentSize(visibleSize.width, visibleSize.height);
  fillRoundRect(
    overlay,
    visibleSize.width,
    visibleSize.height,
    0,
    new Color(68, 43, 27, 138),
  );
  overlay
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) =>
      event?.stopPropagation?.(),
    );
  ui.node.addChild(overlay);

  const wall = new Node("AchievementMedalWallContent");
  wall.addComponent(UITransform).setContentSize(320, 400);
  wall.setPosition(0, -10);
  overlay.addChild(wall);

  const background = new Node("AchievementMedalWallBackground");
  background.addComponent(UITransform).setContentSize(320, 400);
  ui.applyUiIcon("achievementMedalWallBg", background);
  wall.addChild(background);

  const unlockedCount = ACHIEVEMENTS.filter(
    (item) => gm.achievements.indexOf(item.id) >= 0,
  ).length;
  const title = ui.makeLabel(
    "勋章墙",
    22,
    new Color(88, 45, 24),
    true,
    0,
    176,
    180,
    30,
  );
  const titleOutline = title.addComponent(LabelOutline);
  titleOutline.color = new Color(255, 246, 225, 255);
  titleOutline.width = 3;
  wall.addChild(title);
  wall.addChild(
    ui.makeLabel(
      `已解锁 ${unlockedCount}/${ACHIEVEMENTS.length}`,
      12,
      new Color(135, 85, 45),
      true,
      0,
      150,
      180,
      20,
    ),
  );

  // Measured from the sixteen hanging points in the 512 x 640 background and
  // converted to the 320 x 400 runtime wall size.
  const columns = [-102, -34, 34, 102];
  const rows = [98, 30, -37, -105];
  const artworkYOffset: Record<string, number> = {
    plant_50: 1,
    craft_50: 1,
    recipes_all: 3,
    gold_10000: 1,
    catalog_all: 3,
  };
  ACHIEVEMENTS.forEach((definition, index) => {
    const unlocked = gm.achievements.indexOf(definition.id) >= 0;
    const badge = new Node(`MedalWallBadge_${definition.id}`);
    badge.addComponent(UITransform).setContentSize(50, 50);
    badge.setPosition(
      columns[index % 4],
      rows[Math.floor(index / 4)] + (artworkYOffset[definition.id] || 0),
    );
    badge.addComponent(UIOpacity).opacity = unlocked ? 255 : 62;
    ui.applyUiIcon(
      !unlocked && definition.lockedIcon
        ? definition.lockedIcon
        : definition.icon,
      badge,
    );
    wall.addChild(badge);
  });

  const close = new Node("AchievementMedalWallClose");
  close.addComponent(UITransform).setContentSize(38, 38);
  close.setPosition(145, 184);
  close.addChild(
    ui.makeLabel("×", 30, new Color(106, 57, 31), true, 0, 1, 38, 38),
  );
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(close)
      .to(0.06, { scale: new Vec3(0.86, 0.86, 1) }, { easing: "quadOut" })
      .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(() => {
        tween(wall)
          .to(0.12, { scale: new Vec3(0.88, 0.88, 1) }, { easing: "quadIn" })
          .call(() => overlay.destroy())
          .start();
      })
      .start();
  });
  wall.addChild(close);
  wall.setScale(new Vec3(0.84, 0.84, 1));
  tween(wall).to(0.18, { scale: Vec3.ONE }, { easing: "backOut" }).start();
}

function drawAchievementCard(
  ui: any,
  gm: GameManager,
  panelBody: Node,
  content: Node,
  definition: AchievementDefinition,
  index: number,
  y: number,
  cardH: number,
) {
  const unlocked = gm.achievements.indexOf(definition.id) >= 0;
  const claimed = gm.claimedAchievements.indexOf(definition.id) >= 0;
  const alternate = index % 2 === 1;
  const card = new Node(`Achievement_${definition.id}`);
  card.addComponent(UITransform).setContentSize(300, cardH);
  card.setPosition(0, y);
  const cardColor = claimed
    ? alternate
      ? new Color(222, 237, 196, 248)
      : new Color(229, 242, 205, 248)
    : unlocked
      ? alternate
        ? new Color(251, 231, 187, 250)
        : new Color(255, 239, 204, 250)
      : alternate
        ? new Color(229, 220, 203, 238)
        : new Color(236, 228, 213, 238);
  fillRoundRect(card, 300, cardH, 12, cardColor);
  strokeRoundRect(
    card,
    300,
    cardH,
    12,
    new Color(156, 101, 57, unlocked ? 215 : 160),
    1.7,
  );

  const icon = new Node("AchievementIcon");
  icon.addComponent(UITransform).setContentSize(48, 48);
  icon.setPosition(-123, 0);
  const usesLockedArtwork =
    !unlocked && definition.tier === "hidden" && !!definition.lockedIcon;
  icon.addComponent(UIOpacity).opacity =
    unlocked || usesLockedArtwork ? 255 : 125;
  ui.applyUiIcon(
    usesLockedArtwork ? definition.lockedIcon! : definition.icon,
    icon,
  );
  card.addChild(icon);

  const title = ui.makeLabel(
    definition.title,
    14,
    new Color(78, 41, 24),
    true,
    -50,
    20,
    122,
    20,
  );
  title.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  title.addComponent(UIOpacity).opacity = unlocked ? 255 : 175;
  card.addChild(title);
  const desc = ui.makeLabel(
    definition.description,
    11,
    new Color(126, 82, 48),
    false,
    -50,
    1,
    122,
    17,
  );
  desc.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  desc.addComponent(UIOpacity).opacity = unlocked ? 255 : 150;
  card.addChild(desc);
  const progress = getAchievementProgress(gm, definition, unlocked);
  const progressText = ui.makeLabel(
    `进度：${progress.current}/${progress.target}`,
    11,
    new Color(99, 67, 43),
    true,
    -50,
    -18,
    122,
    17,
  );
  progressText.getComponent(Label)!.horizontalAlign =
    Label.HorizontalAlign.LEFT;
  progressText.addComponent(UIOpacity).opacity = unlocked ? 255 : 175;
  card.addChild(progressText);

  const rewardIcon = new Node("AchievementRewardIcon");
  rewardIcon.addComponent(UITransform).setContentSize(27, 27);
  rewardIcon.setPosition(42, 8);
  rewardIcon.addComponent(UIOpacity).opacity = unlocked ? 255 : 160;
  ui.applyUiIcon(definition.reward.type, rewardIcon);
  card.addChild(rewardIcon);
  const rewardText = ui.makeLabel(
    `x${definition.reward.count}`,
    11,
    new Color(80, 43, 25),
    true,
    44,
    -16,
    44,
    16,
  );
  rewardText.addComponent(UIOpacity).opacity = unlocked ? 255 : 160;
  card.addChild(rewardText);

  const action = new Node("AchievementAction");
  action.addComponent(UITransform).setContentSize(66, 34);
  action.setPosition(112, 0);
  const actionVisual = new Node("AchievementActionVisual");
  actionVisual.addComponent(UITransform).setContentSize(78, 78);
  ui.applyUiIcon(
    claimed
      ? "achievementClaimed"
      : unlocked
        ? "achievementClaim"
        : "achievementLocked",
    actionVisual,
  );
  action.addChild(actionVisual);
  if (unlocked && !claimed) {
    action
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        tween(actionVisual)
          .to(0.07, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
          .to(0.12, { scale: Vec3.ONE }, { easing: "backOut" })
          .call(() => {
            if (!gm.claimAchievement(definition.id)) return;
            ui.toast(`领取成就奖励 x${definition.reward.count}`);
            refreshAchievementCategoryContent(ui, panelBody);
          })
          .start();
      });
  }
  card.addChild(action);
  content.addChild(card);
}

type TaskCardData = {
  id: string;
  no: number;
  type: "main" | "daily" | "branch" | "special";
  typeLabel: string;
  title: string;
  desc: string;
  progress: number;
  target: number;
  rewards?: TaskRewardData[];
  claimed?: boolean;
  realQuestId?: string;
  action?: TaskAction;
};

type TaskRewardData = {
  icon: string;
  iconType?: "ui" | "item";
  count: number;
  label: string;
};

const TASK_CARD_COLLAPSED_HEIGHT = 84;
const TASK_REWARD_COLUMNS = 4;
const TASK_REWARD_PANEL_BASE_HEIGHT = 65;
const TASK_REWARD_ROW_STEP = 60;
const TASK_REWARD_TOP_OFFSET = 83.5;
const TASK_REWARD_BOTTOM_PADDING = 4.5;

function getTaskRewardLayout(task: TaskCardData) {
  const rewards = task.rewards || [];
  const rows = Math.max(1, Math.ceil(rewards.length / TASK_REWARD_COLUMNS));
  const panelHeight =
    TASK_REWARD_PANEL_BASE_HEIGHT + (rows - 1) * TASK_REWARD_ROW_STEP;
  return {
    rewards,
    panelHeight,
    cardHeight:
      TASK_REWARD_TOP_OFFSET + panelHeight + TASK_REWARD_BOTTOM_PADDING,
  };
}

function createTaskCardData(tasks: any[]): TaskCardData[] {
  return tasks.map((task) => ({
    id: task.id,
    no: task.no,
    type: task.category,
    typeLabel: getTaskCategoryLabel(task.category),
    title: task.title,
    desc: task.description,
    progress: task.progress,
    target: task.target,
    rewards: task.rewards,
    claimed: task.claimed,
    realQuestId: task.id,
    action: task.action,
  }));
}

function drawTaskCategoryTabs(ui: any, body: Node) {
  const gm = GameManager.getInstance();
  const tabs = [
    {
      type: "main",
      width: 84,
      image: "taskTabsMain",
      icon: "taskMain",
      iconSize: 31,
      iconOffsetX: 0,
      text: "\u4e3b\u7ebf\u4efb\u52a1",
      visualX: -121,
    },
    {
      type: "daily",
      width: 88,
      image: "taskTabsDaily",
      icon: "taskDaily",
      iconSize: 27,
      iconOffsetX: 1,
      text: "\u6bcf\u65e5\u4efb\u52a1",
      visualX: -36,
    },
    {
      type: "branch",
      width: 84,
      image: "taskTabsBranch",
      icon: "taskBranch",
      iconSize: 34,
      iconOffsetX: 1,
      text: "\u652f\u7ebf\u4efb\u52a1",
      visualX: 47,
    },
    {
      type: "special",
      width: 88,
      image: "taskTabsSpecial",
      icon: "taskSpecial",
      iconSize: 25,
      iconOffsetX: 3,
      text: "\u7279\u6b8a\u4efb\u52a1",
      visualX: 128,
    },
  ];
  if (!ui.taskCategory) ui.taskCategory = "main";

  const baselineY = 126;
  const imageW = 360;
  const imageH = 60;
  const hitH = 60;
  const tabGap = 5;
  const totalW =
    tabs.reduce((sum, tab) => sum + tab.width, 0) + tabGap * (tabs.length - 1);
  let cursorX = -totalW / 2;
  const selected = tabs.find((tab) => tab.type === ui.taskCategory) || tabs[0];
  const image = new Node("TaskCategoryTabsImage");
  image.addComponent(UITransform).setContentSize(imageW, imageH);
  image.setPosition(0, baselineY + imageH / 2 - 1);
  ui.applyUiIcon(selected.image, image);
  const tabVisuals: Array<{ icon: Node; label: Node }> = [];

  tabs.forEach((tab, index) => {
    const icon = new Node(`TaskTabIcon_${index}`);
    icon.addComponent(UITransform).setContentSize(tab.iconSize, tab.iconSize);
    icon.setPosition(tab.visualX - 28 + tab.iconOffsetX, 0);
    ui.applyUiIcon(tab.icon, icon);
    image.addChild(icon);

    const label = ui.makeLabel(
      tab.text,
      12,
      new Color(67, 30, 14, 255),
      true,
      tab.visualX + 10,
      0,
      52,
      22,
    );
    label.name = `TaskTabLabel_${index}`;
    label.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    image.addChild(label);
    setupCategoryTabVisual(icon, label, tab.type === ui.taskCategory);
    tabVisuals.push({ icon, label });

    const hasCompletedTask = gm
      .getTasks(tab.type as TaskCategory)
      .some((task) => task.progress >= task.target && !task.claimed);
    if (hasCompletedTask) {
      const badge = new Node(`TaskTabBadge_${index}`);
      badge.setPosition(tab.visualX + tab.width / 2 - 8, 19);
      const badgeGraphics = badge.addComponent(Graphics);
      badgeGraphics.fillColor = new Color(247, 70, 66, 255);
      badgeGraphics.circle(0, 0, 5);
      badgeGraphics.fill();
      badgeGraphics.strokeColor = new Color(255, 242, 211, 255);
      badgeGraphics.lineWidth = 1.4;
      badgeGraphics.circle(0, 0, 5);
      badgeGraphics.stroke();
      image.addChild(badge);
    }
  });
  body.addChild(image);

  tabs.forEach((tab, index) => {
    const w = tab.width;
    const node = new Node(`TaskTabHit_${index}`);
    const centerX = cursorX + w / 2;
    cursorX += w + tabGap;
    node.addComponent(UITransform).setContentSize(w, hitH);
    node.setPosition(centerX, baselineY + hitH / 2);
    bindCategoryTabPressFeedback(
      node,
      tabVisuals[index].icon,
      tabVisuals[index].label,
      tab.type === ui.taskCategory,
    );

    node
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        if (ui.taskCategory === tab.type) return;
        ui.taskCategory = tab.type;
        ui.taskDetailId = "";
        ui.taskScrollOffset = 0;
        refreshTaskCategoryContent(ui, body);
      });
    body.addChild(node);
  });
}

function drawTaskListScroll(
  ui: any,
  gm: GameManager,
  body: Node,
  cards: TaskCardData[],
) {
  const viewportW = 326;
  const viewportH = 358;
  const viewport = new Node("TaskListViewport");
  viewport.addComponent(UITransform).setContentSize(viewportW, viewportH);
  viewport.setPosition(0, -57);

  viewport.addComponent(Mask);
  body.addChild(viewport);

  const baseGap = 6;
  const topPadding = 13;
  const bottomPadding = 3;
  const heights = cards.map((task) =>
    ui.taskDetailId === task.id
      ? getTaskRewardLayout(task).cardHeight
      : TASK_CARD_COLLAPSED_HEIGHT,
  );
  const heightsTotal = heights.reduce((sum, h) => sum + h, 0);
  const gapCount = Math.max(0, cards.length - 1);
  const minimumContentH =
    heightsTotal + baseGap * gapCount + topPadding + bottomPadding;
  const contentH = Math.max(viewportH, minimumContentH);
  const gap = baseGap;
  const content = new Node("TaskListContent");
  content.addComponent(UITransform).setContentSize(viewportW, contentH);
  viewport.addChild(content);

  let y = contentH / 2 - topPadding;
  cards.forEach((task, index) => {
    const h = heights[index];
    y -= h / 2;
    drawTaskCard(ui, gm, content, task, index, y);
    y -= h / 2 + gap;
  });

  const scrollView = viewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  (scrollView as any).elastic = false;
  scrollView.content = content;
  const rememberScroll = () => {
    ui.taskScrollOffset = scrollView.getScrollOffset().y;
  };
  scrollView.node.on(ScrollView.EventType.SCROLLING, rememberScroll);
  scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, rememberScroll);

  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    const maxOffset = Math.max(0, scrollView.getMaxScrollOffset().y);
    const offset = Math.max(0, Math.min(ui.taskScrollOffset || 0, maxOffset));
    scrollView.scrollToOffset(new Vec2(0, offset), 0);
  }, 0);
}

function drawTaskCard(
  ui: any,
  gm: GameManager,
  body: Node,
  task: TaskCardData,
  index: number,
  yOverride?: number,
) {
  const expanded = ui.taskDetailId === task.id;
  const collapsedH = TASK_CARD_COLLAPSED_HEIGHT;
  const w = 300;
  const rewardLayout = getTaskRewardLayout(task);
  const h = expanded ? rewardLayout.cardHeight : collapsedH;
  const y = yOverride ?? (index === 0 ? 13 : -128 - (index - 1) * 106);
  const shadow = new Node(`TaskCardShadow_${task.id}`);
  shadow.addComponent(UITransform).setContentSize(w, h);
  shadow.setPosition(0, y - 4);
  fillRoundRect(shadow, w, h, 13, new Color(111, 68, 38, 35));
  body.addChild(shadow);

  const card = new Node(`TaskCard_${task.id}`);
  card.addComponent(UITransform).setContentSize(w, h);
  card.setPosition(0, y);
  fillRoundRect(card, w, h, 14, new Color(255, 253, 242, 252));
  strokeRoundRect(card, w, h, 14, new Color(129, 76, 42, 230), 2.2);

  const contentOffsetY = expanded ? (h - collapsedH) / 2 : 0;
  const topWash = new Node("TaskCardWarmTop");
  topWash.setPosition(0, 25 + contentOffsetY);
  fillRoundRect(topWash, w - 16, 26, 12, new Color(255, 244, 218, 115));
  card.addChild(topWash);

  const icon = new Node("TaskNoIcon");
  icon.addComponent(UITransform).setContentSize(47, 47);
  icon.setPosition(-122, 13 + contentOffsetY);
  ui.applyUiIcon(`task${task.no}`, icon);
  card.addChild(icon);

  const title = ui.makeLabel(
    `[${task.typeLabel}] ${task.title}`,
    17,
    new Color(48, 25, 16),
    true,
    -27,
    23 + contentOffsetY,
    178,
    24,
  );
  title.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  card.addChild(title);
  const desc = ui.makeLabel(
    task.desc,
    11,
    new Color(62, 36, 24),
    true,
    -27,
    4 + contentOffsetY,
    190,
    17,
  );
  desc.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  card.addChild(desc);

  const progressY = -18 + contentOffsetY;
  drawTaskProgress(ui, card, task, progressY, false);
  drawTaskActionButton(ui, gm, card, task, 8 + contentOffsetY, false);
  if (expanded) drawTaskRewardPanel(ui, card, rewardLayout);
  drawTaskDetailButton(ui, card, task, progressY);
  drawTaskCardFlower(card, w / 2 - 1, h / 2 - 4);

  body.addChild(card);
}

function drawTaskProgress(
  ui: any,
  parent: Node,
  task: TaskCardData,
  y: number,
  wide = false,
) {
  const progressW = wide ? 176 : 170;
  const ratio =
    task.target > 0 ? Math.min(1, Math.max(0, task.progress / task.target)) : 0;
  const bar = new Node("TaskProgress");
  bar.setPosition(wide ? -7 : -6, y);
  drawCatalogStyleProgress(
    bar,
    progressW,
    ratio,
    new Color(220, 190, 153, 245),
    new Color(148, 210, 112, 235),
    "TaskProgressFill",
    "TaskProgressKnob",
    false,
  );
  bar.addChild(
    ui.makeLabel(
      `\u8fdb\u5ea6\uff1a${task.progress}/${task.target}`,
      12,
      new Color(55, 30, 20),
      true,
      0,
      0,
      progressW,
      18,
    ),
  );
  parent.addChild(bar);
}

function drawTaskActionButton(
  ui: any,
  gm: GameManager,
  parent: Node,
  task: TaskCardData,
  y: number,
  compact = false,
) {
  const complete = task.progress >= task.target;
  const button = new Node("TaskGoButton");
  button
    .addComponent(UITransform)
    .setContentSize(compact ? 56 : 52, compact ? 26 : 22);
  button.setPosition(112, y);
  const visual = new Node("TaskGoButtonVisual");
  visual
    .addComponent(UITransform)
    .setContentSize(compact ? 72 : 62, compact ? 72 : 62);
  button.addChild(visual);
  if (task.claimed) {
    ui.applyUiIcon("btnClaimed", visual);
  } else if (complete) {
    ui.applyUiIcon("btnClaim", visual);
  } else {
    ui.applyUiIcon("btnGo", visual);
  }
  bindCatalogPressFeedback(button, visual);
  button
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      if (task.claimed) {
        ui.toast("\u5956\u52b1\u5df2\u9886\u53d6");
        return;
      }
      if (complete && task.realQuestId) {
        const rewardStartWorld = button.worldPosition.clone();
        if (gm.claimTask(task.realQuestId)) {
          ui.toast("\u5956\u52b1\u5df2\u9886\u53d6");
          animateTaskRewardsToInventory(
            ui,
            task.rewards || [],
            rewardStartWorld,
          );
        } else {
          ui.toast("\u80cc\u5305\u7a7a\u95f4\u4e0d\u8db3");
        }
        return;
      }
      navigateToTaskAction(ui, task.action || "farm");
    });
  parent.addChild(button);
}

function animateTaskRewardsToInventory(
  ui: any,
  rewards: TaskRewardData[],
  startWorld: Vec3,
) {
  const root: Node | undefined = ui.bubbleRoot;
  const navTarget = ui.node
    .getChildByName("BottomNav")
    ?.getChildByName("Nav_inventory")
    ?.getChildByName("Icon");
  if (!root || !root.isValid || !navTarget || rewards.length === 0) return;

  root.active = true;
  root.setSiblingIndex(ui.node.children.length - 1);
  const rootTransform =
    root.getComponent(UITransform) || root.addComponent(UITransform);
  const visible = view.getVisibleSize();
  rootTransform.setContentSize(visible.width, visible.height);

  const start = rootTransform.convertToNodeSpaceAR(startWorld);
  const target = rootTransform.convertToNodeSpaceAR(navTarget.worldPosition);
  const visibleRewards = rewards.slice(0, 12);

  visibleRewards.forEach((reward, index) => {
    const bubble = new Node(`TaskRewardFlight_${index}`);
    bubble.addComponent(UITransform).setContentSize(48, 48);
    const col = index % 4;
    const row = Math.floor(index / 4);
    const spreadX = (col - (Math.min(4, visibleRewards.length) - 1) / 2) * 42;
    const spreadY = row * 44;
    const origin = new Vec3(start.x + spreadX, start.y + 30 + spreadY, 0);
    bubble.setPosition(origin);
    bubble.setScale(new Vec3(0.15, 0.15, 1));
    const bubbleGraphics = bubble.addComponent(Graphics);
    bubbleGraphics.fillColor = new Color(255, 240, 191, 250);
    bubbleGraphics.circle(0, 0, 22);
    bubbleGraphics.fill();
    bubbleGraphics.strokeColor = new Color(181, 119, 58, 235);
    bubbleGraphics.lineWidth = 2;
    bubbleGraphics.circle(0, 0, 22);
    bubbleGraphics.stroke();

    const icon =
      reward.iconType === "item"
        ? ui.createItemIcon(reward.icon, 31, true)
        : new Node("RewardFlightIcon");
    if (reward.iconType !== "item") {
      icon.addComponent(UITransform).setContentSize(31, 31);
      ui.applyUiIcon(reward.icon, icon);
    }
    icon.setPosition(0, 4);
    bubble.addChild(icon);

    const count = ui.makeLabel(
      `x${reward.count}`,
      10,
      new Color(72, 39, 20),
      true,
      9,
      -13,
      28,
      14,
    );
    bubble.addChild(count);
    const opacity = bubble.addComponent(UIOpacity);
    root.addChild(bubble);

    tween(bubble)
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();

    const state = { t: 0 };
    const control = new Vec3(
      origin.x + (target.x - origin.x) * 0.32 - 42 - index * 2,
      Math.max(origin.y, target.y) + 82 + row * 12,
      0,
    );
    tween(state)
      .delay(1 + index * 0.035)
      .to(
        0.78,
        { t: 1 },
        {
          easing: "quadIn",
          onUpdate: () => {
            if (!bubble.isValid) return;
            const t = state.t;
            const oneMinusT = 1 - t;
            bubble.setPosition(
              oneMinusT * oneMinusT * origin.x +
                2 * oneMinusT * t * control.x +
                t * t * target.x,
              oneMinusT * oneMinusT * origin.y +
                2 * oneMinusT * t * control.y +
                t * t * target.y,
            );
            const scale = Math.max(0.28, 1 - t * 0.72);
            bubble.setScale(new Vec3(scale, scale, 1));
            opacity.opacity = Math.round(255 * Math.min(1, (1 - t) * 1.8));
          },
        },
      )
      .call(() => {
        if (bubble.isValid) bubble.destroy();
      })
      .start();
  });
}

function navigateToTaskAction(ui: any, action: TaskAction) {
  if (action === "farm") {
    ui.showPanel("task");
    return;
  }
  ui.showPanel(action);
}

function drawTaskDetailButton(
  ui: any,
  parent: Node,
  task: TaskCardData,
  y = -3,
) {
  const button = new Node("TaskDetailButton");
  button.addComponent(UITransform).setContentSize(52, 18);
  button.setPosition(112, y);
  const visual = new Node("TaskDetailButtonVisual");
  visual.addComponent(UITransform).setContentSize(64, 64);
  ui.applyUiIcon("btnDetail", visual);
  button.addChild(visual);
  bindCatalogPressFeedback(button, visual);
  button
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      ui.taskDetailId = ui.taskDetailId === task.id ? "" : task.id;
      ui.renderTaskPanel();
    });
  parent.addChild(button);
}

function drawTaskRewardPanel(
  ui: any,
  parent: Node,
  layout: ReturnType<typeof getTaskRewardLayout>,
) {
  const bubbleColor = new Color(255, 235, 176, 248);
  const bubbleBorderColor = new Color(231, 206, 164, 255);
  const panel = new Node("TaskRewardPanel");
  panel.addComponent(UITransform).setContentSize(284, layout.panelHeight);
  panel.setPosition(
    0,
    layout.cardHeight / 2 - TASK_REWARD_TOP_OFFSET - layout.panelHeight / 2,
  );
  fillRoundRect(panel, 284, layout.panelHeight, 8, bubbleColor);
  strokeRoundRect(panel, 284, layout.panelHeight, 8, bubbleBorderColor, 1.2);

  const tail = new Node("TaskRewardBubbleTail");
  tail.setPosition(112, layout.panelHeight / 2 + 3);
  const tailGraphics = tail.addComponent(Graphics);
  tailGraphics.fillColor = bubbleColor;
  tailGraphics.moveTo(-18, -4);
  tailGraphics.lineTo(-14, -4);
  tailGraphics.bezierCurveTo(-10, -4, -6, 4, -3, 7);
  tailGraphics.bezierCurveTo(-1.5, 9, 1.5, 9, 3, 7);
  tailGraphics.bezierCurveTo(6, 4, 10, -4, 14, -4);
  tailGraphics.lineTo(18, -4);
  tailGraphics.close();
  tailGraphics.fill();
  tailGraphics.strokeColor = bubbleBorderColor;
  tailGraphics.lineWidth = 1.2;
  tailGraphics.moveTo(-15, -3.5);
  tailGraphics.bezierCurveTo(-10, -4, -6, 4, -3, 7);
  tailGraphics.bezierCurveTo(-1.5, 9, 1.5, 9, 3, 7);
  tailGraphics.bezierCurveTo(6, 4, 10, -4, 15, -3.5);
  tailGraphics.stroke();
  panel.addChild(tail);
  panel.addChild(
    ui.makeLabel(
      "\u5956\u52b1\uff1a",
      15,
      new Color(55, 30, 20),
      true,
      -113,
      layout.panelHeight / 2 - 25,
      46,
      20,
    ),
  );
  layout.rewards.forEach((reward, index) => {
    const col = index % TASK_REWARD_COLUMNS;
    const row = Math.floor(index / TASK_REWARD_COLUMNS);
    drawTaskRewardIcon(
      ui,
      panel,
      reward.icon,
      reward.iconType || "ui",
      `x${reward.count}`,
      reward.label,
      -62 + col * 55,
      layout.panelHeight / 2 - 25 - row * TASK_REWARD_ROW_STEP,
    );
  });
  parent.addChild(panel);
}

function drawTaskCardFlower(parent: Node, x: number, y: number) {
  const flower = new Node("TaskCardFlower");
  flower.addComponent(UITransform).setContentSize(29, 29);
  flower.setPosition(x, y);
  const graphics = flower.addComponent(Graphics);
  const petalColor = new Color(91, 177, 86, 255);
  const petalOutline = new Color(46, 126, 64, 255);

  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 + (i * Math.PI * 2) / 5;
    const petalX = Math.cos(angle) * 6.5;
    const petalY = Math.sin(angle) * 6.5;
    graphics.fillColor = petalColor;
    graphics.strokeColor = petalOutline;
    graphics.lineWidth = 1.3;
    graphics.circle(petalX, petalY, 6.2);
    graphics.fill();
    graphics.stroke();
  }

  graphics.fillColor = new Color(246, 194, 54, 255);
  graphics.strokeColor = new Color(188, 139, 38, 255);
  graphics.lineWidth = 1.2;
  graphics.circle(0, 0, 5.1);
  graphics.fill();
  graphics.stroke();
  parent.addChild(flower);
}

function drawTaskRewardIcon(
  ui: any,
  parent: Node,
  iconName: string,
  iconType: "ui" | "item",
  count: string,
  labelText: string,
  x: number,
  y: number,
) {
  const item = new Node("TaskRewardItem");
  item.addComponent(UITransform).setContentSize(54, TASK_REWARD_ROW_STEP);
  item.setPosition(x, y);
  parent.addChild(item);

  const plateW = 44;
  const plateH = 40;
  const plate = new Node("RewardIconPlate");
  plate.addComponent(UITransform).setContentSize(plateW, plateH);
  fillRoundRect(plate, plateW, plateH, 7, new Color(234, 197, 148, 255));
  item.addChild(plate);

  const iconSize = iconType === "item" ? 31 : 32;
  const icon =
    iconType === "item"
      ? ui.createItemIcon(iconName, iconSize, true)
      : new Node("RewardIcon");
  icon.name = "RewardIcon";
  if (iconType === "ui") {
    icon.addComponent(UITransform).setContentSize(iconSize, iconSize);
    ui.applyUiIcon(iconName, icon);
  }
  icon.setPosition(0, iconName === "rewardGold" ? 3 : 4);
  item.addChild(icon);

  const countW = Math.max(14, count.length * 6);
  const countX = plateW / 2 - 3 - countW / 2;
  item.addChild(
    ui.makeLabel(
      count,
      10,
      new Color(55, 30, 20),
      true,
      countX,
      -12,
      countW,
      14,
    ),
  );
  item.addChild(
    ui.makeLabel(labelText, 10, new Color(55, 30, 20), true, 0, -28, 54, 14),
  );
}

export function buySeed(ui: any, crop: ItemDef) {
  const gm = GameManager.getInstance();
  if (crop.unlockLevel > gm.playerLevel) {
    ui.toast(`Lv.${crop.unlockLevel} 解锁`);
    return;
  }
  const price = ui.getSeedBuyPrice(crop);
  if (!gm.spendGold(price)) {
    ui.toast("金币不足");
    return;
  }
  InventorySystem.getInstance().addItem(crop.id, 1);
  ui.toast(`购买 ${ui.itemName(crop.id)} x1`);
  if (ui.panels.shop?.active) ui.renderShopPanel();
}

export function getSeedBuyPrice(ui: any, crop: ItemDef): number {
  const fixedPrices: Record<string, number> = {
    speedTicket: 120,
    doubleHarvestCard: 280,
    goldBoostCard: 280,
    universalSeed: 180,
    makeUpSignInCard: 200,
  };
  if (fixedPrices[crop.id] !== undefined) return fixedPrices[crop.id];
  return Math.max(crop.sellPrice, Math.ceil(crop.sellPrice * 1.2));
}

export function useInventoryTool(ui: any, slotIndex: number) {
  const slot = InventorySystem.getInstance().slots[slotIndex];
  const item = slot ? getItem(slot.itemId) : undefined;
  if (!item || item.category !== ItemCategory.TOOL) return;
  if (item.id === "speedTicket") {
    ui.showPanel("craft");
    ui.toast(
      CraftSystem.getInstance().getActiveCraftCount() > 0
        ? "请在制作队列中选择加速"
        : "开始合成后可在制作队列中使用加速券",
    );
    return;
  }
  if (item.id === "makeUpSignInCard") {
    ui.showPanel("signIn");
    ui.toast(
      GameManager.getInstance().getMissedDailySignInDay()
        ? "点击签到摘要右侧的补签按钮使用补签卡"
        : "当前没有需要补签的日期",
    );
    return;
  }
  ui.showDialog(`使用${item.name}`, item.description, [
    { text: "取消", cb: () => {} },
    {
      text: "使用",
      cb: () => {
        const result = GameManager.getInstance().useTool(item.id);
        ui.toast(result || "当前无法使用");
        if (ui.panels.craft?.active) ui.refreshCraftPanelDynamicSections();
      },
    },
  ]);
}

export function useSpecialItem(ui: any, slotIndex: number) {
  const slot = InventorySystem.getInstance().slots[slotIndex];
  if (!slot || slot.itemId !== "mysteryBox") return;
  ui.showDialog("开启神秘礼盒", "打开后可随机获得金币、钻石或当前等级种子。", [
    { text: "取消", cb: () => {} },
    {
      text: "开启",
      cb: () => {
        const result = GameManager.getInstance().openMysteryBox();
        ui.toast(result || "礼盒数量不足");
        if (ui.panels.inventory?.active) ui.renderInventoryPanel();
      },
    },
  ]);
}

export function startCraft(ui: any, recipeId: string) {
  const craft = CraftSystem.getInstance();
  const id = craft.startCraft(recipeId);
  if (id < 0) {
    const messages: Record<string, string> = {
      recipe: "配方不存在",
      level: "等级不足",
      materials: "材料不足",
      gold: "金币不足",
      capacity: "制作队列已占满",
    };
    ui.toast(messages[craft.getLastStartError()] || "无法开始合成");
    return;
  }
  ui.toast("开始合成");
}
