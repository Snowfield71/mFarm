import { Button, Color, EditBox, Graphics, Label, Mask, Node, ScrollView, UITransform, Vec3, tween, view } from 'cc';
import { Design, GameValues } from '../../config/GameConfig';
import { GameManager } from '../../core/GameManager';
import { EventManager } from '../../core/EventManager';
import { InventorySystem } from '../../systems/InventorySystem';
import { LandBlock, LandSystem } from '../../systems/LandSystem';
import { CraftSystem } from '../../systems/CraftSystem';
import { LevelSystem } from '../../systems/LevelSystem';
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
    refreshPasture(ui);

}

export function refreshPasture(ui: any) {
    if (!ui.pastureRoot) return;
    ui.pastureTiles.forEach((tile: Node) => tile.destroy());
    ui.pastureTiles = [];
    for (const slot of LandSystem.getInstance().getBuildingSlots()) {
        const tile = createPastureTile(ui, slot);
        const pos = getPasturePosition(ui, slot.id);
        tile.setPosition(pos.x, pos.y);
        ui.pastureRoot.addChild(tile);
        ui.pastureTiles.push(tile);
    }
    if (ui.activePastureSlotId >= 0) showSelectedPasture(ui, ui.activePastureSlotId);
    updatePastureCollectAllButton(ui);
}

export function refreshPastureSlot(ui: any, slotId: number) {
    const index = ui.pastureTiles.findIndex((tile: Node) => tile.name === `Pasture_${slotId}`);
    const slot = LandSystem.getInstance().getBuildingSlot(slotId);
    if (index < 0 || !slot) return;
    const oldTile = ui.pastureTiles[index];
    const newTile = createPastureTile(ui, slot);
    newTile.setPosition(oldTile.position);
    oldTile.removeFromParent();
    oldTile.destroy();
    ui.pastureRoot.addChild(newTile);
    newTile.setSiblingIndex(index);
    ui.pastureTiles[index] = newTile;
    if (ui.activePastureSlotId === slotId) showSelectedPasture(ui, slotId);
    updatePastureCollectAllButton(ui);
}

export function createPastureTile(ui: any, slot: LandBlock): Node {
    const tile = new Node(`Pasture_${slot.id}`);
    tile.addComponent(UITransform).setContentSize(82, 82);
    const pad = new Node('BuildingPad');
    pad.addComponent(UITransform).setContentSize(96, 96);
    ui.applyUiIcon('buildingPad', pad);
    tile.addChild(pad);
    const unlocked = LandSystem.getInstance().isPastureSlotUnlocked(slot.id);
    if (!unlocked) {
        const shade = new Node('PastureLockedShade');
        fillRoundRect(shade, 78, 78, 14, new Color(76, 70, 56, 70));
        tile.addChild(shade);
        const billboard = createPastureExpansionBillboard(ui);
        billboard.setScale(new Vec3(0.68, 0.68, 1));
        billboard.setPosition(0, 1);
        tile.addChild(billboard);
    } else if (slot.state === 'occupied') {
        drawOccupiedMarker(ui, tile, slot);
    }
    tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        handlePastureClick(ui, slot.id);
    });
    return tile;
}

export function getPasturePosition(_ui: any, index: number): { x: number; y: number } {
    const cols = 3;
    const stepX = 92;
    const stepY = 96;
    return {
        x: (index % cols - 1) * stepX,
        y: (1.5 - Math.floor(index / cols)) * stepY,
    };
}

export function handlePastureClick(ui: any, slotId: number) {
    const slot = LandSystem.getInstance().getBuildingSlot(slotId);
    if (!slot) return;
    if (!LandSystem.getInstance().isPastureSlotUnlocked(slotId)) {
        closeBuildingBubble(ui);
        handleLockedPastureClick(ui, slotId);
        return;
    }
    if (slot.state === 'empty') {
        if (ui.activePastureSlotId === slotId) {
            closeBuildingBubble(ui);
            return;
        }
        if (ui.activePastureSlotId >= 0 && ui.bubbleRoot.getChildByName('BuildingBubble')) {
            ui.activePastureSlotId = slotId;
            showSelectedPasture(ui, slotId);
            return;
        }
        openBuildingBubble(ui, slotId);
        return;
    }
    closeBuildingBubble(ui);
    ui.handleOccupiedBuilding(slotId);
}

function handleLockedPastureClick(ui: any, slotId: number) {
    const land = LandSystem.getInstance();
    const unlockOrder = Math.max(0, land.getPastureUnlockedCount() - 4);
    const cost = 500 + unlockOrder * 250;
    ui.showDialog(
        '扩建牧场',
        `消耗 ${cost} 金币解锁这块石板`,
        [
            { text: '稍后', cb: () => {} },
            { text: '扩建', cb: () => {
                const gm = GameManager.getInstance();
                if (!gm.spendGold(cost)) {
                    ui.toast('金币不足');
                    return;
                }
                if (!land.expandPastureSlot(slotId)) {
                    gm.addGold(cost);
                    ui.toast('这块石板已经解锁');
                    return;
                }
                ui.refreshTopBar();
                ui.toast('牧场石板扩建成功');
            }},
        ],
    );
}

function showSelectedPasture(ui: any, slotId: number) {
    clearSelectedPasture(ui);
    const tile = ui.pastureTiles.find((candidate: Node) => candidate.name === `Pasture_${slotId}`);
    if (!tile) return;
    const border = new Node('PastureSelectedBorder');
    border.setPosition(0, 1);
    const graphics = border.addComponent(Graphics);
    graphics.strokeColor = new Color(255, 245, 157, 250);
    graphics.lineWidth = 4;
    graphics.roundRect(-43, -43, 86, 86, 15);
    graphics.stroke();
    graphics.strokeColor = new Color(89, 173, 87, 210);
    graphics.lineWidth = 1.5;
    graphics.roundRect(-38, -38, 76, 76, 12);
    graphics.stroke();
    tile.addChild(border);
    tween(border)
        .repeatForever(
            tween()
                .to(0.58, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'quadInOut' })
                .to(0.58, { scale: new Vec3(0.97, 0.97, 1) }, { easing: 'quadInOut' }),
        )
        .start();
}

function clearSelectedPasture(ui: any) {
    for (const tile of ui.pastureTiles) tile.getChildByName('PastureSelectedBorder')?.destroy();
}

export function refreshLandBlock(ui: any, blockId: number, animateStage = false) {
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
    if (animateStage) animateCropStageChange(newTile);
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
            refreshLockedExpansionBillboard(ui, index + 1);
        })
        .start();

    tween(newTile)
        .delay(0.12)
        .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();

}

export function updateGrowingProgress(ui: any, blockId: number, progress: number) {
    const tile = ui.landTiles.find(tile => tile.name === `Land_${blockId}`);
    if (!tile) {
        ui.refreshLandBlock(blockId);
        return;
    }
    const block = LandSystem.getInstance().getBlock(blockId);
    const cropIcon = tile.getChildByName('CropIcon') as any;
    if (block?.cropType && cropIcon && cropIcon.__cropVisualId !== getCropVisualId(block)) {
        ui.refreshLandBlock(blockId, true);
        return;
    }
    const progressBar = tile.getChildByName('CropProgressBar');
    if (block?.cropType && progressBar) drawCropProgressBar(progressBar, block.progress);

}

export function createLandTile(ui: any, block: LandBlock): Node {
    const tile = new Node(`Land_${block.id}`);
    tile.addComponent(UITransform).setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);

    const stateColor: Record<string, Color> = {
        empty: new Color(193, 145, 96, 245),
        growing: new Color(193, 145, 96, 245),
        harvesting: new Color(193, 145, 96, 245),
        occupied: new Color(174, 134, 98, 245),
    };
    ui.drawTileBase(tile, stateColor[block.state] || stateColor.empty);

    if ((block.state === 'growing' || block.state === 'harvesting') && block.cropType) {
        const cropVisualId = getCropVisualId(block);
        const cropSize = getCropVisualSize(block);
        const cropIcon = ui.createItemIcon(cropVisualId, cropSize);
        cropIcon.name = 'CropIcon';
        (cropIcon as any).__cropVisualId = cropVisualId;
        cropIcon.setPosition(0, getCropIconY(ui, block, cropSize));
        tile.addChild(cropIcon);
        cropIcon.setSiblingIndex(tile.children.length - 1);
        if (block.state === 'growing') {
            tile.addChild(createCropProgressBar(block.progress));
        }
    } else if (block.state === 'occupied') {
        ui.drawOccupiedMarker(tile, block);
    }

    tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.handleLandClick(block.id));
    return tile;

}

function getRemainingSeconds(block: LandBlock): number {
    if (!block.plantTime || !block.growthDuration) return 0;
    const elapsed = Math.max(0, (Date.now() - block.plantTime) / 1000);
    return Math.max(0, Math.ceil(block.growthDuration - elapsed));
}

type CropVisualStage = 'seed' | 'middle' | 'mature';

const STAGED_CROPS = new Set([
    'wheat', 'tomato', 'corn', 'carrot', 'lettuce', 'pumpkin',
    'strawberry', 'cherry', 'banana', 'apple',
]);

const CROP_STAGE_VISUAL: Record<string, Record<CropVisualStage, { size: number; y: number }>> = {
    wheat: {
        seed: { size: 96, y: 0 },
        middle: { size: 90, y: 0 },
        mature: { size: 90, y: 0 },
    },
    tomato: {
        seed: { size: 96, y: 0 },
        middle: { size: 96, y: 0 },
        mature: { size: 96, y: 0 },
    },
    corn: {
        seed: { size: 96, y: 0 },
        middle: { size: 104, y: 0 },
        mature: { size: 104, y: 0 },
    },
    carrot: {
        seed: { size: 96, y: 0 }, middle: { size: 96, y: 0 }, mature: { size: 96, y: 0 },
    },
    lettuce: {
        seed: { size: 96, y: 0 }, middle: { size: 96, y: 0 }, mature: { size: 96, y: 0 },
    },
    pumpkin: {
        seed: { size: 96, y: 0 }, middle: { size: 100, y: 0 }, mature: { size: 104, y: 0 },
    },
    strawberry: {
        seed: { size: 96, y: 0 }, middle: { size: 96, y: 0 }, mature: { size: 96, y: 0 },
    },
    cherry: {
        seed: { size: 96, y: 0 }, middle: { size: 104, y: 0 }, mature: { size: 108, y: 0 },
    },
    banana: {
        seed: { size: 96, y: 0 }, middle: { size: 104, y: 0 }, mature: { size: 108, y: 0 },
    },
    apple: {
        seed: { size: 96, y: 0 }, middle: { size: 104, y: 0 }, mature: { size: 108, y: 0 },
    },
};

const CROP_STAGE_ASSET_SIZE = 512;
const CROP_STAGE_ASSET_DEFAULT_BOTTOM_PADDING = 32;
// Mature strawberry artwork ends at y=453 instead of the common y=480 baseline.
const CROP_STAGE_ASSET_BOTTOM_PADDING: Partial<Record<string, Partial<Record<CropVisualStage, number>>>> = {
    strawberry: { mature: 59 },
};

function getCropVisualId(block: LandBlock): string {
    if (!block.cropType) return '';
    if (!STAGED_CROPS.has(block.cropType)) return block.cropType;
    const stageIndex = getCropVisualStage(block) === 'seed' ? 1 : getCropVisualStage(block) === 'middle' ? 2 : 3;
    return `${block.cropType}_stage_${stageIndex}`;
}

function getCropVisualStage(block: LandBlock): CropVisualStage {
    if (block.state === 'harvesting' || block.progress >= 100) return 'mature';
    return block.progress < 50 ? 'seed' : 'middle';
}

function getCropVisualSize(block: LandBlock): number {
    if (!block.cropType) return 82;
    if (!STAGED_CROPS.has(block.cropType)) return block.state === 'harvesting' ? 92 : 82;
    return CROP_STAGE_VISUAL[block.cropType][getCropVisualStage(block)].size;
}

function getCropIconY(ui: any, block: LandBlock, cropSize: number): number {
    if (block.cropType && STAGED_CROPS.has(block.cropType)) {
        const stage = getCropVisualStage(block);
        const bottomPadding = CROP_STAGE_ASSET_BOTTOM_PADDING[block.cropType]?.[stage]
            ?? CROP_STAGE_ASSET_DEFAULT_BOTTOM_PADDING;
        return cropSize * (0.5 - bottomPadding / CROP_STAGE_ASSET_SIZE);
    }
    return (block.state === 'harvesting' ? 0 : -ui.constructor.TILE_SIZE / 2 - 3) + cropSize / 2;
}

function formatCountdown(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
}

function createCropProgressBar(progress: number): Node {
    const bar = new Node('CropProgressBar');
    bar.setPosition(0, -31);
    bar.addComponent(UITransform).setContentSize(48, 8);
    drawCropProgressBar(bar, progress);
    return bar;
}

function drawCropProgressBar(bar: Node, progress: number) {
    let bg = bar.getChildByName('ProgressBg');
    if (!bg) {
        bg = new Node('ProgressBg');
        bar.addChild(bg);
    }
    fillRoundRect(bg, 48, 6, 3, new Color(88, 70, 42, 95));

    const pct = Math.max(0, Math.min(100, progress)) / 100;
    const fillW = Math.max(4, 44 * pct);
    let fill = bar.getChildByName('ProgressFill');
    if (!fill) {
        fill = new Node('ProgressFill');
        bar.addChild(fill);
    }
    fill.setPosition(-22 + fillW / 2, 0);
    fillRoundRect(fill, fillW, 4, 2, new Color(252, 211, 88, 235));
}

function animateCropStageChange(tile: Node) {
    const cropIcon = tile.getChildByName('CropIcon');
    if (!cropIcon) return;
    const finalPosition = cropIcon.position.clone();
    cropIcon.setScale(new Vec3(0.58, 0.58, 1));
    cropIcon.setPosition(finalPosition.x, finalPosition.y - 8, finalPosition.z);
    tween(cropIcon)
        .to(0.14, { position: new Vec3(finalPosition.x, finalPosition.y + 4, finalPosition.z), scale: new Vec3(1.14, 1.14, 1) }, { easing: 'quadOut' })
        .to(0.1, { position: finalPosition, scale: new Vec3(0.96, 0.96, 1) }, { easing: 'quadInOut' })
        .to(0.12, { position: finalPosition, scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
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

export function createLockedTile(ui: any, index: number): Node {
    const tile = new Node(`Locked_${index}`);
    tile.addComponent(UITransform).setContentSize(ui.constructor.TILE_SIZE, ui.constructor.TILE_SIZE);
    ui.drawTileBase(tile, new Color(158, 202, 111, 225), true);
    if (index === LandSystem.getInstance().getAllBlocks().length) {
        tile.addChild(createExpansionBillboard(ui));
    }

    tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.handleLockedLandClick(index));
    return tile;

}

function createExpansionBillboard(ui: any): Node {
    const billboard = new Node('ExpansionBillboard');
    billboard.addComponent(UITransform).setContentSize(72, 72);
    billboard.setPosition(0, 3);
    ui.applyUiIcon('billboard', billboard);
    return billboard;
}

function refreshLockedExpansionBillboard(ui: any, index: number) {
    if (index >= ui.landTiles.length) return;
    const tile = ui.landTiles[index];
    if (!tile || !tile.name.startsWith('Locked_')) return;
    const newTile = ui.createLockedTile(index);
    newTile.setPosition(tile.position);
    newTile.setScale(tile.scale);
    tile.removeFromParent();
    tile.destroy();
    ui.landRoot.addChild(newTile);
    newTile.setSiblingIndex(index);
    ui.landTiles[index] = newTile;
}

export function drawTileBase(ui: any, tile: Node, color: Color, locked = false) {
    const fieldIcon = locked ? 'greenField' : 'field';
    const field = new Node('FieldImage');
    const fieldSize = ui.constructor.TILE_SIZE + 22;
    field.addComponent(UITransform).setContentSize(fieldSize, fieldSize);
    field.setPosition(0, 0);
    ui.applyUiIcon(fieldIcon, field);
    tile.addChild(field);

}

export function drawOccupiedMarker(ui: any, tile: Node, block: LandBlock) {
    const marker = new Node('OccupiedMarker');
    marker.setPosition(0, 5);
    marker.addComponent(UITransform).setContentSize(74, 74);
    if (block.buildingId) {
        const icon = ui.createItemIcon(block.buildingId, 72, true);
        icon.setPosition(block.buildingId === 'fence' ? 3 : 0, 0);
        marker.addChild(icon);
    }
    tile.addChild(marker);

    const production = LandSystem.getInstance().getBuildingProduction(block.id);
    if (production?.ready) {
        const ready = new Node('BuildingReady');
        ready.setPosition(25, 25);
        const g = ready.addComponent(Graphics);
        g.fillColor = new Color(247, 196, 69, 255);
        g.circle(0, 0, 8);
        g.fill();
        g.strokeColor = new Color(255, 250, 218, 255);
        g.lineWidth = 2;
        g.circle(0, 0, 8);
        g.stroke();
        tile.addChild(ready);
    }

}

export function updateHarvestAllButton(ui: any) {
    const button = ui.node.getChildByName('HarvestAllButton');
    if (!button) return;
    const count = ui.activeWorld === 'farm'
        ? LandSystem.getInstance().getAllBlocks().filter(block => block.state === 'harvesting').length
        : 0;
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

    const cropIcon = tile.getChildByName('CropIcon');
    if (cropIcon) {
        cropIcon.setScale(new Vec3(0.12, 0.12, 1));
        const finalY = cropIcon.position.y;
        cropIcon.setPosition(0, -24);
        tween(cropIcon)
            .delay(0.18)
            .to(0.22, { position: new Vec3(0, finalY, 0), scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' })
            .to(0.1, { position: new Vec3(0, finalY, 0), scale: new Vec3(0.96, 0.96, 1) }, { easing: 'quadOut' })
            .to(0.12, { position: new Vec3(0, finalY, 0), scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

}

export function animateHarvest(ui: any, blockId: number, cropId: string, count: number, onComplete?: () => void, lightweight = false) {
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

    if (lightweight) {
        tween(tile)
            .delay(0.24)
            .call(() => onComplete?.())
            .start();
        return;
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
    return LevelSystem.getInstance().getMaxLandBlocks(GameManager.getInstance().playerLevel);

}

function createPastureExpansionBillboard(ui: any): Node {
    const billboard = new Node('PastureExpansionBillboard');
    billboard.addComponent(UITransform).setContentSize(72, 72);
    ui.applyUiIcon('pastureBillboard', billboard);
    return billboard;
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
            if (ui.activeBubbleLandId === blockId) {
                ui.closeSeedBubble();
                return;
            }
            if (
                ui.activeBubbleLandId >= 0 &&
                Math.floor(ui.activeBubbleLandId / ui.constructor.LAND_COLS) ===
                    Math.floor(blockId / ui.constructor.LAND_COLS)
            ) {
                ui.openSeedBubble(blockId);
                return;
            }
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

    if (block.state === 'occupied') {
        ui.handleOccupiedBuilding(blockId);
        return;
    }

    if (block.state === 'harvesting') {
        const cropId = land.harvestCrop(blockId);
        if (!cropId) return;
        const def = getItem(cropId);
        const count = (def?.harvestCount ?? 1) * GameManager.getInstance().consumeHarvestMultiplier();
        InventorySystem.getInstance().addItem(cropId, count);
        GameManager.getInstance().addExperience(land.getHarvestExperience());
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
    const matureBlocks = land.getAllBlocks()
        .filter(block => block.state === 'harvesting' && block.cropType)
    if (matureBlocks.length === 0) {
        ui.toast('没有成熟作物');
        updateHarvestAllButton(ui);
        return;
    }

    const harvestMultiplier = GameManager.getInstance().consumeHarvestMultiplier();
    const ready = matureBlocks.map(block => ({
        blockId: block.id,
        cropId: block.cropType as string,
        count: (getItem(block.cropType as string)?.harvestCount ?? 1) * harvestMultiplier,
    }));

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
        GameManager.getInstance().addExperience(land.getHarvestExperience());
        animateHarvest(ui, item.blockId, cropId, item.count, () => {
            remainingAnimations--;
            if (remainingAnimations <= 0) {
                ui.refreshLand();
                ui.toast(`一键收取 ${harvestedKinds} 块 x${totalCount}`);
            }
        }, true);
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

export function plantUniversalSeed(ui: any, blockId: number) {
    const inventory = InventorySystem.getInstance();
    if (!inventory.hasItems('universalSeed', 1)) {
        ui.toast('万能种子不足');
        return;
    }
    const gm = GameManager.getInstance();
    const candidates = getPlantableCrops().filter(seed => seed.unlockLevel <= gm.playerLevel);
    if (candidates.length === 0) {
        ui.toast('当前没有可种植的作物');
        return;
    }
    const seed = candidates[Math.floor(Math.random() * candidates.length)];
    if (!LandSystem.getInstance().plantCrop(blockId, seed.id)) {
        ui.toast('这块田不能种植');
        return;
    }
    inventory.removeItem('universalSeed', 1);
    ui.selectedSeedId = null;
    ui.closeSeedBubble();
    ui.refreshLandBlock(blockId);
    ui.animatePlanting(blockId);
    ui.toast(`万能种子随机种下 ${getItem(seed.cropId || '')?.name || seed.name}`);
}

export function ownedPlantableCrops(ui: any): ItemDef[] {
    const gm = GameManager.getInstance();
    const inv = InventorySystem.getInstance();
    const crops = getPlantableCrops().filter(c => c.unlockLevel <= gm.playerLevel && inv.hasItems(c.id, 1));
    const universalSeed = getItem('universalSeed');
    if (universalSeed && inv.hasItems(universalSeed.id, 1)) crops.push(universalSeed);
    return crops;

}

export function openSeedBubble(ui: any, blockId: number) {
    const crops = ui.ownedPlantableCrops();
    if (crops.length === 0) {
        ui.toast('没有种子，去商店购买');
        ui.showPanel('shop');
        return;
    }

    ui.bubbleRoot.removeAllChildren();
    ui.activeBubbleLandId = blockId;
    showSelectedLand(ui, blockId);

    const mask = new Node('BubbleMask');
    mask.addComponent(UITransform).setContentSize(Design.WIDTH, view.getVisibleSize().height);
    fillRect(mask, Design.WIDTH, view.getVisibleSize().height, new Color(0, 0, 0, 0));
    mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        const targetBlockId = getTouchedLandBlockId(ui, event);
        ui.scheduleOnce(() => {
            if (targetBlockId >= 0) ui.handleLandClick(targetBlockId);
            else ui.closeSeedBubble();
        }, 0);
    });
    ui.bubbleRoot.addChild(mask);

    const itemSize = 54;
    const cols = Math.min(4, crops.length);
    const rows = Math.ceil(crops.length / cols);
    const visibleRows = Math.min(2, rows);
    const gap = 6;
    const w = cols * itemSize + (cols - 1) * gap + 18;
    const viewportH = visibleRows * itemSize + (visibleRows - 1) * gap;
    const contentH = rows * itemSize + (rows - 1) * gap;
    const h = viewportH + 20;
    const landPos = ui.getLandPosition(blockId);

    const bubble = new Node('SeedBubble');
    bubble.addComponent(UITransform).setContentSize(w, h);
    bubble.setPosition(getSeedBubblePosition(ui, landPos, w, h));
    fillRoundRect(bubble, w, h, 12, new Color(255, 250, 231, 250));
    strokeRoundRect(bubble, w, h, 12, new Color(118, 184, 96, 170), 2);
    bubble.on(Node.EventType.TOUCH_END, (event: any) => event?.stopPropagation?.());
    ui.bubbleRoot.addChild(bubble);

    const viewport = new Node('SeedViewport');
    viewport.addComponent(UITransform).setContentSize(w - 12, viewportH);
    viewport.addComponent(Mask);
    bubble.addChild(viewport);

    const content = new Node('SeedContent');
    content.addComponent(UITransform).setContentSize(w - 12, contentH);
    viewport.addChild(content);

    const startX = -(w - 18) / 2 + itemSize / 2;
    const startY = contentH / 2 - itemSize / 2;
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
                if (target < 0) return;
                const targetBlock = LandSystem.getInstance().getBlock(target);
                if (!targetBlock || targetBlock.state !== 'empty') {
                    ui.toast('这块田地当前不能种植');
                    return;
                }
                if (!InventorySystem.getInstance().hasItems(crop.id, 1)) {
                    ui.toast('种子不足');
                    return;
                }
                if (crop.id === 'universalSeed') ui.plantUniversalSeed(target);
                else ui.plantCrop(target, crop.id);
            }, 0);
        });
        content.addChild(cell);
    });

    if (rows > visibleRows) {
        const scrollView = viewport.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;
        (scrollView as any).elastic = false;
        scrollView.content = content;
        ui.scheduleOnce(() => {
            if (viewport.isValid && content.isValid) scrollView.scrollToTop(0);
        }, 0);
    }

    bubble.scale = new Vec3(0.7, 0.7, 1);
    tween(bubble).to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

}

function getSeedBubblePosition(
    ui: any,
    landPos: { x: number; y: number },
    bubbleW: number,
    bubbleH: number,
): Vec3 {
    const currentRowY = ui.landRoot.position.y + landPos.y * ui.landRoot.scale.y;
    const previousRowOffset = (ui.constructor.TILE_SIZE + ui.constructor.TILE_GAP) * ui.landRoot.scale.y;
    const vs = view.getVisibleSize();
    const margin = 8;
    const targetX = ui.landRoot.position.x;
    const targetY = currentRowY + previousRowOffset;
    return new Vec3(
        Math.max(-vs.width / 2 + bubbleW / 2 + margin, Math.min(vs.width / 2 - bubbleW / 2 - margin, targetX)),
        Math.max(-vs.height / 2 + bubbleH / 2 + 88, Math.min(vs.height / 2 - bubbleH / 2 - 148, targetY)),
        0,
    );
}

export function openBuildingBubble(ui: any, slotId: number) {
    const inventory = InventorySystem.getInstance();
    const buildings = Object.keys(ITEM_DB).map(id => ITEM_DB[id])
        .filter(item => (
            item.category === ItemCategory.BUILDING || item.category === ItemCategory.DECORATION
        ) && inventory.hasItems(item.id, 1))
        .sort((a, b) => a.unlockLevel - b.unlockLevel);
    if (buildings.length === 0) {
        ui.toast('背包中没有可放置的建筑');
        return;
    }
    ui.bubbleRoot.removeAllChildren();
    ui.activePastureSlotId = slotId;
    showSelectedPasture(ui, slotId);

    const mask = new Node('BuildingBubbleMask');
    mask.addComponent(UITransform).setContentSize(Design.WIDTH, view.getVisibleSize().height);
    fillRect(mask, Design.WIDTH, view.getVisibleSize().height, new Color(0, 0, 0, 0));
    mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        const targetSlotId = getTouchedPastureSlotId(ui, event);
        ui.scheduleOnce(() => targetSlotId >= 0 ? ui.handlePastureClick(targetSlotId) : ui.closeBuildingBubble(), 0);
    });
    ui.bubbleRoot.addChild(mask);

    const itemSize = 58;
    const cols = Math.min(4, buildings.length);
    const rows = Math.ceil(buildings.length / cols);
    const visibleRows = Math.min(2, rows);
    const gap = 6;
    const width = cols * itemSize + (cols - 1) * gap + 18;
    const viewportHeight = visibleRows * itemSize + (visibleRows - 1) * gap;
    const contentHeight = rows * itemSize + (rows - 1) * gap;
    const height = viewportHeight + 20;
    const visibleSize = view.getVisibleSize();
    const y = Math.min(visibleSize.height / 2 - height / 2 - 150, ui.pastureRoot.position.y + 190 * ui.pastureRoot.scale.y);

    const bubble = new Node('BuildingBubble');
    bubble.addComponent(UITransform).setContentSize(width, height);
    bubble.setPosition(0, y);
    fillRoundRect(bubble, width, height, 13, new Color(255, 249, 226, 252));
    strokeRoundRect(bubble, width, height, 13, new Color(148, 105, 63, 210), 2);
    bubble.on(Node.EventType.TOUCH_END, (event: any) => event?.stopPropagation?.());
    ui.bubbleRoot.addChild(bubble);

    const viewport = new Node('BuildingViewport');
    viewport.addComponent(UITransform).setContentSize(width - 12, viewportHeight);
    viewport.addComponent(Mask);
    bubble.addChild(viewport);
    const content = new Node('BuildingContent');
    content.addComponent(UITransform).setContentSize(width - 12, contentHeight);
    viewport.addChild(content);
    const startX = -(width - 18) / 2 + itemSize / 2;
    const startY = contentHeight / 2 - itemSize / 2;

    buildings.forEach((building, index) => {
        const cell = new Node(`Building_${building.id}`);
        cell.addComponent(UITransform).setContentSize(itemSize, itemSize);
        cell.setPosition(startX + (index % cols) * (itemSize + gap), startY - Math.floor(index / cols) * (itemSize + gap));
        fillRoundRect(cell, itemSize, itemSize, 10, new Color(246, 227, 191, 250));
        strokeRoundRect(cell, itemSize, itemSize, 10, new Color(168, 111, 57, 170), 1.3);
        const icon = ui.createItemIcon(building.id, 39);
        icon.setPosition(0, 7);
        cell.addChild(icon);
        cell.addChild(ui.makeLabel(building.name, 9, new Color(78, 43, 24), true, 0, -18, itemSize - 4, 12));
        cell.addChild(ui.makeLabel(`x${inventory.getItemCount(building.id)}`, 8, new Color(114, 67, 35), false, 17, 18, 24, 12));
        cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            if (ui.activePastureSlotId >= 0) ui.placeBuilding(ui.activePastureSlotId, building.id);
        });
        content.addChild(cell);
    });
    if (rows > visibleRows) {
        const scrollView = viewport.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;
        (scrollView as any).elastic = false;
        scrollView.content = content;
    }
    bubble.scale = new Vec3(0.72, 0.72, 1);
    tween(bubble).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
}

export function closeBuildingBubble(ui: any) {
    if (ui.bubbleRoot) ui.bubbleRoot.removeAllChildren();
    ui.activePastureSlotId = -1;
    clearSelectedPasture(ui);
}

function getTouchedPastureSlotId(ui: any, event: any): number {
    const location = event?.getUILocation?.();
    if (!location || !ui.pastureRoot) return -1;
    const transform = ui.pastureRoot.getComponent(UITransform);
    const local = transform?.convertToNodeSpaceAR?.(new Vec3(location.x, location.y, 0));
    if (!local) return -1;
    for (const slot of LandSystem.getInstance().getBuildingSlots()) {
        const pos = getPasturePosition(ui, slot.id);
        if (Math.abs(local.x - pos.x) <= 47 && Math.abs(local.y - pos.y) <= 47) return slot.id;
    }
    return -1;
}

export function placeBuilding(ui: any, slotId: number, buildingId: string) {
    const item = getItem(buildingId);
    const inventory = InventorySystem.getInstance();
    const isPlaceable = item?.category === ItemCategory.BUILDING || item?.category === ItemCategory.DECORATION;
    if (!item || !isPlaceable || !inventory.hasItems(buildingId, 1)) {
        ui.toast('建筑数量不足');
        return;
    }
    if (!LandSystem.getInstance().occupyBuildingSlot(slotId, buildingId)) {
        ui.toast('这块地无法放置建筑');
        return;
    }
    inventory.removeItem(buildingId, 1);
    closeBuildingBubble(ui);
    ui.refreshPastureSlot(slotId);
    ui.toast(`${item.name}放置完成`);
}

export function updatePastureCollectAllButton(ui: any) {
    const button = ui.node.getChildByName('PastureCollectAllButton');
    if (!button) return;
    const land = LandSystem.getInstance();
    const ready = ui.activeWorld === 'pasture' && land.getBuildingSlots()
        .some(slot => land.getBuildingProduction(slot.id)?.ready);
    if (ready && !button.active) {
        button.active = true;
        button.scale = new Vec3(0.72, 0.72, 1);
        tween(button).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    } else if (!ready) {
        button.active = false;
        button.scale = new Vec3(1, 1, 1);
    }
}

export function collectAllPastureProducts(ui: any) {
    const land = LandSystem.getInstance();
    const inventory = InventorySystem.getInstance();
    const collected = new Map<string, number>();
    for (const slot of land.getBuildingSlots()) {
        const product = land.collectBuildingProduct(slot.id);
        if (!product) continue;
        inventory.addItem(product.itemId, product.count);
        collected.set(product.itemId, (collected.get(product.itemId) || 0) + product.count);
    }
    if (collected.size === 0) {
        ui.toast('当前没有可收取的牧场产物');
        return;
    }
    ui.refreshPasture();
    const summary = Array.from(collected.entries())
        .map(([id, count]) => `${ui.itemName(id)} x${count}`)
        .join('、');
    ui.toast(`一键收取：${summary}`);
}

export function handleOccupiedBuilding(ui: any, slotId: number) {
    const land = LandSystem.getInstance();
    const block = land.getBuildingSlot(slotId);
    if (!block?.buildingId) return;
    const building = getItem(block.buildingId);
    const production = land.getBuildingProduction(slotId);
    if (production?.ready) {
        const product = land.collectBuildingProduct(slotId);
        if (!product) return;
        InventorySystem.getInstance().addItem(product.itemId, product.count);
        ui.refreshPastureSlot(slotId);
        ui.toast(`收取 ${ui.itemName(product.itemId)} x${product.count}`);
        return;
    }
    const status = production
        ? `距离下次产出还有 ${formatCountdown(production.remaining)}`
        : land.getPlacementEffectText(block.buildingId);
    ui.showDialog(
        building?.name || '农场建筑',
        status,
        [
            { text: '保留', cb: () => {} },
            { text: '拆除', cb: () => {
                if (!land.clearBuildingSlot(slotId)) return;
                InventorySystem.getInstance().addItem(block.buildingId!, 1);
                ui.refreshPastureSlot(slotId);
                ui.toast('建筑已放回背包');
            }},
        ],
    );
}

function getTouchedLandBlockId(ui: any, event: any): number {
    const location = event?.getUILocation?.();
    if (!location || !ui.landRoot) return -1;

    const landTransform = ui.landRoot.getComponent(UITransform);
    let localX = 0;
    let localY = 0;
    if (landTransform?.convertToNodeSpaceAR) {
        const local = landTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
        localX = local.x;
        localY = local.y;
    } else {
        const vs = view.getVisibleSize();
        const rootX = location.x - vs.width / 2;
        const rootY = location.y - vs.height / 2;
        localX = (rootX - ui.landRoot.position.x) / ui.landRoot.scale.x;
        localY = (rootY - ui.landRoot.position.y) / ui.landRoot.scale.y;
    }
    const halfSize = ui.constructor.TILE_SIZE / 2 + 8;

    for (const block of LandSystem.getInstance().getAllBlocks()) {
        const pos = ui.getLandPosition(block.id);
        if (Math.abs(localX - pos.x) <= halfSize && Math.abs(localY - pos.y) <= halfSize) {
            return block.id;
        }
    }
    return -1;
}

export function closeSeedBubble(ui: any) {
    ui.bubbleRoot.removeAllChildren();
    ui.activeBubbleLandId = -1;
    clearSelectedLand(ui);

}
