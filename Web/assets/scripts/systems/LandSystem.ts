import { _decorator, Component, Node, instantiate, Prefab, UITransform, Sprite, Color } from 'cc';
import { GameValues } from '../config/GameConfig';
import { getItem, getPlantableCrops } from '../config/ItemConfig';
import { CropGrowthTimes } from '../config/GameConfig';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';
const { ccclass, property } = _decorator;
const TAG = 'LandSystem';

export type LandState = 'empty' | 'growing' | 'harvesting' | 'occupied';

export interface LandBlock {
    id: number;
    state: LandState;
    cropType?: string;
    progress: number;    // 0-100
    plantTime?: number;  // Date.now()
    growthDuration?: number;
    buildingId?: string;
}

/**
 * 地块系统 - 管理农田地块状态
 */
@ccclass('LandSystem')
export class LandSystem extends Component {
    private static instance: LandSystem;
    private landBlocks: Map<number, LandBlock> = new Map();
    private maxBlocks: number = GameValues.INITIAL_LAND;
    private updateTimer: number = 0;

    static getInstance(): LandSystem { return LandSystem.instance; }
    onLoad() { LandSystem.instance = this; }

    start() {
        this.initBlocks();
    }

    private initBlocks() {
        this.landBlocks.clear();
        for (let i = 0; i < this.maxBlocks; i++) {
            this.landBlocks.set(i, { id: i, state: 'empty', progress: 0 });
        }
    }

    update(dt: number) {
        this.updateTimer += dt;
        if (this.updateTimer >= 0.5) { // 每0.5秒更新一次
            this.updateTimer = 0;
            this.updateGrowth();
        }
    }

    private updateGrowth() {
        for (const block of this.landBlocks.values()) {
            if (block.state === 'growing' && block.plantTime && block.growthDuration) {
                const elapsed = (Date.now() - block.plantTime) / 1000;
                block.progress = Math.min(100, (elapsed / block.growthDuration) * 100);
                if (block.progress >= 100) {
                    block.state = 'harvesting';
                    EventManager.getInstance().emit('cropMatured', { blockId: block.id });
                    Logger.info(TAG, `地块${block.id}作物已成熟`);
                }
            }
        }
    }

    /** 种植作物 */
    plantCrop(blockId: number, cropType: string): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'empty') return false;

        const growthTime = CropGrowthTimes[cropType];
        if (!growthTime) return false;

        block.state = 'growing';
        block.cropType = cropType;
        block.plantTime = Date.now();
        block.growthDuration = growthTime;
        block.progress = 0;

        EventManager.getInstance().emit('cropPlanted', { blockId, cropType });
        return true;
    }

    /** 收获作物 */
    harvestCrop(blockId: number): string | null {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'harvesting' || !block.cropType) return null;

        const cropType = block.cropType;
        const def = getItem(cropType);
        const count = def?.harvestCount ?? 1;

        block.state = 'empty';
        block.cropType = undefined;
        block.progress = 0;
        block.plantTime = undefined;
        block.growthDuration = undefined;

        EventManager.getInstance().emit('cropHarvested', { blockId, cropType, count });
        return cropType;
    }

    /** 加速生长（消耗钻石或广告） */
    speedUpCrop(blockId: number): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'growing') return false;
        block.progress = 100;
        block.state = 'harvesting';
        EventManager.getInstance().emit('cropMatured', { blockId });
        return true;
    }

    /** 获取所有地块 */
    getAllBlocks(): LandBlock[] {
        return Array.from(this.landBlocks.values());
    }

    /** 获取单个地块 */
    getBlock(blockId: number): LandBlock | undefined {
        return this.landBlocks.get(blockId);
    }

    /** 扩展地块数量 */
    expandBlocks(newMax: number) {
        const oldMax = this.maxBlocks;
        this.maxBlocks = Math.min(newMax, GameValues.MAX_LAND);
        for (let i = oldMax; i < this.maxBlocks; i++) {
            this.landBlocks.set(i, { id: i, state: 'empty', progress: 0 });
        }
        EventManager.getInstance().emit('landExpanded');
    }

    /** 获取可用作物列表 */
    getPlantableCrops(level: number) {
        return getPlantableCrops().filter(c => c.unlockLevel <= level);
    }
}
