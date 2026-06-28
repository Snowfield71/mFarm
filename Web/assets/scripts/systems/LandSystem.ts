import { _decorator, Component } from 'cc';
import { GameValues, CropGrowthTimes } from '../config/GameConfig';
import { getItem, getPlantableCrops } from '../config/ItemConfig';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';

const { ccclass } = _decorator;
const TAG = 'LandSystem';

export type LandState = 'empty' | 'growing' | 'harvesting' | 'occupied';

export interface LandBlock {
    id: number;
    state: LandState;
    cropType?: string;
    progress: number;
    plantTime?: number;
    growthDuration?: number;
    buildingId?: string;
}

@ccclass('LandSystem')
export class LandSystem extends Component {
    private static instance: LandSystem;
    private landBlocks: Map<number, LandBlock> = new Map();
    private plantCounts: Record<string, number> = {};
    private updateTimer = 0;
    private maxBlocks = GameValues.INITIAL_LAND;

    static getInstance(): LandSystem { return LandSystem.instance; }

    onLoad() {
        LandSystem.instance = this;
    }

    start() {
        this.reset(GameValues.INITIAL_LAND);
    }

    update(dt: number) {
        this.updateTimer += dt;
        if (this.updateTimer < 0.5) return;
        this.updateTimer = 0;
        this.updateGrowth();
    }

    reset(count: number = GameValues.INITIAL_LAND) {
        this.landBlocks.clear();
        this.plantCounts = {};
        this.maxBlocks = Math.min(Math.max(count, 0), GameValues.MAX_LAND);
        for (let i = 0; i < this.maxBlocks; i++) {
            this.landBlocks.set(i, this.createEmptyBlock(i));
        }
        EventManager.getInstance()?.emit('landChanged');
    }

    loadFromSave(blocks: LandBlock[] = [], plantCounts: Record<string, number> = {}) {
        const count = Math.min(
            Math.max(blocks.length || GameValues.INITIAL_LAND, GameValues.INITIAL_LAND),
            GameValues.MAX_LAND,
        );
        this.landBlocks.clear();
        this.maxBlocks = count;
        this.plantCounts = { ...plantCounts };

        for (let i = 0; i < count; i++) {
            const source = blocks[i];
            if (!source) {
                this.landBlocks.set(i, this.createEmptyBlock(i));
                continue;
            }
            this.landBlocks.set(i, {
                id: i,
                state: source.state || 'empty',
                cropType: source.cropType,
                progress: source.progress || 0,
                plantTime: source.plantTime,
                growthDuration: source.growthDuration,
                buildingId: source.buildingId,
            });
        }
        this.updateGrowth();
        EventManager.getInstance().emit('landChanged');
    }

    exportSave(): { blocks: LandBlock[]; plantCounts: Record<string, number> } {
        return {
            blocks: this.getAllBlocks().map(block => ({ ...block })),
            plantCounts: { ...this.plantCounts },
        };
    }

    getAllBlocks(): LandBlock[] {
        return Array.from(this.landBlocks.values()).sort((a, b) => a.id - b.id);
    }

    getBlock(blockId: number): LandBlock | undefined {
        return this.landBlocks.get(blockId);
    }

    getUnlockedCount(): number {
        return this.maxBlocks;
    }

    expandBlocks(newMax: number) {
        const target = Math.min(Math.max(newMax, this.maxBlocks), GameValues.MAX_LAND);
        if (target === this.maxBlocks) return;

        for (let i = this.maxBlocks; i < target; i++) {
            this.landBlocks.set(i, this.createEmptyBlock(i));
        }
        this.maxBlocks = target;
        EventManager.getInstance().emit('landExpanded', { count: this.maxBlocks });
        EventManager.getInstance().emit('landChanged');
    }

    plantCrop(blockId: number, cropType: string): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'empty') return false;

        const def = getItem(cropType);
        const growthDuration = def?.growthTime || CropGrowthTimes[cropType];
        if (!def?.isCrop || !growthDuration) {
            Logger.warn(TAG, `Cannot plant unknown crop: ${cropType}`);
            return false;
        }

        block.state = 'growing';
        block.cropType = cropType;
        block.progress = 0;
        block.plantTime = Date.now();
        block.growthDuration = growthDuration;
        block.buildingId = undefined;
        this.plantCounts[cropType] = (this.plantCounts[cropType] || 0) + 1;

        EventManager.getInstance().emit('cropPlanted', { blockId, cropType, count: this.plantCounts[cropType] });
        EventManager.getInstance().emit('landChanged');
        return true;
    }

    getPlantCount(cropType: string): number {
        return this.plantCounts[cropType] || 0;
    }

    getTotalPlantCount(): number {
        let total = 0;
        for (const id in this.plantCounts) total += this.plantCounts[id] || 0;
        return total;
    }

    harvestCrop(blockId: number): string | null {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'harvesting' || !block.cropType) return null;

        const cropType = block.cropType;
        this.landBlocks.set(blockId, this.createEmptyBlock(blockId));
        EventManager.getInstance().emit('cropHarvested', { blockId, cropType });
        EventManager.getInstance().emit('landChanged');
        return cropType;
    }

    speedUpCrop(blockId: number): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'growing') return false;
        block.progress = 100;
        block.state = 'harvesting';
        EventManager.getInstance().emit('cropMatured', { blockId, cropType: block.cropType });
        EventManager.getInstance().emit('landChanged');
        return true;
    }

    occupyBlock(blockId: number, buildingId: string): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'empty') return false;
        block.state = 'occupied';
        block.buildingId = buildingId;
        block.progress = 0;
        EventManager.getInstance().emit('landChanged');
        return true;
    }

    clearBlock(blockId: number): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state === 'growing') return false;
        this.landBlocks.set(blockId, this.createEmptyBlock(blockId));
        EventManager.getInstance().emit('landChanged');
        return true;
    }

    getPlantableCrops(level: number) {
        return getPlantableCrops().filter(crop => crop.unlockLevel <= level);
    }

    private updateGrowth() {
        let changed = false;
        for (const block of this.landBlocks.values()) {
            if (block.state !== 'growing' || !block.plantTime || !block.growthDuration) continue;

            const elapsed = (Date.now() - block.plantTime) / 1000;
            const nextProgress = Math.min(100, (elapsed / block.growthDuration) * 100);
            if (Math.floor(nextProgress) !== Math.floor(block.progress)) changed = true;
            block.progress = nextProgress;

            if (block.progress >= 100) {
                block.state = 'harvesting';
                changed = true;
                EventManager.getInstance().emit('cropMatured', { blockId: block.id, cropType: block.cropType });
            }
        }
        if (changed) EventManager.getInstance().emit('landChanged');
    }

    private createEmptyBlock(id: number): LandBlock {
        return { id, state: 'empty', progress: 0 };
    }
}
