/**
 * UI 组件工厂
 * 提供 Label、图标等 UI 组件的创建工具方法
 */
import { Color, director, Director, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { getItem } from "../../config/ItemConfig";
import { RecipeDef } from "../../config/RecipeConfig";
import { ImageCache } from "../../utils/ImageCache";

type ItemTextureTask = {
  node: Node;
  sprite: Sprite;
  spriteFrame: SpriteFrame;
};

const ITEM_TEXTURES_PER_FRAME = 6;
const itemTextureQueue: ItemTextureTask[] = [];
let itemTextureFlushScheduled = false;

function enqueueItemTexture(task: ItemTextureTask) {
  itemTextureQueue.push(task);
  scheduleItemTextureFlush();
}

function scheduleItemTextureFlush() {
  if (itemTextureFlushScheduled) return;
  itemTextureFlushScheduled = true;
  director.once(Director.EVENT_AFTER_DRAW, flushItemTextures);
}

function flushItemTextures() {
  itemTextureFlushScheduled = false;
  let applied = 0;
  while (itemTextureQueue.length > 0 && applied < ITEM_TEXTURES_PER_FRAME) {
    const task = itemTextureQueue.shift()!;
    if (!task.node.isValid || !task.sprite.isValid) continue;
    task.sprite.spriteFrame = task.spriteFrame;
    applied++;
  }
  if (itemTextureQueue.length > 0) scheduleItemTextureFlush();
}

// ===== 中文名称映射 =====

const ITEM_NAMES: Record<string, string> = {
  wheat: "小麦",
  corn: "玉米",
  tomato: "番茄",
  carrot: "胡萝卜",
  pumpkin: "南瓜",
  strawberry: "草莓",
  cherry: "樱桃",
  banana: "香蕉",
  apple: "苹果",
  lettuce: "莴笋",
  egg: "鸡蛋",
  milk: "牛奶",
  flour: "面粉",
  butter: "黄油",
  honey: "蜂蜜",
  sugar: "糖",
  oatmeal: "燕麦",
  bananaSauce: "香甜香蕉酱",
  cherryJam: "樱桃果酱瓶",
  jam: "果酱",
  cheese: "奶酪",
  ketchup: "番茄酱",
  bread: "面包",
  croissant: "牛角包",
  cake: "蛋糕",
  cupcake: "杯子蛋糕",
  cookie: "饼干",
  pie: "派",
  strawberryCake: "草莓蛋糕",
  baguette: "法棍",
  donut: "甜甜圈",
  chocolateCake: "巧克力蛋糕",
  cornFlakes: "玉米片",
  cereal: "麦片",
  pasta: "意面",
  flower: "鲜花",
  butterToast: "黄油吐司",
  honeyToast: "蜂蜜吐司",
  jamToast: "果酱吐司",
  applePie: "香甜苹果派",
  watermelonJuice: "冰爽西瓜汁",
  broccoliCheeseSoup: "奶酪西兰花汤",
  beetrootSalad: "甜菜根沙拉",
  turnipSoup: "香浓芜菁汤",
  celeryJuice: "鲜榨芹菜汁",
  gingerTea: "暖香蜂蜜姜茶",
  kaleSalad: "羽衣甘蓝沙拉",
  cabbageRoll: "田园白菜卷",
  garlicBread: "黄油蒜香面包",
  leekSoup: "韭葱土豆浓汤",
  roastedBrusselsSprouts: "黄油小卷心",
  autumnVegSoup: "秋收蔬菜汤",
  gingerVegStew: "姜香蔬菜煲",
  greenEnergyBowl: "双绿能量碗",
  garlicWinterRoll: "蒜香冬菜卷",
  winterRoastPlatter: "冬日烤蔬盘",
};

const RECIPE_NAMES: Record<string, string> = {
  R001: "制作面粉",
  R002: "制作黄油",
  R003: "制作番茄酱",
  R004: "胡萝卜泥",
  R006: "制作玉米片",
  R010: "烘焙面包",
  R011: "牛角包",
  R012: "制作饼干",
  R013: "黄油吐司",
  R014: "蜂蜜吐司",
  R016: "麦片早餐",
  R017: "烹饪意面",
  R020: "烘焙蛋糕",
  R021: "杯子蛋糕",
  R022: "甜甜圈",
  R024: "草莓派",
  R026: "草莓蛋糕",
  R027: "制作果酱",
  R029: "果酱吐司",
  R030: "巧克力蛋糕",
  R031: "制作奶酪",
  R033: "法棍面包",
  R040: "奶酪西兰花汤",
  R041: "甜菜根沙拉",
  R042: "香浓芜菁汤",
  R043: "鲜榨芹菜汁",
  R044: "暖香蜂蜜姜茶",
  R045: "羽衣甘蓝沙拉",
  R046: "田园白菜卷",
  R047: "黄油蒜香面包",
  R048: "韭葱土豆浓汤",
  R049: "黄油小卷心",
  R050: "秋收蔬菜汤",
  R051: "姜香蔬菜煲",
  R052: "双绿能量碗",
  R053: "蒜香冬菜卷",
  R054: "冬日烤蔬盘",
  R055: "香甜香蕉酱",
  R056: "香甜苹果派",
  R057: "樱桃果酱瓶",
  R058: "冰爽西瓜汁",
};

// ===== 纯工具函数 =====

/** 确定性伪随机（基于种子和偏移） */
export function seededRandom(seed: number, offset: number): number {
  const n = Math.sin(seed * 9283 + offset * 137) * 10000;
  return n - Math.floor(n);
}

/** 获取物品中文名 */
export function getItemDisplayName(itemId: string): string {
  return ITEM_NAMES[itemId] || getItem(itemId)?.name || itemId;
}

/** 获取合成配方中文名 */
export function getRecipeDisplayName(recipe: RecipeDef | undefined): string {
  if (!recipe) return "";
  return RECIPE_NAMES[recipe.id] || recipe.name;
}

// ===== 节点创建工厂 =====

/** 创建文本标签节点 */
export function createLabel(
  text: string,
  fontSize: number,
  color: Color,
  bold: boolean,
  x: number,
  y: number,
  w: number,
  h: number,
): Node {
  const node = new Node("Label");
  node.setPosition(Math.round(x), Math.round(y));
  node.addComponent(UITransform).setContentSize(Math.round(w), Math.round(h));
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = Math.ceil(fontSize * 1.2);
  label.color = color;
  label.isBold = bold;
  label.horizontalAlign = Label.HorizontalAlign.CENTER;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  const labelCtor = Label as any;
  if (labelCtor.CacheMode?.BITMAP !== undefined) {
    (label as any).cacheMode = labelCtor.CacheMode.BITMAP;
  }
  return node;
}

/** 创建物品图标节点；启动阶段已经完成全量预载，此处只读取内存缓存。 */
export function createItemIcon(
  itemId: string,
  size: number,
  trimTransparent = false,
): Node {
  const node = new Node(`Icon_${itemId}`);
  node.addComponent(UITransform).setContentSize(size, size);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.trim = trimTransparent;
  const applySpriteFrame = (sf: import("cc").SpriteFrame | null) => {
    if (!sf || !node.isValid) return;
    enqueueItemTexture({ node, sprite, spriteFrame: sf });
  };
  const imageCache = ImageCache.getInstance();
  const cached = imageCache.getCachedItem(itemId);
  if (cached) applySpriteFrame(cached);
  return node;
}

/** 应用启动阶段已缓存的 UI 图标，不在界面创建期间发起网络请求。 */
export function applyUiIcon(name: string, node: Node) {
  (node as any).__uiIconRequest = name;
  const applySpriteFrame = (sf: import("cc").SpriteFrame | null) => {
    if (!sf || !node.isValid || (node as any).__uiIconRequest !== name) return;
    const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.trim = false;
    sprite.spriteFrame = sf;
  };
  const imageCache = ImageCache.getInstance();
  const cached = imageCache.getCachedUiIcon(name);
  if (cached) applySpriteFrame(cached);
}
