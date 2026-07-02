/**
 * UI 组件工厂
 * 提供 Label、图标等 UI 组件的创建工具方法
 */
import { Color, Graphics, Label, Node, Sprite, UITransform } from 'cc';
import { getItem } from '../../config/ItemConfig';
import { RecipeDef } from '../../config/RecipeConfig';
import { ImageCache } from '../../utils/ImageCache';
import { fillRoundRect } from './UIDraw';

// ===== 中文名称映射 =====

const ITEM_NAMES: Record<string, string> = {
    wheat: '小麦', corn: '玉米', tomato: '番茄', carrot: '胡萝卜', pumpkin: '南瓜',
    strawberry: '草莓', cherry: '樱桃', banana: '香蕉', apple: '苹果', lettuce: '生菜',
    egg: '鸡蛋', milk: '牛奶', flour: '面粉', butter: '黄油', honey: '蜂蜜', sugar: '糖',
    oatmeal: '燕麦', jam: '果酱', cheese: '奶酪', ketchup: '番茄酱',
    bread: '面包', croissant: '牛角包', cake: '蛋糕', cupcake: '杯子蛋糕', cookie: '饼干',
    pie: '派', strawberryCake: '草莓蛋糕', baguette: '法棍', donut: '甜甜圈',
    chocolateCake: '巧克力蛋糕', cereal: '麦片', pasta: '意面',
    butterToast: '黄油吐司', honeyToast: '蜂蜜吐司', jamToast: '果酱吐司',
};

const RECIPE_NAMES: Record<string, string> = {
    R001: '制作面粉', R002: '制作黄油', R003: '制作番茄酱', R004: '胡萝卜泥',
    R010: '烘焙面包', R011: '牛角包', R012: '制作饼干', R013: '黄油吐司',
    R014: '蜂蜜吐司', R016: '麦片早餐', R017: '烹饪意面', R020: '烘焙蛋糕',
    R021: '杯子蛋糕', R022: '甜甜圈', R024: '草莓派', R026: '草莓蛋糕',
    R027: '制作果酱', R029: '果酱吐司', R030: '巧克力蛋糕', R031: '制作奶酪',
    R033: '法棍面包',
};

const ICON_PALETTE = [
    new Color(236, 180, 56, 235),
    new Color(214, 92, 74, 235),
    new Color(94, 178, 88, 235),
    new Color(232, 132, 64, 235),
    new Color(120, 174, 222, 235),
    new Color(190, 126, 214, 235),
];

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
    if (!recipe) return '';
    return RECIPE_NAMES[recipe.id] || recipe.name;
}

/** 根据物品 ID 生成 fallback 颜色 */
export function getItemFallbackColor(itemId: string): Color {
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0;
    return ICON_PALETTE[hash % ICON_PALETTE.length];
}

// ===== 节点创建工厂 =====

/** 创建文本标签节点 */
export function createLabel(text: string, fontSize: number, color: Color, bold: boolean, x: number, y: number, w: number, h: number): Node {
    const node = new Node('Label');
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

/** 创建物品图标节点（异步加载后端图片，加载前显示 fallback 色块） */
export function createItemIcon(itemId: string, size: number, trimTransparent = false): Node {
    const node = new Node(`Icon_${itemId}`);
    node.addComponent(UITransform).setContentSize(size, size);
    const fallback = createFallbackIcon(itemId, size);
    node.addChild(fallback);
    ImageCache.getInstance().load(itemId).then(sf => {
        if (!sf || !node.isValid) return;
        fallback.active = false;
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.trim = trimTransparent;
        sprite.spriteFrame = sf;
    });
    return node;
}

/** 创建物品 fallback 图标（彩色圆角色块） */
function createFallbackIcon(itemId: string, size: number): Node {
    const icon = new Node('FallbackIcon');
    icon.addComponent(UITransform).setContentSize(size, size);
    const color = getItemFallbackColor(itemId);
    const g = icon.addComponent(Graphics);
    g.fillColor = new Color(255, 255, 255, 85);
    g.circle(0, 0, size * 0.48);
    g.fill();
    g.fillColor = color;
    fillRoundRect(icon, size * 0.64, size * 0.56, size * 0.16, color);
    g.fillColor = new Color(255, 255, 255, 95);
    g.circle(-size * 0.12, size * 0.12, size * 0.11);
    g.fill();
    return icon;
}

/** 异步加载 UI 图标（金币、钻石、导航等）并应用到节点 */
export function applyUiIcon(name: string, node: Node) {
    ImageCache.getInstance().loadUiIcon(name).then(sf => {
        if (!sf || !node.isValid) return;
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        sprite.spriteFrame = sf;
    });
}
