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
import { bindCatalogPressFeedback, bindCategoryTabPressFeedback, clearCatalogPanelChrome, createCatalogCloseHitArea, drawCommonPanelBackground, drawRibbonTitle, setupCategoryTabVisual } from "./MainUICatalogPanel";
import { attachPanelScrollState, showPanel } from "./MainUIPanelCore";



export function renderShopPanel(ui: any) {
  renderMarketplacePanel(ui);
}

export function renderMarketplacePanel(ui: any) {
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

  const viewportH = 270;
  const viewport = new Node("TitleListViewport");
  viewport.addComponent(UITransform).setContentSize(278, viewportH);
  viewport.setPosition(0, 20);
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
    const conditionText =
      title.condition.length > 16
        ? `${title.condition.slice(0, 15)}…`
        : title.condition;
    const condition = ui.makeLabel(
      conditionText,
      12,
      unlocked ? new Color(155, 105, 68) : new Color(145, 136, 123),
      false,
      -122,
      -14,
      165,
      19,
    );
    condition.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
    const conditionLabel = condition.getComponent(Label)!;
    conditionLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    conditionLabel.overflow = Label.Overflow.SHRINK;
    conditionLabel.enableWrapText = false;
    row.addChild(condition);
    const bonus = ui.makeLabel(
      `佩戴加成：${title.bonusText}`,
      10,
      unlocked ? new Color(74, 143, 67) : new Color(145, 136, 123),
      true,
      -122,
      -29,
      190,
      15,
    );
    bonus.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
    bonus.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(bonus);
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
    art.addComponent(UITransform).setContentSize(96, 96);
    art.setPosition(x, -149);
    ui.applyUiIcon(icon, art);
    frame.addChild(art);
    const hit = new Node(name);
    hit.addComponent(UITransform).setContentSize(88, 40);
    hit.setPosition(x, -149);
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


export function updateTitleItemVisual(ui: any, row: Node, selected: boolean) {
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


export function refreshTitleItemVisuals(ui: any, content: Node) {
  content.children.forEach((row) => {
    updateTitleItemVisual(
      ui,
      row,
      (row as any).__titleId === ui.titleDialogSelectedId,
    );
  });
}


export function drawTitleCategoryTabs(
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
      image: "titleTabsLevel",
      icon: "titleCategoryLevel",
    },
    {
      type: "achievement",
      text: "成就限定",
      x: 56.5,
      image: "titleTabsAchievement",
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


export function drawMarketplaceTabs(ui: any, body: Node) {
  const tabs = [
    {
      id: "seeds",
      text: "\u79cd\u5b50",
      x: -114,
      image: "marketplaceTabsSeeds",
      icon: "marketplaceSeeds",
      iconSize: 29,
    },
    {
      id: "tools",
      text: "\u5de5\u5177",
      x: 0,
      image: "marketplaceTabsTools",
      icon: "marketplaceTools",
      iconSize: 30,
    },
    {
      id: "buildings",
      text: "\u5efa\u7b51",
      x: 114,
      image: "marketplaceTabsBuildings",
      icon: "marketplaceBuildings",
      iconSize: 30,
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
    icon.setPosition(tab.x - 27, 0);
    ui.applyUiIcon(tab.icon, icon);
    image.addChild(icon);
    const label = ui.makeLabel(
      tab.text,
      14,
      new Color(67, 30, 14, 255),
      true,
      tab.x + 12,
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


export function getMarketplaceItems(category: string) {
  if (category === "seeds") {
    return getPlantableCrops().sort((a, b) => {
      const seasonRankA = isSeasonAllowed(a.seasons) ? 0 : 1;
      const seasonRankB = isSeasonAllowed(b.seasons) ? 0 : 1;
      if (seasonRankA !== seasonRankB) return seasonRankA - seasonRankB;
      // Preserve the existing progression order inside both groups.
      return a.unlockLevel - b.unlockLevel;
    });
  }
  const items: ItemDef[] = [];
  for (const id in ITEM_DB) {
    if (!Object.prototype.hasOwnProperty.call(ITEM_DB, id)) continue;
    const item = ITEM_DB[id];
    const matchesCategory =
      category === "buildings"
        ? item.category === ItemCategory.BUILDING
        : item.category === ItemCategory.TOOL ||
          item.category === ItemCategory.DECORATION;
    if (matchesCategory) {
      items.push(item);
    }
  }
  return items.sort((a, b) => a.unlockLevel - b.unlockLevel);
}


export function drawMarketplaceGrid(
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
  const topPadding = 8;
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
    const marketplaceName = item.isCrop
      ? ui.itemName(item.id).replace(/(?:种子|种薯)$/u, "")
      : ui.itemName(item.id);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const card = new Node(`MarketplaceItem_${item.id}`);
    card.addComponent(UITransform).setContentSize(cellW, cellH);
    card.setPosition(
      -gridW / 2 + cellW / 2 + col * (cellW + gapX),
      contentH / 2 - topPadding - cellH / 2 - row * (cellH + gapY),
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
    if (unlocked && item.isCrop && item.seasons?.length) {
      const seasonIcons: Record<string, string> = {
        spring: "seasonSpring",
        summer: "seasonSummer",
        autumn: "seasonAutumn",
        winter: "seasonWinter",
      };
      const orderedSeasons = SEASONS.filter(
        (season) => item.seasons!.indexOf(season) >= 0,
      );
      const seasonStep = 18;
      const seasonRightX = 25;
      const seasonLeftX =
        seasonRightX - (orderedSeasons.length - 1) * seasonStep;
      orderedSeasons.forEach((season, seasonIndex) => {
        const seasonBadge = new Node(`MarketplaceSeason_${season}`);
        seasonBadge.addComponent(UITransform).setContentSize(20, 20);
        seasonBadge.setPosition(seasonLeftX + seasonIndex * seasonStep, 23);
        ui.applyUiIcon(seasonIcons[season], seasonBadge);
        iconPlate.addChild(seasonBadge);
      });
    }
    card.addChild(iconPlate);
    card.addChild(
      ui.makeLabel(
        unlocked ? marketplaceName : `Lv.${item.unlockLevel}`,
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
        item.id === "greenhouseCard" ? `${price}钻` : `${price}金`,
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
      .node.on(Node.EventType.TOUCH_END, () =>
        ui.buySeed(item, buy.worldPosition.clone()),
      );
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


export function showGoldExchangeDialog(ui: any) {
  const gm = GameManager.getInstance();
  const exchange = (diamonds: number, gold: number) => {
    if (!gm.spendDiamond(diamonds)) {
      ui.toast("钻石不足");
      return;
    }
    gm.addGold(gold);
    ui.refreshTopBar();
    ui.toast(`兑换成功：金币 +${gold}`);
  };
  ui.showDialog(
    "金币不足 · 钻石兑换",
    `当前：${gm.gold}金币 / ${gm.diamond}钻石\n选择兑换档位后即可继续购买`,
    [
      { text: "10钻→1000金", cb: () => exchange(10, 1000) },
      { text: "30钻→3500金", cb: () => exchange(30, 3500) },
      { text: "稍后", cb: () => {} },
    ],
    true,
    false,
    true,
  );
}


export function buySeed(ui: any, crop: ItemDef, startWorld?: Vec3) {
  const gm = GameManager.getInstance();
  if (crop.unlockLevel > gm.playerLevel) {
    ui.toast(`Lv.${crop.unlockLevel} 解锁`);
    return;
  }
  if (crop.id === "greenhouseCard") {
    if (!gm.canBuySeasonalGreenhouseCard()) {
      ui.toast("本季温室卡已达限购数量");
      return;
    }
    if (!gm.spendDiamond(30)) {
      ui.toast("钻石不足");
      return;
    }
    InventorySystem.getInstance().addItem(crop.id, 1);
    const rewardAnimated = startWorld
      ? animateRewardsToInventory(
          ui,
          [{ icon: crop.id, iconType: "item", count: 1 }],
          startWorld,
        )
      : false;
    gm.markSeasonalGreenhouseCardPurchased();
    if (!rewardAnimated) ui.toast("购买 温室卡 x1");
    ui.refreshTopBar();
    return;
  }
  if (crop.id === "fourSeasonGreenhouse") {
    const inventory = InventorySystem.getInstance();
    const price = getSeedBuyPrice(ui, crop);
    if (!gm.spendGold(price)) {
      showGoldExchangeDialog(ui);
      return;
    }
    inventory.addItem(crop.id, 1);
    const rewardAnimated = startWorld
      ? animateRewardsToInventory(
          ui,
          [{ icon: crop.id, iconType: "item", count: 1 }],
          startWorld,
        )
      : false;
    if (!rewardAnimated) ui.toast("恒温温室已放入背包");
    ui.refreshTopBar();
    return;
  }
  const price = ui.getSeedBuyPrice(crop);
  if (!gm.spendGold(price)) {
    showGoldExchangeDialog(ui);
    return;
  }
  InventorySystem.getInstance().addItem(crop.id, 1);
  const rewardAnimated = startWorld
    ? animateRewardsToInventory(
        ui,
        [{ icon: crop.id, iconType: "item", count: 1 }],
        startWorld,
      )
    : false;
  if (!rewardAnimated) ui.toast(`购买 ${ui.itemName(crop.id)} x1`);
}


export function getSeedBuyPrice(_ui: any, crop: ItemDef): number {
  if (crop.buyPrice !== undefined) return crop.buyPrice;
  const fixedPrices: Record<string, number> = {
    speedTicket: 120,
    cropSpeedTicket: 100,
    doubleHarvestCard: 280,
    goldBoostCard: 280,
    universalSeed: 180,
    makeUpSignInCard: 200,
    greenhouseCard: 30,
    fourSeasonGreenhouse: 8000,
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
        : "开始合成后可在制作队列中使用合成加速券",
    );
    return;
  }
  if (item.id === "cropSpeedTicket") {
    ui.toast("请点击生长中的农作物使用农作物加速券");
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
  if (!slot) return;
  const actions: Record<
    string,
    { title: string; message: string; action: () => string | null }
  > = {
    mysteryBox: {
      title: "开启神秘礼盒",
      message: "打开后可随机获得金币、钻石或当前等级种子。",
      action: () => GameManager.getInstance().openMysteryBox(),
    },
    luckyStar: {
      title: "幸运祈愿",
      message: "消耗1颗幸运星，随机获得600~1000金币或8~12钻石。",
      action: () => GameManager.getInstance().useLuckyStar(),
    },
    jade: {
      title: "翡翠兑换",
      message: "消耗1块翡翠，兑换20钻石。",
      action: () => GameManager.getInstance().exchangeJade(),
    },
  };
  const itemId = slot.itemId;
  const config = actions[itemId];
  if (!config) return;
  ui.showDialog(config.title, config.message, [
    { text: "取消", cb: () => {} },
    {
      text: itemId === "mysteryBox" ? "开启" : "使用",
      cb: () => {
        const result = config.action();
        ui.toast(result || `${ui.itemName(itemId)}数量不足`);
      },
    },
  ]);
}
