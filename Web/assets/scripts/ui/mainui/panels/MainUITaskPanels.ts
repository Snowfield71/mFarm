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
import { showPanel } from "./MainUIPanelCore";



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


export function refreshTaskCategoryContent(ui: any, body?: Node) {
  body = body || ui.panels.task?.getChildByName("Body");
  if (!body) return;
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
      ? displayDay === 1
        ? false
        : reward.day < (missedDay || displayDay)
      : reward.day <= gm.dailySignInDay;
    const current = reward.day === displayDay;
    body.addChild(
      createDailySignInCard(
        ui,
        reward,
        x,
        y,
        claimed,
        current,
        claimable && current,
        reward.day === missedDay,
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
        const rewardStartWorld = button.worldPosition.clone();
        const reward = gm.claimDailySignIn();
        if (!reward) return;
        const rewardAnimated = animateRewardsToInventory(
          ui,
          [
            {
              icon:
                reward.type === "item" && reward.itemId
                  ? reward.itemId
                  : reward.type,
              iconType: reward.type === "item" ? "item" : "ui",
              count: reward.count,
            },
          ],
          rewardStartWorld,
        );
        tween(button)
          .to(0.08, { scale: new Vec3(0.94, 0.94, 1) }, { easing: "quadOut" })
          .to(0.16, { scale: new Vec3(1.06, 1.06, 1) }, { easing: "backOut" })
          .call(() => {
            if (!rewardAnimated) {
              ui.toast(`签到成功：${reward.label} x${reward.count}`);
            }
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


export function createDailySignInCard(
  ui: any,
  reward: DailySignInReward,
  x: number,
  y: number,
  claimed: boolean,
  current: boolean,
  animateCurrent: boolean,
  missed = false,
): Node {
  const card = new Node(`SignInDay_${reward.day}`);
  card.setPosition(x, y);
  (card as any).restingX = x;
  (card as any).restingY = y;
  card.addComponent(UITransform).setContentSize(72, 116);
  const fill = missed
    ? new Color(218, 215, 207, 245)
    : claimed
      ? new Color(225, 240, 191, 250)
      : current
        ? new Color(255, 225, 153, 255)
        : new Color(247, 218, 169, 245);
  const border = missed
    ? new Color(149, 143, 134, 205)
    : current
      ? new Color(205, 126, 48, 255)
      : new Color(201, 151, 83, 220);
  fillRoundRect(card, 72, 112, 9, fill);
  strokeRoundRect(card, 72, 112, 9, border, current ? 2.6 : 1.8);

  card.addChild(
    ui.makeLabel(
      `第${reward.day}天`,
      13,
      missed ? new Color(126, 121, 114) : new Color(102, 55, 30),
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
  if (missed) {
    const opacity =
      icon.getComponent(UIOpacity) || icon.addComponent(UIOpacity);
    opacity.opacity = 135;
  }
  iconFrame.addChild(icon);

  card.addChild(
    ui.makeLabel(
      `${reward.label} x${reward.count}`,
      12,
      missed ? new Color(126, 121, 114) : new Color(91, 49, 29),
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


export function addDailySignInMakeUpAction(
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
      const rewardAnimated = animateRewardsToInventory(
        ui,
        [
          {
            icon:
              reward.type === "item" && reward.itemId
                ? reward.itemId
                : reward.type,
            iconType: reward.type === "item" ? "item" : "ui",
            count: reward.count,
          },
        ],
        action.worldPosition.clone(),
      );
      if (!rewardAnimated) {
        ui.toast(`补签成功：${reward.label} x${reward.count}`);
      }
      updateDailySignInAfterMakeUp(ui, body, summary, missedDay);
    });
  summary.addChild(action);
}


export function replaceDailySignInCardState(
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


export function updateDailySignInAfterMakeUp(
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


export function updateDailySignInClaimedState(
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


export const ACHIEVEMENT_CATEGORY_TABS: Array<{
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


export function getAchievementProgress(
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
    case "seasonalPlants": {
      const progress = gm.getSeasonalPlantingProgress(definition.season!);
      current = progress.current;
      target = progress.target;
      break;
    }
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


export function refreshAchievementCategoryContent(ui: any, body?: Node) {
  body = body || ui.panels.achievement?.getChildByName("Body");
  if (!body) return;
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


export function drawAchievementCategoryTabs(ui: any, body: Node) {
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


export function drawAchievementList(ui: any, body: Node) {
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


export function drawAchievementMedalWallEntry(ui: any, body: Node) {
  const entry = new Node("AchievementMedalWallEntry");
  entry.addComponent(UITransform).setContentSize(280, 56);
  entry.setPosition(0, -242);
  const leftOrnament = new Node("AchievementMedalWallOrnamentLeft");
  leftOrnament.addComponent(UITransform).setContentSize(96, 36);
  leftOrnament.setPosition(-86, 0);
  ui.applyUiIcon("achievementMedalWallOrnamentLeft", leftOrnament);
  entry.addChild(leftOrnament);
  const icon = new Node("AchievementMedalWallEntryIcon");
  icon.addComponent(UITransform).setContentSize(56, 56);
  icon.setPosition(0, 0);
  ui.applyUiIcon("achievementMedalWallEntry", icon);
  entry.addChild(icon);
  const rightOrnament = new Node("AchievementMedalWallOrnamentRight");
  rightOrnament.addComponent(UITransform).setContentSize(96, 36);
  rightOrnament.setPosition(86, 0);
  ui.applyUiIcon("achievementMedalWallOrnamentRight", rightOrnament);
  entry.addChild(rightOrnament);
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


export function showAchievementMedalWall(ui: any, _body: Node) {
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

  const wallAchievements = ACHIEVEMENTS.filter((item) => !item.seasonal);
  const unlockedCount = wallAchievements.filter(
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
      `已解锁 ${unlockedCount}/${wallAchievements.length}`,
      12,
      new Color(135, 85, 45),
      true,
      0,
      150,
      180,
      20,
    ),
  );

  const gridViewport = new Node("MedalWallGridViewport");
  gridViewport.addComponent(UITransform).setContentSize(284, 270);
  gridViewport.setPosition(0, -3);
  gridViewport.addComponent(Mask);
  wall.addChild(gridViewport);

  const columns = [-102, -34, 34, 102];
  const rowCount = Math.ceil(wallAchievements.length / columns.length);
  const rowHeight = 60;
  const rowGap = 7;
  const contentH = Math.max(
    270,
    rowCount * rowHeight + Math.max(0, rowCount - 1) * rowGap + 8,
  );
  const gridContent = new Node("MedalWallGridContent");
  gridContent.addComponent(UITransform).setContentSize(284, contentH);
  gridViewport.addChild(gridContent);
  if (contentH > 270) {
    const scroll = gridViewport.addComponent(ScrollView);
    scroll.horizontal = false;
    scroll.vertical = true;
    scroll.inertia = true;
    (scroll as any).elastic = false;
    scroll.content = gridContent;
    ui.scheduleOnce(() => {
      if (gridViewport.isValid && gridContent.isValid) scroll.scrollToTop(0);
    }, 0);
  }
  const artworkYOffset: Record<string, number> = {
    plant_50: 1,
    craft_50: 1,
    recipes_all: 3,
    gold_10000: 1,
    catalog_all: 3,
  };
  wallAchievements.forEach((definition, index) => {
    const unlocked = gm.achievements.indexOf(definition.id) >= 0;
    const x = columns[index % columns.length];
    const row = Math.floor(index / columns.length);
    const y = contentH / 2 - 4 - rowHeight / 2 - row * (rowHeight + rowGap);
    const slotBackground = new Node(`MedalWallSlot_${definition.id}`);
    slotBackground.addComponent(UITransform).setContentSize(60, 60);
    slotBackground.setPosition(x, y);
    ui.applyUiIcon("achievementMedalSlot", slotBackground);
    slotBackground.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      const title = PLAYER_TITLES.find(item => item.achievementId === definition.id);
      const state = unlocked ? "已获得" : "未获得";
      ui.showDialog(
        `${definition.title} · ${state}`,
        `获取条件：${definition.description}\n佩戴加成：${title?.bonusText || "勋章收藏进度 +1"}`,
        [{ text: "知道了", cb: () => {} }],
        true,
        true,
      );
    });
    gridContent.addChild(slotBackground);

    const badge = new Node(`MedalWallBadge_${definition.id}`);
    badge.addComponent(UITransform).setContentSize(50, 50);
    badge.setPosition(x, y + (artworkYOffset[definition.id] || 0));
    badge.addComponent(UIOpacity).opacity = unlocked ? 255 : 62;
    ui.applyUiIcon(
      !unlocked && definition.lockedIcon
        ? definition.lockedIcon
        : definition.icon,
      badge,
    );
    gridContent.addChild(badge);
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


export function drawAchievementCard(
  ui: any,
  gm: GameManager,
  _panelBody: Node,
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

  const rewardIcon =
    definition.reward.type === "item" && definition.reward.itemId
      ? ui.createItemIcon(definition.reward.itemId, 27, true)
      : new Node("AchievementRewardIcon");
  if (!rewardIcon.getComponent(UITransform))
    rewardIcon.addComponent(UITransform).setContentSize(27, 27);
  rewardIcon.setPosition(42, 8);
  rewardIcon.addComponent(UIOpacity).opacity = unlocked ? 255 : 160;
  if (definition.reward.type !== "item")
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
            const rewardStartWorld = action.worldPosition.clone();
            if (!gm.claimAchievement(definition.id)) return;
            const rewardAnimated = animateRewardsToInventory(
              ui,
              [
                {
                  icon:
                    definition.reward.type === "item" &&
                    definition.reward.itemId
                      ? definition.reward.itemId
                      : definition.reward.type,
                  iconType: definition.reward.type === "item" ? "item" : "ui",
                  count: definition.reward.count,
                },
              ],
              rewardStartWorld,
            );
            if (!rewardAnimated) {
              ui.toast(`领取成就奖励 x${definition.reward.count}`);
            }
            ui.applyUiIcon("achievementClaimed", actionVisual);
            const actionButton = action.getComponent(Button);
            if (actionButton) actionButton.interactable = false;
            action.off(Node.EventType.TOUCH_START);
            action.off(Node.EventType.TOUCH_END);
            action.off(Node.EventType.TOUCH_CANCEL);
            const cardGraphics = card.getComponent(Graphics);
            cardGraphics?.clear();
            fillRoundRect(
              card,
              300,
              cardH,
              12,
              alternate
                ? new Color(222, 237, 196, 248)
                : new Color(229, 242, 205, 248),
            );
            strokeRoundRect(
              card,
              300,
              cardH,
              12,
              new Color(156, 101, 57, 215),
              1.7,
            );
          })
          .start();
      });
  }
  card.addChild(action);
  content.addChild(card);
}


export type TaskCardData = {
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


export type TaskRewardData = {
  icon: string;
  iconType?: "ui" | "item";
  count: number;
  label: string;
};


export const TASK_CARD_COLLAPSED_HEIGHT = 84;

export const TASK_REWARD_COLUMNS = 4;

export const TASK_REWARD_PANEL_BASE_HEIGHT = 65;

export const TASK_REWARD_ROW_STEP = 60;

export const TASK_REWARD_TOP_OFFSET = 83.5;

export const TASK_REWARD_BOTTOM_PADDING = 4.5;


export function getTaskRewardLayout(task: TaskCardData) {
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


export function createTaskCardData(tasks: any[]): TaskCardData[] {
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


export function drawTaskCategoryTabs(ui: any, body: Node) {
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


export function drawTaskListScroll(
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

  const gap = 6;
  const topPadding = 13;
  const bottomPadding = 3;
  const content = new Node("TaskListContent");
  const contentTransform = content.addComponent(UITransform);
  contentTransform.setContentSize(viewportW, viewportH);
  // Keep the list top anchored when a detail section changes its height.
  contentTransform.setAnchorPoint(0.5, 1);
  content.setPosition(0, viewportH / 2);
  viewport.addChild(content);

  const rows = cards.map((task) =>
    drawTaskCard(ui, gm, content, task, () => toggleDetails(task.id)),
  );
  rows.find((row) => row.id === ui.taskDetailId)?.setExpanded(true);
  layoutRows();

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

  function layoutRows() {
    let top = topPadding;
    for (const row of rows) {
      row.setCenterY(-top - row.height / 2);
      top += row.height + gap;
    }
    const height = Math.max(viewportH, top + bottomPadding - (rows.length ? gap : 0));
    if (contentTransform.height !== height) {
      contentTransform.setContentSize(viewportW, height);
    }
  }

  function restoreScroll(previousOffset: number) {
    const maxOffset = Math.max(0, scrollView.getMaxScrollOffset().y);
    const offset = Math.max(0, Math.min(previousOffset, maxOffset));
    scrollView.scrollToOffset(new Vec2(0, offset), 0);
    ui.taskScrollOffset = offset;
  }

  function toggleDetails(taskId: string) {
    if (!viewport.isValid || !content.isValid) return;
    const offset = scrollView.getScrollOffset().y;
    scrollView.stopAutoScroll();
    const previous = rows.find((row) => row.id === ui.taskDetailId);
    const opening = ui.taskDetailId !== taskId;
    ui.taskDetailId = opening ? taskId : "";
    previous?.setExpanded(false);
    if (opening) rows.find((row) => row.id === taskId)?.setExpanded(true);
    layoutRows();
    restoreScroll(offset);
  }

  ui.scheduleOnce(() => {
    if (!viewport.isValid || !content.isValid) return;
    restoreScroll(ui.taskScrollOffset || 0);
  }, 0);
}


function drawTaskCard(
  ui: any,
  gm: GameManager,
  body: Node,
  task: TaskCardData,
  onToggleDetails: () => void,
) {
  const collapsedH = TASK_CARD_COLLAPSED_HEIGHT;
  const w = 300;
  let h = collapsedH;
  let rewardPanel: Node | undefined;
  const shadow = new Node(`TaskCardShadow_${task.id}`);
  const shadowTransform = shadow.addComponent(UITransform);
  const card = new Node(`TaskCard_${task.id}`);
  const cardTransform = card.addComponent(UITransform);

  function redrawFrame() {
    shadowTransform.setContentSize(w, h);
    fillRoundRect(shadow, w, h, 13, new Color(111, 68, 38, 35));
    cardTransform.setContentSize(w, h);
    fillRoundRect(card, w, h, 14, new Color(255, 253, 242, 252));
    strokeRoundRect(card, w, h, 14, new Color(129, 76, 42, 230), 2.2);
  }

  redrawFrame();
  body.addChild(shadow);

  const topWash = new Node("TaskCardWarmTop");
  topWash.setPosition(0, 25);
  fillRoundRect(topWash, w - 16, 26, 12, new Color(255, 244, 218, 115));
  card.addChild(topWash);

  const icon = new Node("TaskNoIcon");
  icon.addComponent(UITransform).setContentSize(47, 47);
  icon.setPosition(-122, 13);
  ui.applyUiIcon(`task${task.no}`, icon);
  card.addChild(icon);

  const title = ui.makeLabel(
    `[${task.typeLabel}] ${task.title}`,
    17,
    new Color(48, 25, 16),
    true,
    -27,
    23,
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
    4,
    190,
    17,
  );
  desc.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
  card.addChild(desc);

  const progressY = -18;
  drawTaskProgress(ui, card, task, progressY, false);
  drawTaskActionButton(ui, gm, card, task, 8, false);
  const detailButton = drawTaskDetailButton(ui, card, progressY, onToggleDetails);
  drawTaskCardFlower(card, w / 2 - 1, collapsedH / 2 - 4);
  const summary = card.children.map((node) => ({ node, position: node.position.clone() }));
  body.addChild(card);

  return {
    id: task.id,
    get height() {
      return h;
    },
    setCenterY(y: number) {
      if (card.position.y !== y) card.setPosition(0, y);
      if (shadow.position.y !== y - 4) shadow.setPosition(0, y - 4);
    },
    setExpanded(expanded: boolean) {
      if (expanded === (h !== collapsedH)) return;
      const rewardLayout = expanded ? getTaskRewardLayout(task) : undefined;
      h = rewardLayout?.cardHeight ?? collapsedH;
      redrawFrame();

      const shift = (h - collapsedH) / 2;
      for (const { node, position } of summary) {
        node.setPosition(position.x, position.y + shift, position.z);
      }
      if (rewardLayout && !rewardPanel) {
        rewardPanel = drawTaskRewardPanel(ui, card, rewardLayout);
        rewardPanel.setSiblingIndex(detailButton.getSiblingIndex());
      }
      if (rewardPanel) rewardPanel.active = expanded;
    },
  };
}


export function drawTaskProgress(
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


export function drawTaskActionButton(
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
          const rewardAnimated = animateRewardsToInventory(
            ui,
            task.rewards || [],
            rewardStartWorld,
          );
          if (!rewardAnimated) ui.toast("\u5956\u52b1\u5df2\u9886\u53d6");
        } else {
          ui.toast("\u80cc\u5305\u7a7a\u95f4\u4e0d\u8db3");
        }
        return;
      }
      navigateToTaskAction(ui, task.action || "farm");
    });
  parent.addChild(button);
}


export function navigateToTaskAction(ui: any, action: TaskAction) {
  if (action === "farm") {
    const taskPanel = ui.panels.task;
    if (taskPanel?.active) ui.closePanelWithAnimation(taskPanel);
    ui.scheduleOnce(() => {
      if (ui.activeWorld !== "farm") ui.switchWorld("farm");
      else ui.toast("已平滑定位到农场");
    }, 0.14);
    return;
  }
  if (action === "craft") {
    showPanel(ui, "craft");
    return;
  }
  showPanel(ui, action);
}


function drawTaskDetailButton(
  ui: any,
  parent: Node,
  y: number,
  onToggleDetails: () => void,
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
      onToggleDetails();
    });
  parent.addChild(button);
  return button;
}


export function drawTaskRewardPanel(
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
  return panel;
}


export function drawTaskCardFlower(parent: Node, x: number, y: number) {
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


export function drawTaskRewardIcon(
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
