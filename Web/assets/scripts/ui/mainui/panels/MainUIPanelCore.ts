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
import { InventorySystem, type InventorySlotSwap } from "../../../systems/InventorySystem";
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
import { bindCategoryTabPressFeedback, clearCatalogPanelChrome, createCatalogCloseHitArea, drawCommonPanelBackground, drawRibbonTitle, setupCategoryTabVisual } from "./MainUICatalogPanel";



export function showPanel(ui: any, name: PanelName) {
  ui.closeSeedBubble();
  if (ui.panels[name]?.active) {
    closeActivePanel(ui, name);
    return;
  }
  if (name === "shop") {
    ui.shopCategory =
      ui.nextShopCategory || (ui.activeWorld === "pasture" ? "buildings" : "seeds");
    ui.nextShopCategory = undefined;
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
    ui.renderInventoryPanel();
  }
  if (name === "craft") {
    ui.renderCraftPanel();
  }
  if (name === "shop") {
    ui.renderShopPanel();
  }
  if (name === "quest") {
    ui.renderQuestPanel();
  }
  if (name === "task") {
    ui.renderTaskPanel();
  }
  if (name === "signIn") {
    ui.renderDailySignInPanel();
  }
  if (name === "achievement") {
    ui.renderAchievementPanel();
  }
  if (name === "title") {
    ui.renderTitlePanel();
  }
}


export function closeActivePanel(ui: any, name: PanelName) {
  const panel = ui.panels[name];
  if (panel) ui.closePanelWithAnimation(panel);
}


export function updateBottomNavState(ui: any, active: PanelName) {
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


export function clearPanelBody(_ui: any, panel: Node): Node {
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

  drawInventoryGridContent(ui, body, inv);
}


const inventoryCellsByViewport = new WeakMap<Node, Map<number, Node>>();

function swapInventoryItemLayers(viewport: Node, swap: InventorySlotSwap) {
  const cells = inventoryCellsByViewport.get(viewport);
  if (!cells) return false;
  const firstCell = cells.get(swap.firstIndex);
  const secondCell = cells.get(swap.secondIndex);
  // Neither slot appears in this category. If only one appears, the filter
  // may change which rows are visible and the normal refresh must handle it.
  if (!firstCell && !secondCell) return true;
  const firstItem = firstCell?.getChildByName("InventorySlotItem");
  const secondItem = secondCell?.getChildByName("InventorySlotItem");
  if (!firstCell || !secondCell || !firstItem || !secondItem) return false;

  firstItem.setParent(secondCell);
  secondItem.setParent(firstCell);
  return true;
}

export function refreshInventoryGrid(ui: any, swap?: InventorySlotSwap) {
  const body = ui.panels.inventory?.getChildByName("Body");
  if (!body) return;
  const viewport = body.getChildByName("InventoryViewport");
  if (viewport && swap && swapInventoryItemLayers(viewport, swap)) return;
  if (viewport) {
    viewport.removeFromParent();
    viewport.destroy();
  }
  drawInventoryGridContent(ui, body, InventorySystem.getInstance());
}


export function drawInventoryGridContent(ui: any, body: Node, inv: InventorySystem) {
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


export function drawInventoryCategoryTabs(ui: any, body: Node) {
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


export function inventorySlotMatchesCategory(itemId: string, category: string) {
  if (category === "all") return true;
  if (!itemId) return false;
  const item = getItem(itemId);
  if (!item) return false;
  if (category === "seeds") return item.isCrop === true;
  if (category === "materials") {
    return (
      (item.category === ItemCategory.CROP && !item.isCrop) ||
      item.category === ItemCategory.PROCESSED
    );
  }
  return (
    item.category === ItemCategory.FOOD ||
    item.category === ItemCategory.BUILDING ||
    item.category === ItemCategory.DECORATION ||
    item.category === ItemCategory.SPECIAL ||
    item.category === ItemCategory.TOOL ||
    item.category === ItemCategory.AD_REWARD
  );
}


export function drawInventoryGrid(
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

  const cellsBySlot = new Map<number, Node>();
  inventoryCellsByViewport.set(viewport, cellsBySlot);
  entries.forEach(({ slot, slotIndex }, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cell = new Node(`InventorySlot_${slotIndex}`);
    if (slotIndex >= 0) cellsBySlot.set(slotIndex, cell);
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
      const itemLayer = new Node("InventorySlotItem");
      itemLayer.addComponent(UITransform).setContentSize(cellW, cellH);
      cell.addChild(itemLayer);
      const icon = ui.createItemIcon(slot.itemId, 43, true);
      icon.setPosition(0, 8);
      itemLayer.addChild(icon);
      itemLayer.addChild(
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
      itemLayer.addChild(
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
      const originalPosition = cell.position.clone();
      const dragPointerOffset = new Vec3();
      const dragPointerPosition = new Vec3();
      let dragDistance = 0;
      let draggedItem: Node | null = null;
      let originalSiblingIndex = 0;
      cell.on(Node.EventType.TOUCH_START, (event: any) => {
        event?.stopPropagation?.();
        draggedItem = cell.getChildByName("InventorySlotItem");
        if (!draggedItem) return;
        dragDistance = 0;
        (cell as any).__dragged = false;
        const pointer = event?.getUILocation?.();
        if (pointer) {
          const localPointer = content
            .getComponent(UITransform)!
            .convertToNodeSpaceAR(new Vec3(pointer.x, pointer.y));
          dragPointerPosition.set(localPointer);
          dragPointerOffset.set(
            originalPosition.x - localPointer.x,
            originalPosition.y - localPointer.y,
            0,
          );
        }
        scrollView.stopAutoScroll();
        originalSiblingIndex = cell.getSiblingIndex();
        cell.setSiblingIndex(content.children.length - 1);
        scrollView.enabled = false;
      });
      cell.on(Node.EventType.TOUCH_MOVE, (event: any) => {
        if (!draggedItem) return;
        const pointer = event?.getUILocation?.();
        if (!pointer) return;
        const localPointer = content
          .getComponent(UITransform)!
          .convertToNodeSpaceAR(new Vec3(pointer.x, pointer.y));
        dragDistance = Math.abs(localPointer.x - dragPointerPosition.x)
          + Math.abs(localPointer.y - dragPointerPosition.y);
        if (dragDistance < 7 && !(cell as any).__dragged) return;
        (cell as any).__dragged = true;
        draggedItem.setPosition(
          localPointer.x + dragPointerOffset.x - originalPosition.x,
          localPointer.y + dragPointerOffset.y - originalPosition.y,
        );
        draggedItem.setScale(1.08, 1.08, 1);
      });
      const finishItemDrag = () => {
        const item = draggedItem;
        if (!item) return;
        draggedItem = null;
        cell.setSiblingIndex(originalSiblingIndex);
        scrollView.enabled = true;
        const draggedCenterX = originalPosition.x + item.position.x;
        const draggedCenterY = originalPosition.y + item.position.y;
        item.setPosition(Vec3.ZERO);
        item.setScale(1, 1, 1);
        if (!(cell as any).__dragged) return;

        let toIndex = slotIndex;
        let nearestDistance = Number.POSITIVE_INFINITY;
        cellsBySlot.forEach((candidate, candidateSlot) => {
          if (candidate === cell || !candidate.getChildByName("InventorySlotItem")) return;
          const dx = candidate.position.x - draggedCenterX;
          const dy = candidate.position.y - draggedCenterY;
          const distance = dx * dx + dy * dy;
          const insideCandidate = Math.abs(dx) <= cellW / 2
            && Math.abs(dy) <= cellH / 2;
          if (insideCandidate && distance < nearestDistance) {
            nearestDistance = distance;
            toIndex = candidateSlot;
          }
        });
        if (toIndex !== slotIndex) InventorySystem.getInstance().swapSlots(slotIndex, toIndex);
      };
      cell.on(Node.EventType.TOUCH_END, finishItemDrag);
      // Cocos sends TOUCH_CANCEL when the pointer leaves the fixed source slot.
      // That is the normal completion path for dragging A over B.
      cell.on(Node.EventType.TOUCH_CANCEL, finishItemDrag);
      cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
        if ((cell as any).__dragged) {
          (cell as any).__dragged = false;
          return;
        }
        ui.inventoryScrollOffset = scrollView.getScrollOffset().y;
        const currentSlot = InventorySystem.getInstance().slots[slotIndex];
        if (!currentSlot?.itemId) return;
        const item = getItem(currentSlot.itemId);
        if (item?.category === ItemCategory.TOOL)
          ui.useInventoryTool(slotIndex);
        else if (item?.category === ItemCategory.BUILDING)
          ui.openSellDialog(slotIndex);
        else if (item?.category === ItemCategory.SPECIAL)
          ui.useSpecialItem(slotIndex);
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


export function attachPanelScrollState(
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
