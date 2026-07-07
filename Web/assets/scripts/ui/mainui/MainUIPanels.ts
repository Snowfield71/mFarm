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
import { ImageCache } from "../../utils/ImageCache";

export function showPanel(ui: any, name: PanelName) {
  ui.closeSeedBubble();
  if (ui.panels[name]?.active) {
    closeActivePanel(ui, name);
    return;
  }
  if (ui.panels.inventory) ui.panels.inventory.active = name === "inventory";
  if (ui.panels.craft) ui.panels.craft.active = name === "craft";
  if (ui.panels.shop) ui.panels.shop.active = name === "shop";
  if (ui.panels.quest) ui.panels.quest.active = name === "quest";
  if (ui.panels.task) ui.panels.task.active = name === "task";
  updateBottomNavState(ui, name);

  if (name === "inventory") ui.renderInventoryPanel();
  if (name === "craft") ui.renderCraftPanel();
  if (name === "shop") ui.renderShopPanel();
  if (name === "quest") {
    ImageCache.getInstance().preloadUiIcons(["catalogBg"]);
    ui.renderQuestPanel();
  }
  if (name === "task") {
    ImageCache.getInstance().preloadUiIcons([
      "taskLog",
      "taskMain",
      "taskDaily",
      "taskBranch",
      "taskSpecial",
      "task1",
      "task2",
      "task3",
      "rewardGold",
      "rewardSeed",
    ]);
    ui.renderTaskPanel();
  }
}

function closeActivePanel(ui: any, name: PanelName) {
  const panel = ui.panels[name];
  if (panel) panel.active = false;
  clearBottomNavState(ui);
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
      58,
      13,
      isActive ? new Color(255, 238, 174, 255) : new Color(255, 247, 210, 255),
    );
    strokeRoundRect(
      btn,
      76,
      58,
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
      const baseIconY = panel === "quest" ? 16 : 18;
      icon.setPosition(0, isActive ? baseIconY + 2 : baseIconY);
      tween(icon)
        .to(
          0.12,
          { scale: new Vec3(isActive ? 1.08 : 1, isActive ? 1.08 : 1, 1) },
          { easing: "backOut" },
        )
        .start();
    }
    const indicator = btn.getChildByName("Indicator");
    if (indicator) indicator.active = isActive;
  }
}

function clearBottomNavState(ui: any) {
  const nav = ui.node.getChildByName("BottomNav");
  if (!nav) return;

  const panels: PanelName[] = ["inventory", "craft", "task", "quest"];
  for (const panel of panels) {
    const btn = nav.getChildByName(`Nav_${panel}`);
    if (!btn) continue;
    fillRoundRect(btn, 76, 58, 13, new Color(255, 247, 210, 255));
    strokeRoundRect(btn, 76, 58, 13, new Color(126, 78, 48, 225), 2.2);

    const icon = btn.getChildByName("Icon");
    if (icon) {
      icon.setScale(new Vec3(1, 1, 1));
      icon.setPosition(0, panel === "quest" ? 16 : 18);
    }
    const indicator = btn.getChildByName("Indicator");
    if (indicator) indicator.active = false;
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
  const usage = inv.getUsage();

  const info = ui.makeLabel(
    `容量 ${usage.used}/${usage.max}`,
    13,
    new Color(92, 104, 82),
    false,
    -100,
    152,
    120,
    20,
  );
  body.addChild(info);

  const slots = inv.slots.slice(0, inv.maxSlots);
  const cellSize = 48;
  const cols = 5;
  slots.forEach((slot, index) => {
    const x = -112 + (index % cols) * 56;
    const y = 112 - Math.floor(index / cols) * 58;
    const cell = new Node(`Slot_${index}`);
    cell.addComponent(UITransform).setContentSize(cellSize, cellSize);
    cell.setPosition(x, y);
    fillRoundRect(
      cell,
      cellSize,
      cellSize,
      8,
      slot.itemId
        ? new Color(246, 250, 236, 255)
        : new Color(225, 235, 218, 220),
    );
    strokeRoundRect(
      cell,
      cellSize,
      cellSize,
      8,
      new Color(160, 190, 145, 130),
      1,
    );

    if (slot.itemId) {
      const icon = ui.createItemIcon(slot.itemId, 36);
      icon.setPosition(0, 4);
      cell.addChild(icon);

      const badge = new Node("CountBadge");
      badge.setPosition(13, -15);
      badge.addComponent(UITransform).setContentSize(28, 15);
      fillRoundRect(badge, 28, 15, 7, new Color(54, 112, 55, 225));
      const countLabel = ui.makeLabel(
        `x${slot.count}`,
        10,
        new Color(255, 255, 255),
        true,
        0,
        0,
        26,
        13,
      );
      badge.addChild(countLabel);
      cell.addChild(badge);
      cell
        .addComponent(Button)
        .node.on(Node.EventType.TOUCH_END, () => ui.openSellDialog(index));
    }
    body.addChild(cell);
  });
}

export function renderShopPanel(ui: any) {
  ui.renderShopPanelScrollable();
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
  const recipes = getRecipesByLevel(gm.playerLevel);
  const active = craft.getAllActiveCrafts();

  const status = ui.makeLabel(
    `进行�?${active.length}/${GameValues.MAX_CRAFT_TABLES}`,
    12,
    new Color(92, 104, 82),
    false,
    -8,
    152,
    260,
    20,
  );
  status.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  body.addChild(status);

  const visibleActiveRows = Math.min(active.length, 1);
  active.slice(0, visibleActiveRows).forEach((process, index) => {
    const recipe = getRecipe(process.recipeId);
    if (!recipe) return;
    const y = 124 - index * 34;
    const row = new Node(`Crafting_${process.craftId}`);
    row.addComponent(UITransform).setContentSize(276, 30);
    row.setPosition(0, y);
    fillRoundRect(row, 276, 30, 8, new Color(238, 248, 232, 245));
    strokeRoundRect(row, 276, 30, 8, new Color(134, 190, 122, 125), 1);

    const icon = ui.createItemIcon(recipe.product.itemId, 22);
    icon.setPosition(-118, 0);
    row.addChild(icon);

    const title = ui.makeLabel(
      ui.recipeName(recipe),
      10,
      new Color(54, 72, 46),
      true,
      -48,
      5,
      120,
      14,
    );
    title.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(title);

    const progress = Math.max(0, Math.min(100, process.progress));
    const barBg = new Node("CraftProgressBg");
    barBg.setPosition(-8, -8);
    fillRoundRect(barBg, 124, 7, 4, new Color(184, 210, 172, 180));
    row.addChild(barBg);
    const barFill = new Node("CraftProgressFill");
    const fillW = Math.max(4, (124 * progress) / 100);
    barFill.setPosition(-62 + fillW / 2, 0);
    fillRoundRect(barFill, fillW, 7, 4, new Color(78, 188, 214, 235));
    barBg.addChild(barFill);

    const percent = ui.makeLabel(
      `${Math.floor(progress)}%`,
      10,
      new Color(76, 166, 78),
      true,
      106,
      0,
      46,
      16,
    );
    percent.name = "CraftProgressText";
    row.addChild(percent);
    body.addChild(row);
  });

  if (active.length > visibleActiveRows) {
    const more = ui.makeLabel(
      `还有 ${active.length - visibleActiveRows} 个合成中`,
      10,
      new Color(92, 104, 82),
      false,
      -8,
      102,
      180,
      16,
    );
    more.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    body.addChild(more);
  }

  const recipeTop =
    active.length > 0 ? (active.length > visibleActiveRows ? 76 : 92) : 136;
  const recipeBottom = -154;
  const recipeViewportH = Math.max(90, recipeTop - recipeBottom);
  const recipeViewport = new Node("CraftRecipeViewport");
  recipeViewport.addComponent(UITransform).setContentSize(284, recipeViewportH);
  recipeViewport.setPosition(0, recipeBottom + recipeViewportH / 2);
  recipeViewport.addComponent(Mask);
  body.addChild(recipeViewport);

  const rowH = 48;
  const gap = 6;
  const contentH = Math.max(
    recipeViewportH,
    recipes.length * (rowH + gap) - gap + 8,
  );
  const content = new Node("CraftRecipeContent");
  content.addComponent(UITransform).setContentSize(274, contentH);
  recipeViewport.addChild(content);

  const scrollView = recipeViewport.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.content = content;

  recipes.forEach((recipe, index) => {
    const y = contentH / 2 - 4 - rowH / 2 - index * (rowH + gap);
    const row = new Node(`Recipe_${recipe.id}`);
    row.addComponent(UITransform).setContentSize(276, rowH);
    row.setPosition(0, y);
    fillRoundRect(row, 276, rowH, 8, new Color(248, 252, 238, 245));
    strokeRoundRect(row, 276, rowH, 8, new Color(154, 196, 138, 120), 1);

    const productIcon = ui.createItemIcon(recipe.product.itemId, 28);
    productIcon.setPosition(-114, 0);
    row.addChild(productIcon);
    const name = ui.makeLabel(
      `${ui.recipeName(recipe)} x${recipe.product.count}`,
      12,
      new Color(54, 72, 46),
      true,
      -18,
      9,
      128,
      16,
    );
    name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(name);
    const materialText = recipe.materials
      .map(
        (m) =>
          `${ui.itemName(m.itemId)} ${inv.getItemCount(m.itemId)}/${m.count}`,
      )
      .join(" ");
    const mats = ui.makeLabel(
      materialText,
      10,
      new Color(108, 112, 96),
      false,
      -18,
      -9,
      128,
      14,
    );
    mats.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(mats);

    const start = new Node("Start");
    start.addComponent(UITransform).setContentSize(58, 28);
    start.setPosition(104, 0);
    fillRoundRect(start, 58, 28, 9, new Color(76, 188, 83));
    start.addChild(
      ui.makeLabel("合成", 12, new Color(255, 255, 255), true, 0, 0, 54, 22),
    );
    start
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, () => ui.startCraft(recipe.id));
    row.addChild(start);
    content.addChild(row);
  });

  ui.scheduleOnce(() => {
    if (!recipeViewport.isValid || !content.isValid) return;
    scrollView.scrollToTop(0);
  }, 0);
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
    const card = createCatalogCard(ui, gm, item, row, col);
    const slotCenterOffsetX = col === 0 ? -20 : col === 1 ? -10 : 0;
    card.setPosition(
      -78 +
        col * 98 -
        (col > 0 ? 5 : 0) -
        (col === 0 ? 3 : 0) +
        slotCenterOffsetX,
      94 - row * 126 - row * 5 - (row === 2 ? 5 : 0),
    );
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

function drawTaskLogBackground(ui: any, body: Node) {
  drawPanelImageBackground(ui, body, "taskLog", "TaskLogImageBackground");
}

function drawPanelImageBackground(ui: any, body: Node, iconName: string, nodeName: string) {
  const bg = new Node(nodeName);
  bg.addComponent(UITransform).setContentSize(Design.WIDTH + 10, 540);
  bg.setPosition(0, 0);
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

function createCatalogCard(
  ui: any,
  gm: GameManager,
  item: ItemDef,
  row = 0,
  col = 0,
): Node {
  const discovered = gm.hasDiscoveredItem(item.id);
  const displayUnlockLevel = ui.catalogLevel(item);
  const levelUnlocked = displayUnlockLevel <= gm.playerLevel;
  const card = new Node(`CatalogCard_${item.id}`);
  card.addComponent(UITransform).setContentSize(96, 116);

  const icon = ui.createItemIcon(item.id, item.id === "pasta" ? 64 : 70, true);
  const firstColumnIconOffsetX = col === 0 ? -2 - (row > 0 ? 2 : 0) : 0;
  const iconOffsetX =
    (item.id === "pasta" ? 3 : 0) -
    3 +
    firstColumnIconOffsetX +
    (item.id === "palmTree" ? 5 : 0) +
    (item.id === "fence" ? 5 : 0);
  icon.setPosition(iconOffsetX, 28 - (row > 0 ? 11 : 0));
  if (!discovered) {
    const opacity = icon.addComponent(UIOpacity);
    opacity.opacity = levelUnlocked ? 120 : 72;
  }
  card.addChild(icon);

  const itemNameOffsetX =
    item.id === "tomato" ? -4 : item.id === "carrot" ? 3 : 0;
  const cellNameOffsetX =
    row === 0 && col === 1
      ? -4
      : row === 0 && col === 2
        ? -3
        : row === 1 && col === 1
          ? 0
          : row === 1 && col === 2
            ? 1
            : row === 2 && col === 0
              ? 1
              : 0;
  const nameOffsetX =
    (row === 0 ? 0 : -4) -
    (col === 0 ? 5 : 0) +
    (row > 0 && col === 0 ? 3 : 0) +
    itemNameOffsetX +
    cellNameOffsetX;
  const nameOffsetY = row === 0 ? 4 : row === 1 ? -2 : -4;
  const name = ui.makeLabel(
    ui.itemName(item.id),
    14,
    new Color(88, 45, 24),
    true,
    nameOffsetX,
    -39 + nameOffsetY,
    96,
    24,
  );
  const nameLabel = name.getComponent(Label)!;
  nameLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
  nameLabel.verticalAlign = Label.VerticalAlign.CENTER;
  nameLabel.lineHeight = 18;
  card.addChild(name);

  if (!discovered || !levelUnlocked) {
    const lockFrame = getCatalogLockFrame(row, col);
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

function getCatalogLockFrame(row: number, col: number) {
  const baseW = 85;
  const baseH = row === 0 ? 123 : row === 1 ? 124 : 125;
  const baseY = row === 0 ? 16 : row === 1 ? 17 : 21;
  const baseLeftGrow = row === 2 ? (col === 0 ? 10 : 5) : 10;
  const leftAdjust = col === 0 ? 0 : col === 2 ? -2 : 0;
  const rowCellLeftAdjust =
    row === 2 && col === 1 ? 2 : row === 2 && col === 2 ? 1 : 0;
  const leftGrow = Math.max(0, baseLeftGrow + leftAdjust + rowCellLeftAdjust);
  const rightGrow = col === 1 ? 2 : 0;
  const columnShift = col === 1 ? 1 : 0;
  const topGrow = row === 0 ? 5 : 0;
  const bottomGrow = row === 0 ? 5 : row === 1 ? 9 : 5;
  const downOffset = row === 1 ? 5 : row === 2 ? 15 : 0;

  return {
    w: baseW + leftGrow + rightGrow,
    h: baseH + topGrow + bottomGrow,
    x: (rightGrow - leftGrow) / 2 + columnShift,
    y: baseY - downOffset + (topGrow - bottomGrow) / 2,
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
  fillRoundRect(track, trackW, 13, 7, new Color(154, 104, 80, 230));
  body.addChild(track);

  const fill = new Node("CatalogProgressFill");
  fill.setPosition(-trackW / 2 + (trackW * ratio) / 2, 0);
  fillRoundRect(fill, trackW * ratio, 9, 5, new Color(255, 203, 79, 255));
  track.addChild(fill);

  const knob = new Node("CatalogProgressKnob");
  knob.setPosition(-trackW / 2 + trackW * ratio, 0);
  const kg = knob.addComponent(Graphics);
  kg.fillColor = new Color(255, 247, 226, 255);
  kg.circle(0, 0, 9);
  kg.fill();
  kg.strokeColor = new Color(126, 78, 48, 225);
  kg.lineWidth = 1.6;
  kg.circle(0, 0, 9);
  kg.stroke();
  track.addChild(knob);

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
    panel.active = false;
    clearBottomNavState(ui);
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
  const gm = GameManager.getInstance();
  const quests = gm.getDailyQuests();
  clearCatalogPanelChrome(panel);
  body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
  body.setPosition(0, 0);
  const close = panel.getChildByName("Close");
  if (close) close.active = false;

  drawTaskLogBackground(ui, body);
  drawRibbonTitle(ui, body, "\u4efb\u52a1");
  createCatalogCloseHitArea(ui, panel, body);
  drawTaskCategoryTabs(ui, body);

  const cards = createTaskCardData(quests);
  cards.slice(0, 3).forEach((task, index) => drawTaskCard(ui, gm, body, task, index));
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
  rewardGold?: number;
  rewardSeed?: number;
  claimed?: boolean;
  realQuestId?: string;
};

function createTaskCardData(quests: any[]): TaskCardData[] {
  const daily = quests[0];
  const branch = quests[2] || quests[1];
  return [
    {
      id: "main_plant_wheat",
      no: 1,
      type: "main",
      typeLabel: "\u4e3b\u7ebf",
      title: "\u79cd\u690d\u5c0f\u9ea6",
      desc: "\u5728\u4f60\u7684\u519c\u573a\u79cd\u690d10\u682a\u5c0f\u9ea6",
      progress: Math.min(daily?.progress || 0, 10),
      target: 10,
      rewardGold: 100,
      rewardSeed: 5,
    },
    {
      id: daily?.id || "daily_feed_chicken",
      no: 2,
      type: "daily",
      typeLabel: "\u6bcf\u65e5",
      title: daily?.title || "\u5582\u517b\u5c0f\u9e21",
      desc: "\u4eca\u5929\u5582\u517b5\u53ea\u5c0f\u9e21",
      progress: daily?.progress || 0,
      target: daily?.target || 5,
      rewardGold: daily?.rewardGold,
      claimed: daily?.claimed,
      realQuestId: daily?.id,
    },
    {
      id: branch?.id || "branch_make_jam",
      no: 3,
      type: "branch",
      typeLabel: "\u652f\u7ebf",
      title: branch?.title || "\u5236\u4f5c\u679c\u9171",
      desc: "\u5728\u5236\u4f5c\u53f0\u5236\u4f5c2\u74f6\u8349\u8393\u679c\u9171",
      progress: branch?.progress || 0,
      target: branch?.target || 2,
      rewardGold: branch?.rewardGold,
      claimed: branch?.claimed,
      realQuestId: branch?.id,
    },
  ];
}

function drawTaskCategoryTabs(ui: any, body: Node) {
  const tabs = [
    { text: "\u4e3b\u7ebf\u4efb\u52a1", icon: "taskMain" },
    { text: "\u6bcf\u65e5\u4efb\u52a1", icon: "taskDaily" },
    { text: "\u652f\u7ebf\u4efb\u52a1", icon: "taskBranch" },
    { text: "\u7279\u6b8a\u4efb\u52a1", icon: "taskSpecial" },
  ];
  tabs.forEach((tab, index) => {
    const node = new Node(`TaskTab_${index}`);
    node.addComponent(UITransform).setContentSize(78, 36);
    node.setPosition(-117 + index * 78, 143);
    fillRoundRect(node, 77, 35, 8, new Color(255, 239, 204, 250));
    strokeRoundRect(node, 77, 35, 8, new Color(161, 105, 58, 210), 1.8);
    const icon = new Node("Icon");
    icon.addComponent(UITransform).setContentSize(24, 24);
    icon.setPosition(-26, 0);
    ui.applyUiIcon(tab.icon, icon);
    node.addChild(icon);
    node.addChild(ui.makeLabel(tab.text, 14, new Color(88, 45, 24), true, 8, 0, 56, 20));
    body.addChild(node);
  });
}

function drawTaskCard(ui: any, gm: GameManager, body: Node, task: TaskCardData, index: number) {
  const isFirst = index === 0;
  const w = 312;
  const h = isFirst ? 132 : 92;
  const y = isFirst ? 55 : -62 - (index - 1) * 106;
  const card = new Node(`TaskCard_${task.id}`);
  card.addComponent(UITransform).setContentSize(w, h);
  card.setPosition(0, y);
  fillRoundRect(card, w, h, 14, new Color(255, 252, 239, 248));
  strokeRoundRect(card, w, h, 14, new Color(134, 82, 45, 220), 2.4);

  const icon = new Node("TaskNoIcon");
  icon.addComponent(UITransform).setContentSize(56, 56);
  icon.setPosition(-126, isFirst ? 28 : 9);
  ui.applyUiIcon(`task${task.no}`, icon);
  card.addChild(icon);

  const title = ui.makeLabel(`[${task.typeLabel}] ${task.title}`, 20, new Color(48, 25, 16), true, -38, isFirst ? 39 : 22, 190, 26);
  title.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  card.addChild(title);
  const desc = ui.makeLabel(task.desc, 14, new Color(48, 25, 16), true, -36, isFirst ? 16 : -1, 198, 20);
  desc.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  card.addChild(desc);

  drawTaskProgress(ui, card, task, isFirst ? -8 : -27);
  drawTaskActionButton(ui, gm, card, task, isFirst ? 29 : 4);
  if (isFirst) drawTaskRewardPanel(ui, card, task);

  body.addChild(card);
}

function drawTaskProgress(ui: any, parent: Node, task: TaskCardData, y: number) {
  const progressW = 162;
  const ratio = task.target > 0 ? Math.min(1, Math.max(0, task.progress / task.target)) : 0;
  const bar = new Node("TaskProgress");
  bar.setPosition(-11, y);
  fillRoundRect(bar, progressW, 15, 8, new Color(219, 188, 151, 245));
  strokeRoundRect(bar, progressW, 15, 8, new Color(134, 82, 45, 185), 1.6);
  const fill = new Node("TaskProgressFill");
  const fillW = Math.max(8, progressW * ratio);
  fill.setPosition(-progressW / 2 + fillW / 2, 0);
  fillRoundRect(fill, fillW, 13, 7, new Color(145, 207, 112, 235));
  bar.addChild(fill);
  bar.addChild(ui.makeLabel(`\u8fdb\u5ea6\uff1a${task.progress}/${task.target}`, 13, new Color(55, 30, 20), true, 0, 0, progressW, 18));
  parent.addChild(bar);
}

function drawTaskActionButton(ui: any, gm: GameManager, parent: Node, task: TaskCardData, y: number) {
  const complete = task.progress >= task.target;
  const button = new Node("TaskGoButton");
  button.addComponent(UITransform).setContentSize(72, 36);
  button.setPosition(113, y);
  fillRoundRect(button, 72, 36, 15, task.claimed ? new Color(198, 188, 174, 255) : new Color(250, 148, 166, 255));
  strokeRoundRect(button, 72, 36, 15, new Color(134, 72, 58, 235), 2.2);
  const text = task.claimed ? "\u5df2\u9886" : complete && task.realQuestId ? "\u9886\u53d6" : "\u524d\u5f80";
  button.addChild(ui.makeLabel(text, 20, new Color(88, 45, 24), true, 0, 1, 64, 26));
  bindCatalogPressFeedback(button);
  button.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    if (complete && task.realQuestId && !task.claimed) {
      if (gm.claimDailyQuest(task.realQuestId)) {
        ui.toast("\u5956\u52b1\u5df2\u9886\u53d6");
        ui.renderTaskPanel();
      }
      return;
    }
    ui.toast("\u4efb\u52a1\u8fdb\u884c\u4e2d");
  });
  parent.addChild(button);
}

function drawTaskRewardPanel(ui: any, parent: Node, task: TaskCardData) {
  const panel = new Node("TaskRewardPanel");
  panel.addComponent(UITransform).setContentSize(276, 52);
  panel.setPosition(16, -53);
  fillRoundRect(panel, 276, 52, 9, new Color(255, 234, 176, 245));
  panel.addChild(ui.makeLabel("\u5956\u52b1\uff1a", 16, new Color(55, 30, 20), true, -112, 5, 62, 22));
  if (task.rewardGold) drawTaskRewardIcon(ui, panel, "rewardGold", `x${task.rewardGold}`, -45);
  if (task.rewardSeed) drawTaskRewardIcon(ui, panel, "rewardSeed", `x${task.rewardSeed}`, 26);
  parent.addChild(panel);
}

function drawTaskRewardIcon(ui: any, parent: Node, iconName: string, count: string, x: number) {
  const icon = new Node("RewardIcon");
  icon.addComponent(UITransform).setContentSize(34, 34);
  icon.setPosition(x, 8);
  ui.applyUiIcon(iconName, icon);
  parent.addChild(icon);
  parent.addChild(ui.makeLabel(count, 11, new Color(55, 30, 20), true, x + 20, -2, 34, 16));
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
}

export function getSeedBuyPrice(ui: any, crop: ItemDef): number {
  return Math.max(crop.sellPrice, Math.ceil(crop.sellPrice * 1.2));
}

export function startCraft(ui: any, recipeId: string) {
  const id = CraftSystem.getInstance().startCraft(recipeId);
  if (id < 0) {
    ui.toast("材料或等级不足");
    return;
  }
  ui.toast("开始合成");
}
