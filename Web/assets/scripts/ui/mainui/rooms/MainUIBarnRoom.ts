import { Button, Color, Graphics, Label, Node, UITransform, Vec3, Tween, tween } from "cc";
import { InventorySystem } from "../../../systems/InventorySystem";
import { LandSystem } from "../../../systems/LandSystem";
import { bindTaskStylePressFeedback, fillRoundRect, strokeRoundRect } from "../../utils/UIDraw";
import {
  FARM_BUILDING_DIALOG_HEIGHT,
  FARM_BUILDING_DIALOG_WIDTH,
  LIVESTOCK_FEEDS,
  interiorSourceXToDialog,
  interiorSourceYToDialog,
} from "../farm/MainUILandShared";
import { drawBarnActionButtonSurface, productionRatio } from "./MainUIRoomControls";
import { animateItemToInventory } from "../shared/MainUIRewardAnimation";

const COWS = [
  { name: "哞哞", icon: "barnCowMoo", portrait: "barnCowMooPortrait", x: 168, headX: 236, mouthX: 250 },
  { name: "哒哒", icon: "barnCowDa", portrait: "barnCowDaPortrait", x: 584, headX: 514, mouthX: 503 },
] as const;
const SOURCE_W = 248;
const SOURCE_H = 242;
const SOURCE_Y = 722;
const MOUTH_SOURCE_Y = 707;
const MILK_ICON_X = -20;
// Measured inscribed rectangle of this barn's cream panel, in source pixels.
const BARN_HUD_SAFE = { left: 65, top: 1060, right: 687, bottom: 1300 } as const;
const CARD_W = 124;
const CARD_H = 35;
const BAR_W = 81;
const ACTION_W = 60;
const ACTION_H = 32;
const ACTION_ICON_X = -15;
const TEXT = new Color(93, 52, 30);
const MUTED = new Color(156, 111, 69);
const MILK_READY = new Color(163, 85, 27);
type CowProduction = (NonNullable<ReturnType<LandSystem["getLivestockSlotProduction"]>> & { cleanedThisCycle?: boolean }) | null;
type CowDetail = {
  timeChip: Node;
  clock: Node;
  milk: Node;
  value: Label;
  timeSaved: Label;
  feedPips: Node[];
  wasReady?: boolean;
  feedCount?: number;
};
type CowView = {
  card: Node;
  medallion: Node;
  cleanMark: Node;
  grooming: CowGroomEffects;
  badge: Node;
  status: Label;
  fill: Node;
  detail: CowDetail;
  key?: string;
  progressKey?: string;
};
type CowGroomEffects = { dirt: Node; brush: Node; shine: Node };
type ActionView = {
  surface: Node;
  icon: Node;
  highlighted?: boolean;
  wiggling?: boolean;
};
type BarnState = {
  ui: any;
  buildingSlotId: number;
  selected: number;
  views: CowView[];
  pointer: Node;
  feedLayer: Node;
  mouthAnchors: Node[];
  milkAction?: ActionView;
  collectAction?: ActionView;
  groomAction?: ActionView;
  busy: boolean;
};
const rooms = new WeakMap<Node, BarnState>();
const lastSelections = new WeakMap<object, Map<number, number>>();

function createNode(parent: Node, name: string, w: number, h: number, x = 0, y = 0) {
  const n = new Node(name);
  n.addComponent(UITransform).setContentSize(w, h);
  n.setPosition(x, y);
  parent.addChild(n);
  return n;
}

function onTap(node: Node, callback: () => void) {
  node.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    callback();
  });
}

function makeLabel(ui: any, parent: Node, text: string, size: number, x: number, y: number, w: number, h = 20) {
  const node: Node = ui.makeLabel(text, size, TEXT, true, x, y, w, h);
  parent.addChild(node);
  return node.getComponent(Label)!;
}

function paintOval(node: Node, rx: number, ry: number, fill: Color, outline?: Color, width = 1) {
  const g = node.getComponent(Graphics) || node.addComponent(Graphics);
  const path = () => rx === ry ? g.circle(0, 0, rx) : g.ellipse(0, 0, rx, ry);
  g.clear();
  g.fillColor = fill;
  path();
  g.fill();
  if (outline) {
    g.strokeColor = outline;
    g.lineWidth = width;
    path();
    g.stroke();
  }
}

function createCowGroomEffects(ui: any, actors: Node, id: number, sourceX: number): CowGroomEffects {
  // This is an actor effect: it remains behind the near rail, not in the HUD.
  const root = createNode(actors, `BarnCowGroomEffects_${id}`, 47, 40,
    interiorSourceXToDialog(sourceX) + (id === 0 ? -17 : 17),
    interiorSourceYToDialog(SOURCE_Y) - 5);
  const dirt = createNode(root, "CowCoatDust", 34, 18);
  const dirtColors = [new Color(139, 101, 74, 190), new Color(183, 142, 104, 188)];
  [[-10, 2, 5], [-4, 3, 4], [3, -1, 3]].forEach(([x, y, radius], i) => {
    const spot = createNode(dirt, `Dust_${i}`, radius * 2, radius * 2, x, y);
    paintOval(spot, radius, radius * 0.62, dirtColors[i % dirtColors.length]);
  });

  const brush = createNode(root, "GroomBrush", 26, 26);
  ui.applyUiIcon("barnGroomBrush", brush);
  brush.active = false;
  const shine = createNode(root, "GroomShine", 48, 38);
  const graphics = shine.addComponent(Graphics);
  graphics.fillColor = new Color(255, 241, 161, 255);
  [-15, 1, 16].forEach((x, i) => {
    const y = i === 1 ? 11 : 4;
    const long = i === 1 ? 6 : 4;
    graphics.moveTo(x, y + long);
    graphics.lineTo(x + 1.3, y + 1.3);
    graphics.lineTo(x + long, y);
    graphics.lineTo(x + 1.3, y - 1.3);
    graphics.lineTo(x, y - long);
    graphics.lineTo(x - 1.3, y - 1.3);
    graphics.lineTo(x - long, y);
    graphics.lineTo(x - 1.3, y + 1.3);
    graphics.close();
    graphics.fill();
  });
  shine.active = false;
  return { dirt, brush, shine };
}

function playCowGroomEffects(effect: CowGroomEffects) {
  const { brush, shine } = effect;
  Tween.stopAllByTarget(brush);
  Tween.stopAllByTarget(shine);
  shine.active = false;
  brush.active = true;
  brush.setPosition(-14, 7);
  tween(brush).bindNodeState(true)
    .to(0.14, { position: new Vec3(13, 1, 0) }, { easing: "sineInOut" })
    .to(0.14, { position: new Vec3(-13, 4, 0) }, { easing: "sineInOut" })
    .to(0.14, { position: new Vec3(13, 0, 0) }, { easing: "sineInOut" })
    .call(() => {
      brush.active = false;
      shine.active = true;
      shine.setScale(0.45, 0.45, 1);
      tween(shine).bindNodeState(true)
        .to(0.16, { scale: Vec3.ONE }, { easing: "backOut" })
        .to(0.25, { scale: new Vec3(0.55, 0.55, 1) }, { easing: "sineIn" })
        .call(() => { shine.active = false; })
        .start();
    })
    .start();
}

function makeCowDetail(ui: any, hud: Node, id: number, x: number): CowDetail {
  // The tags sit directly beneath their own cow, not in a shared selection row.
  const detail = createNode(hud, `BarnCowDetail_${id}`, CARD_W, 16, x, 3);
  const timeChip = createNode(detail, "CowTimeChip", 59, 15, -30, 0);
  const clock = createNode(timeChip, "CowClockIcon", 10, 10, -20, 0);
  paintOval(clock, 5, 5, new Color(255, 248, 221), new Color(175, 116, 56));
  const clockHour = createNode(clock, "HourHand", 1.2, 3.4, 0, 1.1);
  const clockMinute = createNode(clock, "MinuteHand", 2.9, 1.2, 1.1, 0);
  fillRoundRect(clockHour, 1.2, 3.4, 0.55, TEXT);
  fillRoundRect(clockMinute, 2.9, 1.2, 0.55, TEXT);
  const milk: Node = ui.createItemIcon("milk", 12);
  milk.name = "CowReadyMilkIcon";
  milk.setPosition(MILK_ICON_X, 0);
  timeChip.addChild(milk);
  const value = makeLabel(ui, timeChip, "", 10, 6, 0, 36, 13);
  value.node.name = "CowTimeValue";
  const timeSaved = makeLabel(ui, timeChip, "", 10, 6, 0, 36, 13);
  timeSaved.node.name = "CowCleaningTimeSaved";
  timeSaved.color = new Color(159, 81, 32);
  timeSaved.node.active = false;

  const feedChip = createNode(detail, "CowFeedChip", 59, 15, 30, 0);
  fillRoundRect(feedChip, 59, 15, 7, new Color(235, 235, 190, 228));
  strokeRoundRect(feedChip, 59, 15, 7, new Color(184, 169, 108), 0.8);
  // A neutral tally glyph communicates uses; wheat is reserved for the feed action.
  const countIcon = createNode(feedChip, "CowFeedCountIcon", 13, 12, -18, 0);
  const countInk = countIcon.addComponent(Graphics);
  countInk.fillColor = MUTED;
  for (const y of [3, 0, -3]) {
    countInk.circle(-4, y, 0.76);
    countInk.fill();
    countInk.roundRect(-1.7, y - 0.57, 6.1, 1.14, 0.54);
    countInk.fill();
  }
  const feedPips = [0, 1, 2].map((index) =>
    createNode(feedChip, `FeedPip_${index}`, 7, 6, -4 + index * 10, 0),
  );
  return { timeChip, clock, milk, value, timeSaved, feedPips };
}

function updateCowDetail(detail: CowDetail, production: CowProduction) {
  const ready = !!production?.ready;
  if (detail.wasReady !== ready) {
    detail.wasReady = ready;
    detail.clock.active = !ready;
    detail.milk.active = ready;
    fillRoundRect(detail.timeChip, 59, 15, 7, ready ? new Color(255, 222, 144) : new Color(251, 232, 184));
    strokeRoundRect(detail.timeChip, 59, 15, 7, ready ? new Color(185, 113, 43) : new Color(199, 151, 92), ready ? 1.15 : 0.8);
    detail.value.color = ready ? MILK_READY : TEXT;
  }
  const remaining = Math.max(0, Math.ceil(production?.remaining ?? 0));
  const value = ready
    ? `×${production?.count ?? 0}`
    : !production ? "—" : remaining < 60
      ? `${remaining}秒`
      : `${Math.floor(remaining / 60)}:${("0" + remaining % 60).slice(-2)}`;
  if (detail.value.string !== value) detail.value.string = value;

  const used = Math.max(0, Math.min(detail.feedPips.length, production?.feedCount ?? 0));
  if (detail.feedCount === used) return;
  detail.feedCount = used;
  detail.feedPips.forEach((seed, index) => {
    const filled = index < used;
    paintOval(seed, 3.5, 3, filled ? new Color(214, 161, 65) : new Color(255, 249, 219), filled ? new Color(155, 103, 43) : new Color(185, 168, 116), 0.8);
  });
}

function playCowTimeSaved(detail: CowDetail, seconds: number) {
  const delta = detail.timeSaved.node;
  const countdown = detail.value.node;
  Tween.stopAllByTarget(delta);
  Tween.stopAllByTarget(countdown);
  detail.timeSaved.string = `−${seconds}秒`;
  countdown.active = false;
  delta.active = true;
  delta.setPosition(6, 0);
  delta.setScale(0.72, 0.72, 1);
  tween(delta).bindNodeState(true)
    .to(0.16, { scale: new Vec3(1.14, 1.14, 1), position: new Vec3(6, 2, 0) }, { easing: "quadOut" })
    .to(0.13, { scale: Vec3.ONE, position: new Vec3(6, 0, 0) }, { easing: "sineInOut" })
    .delay(0.42)
    .call(() => {
      if (!delta.isValid || !countdown.isValid) return;
      delta.active = false;
      countdown.active = true;
      countdown.setScale(0.9, 0.9, 1);
      tween(countdown).bindNodeState(true)
        .to(0.18, { scale: Vec3.ONE }, { easing: "backOut" })
        .start();
    })
    .start();
}

function paintBarnAction(view: ActionView, highlighted: boolean) {
  if (view.highlighted === highlighted) return;
  view.highlighted = highlighted;
  drawBarnActionButtonSurface(view.surface, ACTION_W, ACTION_H, highlighted);
}

function updateBarnMilkActionWiggle(view: ActionView, ready: boolean) {
  if (view.wiggling === ready) return;
  view.wiggling = ready;
  const { icon } = view;
  Tween.stopAllByTarget(icon);
  icon.setPosition(ACTION_ICON_X, 0);
  if (!ready) return;
  const swing = tween(icon)
    .to(0.16, { position: new Vec3(ACTION_ICON_X - 2.6, 0, 0) }, { easing: "sineOut" })
    .to(0.28, { position: new Vec3(ACTION_ICON_X + 2.6, 0, 0) }, { easing: "sineInOut" })
    .to(0.16, { position: new Vec3(ACTION_ICON_X, 0, 0) }, { easing: "sineOut" })
    .delay(0.5);
  tween(icon).bindNodeState(true).repeatForever(swing).start();
}

function isCurrent(dialog: Node, room: BarnState) {
  return dialog.isValid && !(dialog as any).__closing &&
    room.ui.activeLivestockBuildingSlotId === room.buildingSlotId &&
    room.ui.dialogRoot?.getChildByName("LivestockDialog") === dialog;
}

function getProduction(room: BarnState, cowId: number): CowProduction {
  return LandSystem.getInstance().getLivestockSlotProduction(room.buildingSlotId, cowId);
}

export function mountBarnRoom(
  ui: any,
  dialog: Node,
  buildingSlotId: number,
  showFeed: (cowId: number, cowName: string) => void,
) {
  // Draw in this order. Foreground is artwork only and must not claim touches.
  const actors = createNode(dialog, "BarnActors", FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  COWS.forEach((cow, id) => {
    const actor = createNode(actors, `BarnCowActor_${id}`,
      SOURCE_W * FARM_BUILDING_DIALOG_WIDTH / 752, SOURCE_H * FARM_BUILDING_DIALOG_HEIGHT / 1359,
      interiorSourceXToDialog(cow.x), interiorSourceYToDialog(SOURCE_Y));
    ui.applyUiIcon(cow.icon, actor);
  });
  const grooming = COWS.map((cow, id) => createCowGroomEffects(ui, actors, id, cow.x));
  // This layer is deliberately below BarnForegroundOccluders.
  const feedLayer = createNode(actors, "BarnFeedFlights", FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  const mouthAnchors = COWS.map((cow, id) => createNode(
    feedLayer, `BarnCowMouth_${id}`, 1, 1,
    interiorSourceXToDialog(cow.mouthX), interiorSourceYToDialog(MOUTH_SOURCE_Y),
  ));
  const foreground = createNode(dialog, "BarnForegroundOccluders", FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  ui.applyUiIcon("barnForegroundFence", foreground);

  const interactions = createNode(dialog, "BarnInteractions", FARM_BUILDING_DIALOG_WIDTH, FARM_BUILDING_DIALOG_HEIGHT);
  COWS.forEach((cow, id) => {
    const hotspot = createNode(interactions, `BarnCowHotspot_${id}`, 112, 91,
      interiorSourceXToDialog(cow.x), interiorSourceYToDialog(700));
    onTap(hotspot, () => selectCow(id));
  });
  const pointer = createNode(interactions, "BarnSelectedCowPointer", 27, 35);
  // Selection moves the anchor. Production refreshes never move or restart the animated child.
  const hand = createNode(pointer, "BarnPointerFloatArt", 27, 35, 0, 4);
  ui.applyUiIcon("barnCowSelectionPointer", hand);
  const float = tween(hand).bindNodeState(true).repeatForever(
    tween(hand)
      .to(0.56, { position: new Vec3(0, -4, 0) }, { easing: "sineInOut" })
      .to(0.56, { position: new Vec3(0, 4, 0) }, { easing: "sineInOut" }),
  );
  float.start();
  const left = interiorSourceXToDialog(BARN_HUD_SAFE.left);
  const right = interiorSourceXToDialog(BARN_HUD_SAFE.right);
  const top = interiorSourceYToDialog(BARN_HUD_SAFE.top);
  const bottom = interiorSourceYToDialog(BARN_HUD_SAFE.bottom);
  const hud = createNode(dialog, "BarnHUD", right - left, top - bottom, (left + right) / 2, (top + bottom) / 2);
  const views = COWS.map((cow, id) => {
    const card = createNode(hud, `BarnCowStatus_${id}`, CARD_W, CARD_H, id === 0 ? -65 : 65, 30);
    const medallion = createNode(card, "PortraitMedallion", 26, 26, -45, 0);
    const portrait = createNode(medallion, "CowPortrait", 22, 21);
    ui.applyUiIcon(cow.portrait, portrait);
    const cleanMark = createNode(card, "CowCleanMark", 8, 8, -35, -9);
    paintOval(cleanMark, 4, 4, new Color(141, 172, 93), new Color(93, 131, 64), 1);
    const check = cleanMark.getComponent(Graphics)!;
    check.strokeColor = new Color(255, 248, 221);
    check.lineWidth = 1.1;
    check.moveTo(-1.9, 0);
    check.lineTo(-0.55, -1.3);
    check.lineTo(1.9, 1.15);
    check.stroke();
    makeLabel(ui, card, cow.name, 12, -13, 6, 34, 15);
    const badge = createNode(card, "StatusBadge", 43, 14, 33, 6);
    const status = makeLabel(ui, badge, "", 9, 0, 0, 41, 13);
    const track = createNode(card, "ProgressTrack", BAR_W, 5, 15, -9);
    fillRoundRect(track, BAR_W, 5, 3, new Color(178, 131, 82, 97));
    const fill = createNode(track, "ProgressFill", BAR_W, 4);
    onTap(card, () => selectCow(id));
    const detail = makeCowDetail(ui, hud, id, card.position.x);
    return { card, medallion, cleanMark, grooming: grooming[id], badge, status, fill, detail };
  });
  const set = lastSelections.get(ui) || new Map<number, number>();
  lastSelections.set(ui, set);
  const room: BarnState = {
    ui, buildingSlotId, selected: set.get(buildingSlotId) ?? 0,
    pointer, views, feedLayer, mouthAnchors, busy: false,
  };
  rooms.set(dialog, room);
  const stopRoomLoops = () => {
    float.stop();
    if (room.milkAction) updateBarnMilkActionWiggle(room.milkAction, false);
  };
  dialog.on(Node.EventType.PARENT_CHANGED, () => {
    if (!dialog.parent) stopRoomLoops();
  });
  dialog.once(Node.EventType.NODE_DESTROYED, stopRoomLoops);

  const addAction = (
    name: string, label: string, iconKey: string,
    x: number, callback: () => void,
  ) => {
    const n = createNode(hud, name, ACTION_W, ACTION_H, x, -28);
    const surface = createNode(n, "ActionSurface", ACTION_W, ACTION_H);
    const icon = createNode(surface, "ActionIcon", 22, 22, ACTION_ICON_X, 0);
    const view: ActionView = { surface, icon };
    paintBarnAction(view, false);
    ui.applyUiIcon(iconKey, icon);
    makeLabel(ui, surface, label, 11, 10, 0, 30, 17);
    bindTaskStylePressFeedback(n, surface);
    onTap(n, () => { if (isCurrent(dialog, room)) callback(); });
    return view;
  };
  addAction("BarnFeed", "投喂", "sceneBarnWheat", -99, () => {
    const cow = room.selected;
    const p = getProduction(room, cow);
    if (!p || p.ready) { ui.toast("牛奶已可收获"); return; }
    if ((p.feedCount || 0) >= 3) { ui.toast("本轮已投喂 3 次"); return; }
    const stock = InventorySystem.getInstance();
    if (!LIVESTOCK_FEEDS.some((feed) => stock.hasItems(feed.itemId, 1))) {
      ui.toast("背包暂无可用饲料");
      return;
    }
    showFeed(cow, COWS[cow].name);
  });
  room.milkAction = addAction("BarnMilk", "挤奶", "barnMilkGrip", -33,
    () => collectBarnMilk(dialog, room, [room.selected]));
  room.collectAction = addAction("BarnCollectAll", "全收", "pastureCollect", 33,
    () => collectBarnMilk(dialog, room, [0, 1]));
  room.groomAction = addAction("BarnGroom", "清洁", "barnGroomBrush", 99, () => {
    const id = room.selected;
    const land = LandSystem.getInstance();
    const seconds = land.groomLivestockCow(buildingSlotId, id);
    if (seconds <= 0) {
      const state = getProduction(room, id);
      ui.toast(state?.cleanedThisCycle ? `${COWS[id].name}本轮已经清洁`
        : state?.ready ? "请先收奶，下一轮再清洁" : "当前牛位不可清洁");
      return;
    }
    playCowGroomEffects(room.views[id].grooming);
    refreshBarnRoom(dialog);
    playCowTimeSaved(room.views[id].detail, seconds);
    ui.toast(`${COWS[id].name}清洁完成，产奶缩短 ${seconds} 秒`);
  });
  refreshBarnRoom(dialog);

  function selectCow(id: number) {
    if (!isCurrent(dialog, room) || room.selected === id) return;
    room.selected = id;
    set.set(buildingSlotId, id);
    refreshBarnRoom(dialog);
  }
}

function barnFeedPoint(start: Vec3, end: Vec3, t: number): Vec3 {
  const other = 1 - t;
  const controlX = start.x + (end.x - start.x) * 0.56;
  const controlY = Math.max(start.y, end.y) + 60;
  return new Vec3(
    other * other * start.x + 2 * other * t * controlX + t * t * end.x,
    other * other * start.y + 2 * other * t * controlY + t * t * end.y,
    0,
  );
}

export function playBarnFeedFlight(
  dialog: Node,
  buildingSlotId: number,
  cowId: number,
  itemId: string,
  worldOrigin?: Vec3,
): boolean {
  const room = rooms.get(dialog);
  if (!room || room.buildingSlotId !== buildingSlotId || !isCurrent(dialog, room)) return false;
  const mouth = room.mouthAnchors[cowId];
  if (!mouth?.isValid || !room.feedLayer.isValid) return false;
  const transform = room.feedLayer.getComponent(UITransform)!;
  const end = transform.convertToNodeSpaceAR(mouth.worldPosition);
  const start = worldOrigin
    ? transform.convertToNodeSpaceAR(worldOrigin)
    : new Vec3(0, end.y - 50, 0);
  const crop: Node = room.ui.createItemIcon(itemId, 34, true);
  crop.name = `BarnFeedCrop_${cowId}`;
  room.feedLayer.addChild(crop);
  crop.setPosition(start);
  crop.setScale(0.72, 0.72, 1);
  tween(crop).bindNodeState(true)
    .to(0.10, { scale: Vec3.ONE }, { easing: "quadOut" })
    .to(0.57, { scale: new Vec3(0.27, 0.27, 1) }, {
      easing: "sineInOut",
      onUpdate: (_target, ratio) => {
        if (crop.isValid) crop.setPosition(barnFeedPoint(start, end, ratio ?? 0));
      },
    })
    .call(() => {
      if (!crop.isValid) return;
      crop.setPosition(end);
      crop.destroy();
      if (!isCurrent(dialog, room)) return;
      const bite = createNode(room.feedLayer, "BarnFeedBite", 16, 12, end.x, end.y);
      [-4, 0, 4].forEach((x, i) => {
        const crumb = createNode(bite, `FeedCrumb_${i}`, 3, 3, x, i === 1 ? 4 : 0);
        paintOval(crumb, 1.5, 1.5, new Color(255, 225, 127));
      });
      tween(bite).bindNodeState(true)
        .to(0.18, { position: new Vec3(end.x, end.y + 9, 0), scale: new Vec3(0.45, 0.45, 1) })
        .call(() => bite.destroy())
        .start();
    })
    .start();
  return true;
}

export function refreshBarnRoom(dialog: Node): boolean {
  const room = rooms.get(dialog);
  if (!room) return false;
  if (!isCurrent(dialog, room)) return true;
  const selected = COWS[room.selected];
  const targetX = interiorSourceXToDialog(selected.headX);
  const targetY = interiorSourceYToDialog(564);
  if (room.pointer.position.x !== targetX || room.pointer.position.y !== targetY) {
    room.pointer.setPosition(targetX, targetY);
  }
  let selectedProduction: CowProduction = null;
  let anyReady = false;
  room.views.forEach((view, index) => {
    const p = getProduction(room, index);
    const active = index === room.selected;
    updateCowDetail(view.detail, p);
    anyReady ||= !!p?.ready;
    if (active) selectedProduction = p;
    const clean = !!p?.cleanedThisCycle;
    view.cleanMark.active = clean;
    view.grooming.dirt.active = !clean;
    const key = `${Number(active)}/${Number(!!p?.ready)}`;
    if (view.key !== key) {
      view.key = key;
      fillRoundRect(view.card, CARD_W, CARD_H, 8, active ? new Color(255, 227, 159) : new Color(255, 247, 222));
      strokeRoundRect(view.card, CARD_W, CARD_H, 8, active ? new Color(179, 108, 48) : new Color(201, 163, 112), active ? 1.65 : 1);
      paintOval(view.medallion, 13, 13, active ? new Color(241, 191, 103) : new Color(239, 216, 166), active ? new Color(185, 125, 65) : new Color(207, 173, 118));
      fillRoundRect(view.badge, 43, 14, 7, p?.ready ? new Color(250, 206, 113) : new Color(234, 235, 190));
      view.status.string = p?.ready ? "可收牛奶" : "产奶中";
      view.status.color = p?.ready ? MILK_READY : MUTED;
    }
    const percent = Math.round(productionRatio(p) * 100);
    const progressKey = `${percent}/${Number(!!p?.ready)}`;
    if (view.progressKey === progressKey) return;
    view.progressKey = progressKey;
    view.fill.active = percent > 0;
    if (!view.fill.active) return;
    const width = BAR_W * percent / 100;
    view.fill.setPosition(-BAR_W / 2 + width / 2, 0);
    fillRoundRect(view.fill, width, 4, Math.min(2, width / 2), p?.ready ? new Color(231, 151, 55) : new Color(156, 179, 74));
  });
  const p = selectedProduction as CowProduction;
  if (room.milkAction) {
    paintBarnAction(room.milkAction, !!p?.ready);
    // The single-milk button acts on the selected cow, not any ready cow.
    updateBarnMilkActionWiggle(room.milkAction, !!p?.ready);
  }
  if (room.collectAction) paintBarnAction(room.collectAction, anyReady);
  if (room.groomAction) paintBarnAction(room.groomAction, !!p?.cleanedThisCycle);
  return true;
}

function collectBarnMilk(dialog: Node, room: BarnState, ids: number[]) {
  if (room.busy) return;
  const land = LandSystem.getInstance();
  const inventory = InventorySystem.getInstance();
  const ready: Array<{ id: number; itemId: string; count: number; origin: Vec3 }> = [];
  for (const id of ids) {
    const p = getProduction(room, id);
    if (p?.ready) ready.push({
      id, itemId: p.itemId, count: p.count,
      // Capture the ready badge's location before collecting resets it.
      origin: room.views[id].detail.milk.worldPosition.clone(),
    });
  }
  if (!ready.length) { room.ui.toast("暂时没有可收的牛奶"); return; }
  if (!inventory.canAddItems(ready)) { room.ui.toast("背包空间不足"); return; }
  room.busy = true;
  const rewards: Array<{ itemId: string; count: number; origin: Vec3 }> = [];
  try {
    inventory.runBatch(() => {
      for (const cow of ready) {
        const product = land.collectLivestockSlotProduct(room.buildingSlotId, cow.id);
        if (product && inventory.addItem(product.itemId, product.count)) {
          rewards.push({ ...product, origin: cow.origin });
        }
      }
    });
  } finally {
    room.busy = false;
  }
  refreshBarnRoom(dialog);
  let count = 0;
  let animated = false;
  for (const reward of rewards) {
    count += reward.count;
    animated = animateItemToInventory(room.ui, reward.itemId, reward.count, reward.origin) || animated;
  }
  if (count && !animated) room.ui.toast(`收获牛奶 ×${count}`);
}
