import {
  Button,
  Color,
  EditBox,
  Graphics,
  Label,
  Mask,
  Node,
  ScrollView,
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
import { CurrencySystem } from "../../systems/CurrencySystem";
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
import {
  drawCatalogStyleProgress,
  fillRect,
  fillRoundRect,
  strokeRoundRect,
} from "../utils/UIDraw";
import type { PanelName } from "./MainUITypes";
import { getPlayerTitle } from "../../config/TitleConfig";

export function bindEvents(ui: any) {
  const evt = EventManager.getInstance();
  evt.on("goldChanged", () => ui.refreshTopBar());
  evt.on("diamondChanged", () => ui.refreshTopBar());
  evt.on("experienceChanged", () => ui.refreshTopBar());
  evt.on("levelUp", () => ui.refreshAll());
  evt.on("playerTitleChanged", () => ui.refreshTopBar());
  evt.on("inventoryChanged", () => {
    if (ui.panels.inventory?.active) ui.renderInventoryPanel();
    if (ui.panels.quest?.active) ui.renderQuestPanel();
    updateTaskNavBadge(ui);
  });
  evt.on("craftStarted", () => {
    if (ui.panels.craft?.active) ui.refreshCraftPanelDynamicSections();
  });
  evt.on("craftCompleted", (data: any) => {
    ui.toast(`${ui.recipeName(data.recipe)} 完成`);
    if (ui.panels.craft?.active) ui.refreshCraftPanelDynamicSections();
    if (ui.panels.inventory?.active) ui.renderInventoryPanel();
    if (ui.panels.quest?.active) ui.renderQuestPanel();
    updateTaskNavBadge(ui);
  });
  evt.on("achievementUnlocked", () => {
    if (ui.panels.quest?.active) ui.renderQuestPanel();
    if (ui.panels.achievement?.active) ui.renderAchievementPanel();
    updateAchievementEntryState(ui);
  });
  evt.on("achievementClaimed", () => updateAchievementEntryState(ui));
  evt.on("taskChanged", () => {
    if (ui.panels.task?.active) ui.renderTaskPanel();
    updateTaskNavBadge(ui);
  });
  evt.on("craftTablesChanged", () => {
    if (ui.panels.craft?.active) ui.renderCraftPanel();
  });
  evt.on("dailySignInChanged", () => {
    updateDailySignInEntryState(ui);
  });
  evt.on("cropMatured", (data: any) => {
    ui.refreshLandBlock(data.blockId, true);
  });
  evt.on("buildingReady", (data: any) => {
    ui.refreshPastureSlot(data.slotId);
  });
  evt.on("pastureChanged", () => ui.refreshPasture());
  evt.on("landExpanded", () => {
    if (ui.suppressNextLandExpandedRefresh) {
      ui.suppressNextLandExpandedRefresh = false;
      return;
    }
    ui.refreshLand();
  });
}

export function refreshAll(ui: any) {
  ui.refreshTopBar();
  ui.refreshLand();
  if (ui.panels.inventory?.active) ui.renderInventoryPanel();
  if (ui.panels.shop?.active) ui.renderShopPanel();
  if (ui.panels.craft?.active) ui.renderCraftPanel();
  if (ui.panels.quest?.active) ui.renderQuestPanel();
  if (ui.panels.task?.active) ui.renderTaskPanel();
  if (ui.panels.signIn?.active) ui.renderDailySignInPanel();
  if (ui.panels.achievement?.active) ui.renderAchievementPanel();
  updateTaskNavBadge(ui);
  updateDailySignInEntryState(ui);
  updateAchievementEntryState(ui);
}

export function refreshTopBar(ui: any) {
  const gm = GameManager.getInstance();
  const level = ui.topBar
    .getChildByName("LevelBadge")
    ?.getChildByName("LevelText");
  const levelBadge = ui.topBar.getChildByName("LevelBadge");
  const equippedTitle = getPlayerTitle(gm.equippedTitleId);
  const sceneName = ui.activeWorld === "pasture" ? "牧场" : "农场";
  if (level) {
    level.getComponent(Label)!.string = `Lv.${gm.playerLevel} ${sceneName}`;
    level.setPosition(0, equippedTitle ? 6 : 0);
  }
  const playerTitle = levelBadge?.getChildByName("PlayerTitleText");
  if (playerTitle) {
    playerTitle.active = !!equippedTitle;
    if (equippedTitle) playerTitle.getComponent(Label)!.string = `【${equippedTitle.fullName}】`;
  }
  const currencyArea = ui.topBar.getChildByName("CurrencyArea");
  const gold = findNode(currencyArea, "GoldDisplay");
  const diamond = findNode(currencyArea, "DiamondDisplay");
  const currencyLabels = [
    { node: gold, value: gm.gold },
    { node: diamond, value: gm.diamond },
  ]
    .filter((entry): entry is { node: Node; value: number } => !!entry.node)
    .map(({ node, value }) => {
      const label = node.getComponent(Label)!;
      label.string = CurrencySystem.getInstance().format(value);
      return { node, label };
    });
  if (currencyLabels.length > 0) {
    const sharedFontSize = Math.min(
      ...currencyLabels.map(({ node, label }) => currencyFontSize(node, label)),
    );
    currencyLabels.forEach(({ label }) => {
      label.fontSize = sharedFontSize;
      label.lineHeight = sharedFontSize + 4;
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;
    });
  }
  const expText = ui.topBar.getChildByName("ExpBg")?.getChildByName("ExpText");
  if (expText)
    expText.getComponent(Label)!.string = `${gm.experience}/${gm.nextLevelExp}`;
  const fill = ui.topBar.getChildByName("ExpBg")?.getChildByName("ExpFill");
  if (fill) {
    const expBg = ui.topBar.getChildByName("ExpBg");
    const expW = expBg?.getComponent(UITransform)?.width || 100;
    const paddingX = 4;
    const innerW = Math.max(0, expW - paddingX * 2);
    const width = Math.max(
      0,
      Math.min(innerW, (innerW * gm.experience) / gm.nextLevelExp),
    );
    const visualWidth = width > 0 ? Math.min(innerW, Math.max(width, 18)) : 0;
    drawExpFill(fill, visualWidth);
    fill.setPosition(-expW / 2 + paddingX + visualWidth / 2, 0);
  }
}

function drawExpFill(node: Node, width: number) {
  const g = node.getComponent(Graphics) || node.addComponent(Graphics);
  g.clear();
  if (width <= 0) return;

  const height = 14;
  const radius = height / 2;
  g.fillColor = new Color(249, 213, 107, 255);
  g.roundRect(-width / 2, -height / 2, width, height, radius);
  g.fill();

  if (width > 8) {
    const warmW = width * 0.42;
    g.fillColor = new Color(246, 185, 59, 185);
    g.roundRect(width / 2 - warmW, -height / 2, warmW, height, radius);
    g.fill();
  }
}

function findNode(root: Node | null | undefined, name: string): Node | null {
  if (!root) return null;
  if (root.name === name) return root;
  for (const child of root.children) {
    const found = findNode(child, name);
    if (found) return found;
  }
  return null;
}

function currencyFontSize(node: Node, label: Label) {
  const width = node.getComponent(UITransform)?.width || 50;
  const units = Array.from(label.string).reduce((sum, char) => {
    if (/[\u4e00-\u9fff]/.test(char)) return sum + 1;
    if (char === ".") return sum + 0.32;
    if (/\d/.test(char)) return sum + 0.54;
    return sum + 0.62;
  }, 0);
  const fittedSize = Math.max(
    14,
    Math.min(18, Math.floor(width / Math.max(1, units))),
  );
  return fittedSize - 2;
}

function updateTaskNavBadge(ui: any) {
  const badge = ui.node
    .getChildByName("BottomNav")
    ?.getChildByName("Nav_task")
    ?.getChildByName("Badge");
  if (!badge) return;
  const quests = GameManager.getInstance().getTasks();
  badge.active = quests.some((q) => q.progress >= q.target && !q.claimed);
}

function updateDailySignInEntryState(ui: any) {
  const badge = ui.node
    .getChildByName("DailySignInEntry")
    ?.getChildByName("Badge");
  if (!badge) return;
  badge.active = GameManager.getInstance().isDailySignInClaimable();
}

function updateAchievementEntryState(ui: any) {
  const badge = ui.topBar
    ?.getChildByName("Avatar")
    ?.getChildByName("AchievementEntry")
    ?.getChildByName("Badge");
  if (!badge) return;
  const gm = GameManager.getInstance();
  badge.active = gm.achievements.some(
    (id) => gm.claimedAchievements.indexOf(id) < 0,
  );
}

export function updateCraftProgressViews(ui: any) {
  const body = ui.panels.craft?.getChildByName("Body");
  if (!body) return;

  const activeCrafts = CraftSystem.getInstance().getAllActiveCrafts();

  const arrowFill = body
    .getChildByName("CraftRecipeSection")
    ?.getChildByName("CraftRecipeArrow")
    ?.getChildByName("CraftArrowFillMask")
    ?.getChildByName("CraftArrowAnimatedFill");
  if (arrowFill && activeCrafts.length > 0) {
    const cycleMs = 4200;
    const fillMs = 4050;
    const elapsedInCycle =
      Math.max(0, Date.now() - activeCrafts[0].startTime) % cycleMs;
    const ratio = elapsedInCycle < fillMs ? elapsedInCycle / fillMs : 0;
    const eased = 0.5 - Math.cos(Math.PI * ratio) / 2;
    arrowFill.setScale(new Vec3(eased, 1, 1));
  }

  for (const process of activeCrafts) {
    const row = body.getChildByName(`Crafting_${process.craftId}`);
    if (!row) continue;
    const elapsedSeconds = Math.max(0, (Date.now() - process.startTime) / 1000);
    const progress = Math.max(
      0,
      Math.min(
        100,
        process.craftDuration > 0
          ? (elapsedSeconds / process.craftDuration) * 100
          : process.progress,
      ),
    );
    process.progress = progress;
    const displayProgress = Math.floor(progress);
    const barBg = row.getChildByName("CraftProgressBg");
    if (barBg && (barBg as any).craftProgressPercent !== displayProgress) {
      const barW = (barBg as any).craftProgressWidth || 124;
      drawCatalogStyleProgress(
        barBg,
        barW,
        progress / 100,
        new Color(220, 190, 153, 245),
        new Color(148, 210, 112, 245),
        "CraftProgressFill",
        "CraftProgressKnob",
        false,
      );
      (barBg as any).craftProgressPercent = displayProgress;
    }
    const text = row.getChildByName("CraftProgressText");
    if (text && text.getComponent(Label)!.string !== `${displayProgress}%`) {
      text.getComponent(Label)!.string = `${displayProgress}%`;
    }
  }
}
