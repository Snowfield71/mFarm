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

export function refreshLand(ui: any) {
    ui.layoutLandArea();
    ui.ensureLandCountForLevel();
    ui.landTiles.forEach(tile => tile.destroy());
    ui.landTiles = [];

    const blocks = LandSystem.getInstance().getAllBlocks();
    const totalSlots = Math.min(GameValues.MAX_LAND, ui.constructor.LAND_COLS * ui.constructor.LAND_ROWS);
    for (let index = 0; index < totalSlots; index++) {
        const block = blocks[index];
        const tile = block ? ui.createLandTile(block) : ui.createLockedTile(index);
        const pos = ui.getLandPosition(index);
        tile.setPosition(pos.x, pos.y);
        ui.landRoot.addChild(tile);
        ui.landTiles.push(tile);
    }
    updateHarvestAllButton(ui);

}

export function refreshLandBlock(ui: any, blockId: number) {
    const index = ui.landTiles.findIndex(tile => tile.name === `Land_${blockId}`);
    const block = LandSystem.getInstance().getBlock(blockId);
    if (index < 0 || !block) return;

    const oldTile = ui.landTiles[index];
    const newTile = ui.createLandTile(block);
    newTile.setPosition(oldTile.position);
    oldTile.removeFromParent();
    oldTile.destroy();
    ui.landRoot.addChild(newTile);
    newTile.setSiblingIndex(index);
    ui.landTiles[index] = newTile;
    if (ui.activeBubbleLandId === blockId) showSelectedLand(ui, blockId);
    updateHarvestAllButton(ui);

}

export function animateUnlockLand(ui: any, index: number) {
    const block = LandSystem.getInstance().getBlock(index);
    const oldTile = ui.landTiles[index];
    if (!block || !oldTile) {
        ui.refreshLand();
        return;
    }

    const newTile = ui.createLandTile(block);
    newTile.setPosition(oldTile.position);
    newTile.scale = new Vec3(0, 1, 1);
    oldTile.addComponent(Button).interactable = false;
    ui.landRoot.addChild(newTile);
    newTile.setSiblingIndex(index + 1);

    tween(oldTile)
        .to(0.16, { scale: new Vec3(0, 1, 1) }, { easing: 'quadIn' })
        .call(() => {
            oldTile.removeFromParent();
            oldTile.destroy();
            ui.landTiles[index] = newTile;
        })
        .start();

    tween(newTile)
        .delay(0.12)
        .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();

}

export function updateGrowingProgress(ui: any, blockId: number, progress: number) {
    const tile = ui.landTiles.find(tile => tile.name === `Land_${blockId}`);
    const water = tile?.getChildByName('WaterProgress');
    if (!tile || !water) {
        ui.refreshLandBlock(blockId);
        return;
    }
    ui.drawWaterProgress(water, progress);

}

export function createLandTile(ui: any, block: LandBlock): Node {
    const tile = new Node(`Land_${block.id}`);
    tile.addComponent(UITransform).setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);

    const stateColor: Record<string, Color> = {
        empty: new Color(143, 117, 78, 235),
        growing: new Color(143, 117, 78, 235),
        harvesting: new Color(235, 188, 70, 245),
        occupied: new Color(130, 115, 95, 235),
    };
    ui.drawTileBase(tile, stateColor[block.state] || stateColor.empty);

    if ((block.state === 'growing' || block.state === 'harvesting') && block.cropType) {
        drawCropSoilBed(tile, block.state === 'harvesting');
        const cropIcon = ui.createItemIcon(block.cropType, block.state === 'harvesting' ? 52 : 46);
        cropIcon.name = 'CropIcon';
        cropIcon.setPosition(0, block.state === 'harvesting' ? 7 : 4);
        tile.addChild(cropIcon);
        if (block.state === 'growing') {
            const water = ui.createWaterProgress(block.progress);
            tile.addChild(water);
            cropIcon.setSiblingIndex(tile.children.length - 1);
        }
    } else if (block.state === 'occupied') {
        ui.drawOccupiedMarker(tile);
    }

    if (block.state === 'harvesting') {
        const ring = new Node('HarvestRing');
        ring.setPosition(0, 2);
        const g = ring.addComponent(Graphics);
        g.strokeColor = new Color(255, 244, 138, 220);
        g.lineWidth = 3;
        g.roundRect(-31, -31, 62, 62, 8);
        g.stroke();
        tile.addChild(ring);
    }

    tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.handleLandClick(block.id));
    return tile;

}

function showSelectedLand(ui: any, blockId: number) {
    clearSelectedLand(ui);
    const tile = ui.landTiles.find(tile => tile.name === `Land_${blockId}`);
    if (!tile) return;

    const border = new Node('SelectedBorder');
    border.setPosition(0, 3);
    border.setScale(new Vec3(0.94, 0.94, 1));
    const g = border.addComponent(Graphics);
    g.strokeColor = new Color(255, 246, 158, 245);
    g.lineWidth = 3.5;
    g.roundRect(-34, -34, 68, 68, 10);
    g.stroke();
    g.strokeColor = new Color(72, 188, 92, 185);
    g.lineWidth = 1.5;
    g.roundRect(-29, -29, 58, 58, 8);
    g.stroke();
    tile.addChild(border);
    tween(border)
        .repeatForever(
            tween()
                .to(0.55, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'quadInOut' })
                .to(0.55, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'quadInOut' }),
        )
        .start();
}

function clearSelectedLand(ui: any) {
    for (const tile of ui.landTiles) {
        const border = tile.getChildByName('SelectedBorder');
        if (border) border.destroy();
    }
}

function drawCropSoilBed(tile: Node, mature = false) {
    const bed = new Node('CropSoilBed');
    bed.setPosition(0, -17);
    const g = bed.addComponent(Graphics);
    g.fillColor = mature ? new Color(102, 70, 42, 185) : new Color(94, 66, 42, 165);
    g.roundRect(-17, -4, 34, 9, 5);
    g.fill();
    g.fillColor = new Color(145, 105, 66, 105);
    g.roundRect(-11, -1, 22, 4, 3);
    g.fill();
    g.fillColor = new Color(80, 55, 36, 80);
    g.circle(-8, 0, 1.0);
    g.circle(7, 1, 0.9);
    g.circle(1, -2, 0.8);
    g.fill();
    tile.addChild(bed);
}

export function createLockedTile(ui: any, index: number): Node {
    const tile = new Node(`Locked_${index}`);
    tile.addComponent(UITransform).setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);
    ui.drawTileBase(tile, new Color(92, 145, 80, 225), true);

    tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.handleLockedLandClick(index));
    return tile;

}

export function drawTileBase(ui: any, tile: Node, color: Color, locked = false) {
    const shadow = new Node('Shadow');
    shadow.setPosition(3, -3);
    fillRoundRect(shadow, ui.constructor.TILE_SIZE - 2, ui.constructor.TILE_SIZE - 2, 9, new Color(44, 40, 28, 75));
    tile.addChild(shadow);

    const base = new Node('Base');
    base.setPosition(0, 1);
    fillRoundRect(base, ui.constructor.TILE_SIZE - 2, ui.constructor.TILE_SIZE - 2, 9, new Color(Math.max(color.r - 42, 0), Math.max(color.g - 42, 0), Math.max(color.b - 32, 0), color.a));
    tile.addChild(base);

    const face = new Node('Face');
    face.setPosition(0, 3);
    fillRoundRect(face, ui.constructor.TILE_SIZE - 7, ui.constructor.TILE_SIZE - 7, 7, color);
    strokeRoundRect(face, ui.constructor.TILE_SIZE - 7, ui.constructor.TILE_SIZE - 7, 7, locked ? new Color(92, 168, 76, 120) : new Color(104, 81, 50, 120), 1.5);
    tile.addChild(face);

    const detail = new Node('Detail');
    detail.setPosition(0, 3);
    const g = detail.addComponent(Graphics);
    g.fillColor = locked ? new Color(66, 156, 58, 105) : new Color(82, 64, 39, 100);
    for (let i = 0; i < 14; i++) {
        const px = (ui.rng(Number(tile.name.replace(/\D/g, '')) || 1, i * 3) - 0.5) * 48;
        const py = (ui.rng(Number(tile.name.replace(/\D/g, '')) || 1, i * 3 + 1) - 0.5) * 48;
        g.circle(px, py, 1.3 + ui.rng(i + 1, i + 7) * 2.2);
        g.fill();
    }
    tile.addChild(detail);

}

export function drawOccupiedMarker(ui: any, tile: Node) {
    const marker = new Node('OccupiedMarker');
    marker.setPosition(0, 2);
    const g = marker.addComponent(Graphics);
    g.fillColor = new Color(112, 94, 72, 210);
    g.roundRect(-16, -10, 32, 22, 4);
    g.fill();
    g.fillColor = new Color(154, 124, 82, 235);
    g.moveTo(-19, 1);
    g.lineTo(0, 17);
    g.lineTo(19, 1);
    g.close();
    g.fill();
    g.fillColor = new Color(82, 64, 48, 230);
    g.roundRect(-4, -10, 8, 12, 2);
    g.fill();
    tile.addChild(marker);

}

export function createWaterProgress(ui: any, progress: number): Node {
    const node = new Node('WaterProgress');
    node.addComponent(UITransform).setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);
    node.setPosition(0, 3);
    ui.drawWaterProgress(node, progress);
    return node;

}

export function drawWaterProgress(ui: any, node: Node, progress: number) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.clear();
    (g as any).lineCap = 'butt';
    (g as any).lineJoin = 'round';
    const pct = Math.max(0, Math.min(100, progress)) / 100;
    const radius = 29;
    const now = Date.now() / 1000;

    g.strokeColor = new Color(75, 152, 183, 38);
    g.lineWidth = 6;
    drawSoftArc(g, radius, 0, Math.PI * 2, false, 72);
    g.stroke();

    g.strokeColor = new Color(224, 252, 248, 48);
    g.lineWidth = 2;
    drawSoftArc(g, radius - 5, -0.1, Math.PI * 1.72, false, 42);
    g.stroke();

    if (pct <= 0) return;
    const start = Math.PI / 2;
    const end = start - Math.PI * 2 * pct;
    g.strokeColor = new Color(72, 184, 224, 190);
    g.lineWidth = 5.5;
    drawSoftArc(g, radius, start, end, true, 62);
    g.stroke();

    g.strokeColor = new Color(210, 250, 250, 168);
    g.lineWidth = 2.2;
    drawSoftArc(g, radius - 1.5, start - 0.025, end + 0.025, true, 62);
    g.stroke();

    const particleCount = Math.min(8, Math.max(3, Math.floor(pct * 8)));
    for (let i = 0; i < particleCount; i++) {
        const t = (i + 0.45) / (particleCount + 0.65);
        const angle = start - Math.PI * 2 * pct * t;
        const drift = Math.sin(now * 2.1 + i * 1.3) * 1.8;
        const pr = radius + (i % 2 === 0 ? 4.5 : -5.5) + drift;
        g.fillColor = i % 2 === 0 ? new Color(128, 220, 238, 138) : new Color(228, 254, 246, 132);
        g.ellipse(Math.cos(angle) * pr - 1.2, Math.sin(angle) * pr - 1, 2.4 + (i % 3) * 0.5, 3.2 + (i % 2) * 0.4);
        g.fill();
    }

    const leafCount = Math.min(5, Math.max(1, Math.floor(pct * 6)));
    g.fillColor = new Color(136, 224, 152, 120);
    for (let i = 0; i < leafCount; i++) {
        const angle = start - Math.PI * 2 * pct * ((i + 0.72) / (leafCount + 1));
        const lx = Math.cos(angle) * (radius - 8);
        const ly = Math.sin(angle) * (radius - 8);
        const rotate = angle + Math.PI * 0.5;
        g.ellipse(lx - Math.cos(rotate) * 2, ly - Math.sin(rotate) * 2, 7, 3.6);
        g.fill();
    }

    const sparkleCount = Math.min(3, Math.max(1, Math.floor(pct * 4)));
    g.fillColor = new Color(255, 255, 238, 150);
    for (let i = 0; i < sparkleCount; i++) {
        const angle = start - Math.PI * 2 * pct * ((i + 0.5) / (sparkleCount + 0.9)) + Math.sin(now + i) * 0.05;
        drawTinyStar(g, Math.cos(angle) * (radius + 1), Math.sin(angle) * (radius + 1), 2.1 + i * 0.25);
    }

}

function drawSoftArc(g: Graphics, radius: number, start: number, end: number, counterclockwise: boolean, segments: number) {
    const span = counterclockwise ? start - end : end - start;
    const total = Math.abs(span);
    const count = Math.max(6, Math.ceil(segments * total / (Math.PI * 2)));
    for (let i = 0; i <= count; i++) {
        const t = i / count;
        const angle = counterclockwise ? start - total * t : start + total * t;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
}

function drawTinyStar(g: Graphics, x: number, y: number, size: number) {
    g.moveTo(x, y + size);
    g.lineTo(x + size * 0.35, y + size * 0.35);
    g.lineTo(x + size, y);
    g.lineTo(x + size * 0.35, y - size * 0.35);
    g.lineTo(x, y - size);
    g.lineTo(x - size * 0.35, y - size * 0.35);
    g.lineTo(x - size, y);
    g.lineTo(x - size * 0.35, y + size * 0.35);
    g.close();
    g.fill();
}

export function updateHarvestAllButton(ui: any) {
    const button = ui.node.getChildByName('HarvestAllButton');
    if (!button) return;
    const count = LandSystem.getInstance().getAllBlocks().filter(block => block.state === 'harvesting').length;
    if (count <= 0) {
        if (button.active) {
            tween(button)
                .to(0.12, { scale: new Vec3(0.82, 0.82, 1) }, { easing: 'quadIn' })
                .call(() => {
                    button.active = false;
                    button.scale = new Vec3(1, 1, 1);
                })
                .start();
        }
        return;
    }
    if (!button.active) {
        button.active = true;
        button.scale = new Vec3(0.72, 0.72, 1);
        tween(button).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }
}

export function animatePlanting(ui: any, blockId: number) {
    const tile = ui.landTiles.find(tile => tile.name === `Land_${blockId}`);
    if (!tile) return;
    showSelectedLand(ui, blockId);
    ui.scheduleOnce(() => {
        if (ui.activeBubbleLandId !== blockId) clearSelectedLand(ui);
    }, 0.65);

    const face = tile.getChildByName('Face');
    if (face) {
        tween(face)
            .to(0.08, { scale: new Vec3(1.04, 0.96, 1) }, { easing: 'quadOut' })
            .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    const furrow = new Node('PlantFurrow');
    furrow.setPosition(0, -10);
    furrow.setScale(new Vec3(0.25, 0.65, 1));
    const fg = furrow.addComponent(Graphics);
    fg.fillColor = new Color(86, 60, 38, 148);
    fg.roundRect(-20, -4, 40, 8, 5);
    fg.fill();
    tile.addChild(furrow);
    tween(furrow)
        .to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
        .delay(0.2)
        .to(0.18, { scale: new Vec3(0.82, 0.55, 1) }, { easing: 'quadIn' })
        .call(() => furrow.destroy())
        .start();

    const seed = new Node('PlantSeed');
    seed.setPosition(-2, 22);
    const sg = seed.addComponent(Graphics);
    sg.fillColor = new Color(244, 202, 96, 235);
    sg.ellipse(-3, -4, 6, 9);
    sg.fill();
    tile.addChild(seed);
    tween(seed)
        .to(0.18, { position: new Vec3(0, -8, 0), scale: new Vec3(0.72, 0.72, 1) }, { easing: 'quadIn' })
        .call(() => seed.destroy())
        .start();

    const cropIcon = tile.getChildByName('CropIcon');
    if (cropIcon) {
        cropIcon.active = false;
        cropIcon.setScale(new Vec3(0.12, 0.12, 1));
        cropIcon.setPosition(0, -15);
        tween(cropIcon)
            .delay(0.18)
            .call(() => { cropIcon.active = true; })
            .to(0.22, { position: new Vec3(0, 3, 0), scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' })
            .to(0.1, { position: new Vec3(0, 1, 0), scale: new Vec3(0.96, 0.96, 1) }, { easing: 'quadOut' })
            .to(0.12, { position: new Vec3(0, 4, 0), scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    const cover = tile.getChildByName('CropSoilBed');
    if (cover) {
        cover.setScale(new Vec3(0.78, 0.78, 1));
        tween(cover)
            .to(0.16, { scale: new Vec3(1.18, 1.08, 1) }, { easing: 'quadOut' })
            .to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    const sprout = new Node('SproutFlash');
    sprout.setPosition(0, -5);
    sprout.setScale(new Vec3(0.55, 0.55, 1));
    const sg2 = sprout.addComponent(Graphics);
    sg2.strokeColor = new Color(150, 235, 112, 195);
    sg2.lineWidth = 3;
    sg2.moveTo(0, -5);
    sg2.lineTo(0, 10);
    sg2.stroke();
    sg2.fillColor = new Color(136, 224, 92, 190);
    sg2.ellipse(-10, 2, 11, 6);
    sg2.ellipse(0, 3, 11, 6);
    sg2.fill();
    tile.addChild(sprout);
    tween(sprout)
        .delay(0.18)
        .to(0.18, { scale: new Vec3(1, 1, 1), position: new Vec3(0, 0, 0) }, { easing: 'backOut' })
        .to(0.18, { scale: new Vec3(0.7, 0.7, 1) }, { easing: 'quadIn' })
        .call(() => sprout.destroy())
        .start();

    const mist = new Node('PlantMist');
    mist.setPosition(0, 4);
    const mg = mist.addComponent(Graphics);
    mg.strokeColor = new Color(174, 235, 255, 96);
    mg.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const x = -14 + i * 9;
        mg.moveTo(x, -2);
        mg.bezierCurveTo(x - 3, 7, x + 4, 12, x, 21);
        mg.stroke();
    }
    tile.addChild(mist);
    tween(mist)
        .delay(0.2)
        .to(0.34, { position: new Vec3(0, 14, 0), scale: new Vec3(1.08, 1.08, 1) }, { easing: 'quadOut' })
        .call(() => mist.destroy())
        .start();

    const soilRipple = new Node('SoilRipple');
    soilRipple.setPosition(0, -2);
    soilRipple.setScale(new Vec3(0.72, 0.72, 1));
    const rg = soilRipple.addComponent(Graphics);
    rg.strokeColor = new Color(114, 96, 62, 95);
    rg.lineWidth = 3;
    rg.roundRect(-23, -12, 46, 24, 12);
    rg.stroke();
    tile.addChild(soilRipple);
    tween(soilRipple)
        .to(0.24, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
        .call(() => soilRipple.destroy())
        .start();

    for (let i = 0; i < 8; i++) {
        const clod = new Node(`PlantSoilClod_${i}`);
        clod.setPosition(0, -13);
        const cg = clod.addComponent(Graphics);
        cg.fillColor = i % 2 === 0 ? new Color(112, 76, 45, 190) : new Color(147, 102, 60, 165);
        cg.circle(0, 0, 1.4 + (i % 3) * 0.4);
        cg.fill();
        tile.addChild(clod);
        const angle = Math.PI * 0.12 + (Math.PI * 0.76 * i) / 7;
        const distance = 12 + (i % 4) * 4;
        tween(clod)
            .delay(i * 0.012)
            .to(0.24, {
                position: new Vec3(Math.cos(angle) * distance, -10 + Math.sin(angle) * distance, 0),
                scale: new Vec3(0.35, 0.35, 1),
            }, { easing: 'quadOut' })
            .call(() => clod.destroy())
            .start();
    }

    const water = tile.getChildByName('WaterProgress');
    if (water) {
        water.setScale(new Vec3(0.86, 0.86, 1));
        tween(water)
            .to(0.24, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

}

export function animateHarvest(ui: any, blockId: number, cropId: string, count: number, onComplete?: () => void) {
    const tile = ui.landTiles.find(tile => tile.name === `Land_${blockId}`);
    if (!tile) {
        onComplete?.();
        return;
    }

    const button = tile.getComponent(Button);
    if (button) button.interactable = false;

    const cropIcon = tile.getChildByName('CropIcon');
    if (cropIcon) {
        tween(cropIcon)
            .to(0.1, { position: new Vec3(0, 14, 0), scale: new Vec3(1.18, 1.18, 1) }, { easing: 'quadOut' })
            .to(0.18, { position: new Vec3(0, 34, 0), scale: new Vec3(0.72, 0.72, 1) }, { easing: 'quadIn' })
            .call(() => { if (cropIcon.isValid) cropIcon.active = false; })
            .start();
    }

    const rewardIcon = ui.createItemIcon(cropId, 30);
    rewardIcon.name = 'HarvestRewardIcon';
    rewardIcon.setPosition(-12, 12);
    rewardIcon.setScale(new Vec3(0.55, 0.55, 1));
    tile.addChild(rewardIcon);
    tween(rewardIcon)
        .to(0.14, { position: new Vec3(-16, 30, 0), scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .to(0.26, { position: new Vec3(-22, 46, 0), scale: new Vec3(0.88, 0.88, 1) }, { easing: 'quadOut' })
        .call(() => rewardIcon.destroy())
        .start();

    const amount = ui.makeLabel(`+${count}`, 16, new Color(255, 246, 168), true, 18, 26, 44, 24);
    amount.name = 'HarvestAmount';
    tile.addChild(amount);
    tween(amount)
        .to(0.14, { position: new Vec3(18, 40, 0), scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' })
        .to(0.28, { position: new Vec3(18, 58, 0), scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadOut' })
        .call(() => amount.destroy())
        .start();

    const shine = new Node('HarvestShine');
    shine.setPosition(0, 4);
    shine.setScale(new Vec3(0.62, 0.62, 1));
    const sg = shine.addComponent(Graphics);
    sg.strokeColor = new Color(255, 238, 120, 220);
    sg.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const inner = 14;
        const outer = 28 + (i % 2) * 5;
        sg.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        sg.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    sg.stroke();
    tile.addChild(shine);
    tween(shine)
        .to(0.34, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'quadOut' })
        .call(() => shine.destroy())
        .start();

    for (let i = 0; i < 10; i++) {
        const particle = new Node(`HarvestParticle_${i}`);
        particle.setPosition(0, 8);
        particle.setScale(new Vec3(0.8, 0.8, 1));
        const pg = particle.addComponent(Graphics);
        pg.fillColor = i % 2 === 0 ? new Color(255, 230, 92, 210) : new Color(126, 216, 92, 190);
        pg.circle(0, 0, 1.7 + (i % 3) * 0.45);
        pg.fill();
        tile.addChild(particle);

        const angle = -Math.PI * 0.1 - (Math.PI * 0.8 * i) / 9;
        const distance = 22 + (i % 4) * 7;
        const target = new Vec3(Math.cos(angle) * distance, 12 + Math.sin(angle) * distance, 0);
        tween(particle)
            .delay(i * 0.015)
            .to(0.28, { position: target, scale: new Vec3(0.25, 0.25, 1) }, { easing: 'quadOut' })
            .call(() => particle.destroy())
            .start();
    }

    const face = tile.getChildByName('Face');
    if (face) {
        tween(face)
            .to(0.08, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
            .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: 'quadIn' })
            .start();
    }

    tween(tile)
        .delay(0.46)
        .call(() => onComplete?.())
        .start();
}

export function getLandPosition(ui: any, index: number): { x: number; y: number } {
    const col = index % ui.constructor.LAND_COLS;
    const row = Math.floor(index / ui.constructor.LAND_COLS);
    const totalW = ui.constructor.LAND_COLS * ui.constructor.TILE_SIZE + (ui.constructor.LAND_COLS - 1) * ui.constructor.TILE_GAP;
    const totalH = ui.constructor.LAND_ROWS * ui.constructor.TILE_SIZE + (ui.constructor.LAND_ROWS - 1) * ui.constructor.TILE_GAP;
    return {
        x: -totalW / 2 + col * (ui.constructor.TILE_SIZE + ui.constructor.TILE_GAP) + ui.constructor.TILE_SIZE / 2,
        y: totalH / 2 - row * (ui.constructor.TILE_SIZE + ui.constructor.TILE_GAP) - ui.constructor.TILE_SIZE / 2,
    };
}

export function ensureLandCountForLevel(ui: any) {
    const land = LandSystem.getInstance();
    const target = ui.getAutoUnlockedLandCount();
    if (land.getAllBlocks().length < target) land.expandBlocks(target);

}

export function getAutoUnlockedLandCount(ui: any): number {
    const gm = GameManager.getInstance();
    let count = GameValues.INITIAL_LAND;
    const levels = Object.keys(GameValues.LAND_UNLOCK).map(Number).sort((a, b) => a - b);
    for (const lv of levels) {
        if (gm.playerLevel >= lv) count += GameValues.LAND_UNLOCK[lv];
    }
    return Math.min(count, GameValues.MAX_LAND);

}

export function getNextLandUnlockLevel(ui: any, index: number): number {
    const levels = Object.keys(GameValues.LAND_UNLOCK).map(Number).sort((a, b) => a - b);
    let count = GameValues.INITIAL_LAND;
    for (const lv of levels) {
        count += GameValues.LAND_UNLOCK[lv];
        if (index < count) return lv;
    }
    return 99;

}

export function handleLandClick(ui: any, blockId: number) {
    const land = LandSystem.getInstance();
    const block = land.getBlock(blockId);
    if (!block) return;

    if (block.state === 'empty') {
        if (ui.selectedSeedId) {
            ui.plantCrop(blockId, ui.selectedSeedId);
        } else {
            ui.openSeedBubble(blockId);
        }
        return;
    }

    if (block.state === 'growing') {
        ui.showDialog(
            '作物生长中',
            `当前进度 ${Math.floor(block.progress)}%\n消耗 ${GameValues.SPEEDUP_DIAMOND} 钻石立即成熟`,
            [
                { text: '取消', cb: () => {} },
                { text: '加速', cb: () => {
                    const gm = GameManager.getInstance();
                    if (!gm.spendDiamond(GameValues.SPEEDUP_DIAMOND)) {
                        ui.toast('钻石不足');
                        return;
                    }
                    land.speedUpCrop(blockId);
                    ui.refreshTopBar();
                    ui.refreshLandBlock(blockId);
                    ui.toast('加速成功');
                }},
            ],
        );
        return;
    }

    if (block.state === 'harvesting') {
        const cropId = land.harvestCrop(blockId);
        if (!cropId) return;
        const def = getItem(cropId);
        const count = def?.harvestCount ?? 1;
        InventorySystem.getInstance().addItem(cropId, count);
        GameManager.getInstance().addExperience(5);
        ui.refreshTopBar();
        animateHarvest(ui, blockId, cropId, count, () => {
            ui.refreshLandBlock(blockId);
            ui.toast(`收获 ${ui.itemName(cropId)} x${count}`);
        });
        updateHarvestAllButton(ui);
        if (ui.panels.inventory?.active) ui.renderInventoryPanel();
        return;
    }

    ui.toast('这块田地暂时被占用');

}

export function harvestAllMatureCrops(ui: any) {
    const land = LandSystem.getInstance();
    const ready = land.getAllBlocks()
        .filter(block => block.state === 'harvesting' && block.cropType)
        .map(block => ({
            blockId: block.id,
            cropId: block.cropType as string,
            count: getItem(block.cropType as string)?.harvestCount ?? 1,
        }));

    if (ready.length === 0) {
        ui.toast('没有成熟作物');
        updateHarvestAllButton(ui);
        return;
    }

    let harvestedKinds = 0;
    let totalCount = 0;
    let remainingAnimations = ready.length;

    for (const item of ready) {
        const cropId = land.harvestCrop(item.blockId);
        if (!cropId) {
            remainingAnimations--;
            continue;
        }
        harvestedKinds++;
        totalCount += item.count;
        InventorySystem.getInstance().addItem(cropId, item.count);
        GameManager.getInstance().addExperience(5);
        animateHarvest(ui, item.blockId, cropId, item.count, () => {
            ui.refreshLandBlock(item.blockId);
            remainingAnimations--;
            if (remainingAnimations <= 0) {
                ui.toast(`一键收取 ${harvestedKinds} 块 x${totalCount}`);
            }
        });
    }

    ui.refreshTopBar();
    updateHarvestAllButton(ui);
    if (ui.panels.inventory?.active) ui.renderInventoryPanel();
    if (ui.panels.quest?.active) ui.renderQuestPanel();
    if (ui.panels.task?.active) ui.renderTaskPanel();
}

export function handleLockedLandClick(ui: any, index: number) {
    const land = LandSystem.getInstance();
    const gm = GameManager.getInstance();
    const currentCount = land.getAllBlocks().length;
    const unlockIndex = currentCount;
    const maxVisibleLand = Math.min(GameValues.MAX_LAND, ui.constructor.LAND_COLS * ui.constructor.LAND_ROWS);

    if (unlockIndex >= maxVisibleLand) {
        ui.toast('田地已全部解锁');
        return;
    }

    const needLevel = ui.getNextLandUnlockLevel(unlockIndex);
    if (gm.playerLevel >= needLevel) {
        ui.suppressNextLandExpandedRefresh = true;
        land.expandBlocks(unlockIndex + 1);
        ui.toast('新田地解锁');
        ui.animateUnlockLand(unlockIndex);
        return;
    }

    ui.showDialog(
        '扩建田地',
        `Lv.${needLevel} 自动解锁\n也可消耗 ${ui.constructor.LAND_UNLOCK_DIAMOND} 钻石提前扩建`,
        [
            { text: '稍后', cb: () => {} },
            { text: '扩建', cb: () => {
                if (!gm.spendDiamond(ui.constructor.LAND_UNLOCK_DIAMOND)) {
                    ui.toast('钻石不足');
                    return;
                }
                ui.suppressNextLandExpandedRefresh = true;
                land.expandBlocks(unlockIndex + 1);
                ui.refreshTopBar();
                ui.animateUnlockLand(unlockIndex);
                ui.toast('扩建成功');
            }},
        ],
    );

}

export function plantCrop(ui: any, blockId: number, cropId: string) {
    const inv = InventorySystem.getInstance();
    if (!inv.hasItems(cropId, 1)) {
        ui.selectedSeedId = null;
        ui.toast('种子不足');
        return;
    }
    if (!LandSystem.getInstance().plantCrop(blockId, cropId)) {
        ui.toast('这块田不能种植');
        return;
    }
    inv.removeItem(cropId, 1);
    ui.selectedSeedId = null;
    ui.closeSeedBubble();
    ui.toast('种植成功');
    ui.refreshLandBlock(blockId);
    ui.animatePlanting(blockId);
    if (ui.panels.inventory?.active) ui.renderInventoryPanel();

}

export function ownedPlantableCrops(ui: any): ItemDef[] {
    const gm = GameManager.getInstance();
    const inv = InventorySystem.getInstance();
    return getPlantableCrops().filter(c => c.unlockLevel <= gm.playerLevel && inv.hasItems(c.id, 1));

}

export function openSeedBubble(ui: any, blockId: number) {
    const crops = ui.ownedPlantableCrops();
    if (crops.length === 0) {
        ui.toast('没有种子，去商店购买');
        ui.showPanel('shop');
        return;
    }

    ui.closeSeedBubble();
    ui.activeBubbleLandId = blockId;
    showSelectedLand(ui, blockId);

    const mask = new Node('BubbleMask');
    mask.addComponent(UITransform).setContentSize(Design.WIDTH, view.getVisibleSize().height);
    fillRect(mask, Design.WIDTH, view.getVisibleSize().height, new Color(0, 0, 0, 0));
    mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.scheduleOnce(() => ui.closeSeedBubble(), 0));
    ui.bubbleRoot.addChild(mask);

    const itemSize = 54;
    const cols = Math.min(3, crops.length);
    const rows = Math.ceil(crops.length / cols);
    const gap = 6;
    const w = cols * itemSize + (cols - 1) * gap + 18;
    const h = rows * itemSize + (rows - 1) * gap + 20;
    const landPos = ui.getLandPosition(blockId);

    const bubble = new Node('SeedBubble');
    bubble.addComponent(UITransform).setContentSize(w, h);
    bubble.setPosition(Design.WIDTH / 2 - w / 2 - 12, ui.landRoot.position.y + landPos.y * ui.landRoot.scale.y);
    fillRoundRect(bubble, w, h, 12, new Color(255, 250, 231, 250));
    strokeRoundRect(bubble, w, h, 12, new Color(118, 184, 96, 170), 2);
    bubble.on(Node.EventType.TOUCH_END, (event: any) => event?.stopPropagation?.());
    ui.bubbleRoot.addChild(bubble);

    const startX = -w / 2 + itemSize / 2 + 9;
    const startY = h / 2 - itemSize / 2 - 10;
    crops.forEach((crop, index) => {
        const cell = new Node(`Seed_${crop.id}`);
        cell.addComponent(UITransform).setContentSize(itemSize, itemSize);
        cell.setPosition(startX + (index % cols) * (itemSize + gap), startY - Math.floor(index / cols) * (itemSize + gap));
        fillRoundRect(cell, itemSize, itemSize, 10, new Color(236, 247, 226, 245));
        strokeRoundRect(cell, itemSize, itemSize, 10, new Color(140, 200, 120, 120), 1);

        const icon = ui.createItemIcon(crop.id, 38);
        icon.setPosition(0, 6);
        cell.addChild(icon);
        cell.addChild(ui.makeLabel(ui.itemName(crop.id), 9, new Color(50, 78, 44), false, 0, -20, itemSize - 4, 12));

        cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            const target = ui.activeBubbleLandId;
            ui.scheduleOnce(() => {
                if (target >= 0) ui.plantCrop(target, crop.id);
            }, 0);
        });
        bubble.addChild(cell);
    });

    bubble.scale = new Vec3(0.7, 0.7, 1);
    tween(bubble).to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

}

export function closeSeedBubble(ui: any) {
    ui.bubbleRoot.removeAllChildren();
    ui.activeBubbleLandId = -1;
    clearSelectedLand(ui);

}
