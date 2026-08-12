import {
  Button,
  Color,
  Graphics,
  Label,
  LabelOutline,
  Node,
  NodePool,
  Tween,
  UIOpacity,
  UITransform,
  Vec3,
  tween,
  view,
} from "cc";
import { Design } from "../../config/GameConfig";
import { fillRoundRect, strokeRoundRect } from "../utils/UIDraw";
import type { PanelName } from "./MainUITypes";
import { getSeasonInfo, SEASON_LABELS, Season } from "../../config/SeasonConfig";
import { GameManager } from "../../core/GameManager";
import { InventorySystem } from "../../systems/InventorySystem";

function getSeasonBackgroundIcon(world: "farm" | "pasture", season: Season): string {
  const backgrounds: Record<Season, { farm: string; pasture: string }> = {
    spring: { farm: "bgFarmSkyHills", pasture: "bgPastureFence" },
    summer: { farm: "bgFarmSummer", pasture: "bgPastureSummer" },
    autumn: { farm: "bgFarmAutumn", pasture: "bgPastureAutumn" },
    winter: { farm: "bgFarmWinter", pasture: "bgPastureWinter" },
  };
  return backgrounds[season][world];
}

const SEASON_SUFFIX: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

function getSeasonAvatarIcon(season: Season): string {
  return `avatarFarmgirl${SEASON_SUFFIX[season]}`;
}

function getSeasonNavIcon(
  icon: "bag" | "gear" | "quest" | "catalog",
  season: Season,
): string {
  return `${icon}${SEASON_SUFFIX[season]}`;
}

function applySeasonCharacterAndNavArt(ui: any, season: Season) {
  const avatarImage = ui.topBar
    ?.getChildByName("Avatar")
    ?.getChildByName("AvatarImage");
  if (avatarImage) ui.applyUiIcon(getSeasonAvatarIcon(season), avatarImage);

  const nav = ui.node?.getChildByName("BottomNav");
  const icons: Array<[string, "bag" | "gear" | "quest" | "catalog"]> = [
    ["inventory", "bag"],
    ["craft", "gear"],
    ["task", "quest"],
    ["quest", "catalog"],
  ];
  for (const [panel, iconName] of icons) {
    const icon = nav?.getChildByName(`Nav_${panel}`)?.getChildByName("Icon");
    if (icon) ui.applyUiIcon(getSeasonNavIcon(iconName, season), icon);
  }
}

const TOP_BAR_TEXT_STYLE = {
  title: new Color(88, 45, 24),
  secondary: new Color(126, 78, 43),
  outline: new Color(255, 246, 225),
};

function applySeasonTextStyle(ui: any, _season: Season) {
  const style = TOP_BAR_TEXT_STYLE;
  const title = ui.topBar?.getChildByName("FarmTitle");
  const seasonLabel = ui.topBar?.getChildByName("SeasonLabel");
  const level = ui.topBar
    ?.getChildByName("LevelBadge")
    ?.getChildByName("LevelText");
  const levelLabel = level?.getComponent(Label);
  if (levelLabel) levelLabel.color = new Color(88, 45, 24);
  level?.getComponent(LabelOutline)?.destroy();
  for (const [node, color, width] of [
    [title, style.title, 2],
    [seasonLabel, style.secondary, 1.2],
  ] as Array<[Node | null | undefined, Color, number]>) {
    if (!node?.isValid) continue;
    const label = node.getComponent(Label);
    if (label) label.color = color;
    const outline = node.getComponent(LabelOutline) ?? node.addComponent(LabelOutline);
    outline.color = style.outline;
    outline.width = width;
  }
}

export function createBackground(ui: any) {
  const vs = view.getVisibleSize();
  const artBg = new Node("ArtBackground");
  artBg.addComponent(UITransform).setContentSize(vs.width, vs.height);
  artBg.setPosition(0, 0);
  ui.applyUiIcon(getSeasonBackgroundIcon("farm", getSeasonInfo().season), artBg);
  ui.node.addChild(artBg);
  artBg.setSiblingIndex(ui.node.children.length - 1);
  ui.artBackground = artBg;
}

export function createSeasonalEffectLayer(ui: any) {
  const vs = view.getVisibleSize();
  const layer = new Node("SeasonalScreenEffects");
  layer.addComponent(UITransform).setContentSize(vs.width, vs.height);
  layer.setPosition(0, 0);
  ui.node.addChild(layer);
  ui.seasonEffectLayer = layer;
  // Particles must be visible from the physical top edge, including over the
  // top bar, while panels/dialogs created later remain above this layer.
  const topBarIndex = ui.topBar?.getSiblingIndex?.() ?? -1;
  if (topBarIndex >= 0) layer.setSiblingIndex(topBarIndex + 1);
  ui.seasonParticlePool = ui.seasonParticlePool || new NodePool();
  ui.activeSeasonParticles =
    ui.activeSeasonParticles || new Set<Node>();
  ui.seasonVisualKey = "";
  syncSeasonPresentation(ui, true);
}

function syncSeasonPresentation(ui: any, force = false) {
  const season = getSeasonInfo().season;
  const key = `${ui.activeWorld}:${season}`;
  if (!force && ui.seasonVisualKey === key) return season;
  const previousSeason = ui.seasonVisualKey
    ? ui.seasonVisualKey.split(":").pop()
    : "";
  ui.seasonVisualKey = key;
  ui.applyUiIcon(getSeasonBackgroundIcon(ui.activeWorld, season), ui.artBackground);
  applySeasonTextStyle(ui, season);
  applySeasonCharacterAndNavArt(ui, season);
  // Farm/pasture switches only replace the scene background. Existing seasonal
  // particles keep moving and are rebuilt only when the season changes.
  if (previousSeason !== season && ui.seasonEffectLayer?.isValid) {
    ui.seasonEffectTimer = 0;
    recycleAllSeasonParticles(ui);
    if (previousSeason) ui.refreshLand?.();
  }
  return season;
}

export function updateSeasonPresentation(ui: any, dt: number) {
  const season = syncSeasonPresentation(ui);
  if (!ui.seasonEffectLayer?.isValid) return;
  ui.seasonEffectTimer += dt;
  const intervals: Record<Season, number> = {
    spring: 0.3,
    summer: 0.24,
    autumn: 0.42,
    winter: 0.12,
  };
  const interval = intervals[season];
  while (ui.seasonEffectTimer >= interval) {
    ui.seasonEffectTimer -= interval;
    spawnSeasonParticle(ui, season);
    if (season === "winter" && Math.random() > 0.48)
      spawnSeasonParticle(ui, season);
  }
}

function spawnSeasonParticle(ui: any, season: Season) {
  const layer = ui.seasonEffectLayer as Node;
  if (!layer?.isValid) return;
  const active = ui.activeSeasonParticles as Set<Node>;
  const activeCaps: Record<Season, number> = {
    spring: 24,
    summer: 22,
    autumn: 24,
    winter: 48,
  };
  if (active.size >= activeCaps[season]) return;
  const vs = view.getVisibleSize();
  const particleNames: Record<Season, string> = {
    spring: "SpringPetal",
    summer: "SummerPollen",
    autumn: "FallingLeaf",
    winter: "Snowflake",
  };
  const pool = ui.seasonParticlePool as NodePool;
  const particle = pool.size() > 0 ? pool.get()! : createSeasonParticleNode();
  particle.name = particleNames[season];
  particle.active = true;
  particle.angle = 0;
  (particle as any).__seasonParticleActive = true;
  active.add(particle);
  const startX = (Math.random() - 0.5) * (vs.width + 40);
  const startY = vs.height / 2 + 18;
  const driftRange =
    season === "winter" ? 75 : season === "summer" ? 55 : 130;
  const drift = (Math.random() - 0.5) * driftRange;
  const duration =
    season === "winter"
      ? 6.5 + Math.random() * 4
      : season === "summer"
        ? 7 + Math.random() * 4
        : 5 + Math.random() * 3;
  particle.setPosition(startX, startY);
  const opacity = particle.getComponent(UIOpacity)!;
  opacity.opacity = season === "summer" ? 175 : season === "winter" ? 205 : 225;
  const graphics = particle.getComponent(Graphics)!;
  graphics.clear();
  if (season === "winter") {
    const radius = 1.8 + Math.random() * 2.2;
    graphics.fillColor = new Color(255, 255, 255, 235);
    graphics.circle(0, 0, radius);
    graphics.fill();
  } else if (season === "autumn") {
    const colors = [
      new Color(226, 132, 45, 245),
      new Color(205, 94, 43, 245),
      new Color(235, 171, 55, 245),
      new Color(167, 112, 49, 245),
    ];
    graphics.fillColor = colors[Math.floor(Math.random() * colors.length)];
    graphics.ellipse(0, 0, 5.5, 2.8);
    graphics.fill();
    graphics.strokeColor = new Color(120, 74, 39, 210);
    graphics.lineWidth = 1;
    graphics.moveTo(-4, 0);
    graphics.lineTo(5, 0);
    graphics.stroke();
    particle.angle = Math.random() * 180;
  } else if (season === "spring") {
    const petalColors = [
      new Color(255, 187, 205, 238),
      new Color(255, 218, 227, 242),
      new Color(250, 244, 229, 235),
    ];
    graphics.fillColor =
      petalColors[Math.floor(Math.random() * petalColors.length)];
    graphics.ellipse(0, 0, 4.8, 2.5);
    graphics.fill();
    graphics.strokeColor = new Color(205, 126, 145, 155);
    graphics.lineWidth = 0.8;
    graphics.ellipse(0, 0, 4.8, 2.5);
    graphics.stroke();
    particle.angle = Math.random() * 180;
  } else {
    const radius = 1.3 + Math.random() * 1.8;
    graphics.fillColor =
      Math.random() > 0.35
        ? new Color(255, 229, 105, 215)
        : new Color(191, 231, 122, 205);
    graphics.circle(0, 0, radius);
    graphics.fill();
    graphics.strokeColor = new Color(255, 249, 194, 120);
    graphics.lineWidth = 1.2;
    graphics.circle(0, 0, radius + 1.4);
    graphics.stroke();
  }
  layer.addChild(particle);
  const target = new Vec3(startX + drift, -vs.height / 2 - 24, 0);
  tween(particle)
    .to(duration, {
      position: target,
      angle:
        particle.angle +
        (season === "winter"
          ? 80
          : season === "summer"
            ? 120
            : 540 + Math.random() * 360),
    }, { easing: "linear" })
    .call(() => recycleSeasonParticle(ui, particle))
    .start();
  tween(opacity)
    .delay(duration * 0.72)
    .to(duration * 0.28, { opacity: 0 }, { easing: "quadIn" })
    .start();
}

const MAX_SEASON_PARTICLE_POOL = 56;

function createSeasonParticleNode(): Node {
  const particle = new Node("SeasonParticle");
  particle.addComponent(UITransform).setContentSize(18, 18);
  particle.addComponent(UIOpacity);
  particle.addComponent(Graphics);
  return particle;
}

function recycleSeasonParticle(ui: any, particle: Node) {
  if (!(particle as any).__seasonParticleActive) return;
  (particle as any).__seasonParticleActive = false;
  Tween.stopAllByTarget(particle);
  const opacity = particle.getComponent(UIOpacity);
  if (opacity) Tween.stopAllByTarget(opacity);
  (ui.activeSeasonParticles as Set<Node>)?.delete(particle);
  particle.removeFromParent();
  const pool = ui.seasonParticlePool as NodePool;
  if (pool?.size() < MAX_SEASON_PARTICLE_POOL) pool.put(particle);
  else particle.destroy();
}

function recycleAllSeasonParticles(ui: any) {
  const active = ui.activeSeasonParticles as Set<Node>;
  if (!active) return;
  [...active].forEach((particle) => recycleSeasonParticle(ui, particle));
}

export function disposeSeasonalEffects(ui: any) {
  recycleAllSeasonParticles(ui);
  const pool = ui.seasonParticlePool as NodePool;
  pool?.clear();
  ui.activeSeasonParticles?.clear?.();
}

export function createTopBar(ui: any) {
  const vs = view.getVisibleSize();
  const cardW = Design.WIDTH - 20;
  const cardH = 118;
  ui.topBar = new Node("TopBar");
  ui.topBar.setPosition(0, vs.height / 2 - 76);
  ui.topBar.addComponent(UITransform).setContentSize(Design.WIDTH, 144);

  const shadow = new Node("TopShadow");
  shadow.setPosition(0, -7);
  fillRoundRect(shadow, cardW, cardH, 24, new Color(78, 47, 28, 70));
  ui.topBar.addChild(shadow);

  const bg = new Node("Bg");
  drawTopCardBackground(bg, cardW, cardH);
  strokeRoundRect(bg, cardW, cardH, 24, new Color(116, 72, 43, 245), 3.2);
  ui.topBar.addChild(bg);

  const avatarLobe = new Node("AvatarLobe");
  avatarLobe.setPosition(-113, 7);
  drawAvatarLobe(avatarLobe);
  ui.topBar.addChild(avatarLobe);

  const avatar = new Node("Avatar");
  avatar.setPosition(-113, 7);
  const avatarImage = new Node("AvatarImage");
  avatarImage.addComponent(UITransform).setContentSize(88, 88);
  avatarImage.addComponent(UIOpacity).opacity = 248;
  avatarImage.setPosition(0, -12);
  ui.applyUiIcon(getSeasonAvatarIcon(getSeasonInfo().season), avatarImage);
  avatar.addChild(avatarImage);
  ui.topBar.addChild(avatar);

  const achievementEntry = new Node("AchievementEntry");
  achievementEntry.addComponent(UITransform).setContentSize(80, 80);
  achievementEntry
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      ui.showPanel("achievement");
    });
  const achievementBadge = new Node("Badge");
  achievementBadge.setPosition(28, 28);
  achievementBadge.active = false;
  const achievementBadgeGraphics = achievementBadge.addComponent(Graphics);
  achievementBadgeGraphics.fillColor = new Color(247, 70, 66, 255);
  achievementBadgeGraphics.circle(0, 0, 6);
  achievementBadgeGraphics.fill();
  achievementBadgeGraphics.strokeColor = new Color(255, 245, 214, 255);
  achievementBadgeGraphics.lineWidth = 1.6;
  achievementBadgeGraphics.circle(0, 0, 6);
  achievementBadgeGraphics.stroke();
  achievementEntry.addChild(achievementBadge);
  avatar.addChild(achievementEntry);

  const title = ui.makeLabel(
    "萌田农场",
    24,
    new Color(88, 45, 24),
    true,
    0,
    20,
    150,
    34,
  );
  title.setPosition(-3, 22);
  title.getComponent(UITransform)?.setContentSize(160, 34);
  title.getComponent(Label)!.fontSize = 28;
  title.getComponent(Label)!.isBold = true;
  ui.topBar.addChild(title);

  const seasonInfo = getSeasonInfo();
  const seasonLabel = ui.makeLabel(
    `${SEASON_LABELS[seasonInfo.season]} · 第${seasonInfo.dayInSeason}天`,
    10,
    new Color(126, 78, 43),
    true,
    -3,
    2,
    120,
    16,
  );
  title.name = "FarmTitle";
  seasonLabel.name = "SeasonLabel";
  ui.topBar.addChild(seasonLabel);

  const expW = 130;
  const expBg = new Node("ExpBg");
  expBg.setPosition(-2, -22);
  expBg.addComponent(UITransform).setContentSize(expW, 21);
  fillRoundRect(expBg, expW, 21, 10, new Color(159, 118, 97, 255));
  strokeRoundRect(expBg, expW, 21, 10, new Color(255, 255, 255, 235), 2.4);
  ui.topBar.addChild(expBg);

  const expFill = new Node("ExpFill");
  expFill.name = "ExpFill";
  expFill.setPosition(-expW / 2, 0);
  expBg.addChild(expFill);

  const expText = ui.makeLabel(
    "",
    1,
    new Color(255, 255, 255, 0),
    false,
    0,
    0,
    1,
    1,
  );
  expText.name = "ExpText";
  expBg.addChild(expText);

  ui.createCurrencyArea(112, 96, 72);

  const levelBadge = new Node("LevelBadge");
  levelBadge.setPosition(-113, -48);
  levelBadge.addComponent(UITransform).setContentSize(88, 34);
  drawLevelStyleRoundRect(
    levelBadge,
    88,
    34,
    new Color(255, 247, 210, 255),
    new Color(116, 72, 43, 245),
    2.4,
  );
  ui.topBar.addChild(levelBadge);
  levelBadge.setSiblingIndex(ui.topBar.children.length - 1);

  const level = ui.makeLabel(
    "Lv.1 农场",
    14,
    new Color(88, 45, 24),
    true,
    0,
    0,
    86,
    24,
  );
  level.name = "LevelText";
  level.getComponent(UITransform)?.setContentSize(80, 24);
  level.getComponent(Label)!.fontSize = 14;
  levelBadge.addChild(level);

  const playerTitle = ui.makeLabel(
    "",
    9,
    new Color(112, 70, 42),
    true,
    0,
    -9,
    82,
    13,
  );
  playerTitle.name = "PlayerTitleText";
  playerTitle.active = false;
  levelBadge.addChild(playerTitle);
  levelBadge.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    ui.showTitleDialog();
  });

  ui.node.addChild(ui.topBar);
}

function drawTopCardBackground(parent: Node, w: number, h: number) {
  const g = parent.addComponent(Graphics);
  g.fillColor = new Color(248, 229, 184, 255);
  g.roundRect(-w / 2, -h / 2, w, h, 24);
  g.fill();
}

function drawAvatarLobe(parent: Node) {
  const g = parent.addComponent(Graphics);
  g.fillColor = new Color(92, 58, 38, 42);
  g.circle(2, -3, 38);
  g.fill();
  g.fillColor = new Color(239, 205, 162, 255);
  g.circle(0, 0, 36);
  g.fill();
  g.strokeColor = new Color(255, 255, 255, 245);
  g.lineWidth = 2.6;
  g.circle(0, 0, 36);
  g.stroke();
}

export function createCurrencyArea(ui: any, x = 109, width = 126, height = 42) {
  const holder = new Node("CurrencyArea");
  holder.setPosition(x, 0);
  holder.addComponent(UITransform).setContentSize(width, height);
  ui.topBar.addChild(holder);

  ui.createCurrencyEntry(
    holder,
    "gold",
    "GoldDisplay",
    "200",
    20,
    new Color(82, 42, 22),
    44,
    74,
  );
  ui.createCurrencyEntry(
    holder,
    "diamond",
    "DiamondDisplay",
    "50",
    -20,
    new Color(82, 42, 22),
    44,
    74,
    1,
  );
  holder.setSiblingIndex(ui.topBar.children.length - 1);
}

export function createCurrencyEntry(
  ui: any,
  parent: Node,
  icon: string,
  labelName: string,
  value: string,
  y: number,
  color: Color,
  iconSize = 32,
  pillW = 96,
  iconOffsetY = 0,
) {
  const pillH = 28;
  const pill = new Node(`${icon}Pill`);
  pill.setPosition(0, y);
  drawLevelStyleRoundRect(
    pill,
    pillW,
    pillH,
    new Color(235, 207, 159, 238),
    new Color(205, 166, 115, 140),
    1.4,
  );
  parent.addChild(pill);

  const iconNode = new Node(`${icon}Icon`);
  iconNode.addComponent(UITransform).setContentSize(iconSize, iconSize);
  const iconCenterX = -pillW / 2 + 5;
  iconNode.setPosition(iconCenterX, iconOffsetY);
  pill.addChild(iconNode);
  ui.applyUiIcon(icon, iconNode);

  const textW = Math.max(44, pillW - 30);
  const textX = (pillW - textW) / 2 - 8;
  const label = new Node(labelName);
  label.setPosition(textX, 0);
  label.addComponent(UITransform).setContentSize(textW, 24);
  const labelComponent = label.addComponent(Label);
  labelComponent.string = value;
  labelComponent.fontSize = 18;
  labelComponent.lineHeight = 22;
  labelComponent.color = color;
  labelComponent.isBold = true;
  labelComponent.verticalAlign = Label.VerticalAlign.CENTER;
  labelComponent.horizontalAlign = Label.HorizontalAlign.CENTER;
  labelComponent.overflow = Label.Overflow.NONE;
  labelComponent.enableWrapText = false;
  label.name = labelName;
  const labelCtor = Label as any;
  if (labelCtor.CacheMode?.NONE !== undefined) {
    (labelComponent as any).cacheMode = labelCtor.CacheMode.NONE;
  }
  pill.addChild(label);
}

function drawLevelStyleRoundRect(
  node: Node,
  width: number,
  height: number,
  fillColor: Color,
  strokeColor: Color,
  lineWidth: number,
) {
  const radius = Math.min(16, height / 2 - 1);
  fillRoundRect(node, width, height, radius, fillColor);
  strokeRoundRect(node, width, height, radius, strokeColor, lineWidth);
}

export function createLandArea(ui: any) {
  ui.landRoot = new Node("LandRoot");
  const size = ui.getLandGridSize();
  ui.landRoot.addComponent(UITransform).setContentSize(size.width, size.height);
  ui.layoutLandArea();
  ui.node.addChild(ui.landRoot);

  ui.pastureRoot = new Node("PastureRoot");
  ui.pastureRoot
    .addComponent(UITransform)
    .setContentSize(size.width, size.height);
  ui.pastureRoot.active = false;
  ui.node.addChild(ui.pastureRoot);
  createWorldSwitchButton(ui);
  createHarvestAllButton(ui);
  createPastureCollectAllButton(ui);
}

function createHarvestAllButton(ui: any) {
  const button = new Node("HarvestAllButton");
  // Farm is the startup world. Keep the reserved action slot visible even
  // before the first land refresh determines whether anything is collectable.
  button.active = true;
  button.addComponent(UITransform).setContentSize(38, 46);
  button.setPosition(Design.WIDTH / 2 - 20, -16);
  addSideEntryBackground(ui, button, "sideEntryDisabledBg");
  drawDisabledSideActionCard(button);

  const harvestIcon = new Node("HarvestEntryIcon");
  harvestIcon.addComponent(UITransform).setContentSize(32, 32);
  ui.applyUiIcon("entryHarvest", harvestIcon);
  button.addChild(harvestIcon);

  const action = button.addComponent(Button);
  action.interactable = false;
  action.node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      tween(button)
        .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
        .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
        .start();
      ui.harvestAllMatureCrops();
    });
  ui.node.addChild(button);
}

function addSideEntryBackground(
  ui: any,
  owner: Node,
  iconKey = "sideEntryBg",
) {
  const old = owner.getChildByName("SideEntryBackground");
  old?.destroy();
  const background = new Node("SideEntryBackground");
  background.addComponent(UITransform).setContentSize(38, 46);
  background.setPosition(0, -1);
  if (iconKey !== "sideEntryDisabledBg") {
    ui.applyUiIcon(iconKey, background);
  }
  owner.addChild(background);
  background.setSiblingIndex(0);
  return background;
}

function drawDisabledSideActionCard(owner: Node) {
  fillRoundRect(owner, 38, 46, 13, new Color(194, 197, 190, 255));
  strokeRoundRect(owner, 38, 46, 13, new Color(132, 137, 128, 230), 2);
}

/** Match the daily sign-in entry: a white outer card with a green icon tile. */
function addBoostQuickEntryBackground(owner: Node, tileColor: Color) {
  fillRoundRect(owner, 38, 46, 13, new Color(255, 255, 255, 255));
  strokeRoundRect(owner, 38, 46, 13, new Color(105, 174, 86, 180), 2);

  const tile = new Node("BoostQuickIconTile");
  tile.setPosition(0, -1);
  fillRoundRect(tile, 30, 32, 9, tileColor);
  owner.addChild(tile);
  return tile;
}

export function layoutLandArea(ui: any) {
  if (!ui.landRoot) return;

  const vs = view.getVisibleSize();
  const grid = ui.getLandGridSize();
  const grassTopY = vs.height * 0.21;
  const topLimit = grassTopY - 24;
  const navTop = -vs.height / 2 + 84;
  const bottomLimit = navTop + 10;
  const availableH = Math.max(240, topLimit - bottomLimit);
  const availableW = Math.max(Design.WIDTH - 42, 220);
  const scale = Math.min(1, availableW / grid.width, availableH / grid.height);
  const centerY = (topLimit + bottomLimit) / 2 + 5;

  ui.landRoot.setPosition(0, centerY);
  ui.landRoot.setScale(new Vec3(scale, scale, 1));
  if (ui.pastureRoot) {
    ui.pastureRoot.setPosition(0, centerY);
    ui.pastureRoot.setScale(new Vec3(scale, scale, 1));
  }
}

function createPastureCollectAllButton(ui: any) {
  const button = new Node("PastureCollectAllButton");
  button.active = ui.activeWorld === "pasture";
  button.addComponent(UITransform).setContentSize(38, 46);
  button.setPosition(Design.WIDTH / 2 - 20, -16);
  addSideEntryBackground(ui, button, "sideEntryDisabledBg");
  drawDisabledSideActionCard(button);
  const icon = new Node("PastureCollectIcon");
  icon.addComponent(UITransform).setContentSize(32, 32);
  ui.applyUiIcon("pastureCollect", icon);
  button.addChild(icon);
  const action = button.addComponent(Button);
  action.interactable = false;
  action.node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      tween(button)
        .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
        .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
        .start();
      ui.collectAllPastureProducts();
    });
  ui.node.addChild(button);
}

function createWorldSwitchButton(ui: any) {
  const button = new Node("WorldSwitchButton");
  button.addComponent(UITransform).setContentSize(38, 46);
  button.setPosition(Design.WIDTH / 2 - 20, 92);
  fillRoundRect(button, 38, 46, 13, new Color(255, 255, 255, 255));
  strokeRoundRect(button, 38, 46, 13, new Color(105, 174, 86, 180), 2);
  const glow = new Node("WorldSwitchGlow");
  glow.setPosition(0, -1);
  fillRoundRect(glow, 30, 32, 9, new Color(144, 210, 143, 255));
  button.addChild(glow);
  drawWorldSwitchArrow(ui, button, false);
  button
    .addComponent(Button)
    .node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      switchWorld(ui);
    });
  ui.node.addChild(button);
  ui.worldSwitchButton = button;
}

function drawWorldSwitchArrow(ui: any, button: Node, pointsLeft: boolean) {
  button.getChildByName("Arrow")?.destroy();
  const arrow = new Node("Arrow");
  arrow.addComponent(UITransform).setContentSize(34, 34);
  arrow.setPosition(0, -1);
  button.addChild(arrow);
  ui.applyUiIcon(pointsLeft ? "entryFarmArrow" : "entryPastureArrow", arrow);
}

export function switchWorld(ui: any, target?: "farm" | "pasture") {
  if (ui.worldSwitching) return;
  const next: "farm" | "pasture" =
    target || (ui.activeWorld === "farm" ? "pasture" : "farm");
  if (next === ui.activeWorld) return;
  ui.worldSwitching = true;
  ui.closeSeedBubble();
  ui.closeBuildingBubble();

  const vs = view.getVisibleSize();
  const cloudRoot = new Node("WorldCloudTransition");
  cloudRoot.addComponent(UITransform).setContentSize(vs.width, vs.height);
  ui.node.addChild(cloudRoot);
  const halfW = vs.width / 2 + 84;
  const left = createCloudCurtainHalf(
    "CloudLeft",
    halfW + 28,
    vs.height + 110,
    true,
  );
  const right = createCloudCurtainHalf(
    "CloudRight",
    halfW,
    vs.height + 70,
    false,
  );
  const coveredLeftX = -vs.width / 4 + 46;
  const coveredRightX = vs.width / 4 - 34;
  left.setPosition(-vs.width / 2 - halfW / 2, 0);
  right.setPosition(vs.width / 2 + halfW / 2, 0);
  cloudRoot.addChild(left);
  cloudRoot.addChild(right);

  const reveal = () => {
    ui.activeWorld = next;
    ui.landRoot.active = next === "farm";
    ui.pastureRoot.active = next === "pasture";
    syncSeasonPresentation(ui, true);
    drawWorldSwitchArrow(ui, ui.worldSwitchButton, next === "pasture");
    layoutSideEntries(ui);
    const harvestAll = ui.node.getChildByName("HarvestAllButton");
    const pastureCollectAll = ui.node.getChildByName("PastureCollectAllButton");
    if (next === "pasture") {
      if (harvestAll) harvestAll.active = false;
      ui.refreshPasture();
    } else {
      if (pastureCollectAll) pastureCollectAll.active = false;
      ui.refreshLand();
    }
    ui.refreshTopBar();
  };
  tween(left)
    .to(
      0.31,
      { position: new Vec3(coveredLeftX, 7, 0) },
      { easing: "quadInOut" },
    )
    .call(reveal)
    .delay(0.18)
    .to(
      0.52,
      { position: new Vec3(-vs.width / 2 - halfW / 2 - 24, -9, 0) },
      { easing: "quadIn" },
    )
    .call(() => {
      cloudRoot.destroy();
      ui.worldSwitching = false;
    })
    .start();
  tween(right)
    .to(
      0.39,
      { position: new Vec3(coveredRightX, -6, 0) },
      { easing: "sineInOut" },
    )
    .delay(0.12)
    .to(
      0.63,
      { position: new Vec3(vs.width / 2 + halfW / 2 + 18, 12, 0) },
      { easing: "quadIn" },
    )
    .start();
}

function createCloudCurtainHalf(
  name: string,
  width: number,
  height: number,
  leftSide: boolean,
): Node {
  const cloud = new Node(name);
  cloud.addComponent(UITransform).setContentSize(width, height);
  const g = cloud.addComponent(Graphics);
  g.fillColor = leftSide
    ? new Color(248, 253, 255, 255)
    : new Color(243, 250, 255, 255);
  g.rect(-width / 2, -height / 2, width, height);
  g.fill();
  const edgeX = leftSide ? width / 2 - 7 : -width / 2 + 9;
  const spacing = leftSide ? 47 : 55;
  const start = leftSide ? -height / 2 + 17 : -height / 2 + 38;
  for (let y = start, i = 0; y < height / 2; y += spacing, i++) {
    const radius = leftSide
      ? 25 + ((i * 7) % 4) * 5
      : 31 + ((i * 5 + 1) % 3) * 7;
    const offset = leftSide ? (i % 2) * 8 : -(i % 3) * 6;
    g.circle(edgeX + offset, y, radius);
    g.fill();
    if ((leftSide && i % 3 === 1) || (!leftSide && i % 2 === 0)) {
      g.circle(edgeX + (leftSide ? -18 : 20), y + radius * 0.72, radius * 0.62);
      g.fill();
    }
  }
  return cloud;
}

export function getLandGridSize(ui: any): { width: number; height: number } {
  return {
    width:
      ui.constructor.LAND_COLS * ui.constructor.TILE_SIZE +
      (ui.constructor.LAND_COLS - 1) * ui.constructor.TILE_GAP,
    height:
      ui.constructor.LAND_ROWS * ui.constructor.TILE_SIZE +
      (ui.constructor.LAND_ROWS - 1) * ui.constructor.TILE_GAP,
  };
}

export function createBottomNav(ui: any) {
  const vs = view.getVisibleSize();
  const navW = Design.WIDTH;
  const navH = 82;
  const nav = new Node("BottomNav");
  nav.setPosition(0, -vs.height / 2 + navH / 2);
  drawBottomNavBackground(nav, navW, navH);
  ui.node.addChild(nav);

  const buttons: Array<{ name: string; icon: string; panel: PanelName }> = [
    { name: "背包", icon: "bag", panel: "inventory" },
    { name: "设置", icon: "settings", panel: "shop" },
    { name: "任务", icon: "quest", panel: "task" },
    { name: "图鉴", icon: "catalog", panel: "quest" },
  ];

  buttons[1] = { name: "合成", icon: "gear", panel: "craft" };

  const slotW = navW / buttons.length;
  buttons.forEach((item, index) => {
    const itemX = -navW / 2 + slotW * index + slotW / 2;
    const itemY = 2;
    const shadow = new Node(`NavShadow_${item.panel}`);
    shadow.setPosition(itemX, itemY - 4);
    fillRoundRect(shadow, 76, 59, 13, new Color(104, 60, 35, 112));
    nav.addChild(shadow);

    const btn = new Node(`Nav_${item.panel}`);
    // All seasonal sprite-sheet cells use the same normalized 256×256 canvas,
    // so every tab item uses one shared size and baseline without compensation.
    const iconSize = 49.6;
    const iconY = 15.3;
    btn.addComponent(UITransform).setContentSize(76, 59);
    btn.setPosition(itemX, itemY);
    fillRoundRect(btn, 76, 59, 13, new Color(255, 247, 210, 255));
    strokeRoundRect(btn, 76, 59, 13, new Color(126, 78, 48, 225), 2.2);

    const icon = new Node("Icon");
    icon.addComponent(UITransform).setContentSize(iconSize, iconSize);
    icon.setPosition(0, iconY);
    (icon as any).__bottomNavBaseY = iconY;
    ui.applyUiIcon(
      getSeasonNavIcon(
        item.icon as "bag" | "gear" | "quest" | "catalog",
        getSeasonInfo().season,
      ),
      icon,
    );
    btn.addChild(icon);

    const label = ui.makeLabel(
      item.name,
      14,
      new Color(88, 45, 24),
      true,
      0,
      -15,
      68,
      26,
    );
    label.name = "Label";
    btn.addChild(label);

    if (item.panel === "task") {
      const badge = new Node("Badge");
      badge.setPosition(28, 18);
      badge.active = false;
      const badgeGraphics = badge.addComponent(Graphics);
      badgeGraphics.fillColor = new Color(247, 70, 66, 255);
      badgeGraphics.circle(0, 0, 5.5);
      badgeGraphics.fill();
      badgeGraphics.strokeColor = new Color(255, 242, 211, 255);
      badgeGraphics.lineWidth = 1.5;
      badgeGraphics.circle(0, 0, 5.5);
      badgeGraphics.stroke();
      btn.addChild(badge);
    }

    btn.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
      tween(btn)
        .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
        .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
        .start();
      ui.showPanel(item.panel);
    });
    nav.addChild(btn);
    btn.setSiblingIndex(nav.children.length - 1);
  });
}

export function createPanels(ui: any) {
  ui.panels.inventory = ui.createPanel("储物背包", Design.WIDTH, 540);
  ui.panels.craft = ui.createPanel("合成工坊", Design.WIDTH, 540);
  ui.panels.shop = ui.createPanel("好物集市", Design.WIDTH, 540);
  ui.panels.quest = ui.createPanel("图鉴", Design.WIDTH, 540);
  ui.panels.task = ui.createPanel(
    "\u4eca\u65e5\u4efb\u52a1",
    Design.WIDTH,
    540,
  );
  ui.panels.signIn = ui.createPanel(
    "\u6bcf\u65e5\u7b7e\u5230",
    Design.WIDTH,
    540,
  );
  ui.panels.achievement = ui.createPanel(
    "\u6210\u5c31\u624b\u518c",
    Design.WIDTH,
    540,
  );
  ui.panels.title = ui.createPanel("\u6211\u7684\u79f0\u53f7", Design.WIDTH, 540);
  layoutResponsiveFeaturePanels(ui);
  for (const panel of [
    ui.panels.inventory,
    ui.panels.craft,
    ui.panels.shop,
    ui.panels.quest,
    ui.panels.task,
    ui.panels.signIn,
    ui.panels.achievement,
    ui.panels.title,
  ]) {
    if (!panel) continue;
    panel.active = false;
    ui.node.addChild(panel);
  }
}

function drawBottomNavBackground(node: Node, w: number, h: number) {
  const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
  const left = -w / 2;
  const right = w / 2;
  const bottom = -h / 2;
  const top = h / 2;
  const radius = 18;
  const path = () => {
    graphics.moveTo(left, bottom);
    graphics.lineTo(left, top - radius);
    graphics.quadraticCurveTo(left, top, left + radius, top);
    graphics.lineTo(right - radius, top);
    graphics.quadraticCurveTo(right, top, right, top - radius);
    graphics.lineTo(right, bottom);
    graphics.close();
  };

  graphics.clear();
  graphics.fillColor = new Color(232, 164, 88, 250);
  path();
  graphics.fill();
  graphics.strokeColor = new Color(128, 78, 46, 220);
  graphics.lineWidth = 2.4;
  path();
  graphics.stroke();
}

export function layoutResponsiveFeaturePanels(ui: any) {
  const vs = view.getVisibleSize();
  layoutSideEntries(ui);
  const layoutKey = `${vs.width}x${vs.height}`;
  if (ui.featurePanelLayoutKey === layoutKey) return;
  ui.featurePanelLayoutKey = layoutKey;
  const panelH = 540;
  const bottomNavH = 82;
  const scale = vs.width / Design.WIDTH;
  const centerY = -vs.height / 2 + bottomNavH + (panelH * scale) / 2;
  for (const panel of [
    ui.panels.inventory,
    ui.panels.craft,
    ui.panels.shop,
    ui.panels.quest,
    ui.panels.task,
    ui.panels.signIn,
    ui.panels.achievement,
    ui.panels.title,
  ]) {
    if (!panel) continue;
    panel.setPosition(0, centerY);
    panel.setScale(scale, scale, 1);
  }
}

export function createShopEntry(ui: any) {
  const entry = new Node("ShopEntry");
  entry.setPosition(Design.WIDTH / 2 - 20, 38);
  entry.addComponent(UITransform).setContentSize(38, 46);
  fillRoundRect(entry, 38, 46, 13, new Color(255, 255, 255, 255));
  strokeRoundRect(entry, 38, 46, 13, new Color(105, 174, 86, 180), 2);

  const glow = new Node("ShopEntryGlow");
  glow.setPosition(0, -1);
  fillRoundRect(glow, 30, 32, 9, new Color(240, 168, 70, 255));
  const glowOpacity = glow.addComponent(UIOpacity);
  glowOpacity.opacity = 220;
  entry.addChild(glow);

  const icon = new Node("ShopEntryIcon");
  icon.addComponent(UITransform).setContentSize(30, 30);
  icon.setPosition(0, -1);
  ui.applyUiIcon("entryShop", icon);
  entry.addChild(icon);

  entry.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(entry)
      .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
      .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();
    ui.showPanel("shop");
  });
  ui.shopEntry = entry;
  ui.shopEntryGlow = glow;
  ui.shopEntryGlowOpacity = glowOpacity;
  ui.node.addChild(entry);
  layoutSideEntries(ui);
  raiseFeaturePanels(ui);
}

function layoutSideEntries(ui: any) {
  const vs = view.getVisibleSize();
  const x = Design.WIDTH / 2 - 20;
  const topBoundary = ui.topBar?.isValid
    ? ui.topBar.position.y - 72
    : vs.height / 2 - 148;
  const bottomBoundary = -vs.height / 2 + 102;
  const centerY = (topBoundary + bottomBoundary) / 2;
  const gap = 54;
  const actionName = ui.activeWorld === "pasture"
    ? "PastureCollectAllButton"
    : "HarvestAllButton";
  const slots: Array<[string, number]> = [
    ["WorldSwitchButton", 1.5],
    ["ShopEntry", 0.5],
    [actionName, -0.5],
    ["ShovelEntry", -1.5],
  ];
  slots.forEach(([name, offset]) => {
    const node = ui.node.getChildByName(name);
    if (node) node.setPosition(x, centerY + offset * gap);
  });
  const hiddenAction = ui.node.getChildByName(
    ui.activeWorld === "pasture" ? "HarvestAllButton" : "PastureCollectAllButton",
  );
  if (hiddenAction) hiddenAction.setPosition(x, centerY - .5 * gap);
}

function raiseFeaturePanels(ui: any) {
  for (const panel of [
    ui.panels.inventory,
    ui.panels.craft,
    ui.panels.shop,
    ui.panels.quest,
    ui.panels.task,
    ui.panels.signIn,
    ui.panels.achievement,
    ui.panels.title,
  ]) {
    if (panel) panel.setSiblingIndex(ui.node.children.length - 1);
  }
}

/** Draw attention to the shop without opening it. Repeated requests restart
 * the finite breathing cue, so the entry always responds immediately. */
export function pulseShopEntry(ui: any) {
  const entry: Node | undefined = ui.shopEntry;
  const glow: Node | undefined = ui.shopEntryGlow;
  const opacity: UIOpacity | undefined = ui.shopEntryGlowOpacity;
  if (!entry?.isValid || !glow?.isValid || !opacity?.isValid) return;

  Tween.stopAllByTarget(entry);
  Tween.stopAllByTarget(glow);
  Tween.stopAllByTarget(opacity);
  entry.setScale(Vec3.ONE);
  glow.setScale(Vec3.ONE);
  opacity.opacity = 220;

  tween(entry)
    .repeat(
      3,
      tween()
        .to(0.34, { scale: new Vec3(1.09, 1.09, 1) }, { easing: "sineInOut" })
        .to(0.34, { scale: Vec3.ONE }, { easing: "sineInOut" }),
    )
    .start();
  tween(glow)
    .repeat(
      3,
      tween()
        .to(0.34, { scale: new Vec3(1.28, 1.2, 1) }, { easing: "sineInOut" })
        .to(0.34, { scale: Vec3.ONE }, { easing: "sineInOut" }),
    )
    .start();
  tween(opacity)
    .repeat(
      3,
      tween()
        .to(0.34, { opacity: 255 }, { easing: "sineInOut" })
        .to(0.34, { opacity: 150 }, { easing: "sineInOut" }),
    )
    .call(() => {
      if (opacity.isValid) opacity.opacity = 220;
    })
    .start();
}

export function createShovelEntry(ui: any) {
  const entry = new Node("ShovelEntry");
  entry.setPosition(Design.WIDTH / 2 - 20, -70);
  entry.addComponent(UITransform).setContentSize(38, 46);
  fillRoundRect(entry, 38, 46, 13, new Color(255, 255, 255, 255));
  strokeRoundRect(entry, 38, 46, 13, new Color(105, 174, 86, 180), 2);

  const utilityTile = new Node("UtilityTile");
  utilityTile.setPosition(0, -1);
  fillRoundRect(utilityTile, 30, 32, 9, new Color(144, 210, 143, 255));
  entry.addChild(utilityTile);

  const selectedGlow = new Node("SelectedGlow");
  selectedGlow.setPosition(0, -1);
  fillRoundRect(selectedGlow, 31, 35, 10, new Color(255, 211, 94, 210));
  strokeRoundRect(selectedGlow, 31, 35, 10, new Color(219, 128, 42, 235), 2);
  selectedGlow.active = false;
  entry.addChild(selectedGlow);

  const icon = new Node("ShovelEntryIcon");
  icon.addComponent(UITransform).setContentSize(31, 31);
  icon.setPosition(0, -1);
  ui.applyUiIcon("entryShovel", icon);
  entry.addChild(icon);

  entry.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    const nextActive = !ui.demolitionMode;
    setShovelMode(ui, nextActive);
    tween(entry).stop();
    entry.setScale(new Vec3(0.91, 0.91, 1));
    tween(entry)
      .to(0.12, { scale: new Vec3(nextActive ? 1.08 : 1, nextActive ? 1.08 : 1, 1) }, { easing: "backOut" })
      .start();
    ui.toast(nextActive ? "铲子已选中，点击目标拆除" : "已退出铲子模式");
  });
  ui.shovelEntry = entry;
  ui.node.addChild(entry);
  layoutSideEntries(ui);
  raiseFeaturePanels(ui);
}

export function setShovelMode(ui: any, active: boolean) {
  ui.demolitionMode = active;
  ui.selectedSeedId = null;
  ui.closeSeedBubble?.();
  ui.closeBuildingBubble?.();
  const entry = ui.shovelEntry || ui.node.getChildByName("ShovelEntry");
  if (!entry) return;
  const glow = entry.getChildByName("SelectedGlow");
  if (glow) glow.active = active;
  entry.setScale(new Vec3(active ? 1.08 : 1, active ? 1.08 : 1, 1));
}

export function createPanel(
  ui: any,
  title: string,
  w: number,
  h: number,
): Node {
  const panel = new Node(`Panel_${title}`);
  panel.setPosition(0, -55);
  panel.addComponent(UITransform).setContentSize(w, h);
  fillRoundRect(panel, w, h, 14, new Color(255, 250, 230, 252));
  strokeRoundRect(panel, w, h, 14, new Color(124, 184, 105, 160), 2);
  panel.addComponent(Button);

  const close = new Node("Close");
  close.addComponent(UITransform).setContentSize(32, 32);
  close.setPosition(w / 2 - 24, h / 2 - 24);
  fillRoundRect(close, 28, 28, 14, new Color(232, 238, 219, 255));
  const x = ui.makeLabel("x", 18, new Color(92, 104, 82), true, 0, 1, 28, 28);
  close.addChild(x);
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    closePanelWithAnimation(ui, panel);
  });
  panel.addChild(close);

  return panel;
}

export function closePanelWithAnimation(ui: any, panel: Node) {
  if ((panel as any).closing) return;
  (panel as any).closing = true;
  const originalScale = panel.scale.clone();
  const originalPosition = panel.position.clone();
  const opacity =
    panel.getComponent(UIOpacity) || panel.addComponent(UIOpacity);
  opacity.opacity = 255;
  tween(opacity).to(0.18, { opacity: 0 }, { easing: "quadIn" }).start();
  tween(panel)
    .to(
      0.07,
      { scale: new Vec3(originalScale.x * 1.02, originalScale.y * 1.02, 1) },
      { easing: "quadOut" },
    )
    .to(
      0.17,
      {
        position: new Vec3(
          originalPosition.x,
          originalPosition.y - 10,
          originalPosition.z,
        ),
        scale: new Vec3(originalScale.x * 0.88, originalScale.y * 0.88, 1),
      },
      { easing: "quadIn" },
    )
    .call(() => {
      panel.active = false;
      panel.setPosition(originalPosition);
      panel.setScale(originalScale);
      opacity.opacity = 255;
      (panel as any).closing = false;
      clearBottomNavState(ui);
    })
    .start();
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

export function createDialogRoot(ui: any) {
  ui.dialogRoot = new Node("DialogRoot");
  ui.dialogRoot.active = false;
  ui.node.addChild(ui.dialogRoot);
}

export function createBubbleRoot(ui: any) {
  ui.bubbleRoot = new Node("BubbleRoot");
  const visible = view.getVisibleSize();
  ui.bubbleRoot
    .addComponent(UITransform)
    .setContentSize(visible.width, visible.height);
  ui.node.addChild(ui.bubbleRoot);
}

export function createDailySignInEntry(ui: any) {
  const entry = new Node("DailySignInEntry");
  entry.setPosition(-Design.WIDTH / 2 + 20, -55);
  entry.addComponent(UITransform).setContentSize(38, 46);
  fillRoundRect(entry, 38, 46, 13, new Color(255, 255, 255, 255));
  strokeRoundRect(entry, 38, 46, 13, new Color(105, 174, 86, 180), 2);

  const tile = new Node("CalendarTile");
  tile.setPosition(0, -1);
  fillRoundRect(tile, 30, 32, 9, new Color(240, 168, 70, 255));
  entry.addChild(tile);

  const calendar = new Node("CalendarIcon");
  calendar.setPosition(0, -1);
  const g = calendar.addComponent(Graphics);
  g.fillColor = new Color(255, 248, 218, 255);
  g.roundRect(-9, -9, 18, 18, 4);
  g.fill();
  g.strokeColor = new Color(122, 69, 38, 235);
  g.lineWidth = 1.8;
  g.roundRect(-9, -9, 18, 18, 4);
  g.stroke();
  g.fillColor = new Color(239, 105, 101, 255);
  g.roundRect(-9, 3, 18, 6, 3);
  g.fill();
  g.strokeColor = new Color(122, 69, 38, 235);
  g.lineWidth = 1.6;
  g.moveTo(-5, 7);
  g.lineTo(-5, 11);
  g.moveTo(5, 7);
  g.lineTo(5, 11);
  g.stroke();
  g.fillColor = new Color(246, 190, 66, 255);
  g.circle(0, -3, 3.2);
  g.fill();
  entry.addChild(calendar);

  const badge = new Node("Badge");
  badge.setPosition(13, 17);
  badge.active = false;
  const badgeG = badge.addComponent(Graphics);
  badgeG.fillColor = new Color(247, 70, 66, 255);
  badgeG.circle(0, 0, 5.5);
  badgeG.fill();
  badgeG.strokeColor = new Color(255, 242, 211, 255);
  badgeG.lineWidth = 1.5;
  badgeG.circle(0, 0, 5.5);
  badgeG.stroke();
  entry.addChild(badge);

  entry.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    tween(entry)
      .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: "quadOut" })
      .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();
    ui.showPanel("signIn");
  });
  ui.node.addChild(entry);
  raiseFeaturePanels(ui);
}

export function refreshBoostEntries(ui: any, changedBoostId?: string) {
  const inv = InventorySystem.getInstance();
  const gm = GameManager.getInstance();
  if (!inv || !gm) return;
  const harvestCards = inv.getItemCount("doubleHarvestCard");
  const goldCards = inv.getItemCount("goldBoostCard");
  const key = `${harvestCards}/${goldCards}/${gm.doubleHarvestCharges}/${gm.goldBoostCharges}`;
  if (ui.boostUiKey === key) return;
  ui.boostUiKey = key;
  ui.node.getChildByName("BoostQuickEntries")?.destroy();

  const quickRoot = new Node("BoostQuickEntries");
  quickRoot.setPosition(-Design.WIDTH / 2 + 20, -109);
  ui.node.addChild(quickRoot);
  // Boost tickets belong to the world HUD. Rebuilding them while an indoor
  // dialog is open must never append them above the modal artwork.
  if (ui.dialogRoot?.isValid) {
    quickRoot.setSiblingIndex(Math.max(0, ui.dialogRoot.getSiblingIndex() - 1));
  }
  const quickItems = [
    { id: "doubleHarvestCard", count: harvestCards, label: "双倍收获" },
    { id: "goldBoostCard", count: goldCards, label: "金币加倍" },
  ].filter(item => item.count > 0);
  quickItems.forEach((item, index) => {
    const button = new Node(`BoostQuick_${item.id}`);
    button.addComponent(UITransform).setContentSize(38, 46);
    button.setPosition(0, -index * 54);
    addBoostQuickEntryBackground(
      button,
      item.id === "goldBoostCard"
        ? new Color(240, 168, 70, 255)
        : new Color(144, 210, 143, 255),
    );
    const icon = ui.createItemIcon(item.id, 31, true);
    icon.setPosition(0, -1);
    button.addChild(icon);
    button.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      gm.useTool(item.id);
      ui.boostUiKey = "";
      refreshBoostEntries(ui, item.id);
    });
    quickRoot.addChild(button);
  });
  raiseFeaturePanels(ui);

  const active = [
    { id: "doubleHarvestCard", count: gm.doubleHarvestCharges, text: "\u53cc\u500d\u6536\u83b7\u5269\u4f59" },
    { id: "goldBoostCard", count: gm.goldBoostCharges, text: "\u91d1\u5e01\u52a0\u500d\u5269\u4f59" },
  ].filter(item => item.count > 0);
  if (active.length === 0) {
    ui.node.getChildByName("BoostStatusRow")?.destroy();
    return;
  }

  let statusRoot = ui.node.getChildByName("BoostStatusRow");
  if (!statusRoot) {
    statusRoot = new Node("BoostStatusRow");
    ui.node.addChild(statusRoot);
  }
  const levelBadge = ui.topBar?.getChildByName("LevelBadge");
  const levelX = levelBadge?.position.x ?? -113;
  const levelY = ui.topBar?.position.y ?? view.getVisibleSize().height / 2 - 76;
  const levelWidth = levelBadge?.getComponent(UITransform)?.contentSize.width ?? 88;
  const firstCloudX = levelX - levelWidth / 2 + 76;
  statusRoot.setPosition(0, levelY - 99);

  const activeNames = new Set(active.map(item => `BoostStatus_${item.id}`));
  for (const child of [...statusRoot.children]) {
    if (child.name.startsWith("BoostStatus_") && !activeNames.has(child.name)) {
      child.name = `Removing_${child.name}`;
      Tween.stopAllByTarget(child);
      const opacity = child.getComponent(UIOpacity) || child.addComponent(UIOpacity);
      tween(opacity).to(0.16, { opacity: 0 }, { easing: "quadIn" }).start();
      tween(child)
        .to(0.16, { scale: new Vec3(0.86, 0.86, 1) }, { easing: "quadIn" })
        .call(() => child.destroy())
        .start();
    }
  }

  active.forEach((item, index) => {
    const cloudName = `BoostStatus_${item.id}`;
    let cloud = statusRoot!.getChildByName(cloudName);
    const shouldUpdate = !changedBoostId || changedBoostId === item.id || !cloud;
    const targetX = firstCloudX + index * 156;
    if (!cloud) {
      cloud = new Node(cloudName);
      cloud.addComponent(UITransform).setContentSize(152, 52);
      cloud.setPosition(targetX, 0);
      cloud.setScale(new Vec3(0.86, 0.86, 1));
      const opacity = cloud.addComponent(UIOpacity);
      opacity.opacity = 0;
      ui.applyUiIcon("boostStatusCloud", cloud);
      const icon = ui.createItemIcon(item.id, 30, true);
      icon.setPosition(-48, 0);
      cloud.addChild(icon);
      const label = ui.makeLabel("", 10, new Color(88, 51, 28), true, 23, 0, 108, 24);
      label.name = "BoostStatusText";
      cloud.addChild(label);
      statusRoot!.addChild(cloud);
      tween(opacity).to(0.2, { opacity: 255 }, { easing: "quadOut" }).start();
      tween(cloud)
        .to(0.22, { scale: Vec3.ONE }, { easing: "backOut" })
        .start();
    } else if (Math.abs(cloud.position.x - targetX) > 0.5) {
      Tween.stopAllByTarget(cloud);
      tween(cloud)
        .to(0.24, { position: new Vec3(targetX, 0, 0) }, { easing: "quadInOut" })
        .start();
    }
    if (shouldUpdate) {
      const label = cloud.getChildByName("BoostStatusText")?.getComponent(Label);
      if (label) label.string = `${item.text} ${item.count}\u6b21`;
    }
  });
  // During a right-shift overlap, keep the double-harvest cloud visible above
  // the moving gold cloud. Their final positions remain double-left/gold-right.
  const doubleCloud = statusRoot.getChildByName("BoostStatus_doubleHarvestCard");
  if (doubleCloud) doubleCloud.setSiblingIndex(statusRoot.children.length - 1);
  raiseFeaturePanels(ui);
}
