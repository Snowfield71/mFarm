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
import { FLOWERHOUSE_SEED_PANEL_CENTER_Y } from "../farm/MainUILandShared";



// Shared by the barn action row and the feed picker confirmation buttons.
export function getBarnActionButtonTheme(highlighted: boolean) {
  return {
    fill: highlighted ? new Color(255, 222, 140) : new Color(255, 241, 203),
    stroke: highlighted ? new Color(173, 99, 35) : new Color(193, 144, 88),
    text: new Color(93, 52, 30),
    radius: 8,
    strokeWidth: highlighted ? 1.6 : 1.15,
  };
}

export function drawBarnActionButtonSurface(node: Node, width: number, height: number, highlighted: boolean) {
  const theme = getBarnActionButtonTheme(highlighted);
  fillRoundRect(node, width, height, theme.radius, theme.fill);
  strokeRoundRect(node, width, height, theme.radius, theme.stroke, theme.strokeWidth);
}

export function productionRatio(production: {
  duration?: number;
  remaining?: number;
  ready?: boolean;
} | null | undefined): number {
  if (!production) return 0;
  if (production.ready) return 1;
  const duration = Math.max(1, Number(production.duration || 1));
  return Math.max(
    0,
    Math.min(1, 1 - Number(production.remaining || duration) / duration),
  );
}


export function createSceneInteractionBadge(
  ui: any,
  parent: Node,
  options: {
    name: string;
    x: number;
    y: number;
    width?: number;
    label: string;
    ratio?: number;
    ready?: boolean;
    locked?: boolean;
    onClick: () => void;
  },
): Node {
  const width = options.width || 70;
  const badge = new Node(options.name);
  badge.addComponent(UITransform).setContentSize(width, 24);
  badge.setPosition(options.x, options.y);
  const badgeBackground = new Node("SceneBadgeBackground");
  badgeBackground.addComponent(UITransform).setContentSize(width, 24);
  ui.applyUiIcon(options.ready ? "feedCardSelectedBg" : "feedCardBg", badgeBackground);
  if (options.locked) {
    badgeBackground.addComponent(UIOpacity).opacity = 155;
  }
  badge.addChild(badgeBackground);
  badge.addChild(
    ui.makeLabel(
      options.label,
      9,
      new Color(94, 55, 29),
      true,
      0,
      4,
      width - 8,
      13,
    ),
  );
  const progress = new Node("SceneBadgeProgress");
  progress.addComponent(UITransform).setContentSize(width - 14, 4);
  progress.setPosition(0, -7);
  fillRoundRect(progress, width - 14, 4, 2, new Color(166, 119, 75, 105));
  const ratio = Math.max(0, Math.min(1, Number(options.ratio || 0)));
  const fillWidth = (width - 16) * ratio;
  if (fillWidth > 0) {
    const fill = new Node("Fill");
    fill.addComponent(UITransform).setContentSize(fillWidth, 3);
    fill.setPosition(-(width - 16) / 2 + fillWidth / 2, 0);
    fillRoundRect(
      fill,
      fillWidth,
      3,
      1.5,
      options.ready
        ? new Color(255, 171, 45, 255)
        : new Color(117, 189, 75, 255),
    );
    progress.addChild(fill);
  }
  badge.addChild(progress);
  badge.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(badge)
      .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
      .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
      .call(options.onClick)
      .start();
  });
  parent.addChild(badge);
  return badge;
}


export function emitSceneCardClick(card: Node | null | undefined) {
  if (!card?.isValid) return;
  card.emit(Node.EventType.TOUCH_END, { stopPropagation() {} });
}


export function updateSceneInteractionBadge(
  badge: Node | null | undefined,
  labelText: string,
  ratioValue: number,
  ready = false,
) {
  if (!badge?.isValid) return;
  const label = badge.children.find((child) => child.getComponent(Label))?.getComponent(Label);
  if (label) label.string = labelText;
  const progress = badge.getChildByName("SceneBadgeProgress");
  if (!progress) return;
  [...progress.children].forEach((child) => child.destroy());
  const progressWidth = Math.max(
    0,
    (progress.getComponent(UITransform)?.contentSize.width || 0) - 2,
  );
  const fillWidth = progressWidth * Math.max(0, Math.min(1, ratioValue));
  if (fillWidth <= 0) return;
  const fill = new Node("Fill");
  fill.addComponent(UITransform).setContentSize(fillWidth, 3);
  fill.setPosition(-progressWidth / 2 + fillWidth / 2, 0);
  fillRoundRect(
    fill,
    fillWidth,
    3,
    1.5,
    ready ? new Color(255, 171, 45, 255) : new Color(117, 189, 75, 255),
  );
  progress.addChild(fill);
}


export function rebuildFlowerHouseSceneControls(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  content.children
    .filter(
      (child) =>
        child.name.startsWith("FlowerSceneControl_") ||
        child.name.startsWith("FlowerSceneVisual_"),
    )
    .forEach((child) => child.destroy());
  const land = LandSystem.getInstance();
  const positions = [
    [-91, 78],
    [91, 78],
    [-91, -4],
    [91, -4],
  ];
  land.getFlowerHouseSlots(buildingSlotId).forEach((slot, index) => {
    const point = positions[index];
    if (!point) return;
    const production = land.getFlowerHouseSlotProduction(buildingSlotId, slot.id);
    if (slot.flowerId) {
      const visual = ui.createItemIcon(slot.flowerId, 46);
      visual.name = `FlowerSceneVisual_${slot.id}`;
      visual.setPosition(point[0], point[1] + 13);
      content.addChild(visual);
    }
    createSceneInteractionBadge(ui, content, {
      name: `FlowerSceneControl_${slot.id}`,
      x: point[0],
      y: point[1] - 24,
      width: 74,
      label: !slot.flowerId
        ? "点击种植"
        : production?.ready
          ? "点击收获"
          : `生长 ${Math.round(productionRatio(production) * 100)}%`,
      ratio: productionRatio(production),
      ready: !!production?.ready,
      onClick: () =>
        emitSceneCardClick(content.getChildByName(`FlowerHouseCard_${slot.id}`)),
    });
  });
}


export function rebuildBeehiveSceneControls(
  ui: any,
  content: Node,
  buildingSlotId: number,
) {
  content.children
    .filter(
      (child) =>
        child.name.startsWith("BeehiveSceneControl_") ||
        child.name.startsWith("BeehiveSceneVisual_"),
    )
    .forEach((child) => child.destroy());
  const land = LandSystem.getInstance();
  const positions = [
    [-88, 142], [0, 142], [88, 142],
    [-88, 78], [0, 78], [88, 78],
    [-88, 14], [0, 14], [88, 14],
  ];
  land.getBeehiveSlots(buildingSlotId).forEach((slot, index) => {
    const point = positions[index];
    if (!point) return;
    const production = land.getBeehiveSlotProduction(buildingSlotId, slot.id);
    if (slot.unlocked) {
      const visual = new Node(`BeehiveSceneVisual_${slot.id}`);
      visual.addComponent(UITransform).setContentSize(34, 34);
      visual.setPosition(point[0], point[1] + 8);
      ui.applyUiIcon(getBeehiveHoneyIconKey(production), visual);
      content.addChild(visual);
    }
    createSceneInteractionBadge(ui, content, {
      name: `BeehiveSceneControl_${slot.id}`,
      x: point[0],
      y: point[1] - 21,
      width: 44,
      label: !slot.unlocked
        ? "待解锁"
        : production?.ready
          ? "收蜜"
          : production
            ? `${Math.round(productionRatio(production) * 100)}%`
            : "选花",
      ratio: productionRatio(production),
      ready: !!production?.ready,
      locked: !slot.unlocked,
      onClick: () =>
        emitSceneCardClick(
          content
            .getChildByName("BeehiveCardViewport")
            ?.getChildByName("BeehiveCardContent")
            ?.getChildByName(`BeehiveCard_${slot.id}`),
        ),
    });
  });
}


export const FLOWER_HOUSE_FLOWERS = ["sunflower", "flower", "tulip", "rose"];

export const FLOWER_HOUSE_SEED_ICONS: Record<string, string> = {
  sunflower: "flowerSeedSunflower",
  flower: "flowerSeedFlower",
  tulip: "flowerSeedTulip",
  rose: "flowerSeedRose",
};

export const FLOWER_HOUSE_GROWTH_ICONS: Record<string, [string, string, string]> = {
  sunflower: ["flowerGrowthSunflowerStage1", "flowerGrowthSunflowerStage2", "flowerGrowthSunflowerStage3"],
  flower: ["flowerGrowthFlowerStage1", "flowerGrowthFlowerStage2", "flowerGrowthFlowerStage3"],
  tulip: ["flowerGrowthTulipStage1", "flowerGrowthTulipStage2", "flowerGrowthTulipStage3"],
  rose: ["flowerGrowthRoseStage1", "flowerGrowthRoseStage2", "flowerGrowthRoseStage3"],
};


export function drawFlowerHouseSeedPriceBand(node: Node, selected: boolean) {
  const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = selected
    ? new Color(255, 220, 139, 255)
    : new Color(255, 224, 157, 255);
  // Start with a bottom-rounded block, then fill its upper arc notches with a
  // rectangle. The resulting price strip has square upper corners while its
  // lower corners follow the card's rounded silhouette, matching the reference.
  graphics.roundRect(-28.5, -12, 57, 24, 6);
  graphics.fill();
  graphics.rect(-28.5, 0, 57, 12);
  graphics.fill();
}


export function drawGreenhouseSeedCountBand(node: Node, selected: boolean) {
  const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = selected
    ? new Color(255, 220, 139, 255)
    : new Color(255, 224, 157, 255);
  // Same reference geometry as the flower-house price strip: square upper
  // corners and lower corners following the enclosing seed card.
  graphics.roundRect(-28.5, -12, 57, 24, 6);
  graphics.fill();
  graphics.rect(-28.5, 0, 57, 12);
  graphics.fill();
}


export function createFlowerHouseSeedShelf(ui: any, dialog: Node) {
  const items = FLOWER_HOUSE_FLOWERS.map((id) => ({
    id,
    name: ui.itemName(id),
    price: LandSystem.getInstance().getFlowerHousePlantCost(id),
    iconKey: FLOWER_HOUSE_SEED_ICONS[id],
  }));
  const shelf = new Node("FlowerHouseSeedShelf");
  // The background already provides the ornamental lower panel. This node is
  // only a clipped interaction host and must not paint over its border.
  // Keep the shelf centre fixed while expanding equally upward/downward inside
  // the ornamental lower panel.
  shelf.addComponent(UITransform).setContentSize(286, 104);
  shelf.setPosition(0, FLOWERHOUSE_SEED_PANEL_CENTER_Y);
  dialog.addChild(shelf);

  const viewport = new Node("FlowerHouseSeedViewport");
  viewport.addComponent(UITransform).setContentSize(278, 98);
  viewport.addComponent(Mask);
  shelf.addChild(viewport);
  const cardWidth = 62;
  const gap = 7;
  const occupiedWidth = items.length * cardWidth + Math.max(0, items.length - 1) * gap;
  const contentWidth = Math.max(278, occupiedWidth);
  const content = new Node("FlowerHouseSeedContent");
  content.addComponent(UITransform).setContentSize(contentWidth, 98);
  viewport.addChild(content);
  const scroll = viewport.addComponent(ScrollView);
  scroll.content = content;
  scroll.horizontal = true;
  scroll.vertical = false;

  // Centre the visible card group, not the padded scroll content. With four
  // cards the group is 269px wide inside a 278px viewport; using contentWidth
  // here leaves it visibly 4.5px left of the reserved panel centre.
  const startX = -occupiedWidth / 2 + cardWidth / 2;
  items.forEach((item, index) => {
    const selected = ui.flowerHouseSelectedFlowerId === item.id;
    const card = new Node(`FlowerHouseSeedCard_${item.id}`);
    card.addComponent(UITransform).setContentSize(cardWidth, 94);
    card.setPosition(startX + index * (cardWidth + gap), 0);
    fillRoundRect(card, 60, 92, 7, selected
      ? new Color(255, 241, 196, 255)
      : new Color(255, 235, 196, 250));
    strokeRoundRect(card, 60, 92, 7, selected
      ? new Color(220, 111, 29, 255)
      : new Color(208, 137, 66, 255), selected ? 2.5 : 1.4);
    const priceBand = new Node("FlowerHouseSeedPriceBand");
    priceBand.addComponent(UITransform).setContentSize(57, 24);
    priceBand.setPosition(0, -33);
    drawFlowerHouseSeedPriceBand(priceBand, selected);
    card.addChild(priceBand);
    const icon = new Node(`FlowerHouseSeedIcon_${item.id}`);
    icon.addComponent(UITransform).setContentSize(42, 42);
    icon.setPosition(0, 23);
    ui.applyUiIcon(item.iconKey, icon);
    card.addChild(icon);
    card.addChild(ui.makeLabel(item.name, 9, new Color(91, 52, 26), true, 0, -9, 56, 14));
    const coin = new Node(`FlowerHouseSeedGold_${item.id}`);
    coin.addComponent(UITransform).setContentSize(16, 16);
    coin.setPosition(-16, -34);
    ui.applyUiIcon("gold", coin);
    card.addChild(coin);
    card.addChild(ui.makeLabel(`${item.price}金币`, 8, new Color(102, 60, 30), true, 9, -34, 42, 14));
    card.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      ui.flowerHouseSelectedFlowerId = item.id;
      content.children.forEach((child) => {
        const active = child.name === `FlowerHouseSeedCard_${item.id}`;
        fillRoundRect(child, 60, 92, 7, active
          ? new Color(255, 241, 196, 255)
          : new Color(255, 235, 196, 250));
        strokeRoundRect(child, 60, 92, 7, active
          ? new Color(220, 111, 29, 255)
          : new Color(208, 137, 66, 255), active ? 2.5 : 1.4);
        const childPriceBand = child.getChildByName("FlowerHouseSeedPriceBand");
        if (childPriceBand) drawFlowerHouseSeedPriceBand(childPriceBand, active);
      });
    });
    content.addChild(card);
  });
}

export const BEEHIVE_FEED_ICONS: Record<string, string> = {
  sunflower: "beehiveFeedSunflower",
  flower: "beehiveFeedFlower",
  tulip: "beehiveFeedTulip",
  rose: "beehiveFeedRose",
};

export const BEEHIVE_SLOT_NAMES = [
  "嗡嗡",
  "蜜蜜",
  "花花",
  "甜甜",
  "团团",
  "朵朵",
  "暖暖",
  "乐乐",
  "圆圆",
];

export const BEEHIVE_FEED_PANEL_WIDTH = 282;

export const BEEHIVE_FEED_VIEWPORT_WIDTH = 270;

export const BEEHIVE_FEED_CARD_WIDTH = 74;

export const BEEHIVE_FEED_GAP = 6;


export function getBeehiveFeedLayout(itemCount: number) {
  const rowWidth =
    itemCount > 0
      ? itemCount * BEEHIVE_FEED_CARD_WIDTH + (itemCount - 1) * BEEHIVE_FEED_GAP
      : 0;
  const contentWidth = Math.max(BEEHIVE_FEED_VIEWPORT_WIDTH, rowWidth);
  const startX =
    itemCount <= 0
      ? 0
      : rowWidth <= BEEHIVE_FEED_VIEWPORT_WIDTH
        ? -rowWidth / 2 + BEEHIVE_FEED_CARD_WIDTH / 2
        : -contentWidth / 2 + BEEHIVE_FEED_CARD_WIDTH / 2;
  return { rowWidth, contentWidth, startX };
}


export function drawBeehiveFeedCard(ui: any, cell: Node, selected: boolean) {
  let background = cell.getChildByName("FeedCardBackground");
  if (!background) {
    background = new Node("FeedCardBackground");
    background
      .addComponent(UITransform)
      .setContentSize(BEEHIVE_FEED_CARD_WIDTH, 32);
    cell.addChild(background);
    background.setSiblingIndex(0);
  }
  ui.applyUiIcon(selected ? "feedCardSelectedBg" : "feedCardBg", background);
}


export interface FlowerOptionItem {
  id: string;
  iconKey: string;
  label: string;
  subLabel?: string;
}


export interface FlowerOptionScrollerOptions {
  panelName: string;
  viewportName: string;
  contentName: string;
  cellPrefix: string;
  iconPrefix: string;
  panelY: number;
  items: FlowerOptionItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  scrollStateKey?: string;
  labelName?: string;
  createIcon?: (id: string, size: number) => Node;
}


/**
 * Shared horizontal flower selector used by the beehive feed row and the
 * flower-house seed row. Keeping panel, viewport, card geometry and scrolling
 * in one implementation prevents the two interfaces from drifting apart.
 */
export function createFlowerOptionScroller(
  ui: any,
  parent: Node,
  options: FlowerOptionScrollerOptions,
) {
  const panel = new Node(options.panelName);
  panel.addComponent(UITransform).setContentSize(BEEHIVE_FEED_PANEL_WIDTH, 48);
  panel.setPosition(0, options.panelY);
  ui.applyUiIcon("beehiveBottomPanelBg", panel);
  parent.addChild(panel);

  const viewport = new Node(options.viewportName);
  viewport
    .addComponent(UITransform)
    .setContentSize(BEEHIVE_FEED_VIEWPORT_WIDTH, 32);
  viewport.setPosition(0, options.panelY);
  viewport.addComponent(Mask);
  parent.addChild(viewport);

  const layout = getBeehiveFeedLayout(options.items.length);
  const optionContent = new Node(options.contentName);
  optionContent
    .addComponent(UITransform)
    .setContentSize(layout.contentWidth, 32);
  viewport.addChild(optionContent);

  const scroll = viewport.addComponent(ScrollView);
  scroll.content = optionContent;
  scroll.horizontal = true;
  scroll.vertical = false;

  const restoreScrollX = options.scrollStateKey
    ? Math.max(0, (parent as any)[options.scrollStateKey] || 0)
    : 0;
  if (options.scrollStateKey) {
    const rememberScroll = () => {
      if (
        !scroll.isValid ||
        !optionContent.isValid ||
        scroll.content !== optionContent
      ) {
        return;
      }
      (parent as any)[options.scrollStateKey!] = Math.max(
        0,
        scroll.getScrollOffset().x,
      );
    };
    scroll.node.on(ScrollView.EventType.SCROLLING, rememberScroll);
    scroll.node.on(ScrollView.EventType.SCROLL_ENDED, rememberScroll);
  }

  options.items.forEach((option, index) => {
    const cell = new Node(`${options.cellPrefix}_${option.id}`);
    cell.addComponent(UITransform).setContentSize(BEEHIVE_FEED_CARD_WIDTH, 32);
    cell.setPosition(
      layout.startX + index * (BEEHIVE_FEED_CARD_WIDTH + BEEHIVE_FEED_GAP),
      0,
    );
    drawBeehiveFeedCard(ui, cell, options.selectedId === option.id);

    const icon =
      options.createIcon?.(option.id, 26)
      || new Node(`${options.iconPrefix}_${option.id}`);
    icon.name = `${options.iconPrefix}_${option.id}`;
    if (!icon.getComponent(UITransform)) {
      icon.addComponent(UITransform).setContentSize(26, 26);
    } else {
      icon.getComponent(UITransform)!.setContentSize(26, 26);
    }
    icon.setPosition(-22, 0);
    if (!options.createIcon) ui.applyUiIcon(option.iconKey, icon);
    cell.addChild(icon);

    const label = ui.makeLabel(
      option.label,
      option.subLabel ? 7 : 8,
      new Color(92, 50, 26),
      true,
      15,
      option.subLabel ? 6 : 0,
      52,
      option.subLabel ? 13 : 18,
    );
    label.name = options.labelName || `${options.cellPrefix}Label`;
    cell.addChild(label);
    if (option.subLabel) {
      const subLabel = ui.makeLabel(
        option.subLabel,
        7,
        new Color(133, 78, 39),
        true,
        15,
        -7,
        52,
        12,
      );
      subLabel.name = `${options.cellPrefix}SubLabel`;
      cell.addChild(subLabel);
    }

    cell
      .addComponent(Button)
      .node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        options.onSelect(option.id);
        if (!optionContent.isValid) return;
        optionContent.children.forEach((candidate) => {
          drawBeehiveFeedCard(
            ui,
            candidate,
            candidate.name === `${options.cellPrefix}_${option.id}`,
          );
        });
      });
    optionContent.addChild(cell);
  });

  ui.scheduleOnce(() => {
    if (
      !parent.isValid ||
      !viewport.isValid ||
      !optionContent.isValid ||
      !scroll.isValid ||
      viewport.parent !== parent ||
      optionContent.parent !== viewport ||
      scroll.content !== optionContent
    ) {
      return;
    }
    const maxOffset = Math.max(
      0,
      layout.contentWidth - BEEHIVE_FEED_VIEWPORT_WIDTH,
    );
    scroll.scrollToOffset(new Vec2(Math.min(restoreScrollX, maxOffset), 0), 0);
  }, 0.02);

  return { panel, viewport, content: optionContent, scroll };
}


export const BEEHIVE_HONEY_ICON_KEYS: Record<string, [string, string, string]> = {
  sunflower: [
    "beehiveHoneySunflowerStage1",
    "beehiveHoneySunflowerStage2",
    "beehiveHoneySunflowerStage3",
  ],
  flower: [
    "beehiveHoneyFlowerStage1",
    "beehiveHoneyFlowerStage2",
    "beehiveHoneyFlowerStage3",
  ],
  tulip: [
    "beehiveHoneyTulipStage1",
    "beehiveHoneyTulipStage2",
    "beehiveHoneyTulipStage3",
  ],
  rose: [
    "beehiveHoneyRoseStage1",
    "beehiveHoneyRoseStage2",
    "beehiveHoneyRoseStage3",
  ],
};


export function getBeehiveHoneyIconKey(production: any): string {
  if (!production?.sourceFlowerId) return "beehiveHoneyEmpty";
  const keys = BEEHIVE_HONEY_ICON_KEYS[production.sourceFlowerId];
  if (!keys) return "beehiveHoneyEmpty";
  if (production.ready) return keys[2];
  const progress = Math.max(
    0,
    Math.min(1, 1 - production.remaining / production.duration),
  );
  return progress < 0.5 ? keys[0] : keys[1];
}


export function drawBeehiveCardProgress(progress: Node, production: any) {
  fillRoundRect(progress, 52, 7, 4, new Color(190, 135, 80, 115));
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
  const width = 50 * ratio;
  fill.active = width > 0;
  if (!fill.active) return;
  fill.getComponent(UITransform)!.setContentSize(width, 5);
  fill.setPosition(-25 + width / 2, 0);
  fillRoundRect(
    fill,
    width,
    5,
    3,
    production.ready ? new Color(255, 166, 43) : new Color(255, 190, 56),
  );
}


export function stopBeehiveHarvestAnimation(card: Node) {
  if (!(card as any).__beehiveHarvestAnimating) return;
  (card as any).__beehiveHarvestAnimating = false;
  Tween.stopAllByTarget(card);
  card.setPosition(card.position.x, 0, card.position.z);
}


export function refreshVisibleBeehiveHarvestAnimations(
  content: Node,
  buildingSlotId: number,
) {
  const viewport = content.getChildByName("BeehiveCardViewport");
  const cardContent = viewport?.getChildByName("BeehiveCardContent");
  const scroll = viewport?.getComponent(ScrollView);
  if (!viewport || !cardContent || !scroll || scroll.content !== cardContent)
    return;

  const contentWidth = cardContent.getComponent(UITransform)?.width || 0;
  const viewportWidth = viewport.getComponent(UITransform)?.width || 0;
  const offsetX = Math.max(0, scroll.getScrollOffset().x);
  const left = -contentWidth / 2 + offsetX;
  const right = left + viewportWidth;
  const land = LandSystem.getInstance();
  const readyVisibleCards: Node[] = [];

  land.getBeehiveSlots(buildingSlotId).forEach((slot) => {
    const card = cardContent.getChildByName(`BeehiveCard_${slot.id}`);
    if (!card) return;
    const production = slot.unlocked
      ? land.getBeehiveSlotProduction(buildingSlotId, slot.id)
      : null;
    const centerX = card.position.x;
    const cardHalfWidth = (card.getComponent(UITransform)?.width || 68) / 2;
    const isVisible =
      centerX - cardHalfWidth >= left && centerX + cardHalfWidth <= right;
    if (production?.ready && isVisible) {
      readyVisibleCards.push(card);
    } else {
      stopBeehiveHarvestAnimation(card);
    }
  });

  readyVisibleCards
    .sort((a, b) => a.position.x - b.position.x)
    .forEach((card, index) => {
      if ((card as any).__beehiveHarvestAnimating) return;
      (card as any).__beehiveHarvestAnimating = true;
      const basePosition = card.position.clone();
      const raisedPosition = new Vec3(
        basePosition.x,
        basePosition.y + 3,
        basePosition.z,
      );
      tween(card)
        .delay(index * 0.14)
        .repeatForever(
          tween()
            .to(0.12, { position: raisedPosition }, { easing: "quadOut" })
            .to(0.12, { position: basePosition }, { easing: "quadIn" })
            .delay(0.72),
        )
        .start();
    });
}


export function setFlowerHarvestAnimation(
  icon: Node | null | undefined,
  ready: boolean,
) {
  if (!icon) return;
  if (!ready) {
    if ((icon as any).__flowerHarvestAnimating) {
      (icon as any).__flowerHarvestAnimating = false;
      Tween.stopAllByTarget(icon);
    }
    icon.angle = 0;
    return;
  }
  if ((icon as any).__flowerHarvestAnimating) return;
  (icon as any).__flowerHarvestAnimating = true;
  Tween.stopAllByTarget(icon);
  icon.angle = 0;
  tween(icon)
    .repeatForever(
      tween()
        .to(0.28, { angle: 5 }, { easing: "sineInOut" })
        .to(0.56, { angle: -5 }, { easing: "sineInOut" })
        .to(0.28, { angle: 0 }, { easing: "sineInOut" })
        .delay(0.4),
    )
    .start();
}
