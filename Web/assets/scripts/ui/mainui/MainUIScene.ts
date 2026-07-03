import { Button, Color, EditBox, Graphics, Label, Mask, Node, ScrollView, UIOpacity, UITransform, Vec3, tween, view } from 'cc';
import { Design, GameValues } from '../../config/GameConfig';
import { GameManager } from '../../core/GameManager';
import { EventManager } from '../../core/EventManager';
import { InventorySystem } from '../../systems/InventorySystem';
import { LandBlock, LandSystem } from '../../systems/LandSystem';
import { CraftSystem } from '../../systems/CraftSystem';
import { getItem, getPlantableCrops, ITEM_DB, ItemCategory, ItemDef } from '../../config/ItemConfig';
import { getRecipe, getRecipesByLevel, RecipeDef } from '../../config/RecipeConfig';
import { fillRoundRect, strokeRoundRect } from '../utils/UIDraw';
import type { PanelName } from './MainUITypes';

export function createBackground(ui: any) {
    const vs = view.getVisibleSize();
    const fieldTop = vs.height * 0.21;
    const arcPeakY = fieldTop - 4;
    const arcEdgeY = arcPeakY - 24;
    const grassTop = arcPeakY + 4;
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

    const hills = new Node('Hills');
    const hg = hills.addComponent(Graphics);
    hills.setPosition(0, fieldTop - 88);
    hg.fillColor = new Color(136, 205, 160, 190);
    hg.moveTo(-vs.width / 2 - 60, 88);
    hg.bezierCurveTo(-vs.width * 0.28, 138, -vs.width * 0.08, 150, vs.width * 0.12, 98);
    hg.bezierCurveTo(vs.width * 0.34, 42, vs.width * 0.52, 86, vs.width / 2 + 60, 58);
    hg.lineTo(vs.width / 2 + 60, -20);
    hg.lineTo(-vs.width / 2 - 60, -20);
    hg.close();
    hg.fill();
    hg.fillColor = new Color(112, 190, 142, 150);
    hg.moveTo(-vs.width / 2 - 60, 42);
    hg.bezierCurveTo(-vs.width * 0.2, 104, vs.width * 0.08, 114, vs.width * 0.32, 62);
    hg.bezierCurveTo(vs.width * 0.46, 32, vs.width * 0.58, 46, vs.width / 2 + 60, 28);
    hg.lineTo(vs.width / 2 + 60, -20);
    hg.lineTo(-vs.width / 2 - 60, -20);
    hg.close();
    hg.fill();
    ui.node.addChild(hills);

    const grass = new Node('Grass');
    const grassHeight = vs.height;
    grass.setPosition(0, grassTop - grassHeight / 2);
    const grassG = grass.addComponent(Graphics);
    const localBottom = -grassHeight / 2;
    const localPeak = arcPeakY - (grassTop - grassHeight / 2);
    const localEdge = arcEdgeY - (grassTop - grassHeight / 2);
    grassG.fillColor = new Color(183, 232, 111, 255);
    grassG.moveTo(-vs.width, localEdge);
    grassG.bezierCurveTo(-vs.width * 0.34, localPeak - 2, -vs.width * 0.08, localPeak + 2, 0, localPeak + 4);
    grassG.bezierCurveTo(vs.width * 0.08, localPeak + 2, vs.width * 0.34, localPeak - 2, vs.width, localEdge);
    grassG.lineTo(vs.width, localBottom);
    grassG.lineTo(-vs.width, localBottom);
    grassG.close();
    grassG.fill();
    ui.node.addChild(grass);
    ui.createGrassPatches(grass, vs.width, grassHeight, grassTop, arcEdgeY - 4);

    const fieldArc = new Node('FieldArc');
    const ag = fieldArc.addComponent(Graphics);
    ag.strokeColor = new Color(74, 154, 78, 170);
    ag.lineWidth = 2.6;
    ag.moveTo(-vs.width / 2 - 8, arcEdgeY);
    ag.bezierCurveTo(-vs.width * 0.34, arcPeakY - 2, -vs.width * 0.08, arcPeakY + 2, 0, arcPeakY + 4);
    ag.bezierCurveTo(vs.width * 0.08, arcPeakY + 2, vs.width * 0.34, arcPeakY - 2, vs.width / 2 + 8, arcEdgeY);
    ag.stroke();
    ui.node.addChild(fieldArc);

    createSideTree(ui, -vs.width / 2 + 25, fieldTop + 8, 1.12, -1);
    createSideTree(ui, -vs.width / 2 + 88, fieldTop + 1, 0.82, -1);
    createSideTree(ui, vs.width / 2 - 25, fieldTop + 8, 1.12, 1);
    createSideTree(ui, vs.width / 2 - 88, fieldTop + 1, 0.82, 1);

    const artBg = new Node('ArtBackground');
    artBg.addComponent(UITransform).setContentSize(vs.width, vs.height);
    artBg.setPosition(0, 0);
    ui.applyUiIcon('bgFarmSkyHills', artBg);
    ui.node.addChild(artBg);
    artBg.setSiblingIndex(ui.node.children.length - 1);

}

function createSideTree(ui: any, x: number, y: number, scale: number, side: number) {
    const tree = new Node('SideTree');
    tree.setPosition(x, y);
    tree.setScale(new Vec3(scale, scale, 1));
    const g = tree.addComponent(Graphics);
    g.fillColor = new Color(128, 84, 55, 235);
    g.moveTo(-8 * side, -54);
    g.lineTo(8 * side, -54);
    g.lineTo(6 * side, -4);
    g.lineTo(-6 * side, -4);
    g.close();
    g.fill();
    g.strokeColor = new Color(104, 72, 50, 185);
    g.lineWidth = 3.2;
    g.moveTo(0, -23);
    g.lineTo(-18 * side, 3);
    g.moveTo(2 * side, -18);
    g.lineTo(21 * side, 8);
    g.stroke();
    g.fillColor = new Color(121, 178, 83, 245);
    g.circle(-18 * side, 20, 28);
    g.circle(8 * side, 33, 35);
    g.circle(31 * side, 17, 29);
    g.circle(0, 7, 31);
    g.fill();
    g.fillColor = new Color(152, 202, 103, 235);
    g.circle(-14 * side, 31, 18);
    g.circle(18 * side, 31, 17);
    g.circle(5 * side, 48, 19);
    g.fill();
    g.fillColor = new Color(178, 218, 118, 145);
    g.circle(-20 * side, 31, 7);
    g.circle(19 * side, 34, 6);
    g.circle(4 * side, 12, 6);
    g.fill();
    ui.node.addChild(tree);
}

export function createGrassPatches(ui: any, parent: Node, viewWidth: number, grassHeight: number, grassTop: number, patchTop = grassTop) {
    const colors = [
        new Color(95, 166, 80, 150),
        new Color(121, 186, 86, 138),
        new Color(142, 200, 92, 126),
    ];
    const rows = 12;
    const cols = 9;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if ((row + col * 2) % 7 === 0 && row > 2) continue;
            const seed = row * 17 + col * 29;
            const x = -viewWidth / 2 + 14 + col * (viewWidth - 28) / (cols - 1) + (ui.rng(seed, 1) - 0.5) * 20;
            const worldY = patchTop - 16 - row * 38 + (ui.rng(seed, 2) - 0.5) * 16;
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
    const cardW = Design.WIDTH - 20;
    const cardH = 118;
    ui.topBar = new Node('TopBar');
    ui.topBar.setPosition(0, vs.height / 2 - 76);
    ui.topBar.addComponent(UITransform).setContentSize(Design.WIDTH, 144);

    const shadow = new Node('TopShadow');
    shadow.setPosition(0, -7);
    fillRoundRect(shadow, cardW, cardH, 24, new Color(78, 47, 28, 70));
    ui.topBar.addChild(shadow);

    const bg = new Node('Bg');
    drawTopCardBackground(bg, cardW, cardH);
    strokeRoundRect(bg, cardW, cardH, 24, new Color(116, 72, 43, 245), 3.2);
    ui.topBar.addChild(bg);

    const avatarLobe = new Node('AvatarLobe');
    avatarLobe.setPosition(-116, 10);
    drawAvatarLobe(avatarLobe);
    ui.topBar.addChild(avatarLobe);

    const avatar = new Node('Avatar');
    avatar.setPosition(-116, 3);
    const avatarImage = new Node('AvatarImage');
    avatarImage.addComponent(UITransform).setContentSize(90, 90);
    avatarImage.addComponent(UIOpacity).opacity = 248;
    avatarImage.setPosition(0, -1);
    ui.applyUiIcon('avatarFarmgirl', avatarImage);
    avatar.addChild(avatarImage);
    ui.topBar.addChild(avatar);

    const title = ui.makeLabel('萌田农场', 24, new Color(88, 45, 24), true, 0, 20, 150, 34);
    title.setPosition(-3, 22);
    title.getComponent(UITransform)?.setContentSize(160, 34);
    title.getComponent(Label)!.fontSize = 28;
    title.getComponent(Label)!.isBold = true;
    ui.topBar.addChild(title);

    const expW = 130;
    const expBg = new Node('ExpBg');
    expBg.setPosition(-2, -22);
    expBg.addComponent(UITransform).setContentSize(expW, 21);
    fillRoundRect(expBg, expW, 21, 10, new Color(159, 118, 97, 255));
    strokeRoundRect(expBg, expW, 21, 10, new Color(255, 255, 255, 235), 2.4);
    ui.topBar.addChild(expBg);

    const expFill = new Node('ExpFill');
    expFill.name = 'ExpFill';
    expFill.setPosition(-expW / 2, 0);
    expBg.addChild(expFill);

    const expText = ui.makeLabel('', 1, new Color(255, 255, 255, 0), false, 0, 0, 1, 1);
    expText.name = 'ExpText';
    expBg.addChild(expText);

    ui.createCurrencyArea(121, 112, 88);

    const levelBadge = new Node('LevelBadge');
    levelBadge.setPosition(-116, -51);
    fillRoundRect(levelBadge, 88, 34, 16, new Color(255, 247, 210, 255));
    strokeRoundRect(levelBadge, 88, 34, 16, new Color(116, 72, 43, 245), 2.4);
    ui.topBar.addChild(levelBadge);

    const level = ui.makeLabel('Lv.1 农场', 14, new Color(88, 45, 24), true, 0, 0, 86, 24);
    level.name = 'LevelText';
    level.getComponent(UITransform)?.setContentSize(80, 24);
    level.getComponent(Label)!.fontSize = 14;
    levelBadge.addChild(level);

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
    g.circle(2, -3, 46);
    g.fill();
    g.fillColor = new Color(239, 205, 162, 255);
    g.circle(0, 0, 44);
    g.fill();
    g.strokeColor = new Color(255, 255, 255, 245);
    g.lineWidth = 3;
    g.circle(0, 0, 44);
    g.stroke();
}

export function createCurrencyArea(ui: any, x = 109, width = 126, height = 42) {
    const holder = new Node('CurrencyArea');
    holder.setPosition(x, 0);
    holder.addComponent(UITransform).setContentSize(width, height);
    ui.topBar.addChild(holder);

    ui.createCurrencyEntry(holder, 'gold', 'GoldDisplay', '200', 22, new Color(82, 42, 22), 52, 80);
    ui.createCurrencyEntry(holder, 'diamond', 'DiamondDisplay', '50', -22, new Color(82, 42, 22), 52, 80, 1);
    holder.setSiblingIndex(ui.topBar.children.length - 1);

}

export function createCurrencyEntry(ui: any, parent: Node, icon: string, labelName: string, value: string, y: number, color: Color, iconSize = 32, pillW = 96, iconOffsetY = 0) {
    const pillH = 34;
    const pill = new Node(`${icon}Pill`);
    pill.setPosition(0, y);
    fillRoundRect(pill, pillW, pillH, 15, new Color(235, 207, 159, 238));
    strokeRoundRect(pill, pillW, pillH, 15, new Color(205, 166, 115, 140), 1.4);
    parent.addChild(pill);

    const iconNode = new Node(`${icon}Icon`);
    iconNode.addComponent(UITransform).setContentSize(iconSize, iconSize);
    const iconCenterX = -pillW / 2 + 5;
    iconNode.setPosition(iconCenterX, iconOffsetY);
    pill.addChild(iconNode);
    ui.applyUiIcon(icon, iconNode);

    const label = ui.makeLabel(value, 18, color, true, 0, 0, pillW, 24);
    label.name = labelName;
    label.setPosition(8, 0);
    pill.addChild(label);

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

function createActionButtons(ui: any) {
    const vs = view.getVisibleSize();
    const y = -vs.height / 2 + 154;
    const actions: Array<{ name: string; icon: string; cb: () => void }> = [
        { name: '种植', icon: 'leaf', cb: () => ui.showPanel('shop') },
        { name: '合成', icon: 'gear', cb: () => ui.showPanel('craft') },
    ];

    actions.forEach((item, index) => {
        const btn = new Node(`Action_${item.name}`);
        btn.addComponent(UITransform).setContentSize(104, 48);
        btn.setPosition(index === 0 ? -56 : 56, y);
        fillRoundRect(btn, 104, 48, 14, new Color(255, 248, 218, 255));
        strokeRoundRect(btn, 104, 48, 14, new Color(126, 78, 48, 225), 2.2);

        const icon = new Node('Icon');
        icon.addComponent(UITransform).setContentSize(34, 34);
        icon.setPosition(-28, 2);
        ui.applyUiIcon(item.icon, icon);
        btn.addChild(icon);

        const label = ui.makeLabel(item.name, 22, new Color(88, 45, 24), true, 18, 0, 62, 30);
        btn.addChild(label);

        btn.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            tween(btn)
                .to(0.06, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'quadOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
            item.cb();
        });
        ui.node.addChild(btn);
    });
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
    nav.setPosition(0, -vs.height / 2 + 42);
    fillRoundRect(nav, Design.WIDTH + 18, 84, 18, new Color(232, 164, 88, 250));
    strokeRoundRect(nav, Design.WIDTH + 18, 84, 18, new Color(128, 78, 46, 220), 2.4);
    ui.node.addChild(nav);

    const buttons: Array<{ name: string; icon: string; panel: PanelName }> = [
        { name: '物品栏', icon: 'bag', panel: 'inventory' },
        { name: '设置', icon: 'settings', panel: 'shop' },
        { name: '任务', icon: 'quest', panel: 'task' },
        { name: '图鉴', icon: 'catalog', panel: 'quest' },
    ];

    buttons[1] = { name: '合成', icon: 'gear', panel: 'craft' };

    const slotW = Design.WIDTH / buttons.length;
    buttons.forEach((item, index) => {
        const btn = new Node(`Nav_${item.panel}`);
        const iconSize = item.panel === 'inventory' ? 49 : (item.panel === 'craft' ? 54 : 49);
        const iconY = item.panel === 'quest' ? 16 : 18;
        btn.addComponent(UITransform).setContentSize(76, 58);
        btn.setPosition(-Design.WIDTH / 2 + slotW * index + slotW / 2, 1);
        fillRoundRect(btn, 76, 58, 13, new Color(255, 247, 210, 255));
        strokeRoundRect(btn, 76, 58, 13, new Color(126, 78, 48, 225), 2.2);

        const icon = new Node('Icon');
        icon.addComponent(UITransform).setContentSize(iconSize, iconSize);
        icon.setPosition(0, iconY);
        ui.applyUiIcon(item.icon, icon);
        btn.addChild(icon);

        const label = ui.makeLabel(item.name, 14, new Color(88, 45, 24), true, 0, -12, 68, 26);
        label.name = 'Label';
        btn.addChild(label);

        const indicator = new Node('Indicator');
        indicator.setPosition(0, -27);
        indicator.active = false;
        fillRoundRect(indicator, 34, 5, 2, new Color(126, 78, 48, 180));
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

function createAdBanner(ui: any, vs: { width: number; height: number }) {
    const banner = new Node('AdBanner');
    banner.setPosition(0, -vs.height / 2 + 102);
    banner.addComponent(UITransform).setContentSize(324, 48);
    fillRoundRect(banner, 324, 48, 8, new Color(112, 84, 64, 218));
    strokeRoundRect(banner, 324, 48, 8, new Color(255, 255, 255, 230), 2);

    const warm = new Node('AdWarmth');
    warm.setPosition(-56, 0);
    fillRoundRect(warm, 176, 42, 8, new Color(248, 184, 92, 45));
    banner.addChild(warm);

    const title = ui.makeLabel('Banner\n320x50 px', 16, new Color(255, 255, 255), true, -116, 0, 74, 40);
    banner.addChild(title);

    const offer = ui.makeLabel('免费领取钻石?', 21, new Color(255, 255, 255), true, 32, 0, 160, 32);
    banner.addChild(offer);

    const countdown = ui.makeLabel('5s', 16, new Color(255, 255, 255), true, 120, 6, 38, 24);
    banner.addChild(countdown);

    const close = new Node('Close');
    close.setPosition(150, 12);
    fillRoundRect(close, 20, 20, 10, new Color(95, 66, 50, 210));
    close.addChild(ui.makeLabel('x', 16, new Color(255, 255, 255), true, 0, 0, 18, 18));
    banner.addChild(close);

    const note = ui.makeLabel('广告合规与用户体验', 9, new Color(255, 255, 255), false, 104, -15, 112, 14);
    banner.addChild(note);
    ui.node.addChild(banner);
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
    ui.panels.quest = ui.createPanel('图鉴', Design.WIDTH, 540);
    ui.panels.quest.setPosition(0, -35);
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
        closePanelWithAnimation(ui, panel);
    });
    panel.addChild(close);

    return panel;

}

function closePanelWithAnimation(ui: any, panel: Node) {
    const originalScale = panel.scale.clone();
    tween(panel)
        .to(0.08, { scale: new Vec3(originalScale.x * 1.025, originalScale.y * 1.025, 1) }, { easing: 'quadOut' })
        .to(0.16, { scale: new Vec3(0.86, 0.86, 1) }, { easing: 'quadIn' })
        .call(() => {
            panel.active = false;
            panel.setScale(originalScale);
            clearBottomNavState(ui);
        })
        .start();
}

function clearBottomNavState(ui: any) {
    const nav = ui.node.getChildByName('BottomNav');
    if (!nav) return;
    const panels: PanelName[] = ['inventory', 'craft', 'task', 'quest'];
    for (const panel of panels) {
        const btn = nav.getChildByName(`Nav_${panel}`);
        if (!btn) continue;
        fillRoundRect(btn, 76, 58, 13, new Color(255, 247, 210, 255));
        strokeRoundRect(btn, 76, 58, 13, new Color(126, 78, 48, 225), 2.2);
        const icon = btn.getChildByName('Icon');
        if (icon) {
            icon.setScale(new Vec3(1, 1, 1));
            icon.setPosition(0, 18);
        }
        const indicator = btn.getChildByName('Indicator');
        if (indicator) indicator.active = false;
    }
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
