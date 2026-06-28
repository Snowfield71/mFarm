import { Button, Color, EditBox, Graphics, Label, Mask, Node, ScrollView, UITransform, Vec3, tween, view } from 'cc';
import { Design, GameValues } from '../../config/GameConfig';
import { GameManager } from '../../core/GameManager';
import { EventManager } from '../../core/EventManager';
import { InventorySystem } from '../../systems/InventorySystem';
import { LandBlock, LandSystem } from '../../systems/LandSystem';
import { CraftSystem } from '../../systems/CraftSystem';
import { getItem, getPlantableCrops, ITEM_DB, ItemCategory, ItemDef } from '../../config/ItemConfig';
import { getRecipe, getRecipesByLevel, RecipeDef } from '../../config/RecipeConfig';
import { fillRect, fillRoundRect, strokeRoundRect } from '../utils/UIDraw';
import type { PanelName } from './MainUITypes';

export function createBackground(ui: any) {
    const vs = view.getVisibleSize();
    const sky = new Node('Sky');
    sky.addComponent(UITransform).setContentSize(vs.width * 2, vs.height * 2);
    const g = sky.addComponent(Graphics);
    const steps = 16;
    const skyHeight = vs.height * 0.66;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        g.fillColor = new Color(
            Math.round(139 + 87 * t),
            Math.round(211 + 28 * t),
            Math.round(238 - 4 * t),
            255,
        );
        const y = vs.height - (i + 1) * (skyHeight / steps);
        g.rect(-vs.width, y - vs.height / 2, vs.width * 2, skyHeight / steps + 2);
        g.fill();
    }
    ui.node.addChild(sky);

    const grass = new Node('Grass');
    const grassTop = vs.height * 0.14;
    const grassHeight = vs.height;
    grass.setPosition(0, grassTop - grassHeight / 2);
    fillRect(grass, vs.width * 2, grassHeight, new Color(148, 236, 158, 255));
    ui.node.addChild(grass);
    ui.createGrassPatches(grass, vs.width, grassHeight, grassTop);

    const sun = ui.createSun(vs.width * 0.31, vs.height * 0.39);
    ui.node.addChild(sun);

    const cloudScale = Math.max(0.86, Math.min(1.12, vs.width / Design.WIDTH));
    const cloudData: Array<[number, number, number]> = [
        [-0.34, 0.33, 42],
        [-0.16, 0.25, 32],
        [0.16, 0.28, 32],
        [0.39, 0.19, 26],
    ];
    for (const [xRatio, yRatio, s] of cloudData) {
        ui.createCloud(vs.width * xRatio, vs.height * yRatio, s * cloudScale);
    }

}

export function createGrassPatches(ui: any, parent: Node, viewWidth: number, grassHeight: number, grassTop: number) {
    const colors = [
        new Color(76, 164, 73, 175),
        new Color(94, 184, 78, 165),
        new Color(116, 198, 88, 150),
    ];
    const rows = 10;
    const cols = 10;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if ((row + col * 2) % 7 === 0 && row > 2) continue;
            const seed = row * 17 + col * 29;
            const x = -viewWidth / 2 + 14 + col * (viewWidth - 28) / (cols - 1) + (ui.rng(seed, 1) - 0.5) * 20;
            const worldY = grassTop - 16 - row * 38 + (ui.rng(seed, 2) - 0.5) * 16;
            const localY = worldY - (grassTop - grassHeight / 2);
            ui.drawGrassPatch(parent, x, localY, 6 + ui.rng(seed, 3) * 4, colors[(row + col) % colors.length]);
        }
    }

}

export function drawGrassPatch(ui: any, parent: Node, x: number, y: number, size: number, color: Color) {
    const patch = new Node('GrassPatch');
    patch.setPosition(x, y);
    const g = patch.addComponent(Graphics);
    g.strokeColor = color;
    g.lineWidth = 1.2;
    const blades = 3 + Math.floor(ui.rng(x, y) * 3);
    for (let i = 0; i < blades; i++) {
        const center = (blades - 1) / 2;
        const offset = (i - center) * 2.5;
        const height = size * (0.66 + ui.rng(x + y, i) * 0.42);
        const bend = (i - center) * 2.1;
        g.moveTo(offset, 0);
        g.quadraticCurveTo(offset + bend * 0.5, height * 0.48, offset + bend, height);
    }
    g.stroke();
    parent.addChild(patch);

}

export function createSun(ui: any, x: number, y: number): Node {
    const sun = new Node('Sun');
    sun.setPosition(x, y);

    const rays = new Node('SunRays');
    const rg = rays.addComponent(Graphics);
    rg.fillColor = new Color(255, 221, 94, 120);
    for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14;
        const half = 0.07;
        const inner = 38;
        const outer = i % 2 === 0 ? 57 : 51;
        rg.moveTo(Math.cos(angle - half) * inner, Math.sin(angle - half) * inner);
        rg.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        rg.lineTo(Math.cos(angle + half) * inner, Math.sin(angle + half) * inner);
        rg.close();
        rg.fill();
    }
    sun.addChild(rays);

    const glow = new Node('SunGlow');
    const gg = glow.addComponent(Graphics);
    gg.fillColor = new Color(255, 214, 72, 48);
    gg.circle(0, 0, 50);
    gg.fill();
    gg.fillColor = new Color(255, 226, 104, 72);
    gg.circle(0, 0, 42);
    gg.fill();
    sun.addChild(glow);

    const body = new Node('SunBody');
    const bg = body.addComponent(Graphics);
    bg.fillColor = new Color(255, 194, 42, 255);
    bg.circle(0, 0, 34);
    bg.fill();
    bg.fillColor = new Color(255, 218, 79, 255);
    bg.circle(-5, 6, 24);
    bg.fill();
    bg.fillColor = new Color(255, 242, 156, 185);
    bg.circle(-12, 13, 11);
    bg.fill();
    sun.addChild(body);

    return sun;

}

export function createCloud(ui: any, x: number, y: number, size: number) {
    const cloud = new Node('Cloud');
    cloud.setPosition(x, y);
    const g = cloud.addComponent(Graphics);
    g.fillColor = new Color(217, 243, 250, 62);
    g.roundRect(-size * 0.68, -size * 0.25, size * 1.36, size * 0.42, size * 0.2);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 160);
    g.roundRect(-size * 0.62, -size * 0.2, size * 1.24, size * 0.36, size * 0.18);
    g.fill();
    g.circle(-size * 0.38, -size * 0.02, size * 0.34);
    g.circle(-size * 0.08, size * 0.16, size * 0.42);
    g.circle(size * 0.34, size * 0.02, size * 0.33);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 72);
    g.circle(-size * 0.28, size * 0.15, size * 0.22);
    g.circle(size * 0.1, size * 0.24, size * 0.18);
    g.fill();
    ui.node.addChild(cloud);

}

export function createTopBar(ui: any) {
    const vs = view.getVisibleSize();
    const sideMargin = 8;
    const levelW = 70;
    const currencyW = 142;
    const pillH = 42;
    const levelX = -Design.WIDTH / 2 + sideMargin + levelW / 2;
    const currencyX = Design.WIDTH / 2 - sideMargin - currencyW / 2;
    const expGap = 10;
    const expLeft = levelX + levelW / 2 + expGap;
    const expRight = currencyX - currencyW / 2 - 8;
    const expW = Math.max(78, expRight - expLeft);
    const expX = (expLeft + expRight) / 2;

    ui.topBar = new Node('TopBar');
    ui.topBar.setPosition(0, vs.height / 2 - 31);
    ui.topBar.addComponent(UITransform).setContentSize(Design.WIDTH, 62);

    const bg = new Node('Bg');
    fillRoundRect(bg, Design.WIDTH + 8, 64, 0, new Color(70, 170, 76, 245));
    ui.topBar.addChild(bg);
    addStarSprinkles(ui.topBar, [
        [-170, 22, 3.1], [-160, 2, 1.6], [-152, -8, 1.8], [-138, 18, 1.5],
        [-118, 20, 2.2], [-94, -18, 1.5], [-74, 22, 1.7],
        [76, -18, 1.5], [98, 21, 1.7], [128, 19, 2.1],
        [146, 5, 1.5], [154, -7, 1.8], [170, 17, 3.0],
    ]);

    const levelBadge = new Node('LevelBadge');
    levelBadge.setPosition(levelX, 0);
    fillRoundRect(levelBadge, levelW, pillH, 20, new Color(84, 190, 86, 245));
    strokeRoundRect(levelBadge, levelW, pillH, 20, new Color(47, 135, 58, 105), 2);
    ui.topBar.addChild(levelBadge);

    const expBg = new Node('ExpBg');
    expBg.setPosition(expX, -1);
    expBg.addComponent(UITransform).setContentSize(expW, 14);
    fillRoundRect(expBg, expW, 14, 8, new Color(45, 116, 55, 190));
    ui.topBar.addChild(expBg);

    const level = ui.makeLabel('Lv.1', 22, new Color(255, 255, 255), true, 0, 1, 64, 30);
    level.name = 'LevelText';
    levelBadge.addChild(level);
    levelBadge.setSiblingIndex(expBg.getSiblingIndex() + 1);

    const expFill = new Node('ExpFill');
    expFill.name = 'ExpFill';
    expFill.setPosition(-expW / 2, 0);
    expBg.addChild(expFill);

    const expText = ui.makeLabel('0/100', 11, new Color(255, 255, 255), false, 0, 0, 70, 14);
    expText.name = 'ExpText';
    expBg.addChild(expText);
    ui.createCurrencyArea(currencyX, currencyW, pillH);

    ui.node.addChild(ui.topBar);

}

export function createCurrencyArea(ui: any, x = 109, width = 126, height = 42) {
    const holder = new Node('CurrencyArea');
    holder.setPosition(x, 0);
    holder.addComponent(UITransform).setContentSize(width, height);
    fillRoundRect(holder, width, height, height / 2, new Color(55, 145, 63, 220));
    strokeRoundRect(holder, width, height, height / 2, new Color(47, 135, 58, 90), 1.5);
    ui.topBar.addChild(holder);

    ui.createCurrencyEntry(holder, 'gold', 'GoldDisplay', '200', -38, new Color(255, 217, 59));
    ui.createCurrencyEntry(holder, 'diamond', 'DiamondDisplay', '50', 32, new Color(255, 144, 205));
    holder.setSiblingIndex(ui.topBar.children.length - 1);

}

export function createCurrencyEntry(ui: any, parent: Node, icon: string, labelName: string, value: string, x: number, color: Color) {
    const iconNode = new Node(`${icon}Icon`);
    iconNode.addComponent(UITransform).setContentSize(27, 27);
    iconNode.setPosition(x - 22, 0);
    parent.addChild(iconNode);
    ui.applyUiIcon(icon, iconNode);

    const label = ui.makeLabel(value, 15, color, true, x + 11, -1, 48, 24);
    label.name = labelName;
    parent.addChild(label);

}

export function createLandArea(ui: any) {
    ui.landRoot = new Node('LandRoot');
    const size = ui.getLandGridSize();
    ui.landRoot.addComponent(UITransform).setContentSize(size.width, size.height);
    ui.layoutLandArea();
    ui.node.addChild(ui.landRoot);
    createHarvestAllButton(ui);

}

function createHarvestAllButton(ui: any) {
    const button = new Node('HarvestAllButton');
    button.active = false;
    button.addComponent(UITransform).setContentSize(38, 46);
    button.setPosition(Design.WIDTH / 2 - 20, -108);
    fillRoundRect(button, 38, 46, 13, new Color(255, 250, 230, 240));
    strokeRoundRect(button, 38, 46, 13, new Color(105, 174, 86, 180), 2);

    const glow = new Node('Glow');
    glow.setPosition(0, -1);
    fillRoundRect(glow, 28, 30, 12, new Color(116, 216, 104, 82));
    button.addChild(glow);

    const basket = new Node('BasketIcon');
    basket.setPosition(0, 0);
    const g = basket.addComponent(Graphics);
    g.strokeColor = new Color(74, 136, 70, 235);
    g.lineWidth = 2.1;
    g.moveTo(-8, 3);
    g.quadraticCurveTo(0, 12, 8, 3);
    g.stroke();
    g.fillColor = new Color(246, 190, 84, 245);
    g.roundRect(-10, -8, 20, 15, 4);
    g.fill();
    g.strokeColor = new Color(140, 96, 42, 160);
    g.roundRect(-10, -8, 20, 15, 4);
    g.stroke();
    g.fillColor = new Color(92, 178, 84, 220);
    g.circle(-4, 3, 2.2);
    g.circle(2, 4, 2.4);
    g.circle(6, 1, 1.9);
    g.fill();
    button.addChild(basket);

    button.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        tween(button)
            .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadOut' })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        ui.harvestAllMatureCrops();
    });
    ui.node.addChild(button);

    tween(glow)
        .repeatForever(
            tween()
                .to(0.8, { scale: new Vec3(1.12, 1.06, 1) }, { easing: 'quadInOut' })
                .to(0.8, { scale: new Vec3(1, 1, 1) }, { easing: 'quadInOut' }),
        )
        .start();
}

export function layoutLandArea(ui: any) {
    if (!ui.landRoot) return;

    const vs = view.getVisibleSize();
    const grid = ui.getLandGridSize();
    const grassTopY = vs.height * 0.14;
    const topLimit = grassTopY - 12;
    const navTop = -vs.height / 2 + 32 + ui.constructor.BOTTOM_NAV_HEIGHT / 2;
    const bottomLimit = navTop + 14;
    const availableH = Math.max(240, topLimit - bottomLimit);
    const availableW = Math.max(Design.WIDTH - 42, 220);
    const scale = Math.min(1, availableW / grid.width, availableH / grid.height);
    const centerY = (topLimit + bottomLimit) / 2;

    ui.landRoot.setPosition(0, centerY);
    ui.landRoot.setScale(new Vec3(scale, scale, 1));

}

export function getLandGridSize(ui: any): { width: number; height: number } {
    return {
        width: ui.constructor.LAND_COLS * ui.constructor.TILE_SIZE + (ui.constructor.LAND_COLS - 1) * ui.constructor.TILE_GAP,
        height: ui.constructor.LAND_ROWS * ui.constructor.TILE_SIZE + (ui.constructor.LAND_ROWS - 1) * ui.constructor.TILE_GAP,
    };
}

export function createBottomNav(ui: any) {
    const vs = view.getVisibleSize();
    const nav = new Node('BottomNav');
    nav.setPosition(0, -vs.height / 2 + 32);
    fillRoundRect(nav, Design.WIDTH + 8, 66, 12, new Color(60, 154, 65, 245));
    ui.node.addChild(nav);
    addStarSprinkles(nav, [
        [-166, 22, 2.2], [-150, 5, 1.5], [-144, -18, 1.7],
        [-118, -23, 1.4], [-104, 18, 1.9], [-66, 23, 1.5],
        [66, 23, 1.6], [104, 19, 2.0], [120, -22, 1.4],
        [142, -15, 1.6], [152, 6, 1.5], [168, 18, 2.4],
    ]);

    const buttons: Array<{ name: string; icon: string; panel: PanelName }> = [
        { name: '背包', icon: 'bag', panel: 'inventory' },
        { name: '合成', icon: 'gear', panel: 'craft' },
        { name: '商店', icon: 'shop', panel: 'shop' },
        { name: '图鉴', icon: 'catalog', panel: 'quest' },
    ];

    const slotW = Design.WIDTH / buttons.length;
    buttons.forEach((item, index) => {
        const btn = new Node(`Nav_${item.panel}`);
        btn.addComponent(UITransform).setContentSize(74, 48);
        btn.setPosition(-Design.WIDTH / 2 + slotW * index + slotW / 2, -1);
        fillRoundRect(btn, 74, 46, 10, new Color(76, 181, 78, 235));
        strokeRoundRect(btn, 74, 46, 10, new Color(38, 132, 52, 105), 1.2);

        const shade = new Node('Shade');
        shade.setPosition(0, -15);
        fillRoundRect(shade, 48, 10, 5, new Color(36, 124, 48, 78));
        btn.addChild(shade);

        const halo = new Node('Halo');
        halo.setPosition(0, 2);
        fillRoundRect(halo, 42, 34, 15, new Color(116, 210, 102, 118));
        btn.addChild(halo);

        const icon = new Node('Icon');
        icon.addComponent(UITransform).setContentSize(33, 33);
        icon.setPosition(0, 2);
        ui.applyUiIcon(item.icon, icon);
        btn.addChild(icon);

        const indicator = new Node('Indicator');
        indicator.setPosition(0, -19);
        indicator.active = false;
        fillRoundRect(indicator, 24, 4, 2, new Color(248, 252, 238, 230));
        btn.addChild(indicator);

        btn.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            tween(btn)
                .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
            ui.showPanel(item.panel);
        });
        nav.addChild(btn);
        btn.setSiblingIndex(nav.children.length - 1);
    });

}

function addStarSprinkles(parent: Node, stars: number[][]) {
    for (let i = 0; i < stars.length; i++) {
        const [x, y, size] = stars[i];
        const star = new Node(`Star_${i}`);
        star.setPosition(x, y);
        const g = star.addComponent(Graphics);
        g.fillColor = new Color(255, 255, 255, 178);
        g.moveTo(0, size);
        g.lineTo(size * 0.32, size * 0.32);
        g.lineTo(size, 0);
        g.lineTo(size * 0.32, -size * 0.32);
        g.lineTo(0, -size);
        g.lineTo(-size * 0.32, -size * 0.32);
        g.lineTo(-size, 0);
        g.lineTo(-size * 0.32, size * 0.32);
        g.close();
        g.fill();
        parent.addChild(star);
    }
}

export function createPanels(ui: any) {
    ui.panels.inventory = ui.createPanel('背包仓库', 318, 398);
    ui.panels.craft = ui.createPanel('合成工坊', 318, 398);
    ui.panels.shop = ui.createPanel('集市商店', 318, 398);
    ui.panels.quest = ui.createPanel('图鉴', 318, 398);
    ui.panels.task = ui.createPanel('今日任务', 318, 398);
    for (const panel of [ui.panels.inventory, ui.panels.craft, ui.panels.shop, ui.panels.quest, ui.panels.task]) {
        if (!panel) continue;
        panel.active = false;
        ui.node.addChild(panel);
    }

}

export function createTaskEntry(ui: any) {
    const entry = new Node('TaskEntry');
    entry.setPosition(Design.WIDTH / 2 - 20, -55);
    entry.addComponent(UITransform).setContentSize(38, 46);
    fillRoundRect(entry, 38, 46, 13, new Color(255, 250, 230, 240));
    strokeRoundRect(entry, 38, 46, 13, new Color(105, 174, 86, 180), 2);

    const icon = new Node('TaskIcon');
    icon.setPosition(0, 0);
    const g = icon.addComponent(Graphics);
    g.strokeColor = new Color(76, 150, 78, 240);
    g.lineWidth = 2.4;
    g.roundRect(-8, -11, 16, 22, 3.5);
    g.stroke();
    g.strokeColor = new Color(76, 150, 78, 210);
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const y = 5 - i * 7;
        g.moveTo(-4, y);
        g.lineTo(5, y);
        g.stroke();
        g.circle(-6.5, y, 1);
        g.stroke();
    }
    entry.addChild(icon);

    const badge = new Node('Badge');
    badge.name = 'Badge';
    badge.setPosition(13, 17);
    badge.active = false;
    fillRoundRect(badge, 9, 9, 4.5, new Color(255, 92, 92, 245));
    entry.addChild(badge);

    entry.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        tween(entry)
            .to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadOut' })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        if (ui.panels.task?.active) {
            ui.renderTaskPanel();
            return;
        }
        ui.showPanel('task');
    });
    ui.node.addChild(entry);
    for (const panel of [ui.panels.inventory, ui.panels.craft, ui.panels.shop, ui.panels.quest, ui.panels.task]) {
        if (panel) panel.setSiblingIndex(ui.node.children.length - 1);
    }
}

export function createPanel(ui: any, title: string, w: number, h: number): Node {
    const panel = new Node(`Panel_${title}`);
    panel.setPosition(0, -55);
    panel.addComponent(UITransform).setContentSize(w, h);
    fillRoundRect(panel, w, h, 14, new Color(255, 250, 230, 252));
    strokeRoundRect(panel, w, h, 14, new Color(124, 184, 105, 160), 2);
    panel.addComponent(Button);

    const close = new Node('Close');
    close.addComponent(UITransform).setContentSize(32, 32);
    close.setPosition(w / 2 - 24, h / 2 - 24);
    fillRoundRect(close, 28, 28, 14, new Color(232, 238, 219, 255));
    const x = ui.makeLabel('x', 18, new Color(92, 104, 82), true, 0, 1, 28, 28);
    close.addChild(x);
    close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        closePanelWithAnimation(panel);
    });
    panel.addChild(close);

    return panel;

}

function closePanelWithAnimation(panel: Node) {
    const originalScale = panel.scale.clone();
    tween(panel)
        .to(0.08, { scale: new Vec3(originalScale.x * 1.025, originalScale.y * 1.025, 1) }, { easing: 'quadOut' })
        .to(0.16, { scale: new Vec3(0.86, 0.86, 1) }, { easing: 'quadIn' })
        .call(() => {
            panel.active = false;
            panel.setScale(originalScale);
        })
        .start();
}

export function createDialogRoot(ui: any) {
    ui.dialogRoot = new Node('DialogRoot');
    ui.dialogRoot.active = false;
    ui.node.addChild(ui.dialogRoot);

}

export function createBubbleRoot(ui: any) {
    ui.bubbleRoot = new Node('BubbleRoot');
    ui.node.addChild(ui.bubbleRoot);

}
