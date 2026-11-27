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
import { bindCatalogPressFeedback, clearCatalogPanelChrome, createCatalogCloseHitArea, drawCommonPanelBackground, drawRibbonTitle } from "./MainUICatalogPanel";



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


export function drawCraftSectionFrame(
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


export function drawCraftRecipeSection(
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


export function traceCraftArrow(graphics: Graphics) {
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


export function drawAnimatedCraftArrow(root: Node, active: boolean) {
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


export function drawCraftProgressSection(
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
    drawCraftChefIcon(ui, section, 112, -2);
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
  for (let tick = 1; tick < 5; tick++) {
    const marker = new Node(`CraftProgressTick_${tick}`);
    marker.setPosition(-barW / 2 + (barW * tick) / 5, 0);
    const markerGraphics = marker.addComponent(Graphics);
    markerGraphics.strokeColor = new Color(255, 250, 218, 155);
    markerGraphics.lineWidth = 1;
    markerGraphics.moveTo(0, -4);
    markerGraphics.lineTo(0, 4);
    markerGraphics.stroke();
    bar.addChild(marker);
  }
  const shine = new Node("CraftProgressShine");
  shine.setPosition(-barW / 2 + 7, 0);
  const shineGraphics = shine.addComponent(Graphics);
  shineGraphics.fillColor = new Color(255, 255, 232, 175);
  shineGraphics.ellipse(0, 0, 8, 3);
  shineGraphics.fill();
  bar.addChild(shine);
  tween(shine)
    .repeatForever(
      tween()
        .to(1.35, { position: new Vec3(barW / 2 - 7, 0, 0) }, { easing: "sineInOut" })
        .delay(.3)
        .set({ position: new Vec3(-barW / 2 + 7, 0, 0) }),
    )
    .start();
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
          ui.toast("当前无法使用合成加速券");
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


export function drawCraftChefIcon(ui: any, parent: Node, x: number, y: number) {
  const root = new Node("CraftChefIcon");
  root.setPosition(x, y);
  root.addComponent(UITransform).setContentSize(58, 58);
  ui.applyUiIcon("craftChefTools", root);
  parent.addChild(root);
}


export function drawCraftOperationsSection(
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
    const iconHost = new Node("CraftRecipeIconHost");
    iconHost.addComponent(UITransform).setContentSize(34, 34);
    iconHost.setPosition(0, 8);
    (iconHost as any).__itemId = recipe.product.itemId;
    (iconHost as any).__hydrated = false;
    cell.addChild(iconHost);
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
  const hydrateVisibleRecipeIcons = () => {
    if (!content.isValid) return;
    const offset = Math.max(0, scrollView.getScrollOffset().y);
    const firstRow = Math.max(0, Math.floor(offset / (cellH + gapY)) - 1);
    const lastRow = Math.min(
      rows - 1,
      Math.ceil((offset + 112) / (cellH + gapY)) + 1,
    );
    const firstIndex = firstRow * cols;
    const lastIndex = Math.min(recipes.length - 1, (lastRow + 1) * cols - 1);
    for (let index = firstIndex; index <= lastIndex; index++) {
      const cell = content.children[index];
      const host = cell?.getChildByName("CraftRecipeIconHost");
      if (!host?.isValid || (host as any).__hydrated) continue;
      (host as any).__hydrated = true;
      host.addChild(ui.createItemIcon((host as any).__itemId, 34, true));
    }
  };
  const rememberScroll = () => {
    ui.craftRecipeScrollOffset = scrollView.getScrollOffset().y;
    hydrateVisibleRecipeIcons();
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
    hydrateVisibleRecipeIcons();
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


export function createCraftActionButton(
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
