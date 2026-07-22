import { _decorator, Component } from 'cc';
import { GameValues, CropGrowthTimes } from '../config/GameConfig';
import { getItem, getPlantableCrops, ItemCategory } from '../config/ItemConfig';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';
import { ENFORCE_FARM_SEASON_RESTRICTION, isSeasonAllowed } from '../config/SeasonConfig';

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
    buildingPlacedTime?: number;
    buildingLastCollectTime?: number;
    buildingReadyNotified?: boolean;
    buildingCollectCount?: number;
    greenhouseUntil?: number;
    greenhouseUnlocked?: boolean;
}

type BuildingProductionDefinition = {
    itemId?: string;
    itemIds?: string[];
    count: number;
    duration: number;
};

const BUILDING_PRODUCTION: Record<string, BuildingProductionDefinition> = {
    chickenCoop: { itemId: 'egg', count: 2, duration: 120 },
    barn: { itemId: 'milk', count: 2, duration: 150 },
    well: { itemId: 'water', count: 2, duration: 140 },
    beehive: { itemId: 'honey', count: 1, duration: 180 },
    garden: { itemIds: ['flower', 'sunflower', 'tulip', 'rose'], count: 2, duration: 150 },
    tent: { itemId: 'speedTicket', count: 1, duration: 300 },
};

const DECORATION_GROWTH_BONUS = 0.01;
const MAX_DECORATION_GROWTH_BONUS = 0.15;
const WAREHOUSE_PRODUCTION_BONUS = 0.1;
const MAX_WAREHOUSE_PRODUCTION_BONUS = 0.3;

const PASTURE_SLOT_COUNT = 12;
const INITIAL_PASTURE_SLOTS = [0, 1, 3, 4];

@ccclass('LandSystem')
export class LandSystem extends Component {
    private static instance: LandSystem;
    private landBlocks: Map<number, LandBlock> = new Map();
    private buildingSlots: Map<number, LandBlock> = new Map();
    private greenhouseBlocks: Map<number, LandBlock> = new Map();
    private pastureUnlockedSlots = new Set<number>(INITIAL_PASTURE_SLOTS);
    private plantCounts: Record<string, number> = {};
    private updateTimer = 0;
    private maxBlocks = GameValues.INITIAL_LAND;
    private lastPlantError: 'none' | 'land' | 'seed' | 'season' = 'none';

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
        this.greenhouseBlocks.clear();
        this.pastureUnlockedSlots = new Set(INITIAL_PASTURE_SLOTS);
        this.resetBuildingSlots();
        this.plantCounts = {};
        this.maxBlocks = Math.min(Math.max(count, 0), GameValues.MAX_LAND);
        for (let i = 0; i < this.maxBlocks; i++) {
            this.landBlocks.set(i, this.createEmptyBlock(i));
        }
        EventManager.getInstance()?.emit('landChanged');
    }

    loadFromSave(
        blocks: LandBlock[] = [],
        plantCounts: Record<string, number> = {},
        savedBuildingSlots: LandBlock[] = [],
        savedPastureUnlockedSlots?: number[],
        savedGreenhouseBlocks: LandBlock[] = [],
        resetGreenhouseUnlocks = false,
    ) {
        const count = Math.min(
            Math.max(blocks.length || GameValues.INITIAL_LAND, GameValues.INITIAL_LAND),
            GameValues.MAX_LAND,
        );
        this.landBlocks.clear();
        this.greenhouseBlocks.clear();
        this.resetBuildingSlots();
        const legacyUnlocked = INITIAL_PASTURE_SLOTS.concat(
            savedBuildingSlots
                .filter(slot => !!slot?.buildingId)
                .map(slot => slot.id),
        );
        const unlockedSource = savedPastureUnlockedSlots?.length
            ? savedPastureUnlockedSlots
            : legacyUnlocked;
        this.pastureUnlockedSlots = new Set(
            unlockedSource.filter(id => Number.isInteger(id) && id >= 0 && id < PASTURE_SLOT_COUNT),
        );
        for (const id of INITIAL_PASTURE_SLOTS) this.pastureUnlockedSlots.add(id);
        this.maxBlocks = count;
        this.plantCounts = { ...plantCounts };

        for (const source of savedBuildingSlots.slice(0, PASTURE_SLOT_COUNT)) {
            if (!source?.buildingId) continue;
            const id = Math.max(0, Math.min(PASTURE_SLOT_COUNT - 1, source.id));
            this.buildingSlots.set(id, {
                id,
                state: 'occupied',
                progress: 0,
                buildingId: source.buildingId,
                buildingPlacedTime: source.buildingPlacedTime,
                buildingLastCollectTime: source.buildingLastCollectTime,
                buildingReadyNotified: source.buildingReadyNotified,
                buildingCollectCount: Math.max(0, source.buildingCollectCount || 0),
            });
        }
        this.syncGreenhouseBlocks(savedGreenhouseBlocks, resetGreenhouseUnlocks);

        for (let i = 0; i < count; i++) {
            const source = blocks[i];
            if (!source) {
                this.landBlocks.set(i, this.createEmptyBlock(i));
                continue;
            }
            if (source.state === 'occupied' && source.buildingId) {
                this.migrateBuildingToPasture(source);
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
                greenhouseUntil: source.greenhouseUntil,
            });
        }
        this.updateGrowth();
        EventManager.getInstance().emit('landChanged');
    }

    exportSave(): { blocks: LandBlock[]; buildingSlots: LandBlock[]; greenhouseBlocks: LandBlock[]; pastureUnlockedSlots: number[]; plantCounts: Record<string, number> } {
        return {
            blocks: this.getAllBlocks().map(block => ({ ...block })),
            buildingSlots: this.getBuildingSlots().map(slot => ({ ...slot })),
            greenhouseBlocks: this.getGreenhouseBlocks().map(slot => ({ ...slot })),
            pastureUnlockedSlots: Array.from(this.pastureUnlockedSlots).sort((a, b) => a - b),
            plantCounts: { ...this.plantCounts },
        };
    }

    getAllBlocks(): LandBlock[] {
        return Array.from(this.landBlocks.values()).sort((a, b) => a.id - b.id);
    }

    getBlock(blockId: number): LandBlock | undefined {
        return this.landBlocks.get(blockId);
    }

    getBuildingSlots(): LandBlock[] {
        return Array.from(this.buildingSlots.values()).sort((a, b) => a.id - b.id);
    }

    getBuildingSlot(slotId: number): LandBlock | undefined {
        return this.buildingSlots.get(slotId);
    }

    getGreenhouseBlocks(): LandBlock[] {
        return Array.from(this.greenhouseBlocks.values()).sort((a, b) => a.id - b.id);
    }

    getGreenhouseBlocksForBuilding(buildingSlotId: number): LandBlock[] {
        const firstSlotId = buildingSlotId * 6;
        return Array.from({ length: 6 }, (_, index) => this.greenhouseBlocks.get(firstSlotId + index))
            .filter((block): block is LandBlock => !!block);
    }

    getGreenhouseBlock(slotId: number): LandBlock | undefined {
        return this.greenhouseBlocks.get(slotId);
    }

    getGreenhouseCapacity(): number {
        return this.getGreenhouseBlocks().filter(block => block.greenhouseUnlocked).length;
    }

    isGreenhouseSlotUnlocked(slotId: number): boolean {
        return this.greenhouseBlocks.get(slotId)?.greenhouseUnlocked === true;
    }

    getGreenhouseSlotUnlockCost(slotId: number): number {
        const localIndex = ((slotId % 6) + 6) % 6;
        return [0, 800, 1600, 3000, 5000, 8000][localIndex];
    }

    unlockGreenhouseSlot(slotId: number): boolean {
        const block = this.greenhouseBlocks.get(slotId);
        if (!block || block.greenhouseUnlocked) return false;
        const localIndex = ((slotId % 6) + 6) % 6;
        if (localIndex > 0 && !this.isGreenhouseSlotUnlocked(slotId - 1)) return false;
        block.greenhouseUnlocked = true;
        EventManager.getInstance().emit('greenhouseChanged');
        return true;
    }

    isPastureSlotUnlocked(slotId: number): boolean {
        return this.pastureUnlockedSlots.has(slotId);
    }

    getPastureUnlockedCount(): number {
        return this.pastureUnlockedSlots.size;
    }

    expandPastureSlot(slotId: number): boolean {
        if (!this.buildingSlots.has(slotId) || this.pastureUnlockedSlots.has(slotId)) return false;
        this.pastureUnlockedSlots.add(slotId);
        EventManager.getInstance().emit('pastureExpanded', { slotId, count: this.pastureUnlockedSlots.size });
        EventManager.getInstance().emit('pastureChanged');
        return true;
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

    plantCrop(blockId: number, seedId: string, ignoreSeason = false): boolean {
        this.lastPlantError = 'none';
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'empty') {
            this.lastPlantError = 'land';
            return false;
        }

        const seed = getItem(seedId);
        const cropType = seed?.cropId;
        const baseGrowthDuration = seed?.growthTime || (cropType ? CropGrowthTimes[cropType] : undefined);
        if (!seed?.isCrop || !cropType || !getItem(cropType) || !baseGrowthDuration) {
            this.lastPlantError = 'seed';
            Logger.warn(TAG, `Cannot plant unknown seed: ${seedId}`);
            return false;
        }
        if (
            ENFORCE_FARM_SEASON_RESTRICTION &&
            !ignoreSeason &&
            !this.isGreenhouseActive(blockId) &&
            !isSeasonAllowed(seed.seasons)
        ) {
            this.lastPlantError = 'season';
            return false;
        }

        block.state = 'growing';
        block.cropType = cropType;
        block.progress = 0;
        block.plantTime = Date.now();
        block.growthDuration = Math.max(1, baseGrowthDuration * this.getCropGrowthMultiplier());
        block.buildingId = undefined;
        this.plantCounts[cropType] = (this.plantCounts[cropType] || 0) + 1;

        EventManager.getInstance().emit('cropPlanted', {
            blockId,
            cropType,
            count: this.plantCounts[cropType],
            offSeason: !isSeasonAllowed(seed.seasons),
            greenhouse: this.isGreenhouseActive(blockId),
        });
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
        const greenhouseUntil = block.greenhouseUntil;
        this.landBlocks.set(blockId, { ...this.createEmptyBlock(blockId), greenhouseUntil });
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

    occupyBuildingSlot(slotId: number, buildingId: string): boolean {
        const slot = this.buildingSlots.get(slotId);
        if (!slot || !this.isPastureSlotUnlocked(slotId) || slot.state !== 'empty') return false;
        slot.state = 'occupied';
        slot.buildingId = buildingId;
        slot.buildingPlacedTime = Date.now();
        slot.buildingLastCollectTime = Date.now();
        slot.buildingReadyNotified = false;
        slot.buildingCollectCount = 0;
        slot.progress = 0;
        if (buildingId === 'fourSeasonGreenhouse') this.syncGreenhouseBlocks();
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    getLastPlantError() {
        return this.lastPlantError;
    }

    isGreenhouseActive(blockId: number, now = Date.now()): boolean {
        const block = this.landBlocks.get(blockId);
        return !!block?.greenhouseUntil && block.greenhouseUntil > now;
    }

    activateGreenhouse(blockId: number, durationMs = 7 * 24 * 60 * 60 * 1000): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block || block.state !== 'empty') return false;
        block.greenhouseUntil = Math.max(block.greenhouseUntil || 0, Date.now()) + durationMs;
        EventManager.getInstance().emit('landChanged');
        return true;
    }

    clearBuildingSlot(slotId: number): boolean {
        const slot = this.buildingSlots.get(slotId);
        if (!slot || slot.state !== 'occupied') return false;
        if (slot.buildingId === 'fourSeasonGreenhouse') {
            if (this.getGreenhouseBlocksForBuilding(slotId).some(block => block.state !== 'empty')) return false;
            for (const block of this.getGreenhouseBlocksForBuilding(slotId)) {
                this.greenhouseBlocks.delete(block.id);
            }
        }
        this.buildingSlots.set(slotId, this.createEmptyBlock(slotId));
        this.syncGreenhouseBlocks();
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    plantGreenhouseCrop(slotId: number, seedId: string): boolean {
        const block = this.greenhouseBlocks.get(slotId);
        const seed = getItem(seedId);
        const cropType = seed?.cropId;
        const baseGrowthDuration = seed?.growthTime || (cropType ? CropGrowthTimes[cropType] : undefined);
        if (!block || !block.greenhouseUnlocked || block.state !== 'empty' || !seed?.isCrop || !cropType || !baseGrowthDuration) return false;
        block.state = 'growing';
        block.cropType = cropType;
        block.progress = 0;
        block.plantTime = Date.now();
        block.growthDuration = Math.max(1, baseGrowthDuration * this.getCropGrowthMultiplier());
        this.plantCounts[cropType] = (this.plantCounts[cropType] || 0) + 1;
        EventManager.getInstance().emit('cropPlanted', {
            blockId: 1000 + slotId,
            greenhouseSlotId: slotId,
            cropType,
            count: this.plantCounts[cropType],
            offSeason: !isSeasonAllowed(seed.seasons),
            greenhouse: true,
        });
        EventManager.getInstance().emit('greenhouseChanged');
        return true;
    }

    harvestGreenhouseCrop(slotId: number): string | null {
        const block = this.greenhouseBlocks.get(slotId);
        if (!block || block.state !== 'harvesting' || !block.cropType) return null;
        const cropType = block.cropType;
        this.greenhouseBlocks.set(slotId, { ...this.createEmptyBlock(slotId), greenhouseUnlocked: true });
        EventManager.getInstance().emit('cropHarvested', { blockId: 1000 + slotId, greenhouseSlotId: slotId, cropType });
        EventManager.getInstance().emit('greenhouseChanged');
        return cropType;
    }

    removeGreenhouseCrop(slotId: number): boolean {
        const block = this.greenhouseBlocks.get(slotId);
        if (!block?.cropType || (block.state !== 'growing' && block.state !== 'harvesting')) return false;
        const cropType = block.cropType;
        this.greenhouseBlocks.set(slotId, { ...this.createEmptyBlock(slotId), greenhouseUnlocked: true });
        EventManager.getInstance().emit('cropRemoved', { blockId: 1000 + slotId, greenhouseSlotId: slotId, cropType });
        EventManager.getInstance().emit('greenhouseChanged');
        return true;
    }

    removeCrop(blockId: number): boolean {
        const block = this.landBlocks.get(blockId);
        if (!block?.cropType || (block.state !== 'growing' && block.state !== 'harvesting')) return false;
        const cropType = block.cropType;
        const greenhouseUntil = block.greenhouseUntil;
        this.landBlocks.set(blockId, { ...this.createEmptyBlock(blockId), greenhouseUntil });
        EventManager.getInstance().emit('cropRemoved', { blockId, cropType });
        EventManager.getInstance().emit('landChanged');
        return true;
    }

    removeLandOccupant(blockId: number): string | null {
        const block = this.landBlocks.get(blockId);
        if (!block?.buildingId || block.state !== 'occupied') return null;
        const buildingId = block.buildingId;
        const greenhouseUntil = block.greenhouseUntil;
        this.landBlocks.set(blockId, { ...this.createEmptyBlock(blockId), greenhouseUntil });
        EventManager.getInstance().emit('landChanged');
        return buildingId;
    }

    speedUpGreenhouseCrop(slotId: number): boolean {
        const block = this.greenhouseBlocks.get(slotId);
        if (!block || block.state !== 'growing') return false;
        block.progress = 100;
        block.state = 'harvesting';
        EventManager.getInstance().emit('cropMatured', { blockId: 1000 + slotId, greenhouseSlotId: slotId, cropType: block.cropType });
        EventManager.getInstance().emit('greenhouseChanged');
        return true;
    }

    getBuildingProduction(slotId: number) {
        const slot = this.buildingSlots.get(slotId);
        if (!slot?.buildingId) return null;
        const production = BUILDING_PRODUCTION[slot.buildingId];
        if (!production) return null;
        const itemId = production.itemId || production.itemIds?.[
            (slot.buildingCollectCount || 0) % production.itemIds.length
        ];
        if (!itemId) return null;
        const duration = Math.max(1, production.duration * this.getBuildingProductionMultiplier());
        const lastTime = slot.buildingLastCollectTime || slot.buildingPlacedTime || Date.now();
        const elapsed = Math.max(0, (Date.now() - lastTime) / 1000);
        return {
            ...production,
            itemId,
            duration,
            ready: elapsed >= duration,
            remaining: Math.max(0, Math.ceil(duration - elapsed)),
        };
    }

    getCropGrowthMultiplier(): number {
        const decorations = this.countPlacedByCategory(ItemCategory.DECORATION);
        const bonus = Math.min(MAX_DECORATION_GROWTH_BONUS, decorations * DECORATION_GROWTH_BONUS);
        return 1 - bonus;
    }

    getBuildingProductionMultiplier(): number {
        const warehouses = this.countPlacedById('warehouse');
        const bonus = Math.min(MAX_WAREHOUSE_PRODUCTION_BONUS, warehouses * WAREHOUSE_PRODUCTION_BONUS);
        return 1 - bonus;
    }

    getHarvestExperience(baseExperience = 5): number {
        return baseExperience + this.countPlacedById('house');
    }

    getPlacementEffectText(itemId: string): string {
        const production = BUILDING_PRODUCTION[itemId];
        if (itemId === 'garden') return '轮换产出鲜花、向日葵、郁金香和玫瑰';
        if (production?.itemId) return `定时产出 ${getItem(production.itemId)?.name || production.itemId} x${production.count}`;
        if (itemId === 'warehouse') return '所有牧场生产耗时缩短10%，最多叠加30%';
        if (itemId === 'house') return '每次收获农作物额外获得1经验';
        if (itemId === 'fourSeasonGreenhouse') return '初始开放 1 个恒温花盆，其余位置可逐步解锁';
        if (getItem(itemId)?.category === ItemCategory.DECORATION) {
            return '农作物生长时间缩短1%，装饰总加成最多15%';
        }
        return '当前物品没有可触发的生产效果';
    }

    private countPlacedById(itemId: string): number {
        return this.getBuildingSlots().filter(slot => slot.buildingId === itemId).length;
    }

    private countPlacedByCategory(category: ItemCategory): number {
        return this.getBuildingSlots().filter(slot => getItem(slot.buildingId || '')?.category === category).length;
    }

    collectBuildingProduct(slotId: number): { itemId: string; count: number } | null {
        const slot = this.buildingSlots.get(slotId);
        const production = this.getBuildingProduction(slotId);
        if (!slot || !production?.ready) return null;
        slot.buildingLastCollectTime = Date.now();
        slot.buildingReadyNotified = false;
        slot.buildingCollectCount = (slot.buildingCollectCount || 0) + 1;
        EventManager.getInstance().emit('buildingCollected', {
            slotId,
            buildingId: slot.buildingId,
            itemId: production.itemId,
            count: production.count,
        });
        EventManager.getInstance().emit('pastureChanged');
        return { itemId: production.itemId, count: production.count };
    }

    getPlantableCrops(level: number) {
        return getPlantableCrops().filter(crop => crop.unlockLevel <= level);
    }

    private updateGrowth() {
        let landChanged = false;
        let pastureChanged = false;
        for (const slot of this.buildingSlots.values()) {
            if (slot.state !== 'occupied' || !slot.buildingId) continue;
            const production = this.getBuildingProduction(slot.id);
            if (production?.ready && !slot.buildingReadyNotified) {
                slot.buildingReadyNotified = true;
                pastureChanged = true;
                EventManager.getInstance().emit('buildingReady', {
                    slotId: slot.id,
                    buildingId: slot.buildingId,
                });
            }
        }
        for (const block of this.landBlocks.values()) {
            if (block.state !== 'growing' || !block.plantTime || !block.growthDuration) continue;

            const elapsed = (Date.now() - block.plantTime) / 1000;
            const nextProgress = Math.min(100, (elapsed / block.growthDuration) * 100);
            if (Math.floor(nextProgress) !== Math.floor(block.progress)) landChanged = true;
            block.progress = nextProgress;

            if (block.progress >= 100) {
                block.state = 'harvesting';
                landChanged = true;
                EventManager.getInstance().emit('cropMatured', { blockId: block.id, cropType: block.cropType });
            }
        }
        let greenhouseChanged = false;
        for (const block of this.greenhouseBlocks.values()) {
            if (block.state !== 'growing' || !block.plantTime || !block.growthDuration) continue;
            const elapsed = (Date.now() - block.plantTime) / 1000;
            const nextProgress = Math.min(100, (elapsed / block.growthDuration) * 100);
            if (Math.floor(nextProgress) !== Math.floor(block.progress)) greenhouseChanged = true;
            block.progress = nextProgress;
            if (block.progress >= 100) {
                block.state = 'harvesting';
                greenhouseChanged = true;
                EventManager.getInstance().emit('cropMatured', { blockId: 1000 + block.id, greenhouseSlotId: block.id, cropType: block.cropType });
            }
        }
        if (landChanged) EventManager.getInstance().emit('landChanged');
        if (pastureChanged) EventManager.getInstance().emit('pastureChanged');
        if (greenhouseChanged) EventManager.getInstance().emit('greenhouseChanged');
    }

    private resetBuildingSlots() {
        this.buildingSlots.clear();
        for (let i = 0; i < PASTURE_SLOT_COUNT; i++) {
            this.buildingSlots.set(i, this.createEmptyBlock(i));
        }
    }

    private migrateBuildingToPasture(source: LandBlock) {
        const target = this.getBuildingSlots().find(slot => this.isPastureSlotUnlocked(slot.id) && slot.state === 'empty');
        if (!target || !source.buildingId) return;
        this.buildingSlots.set(target.id, {
            id: target.id,
            state: 'occupied',
            progress: 0,
            buildingId: source.buildingId,
            buildingPlacedTime: source.buildingPlacedTime,
            buildingLastCollectTime: source.buildingLastCollectTime,
            buildingReadyNotified: source.buildingReadyNotified,
        });
    }

    private createEmptyBlock(id: number): LandBlock {
        return { id, state: 'empty', progress: 0 };
    }

    private syncGreenhouseBlocks(savedBlocks: LandBlock[] = [], resetUnlocks = false) {
        const greenhouseBuildingSlotIds = this.getBuildingSlots()
            .filter(slot => slot.state === 'occupied' && slot.buildingId === 'fourSeasonGreenhouse')
            .map(slot => slot.id);
        const validIds = greenhouseBuildingSlotIds.reduce<number[]>((ids, slotId) => {
            for (let index = 0; index < 6; index++) ids.push(slotId * 6 + index);
            return ids;
        }, []);
        const validIdSet = new Set(validIds);
        const sources = (savedBlocks.length > 0 ? savedBlocks : this.getGreenhouseBlocks())
            .slice()
            .sort((a, b) => a.id - b.id);
        const requiresLegacyMigration = sources.some(block => !validIdSet.has(block.id));
        const sourceById = new Map<number, LandBlock>();
        if (requiresLegacyMigration) {
            sources.slice(0, validIds.length).forEach((source, index) => sourceById.set(validIds[index], source));
        } else {
            sources.forEach(source => sourceById.set(source.id, source));
        }

        const nextBlocks = new Map<number, LandBlock>();
        validIds.forEach(id => {
            const source = sourceById.get(id);
            const localIndex = ((id % 6) + 6) % 6;
            const greenhouseUnlocked = resetUnlocks
                ? localIndex === 0 || (!!source && source.state !== 'empty')
                : source?.greenhouseUnlocked
                    ?? (localIndex === 0 || (!!source && source.state !== 'empty'));
            nextBlocks.set(id, source ? {
                id,
                state: source.state || 'empty',
                cropType: source.cropType,
                progress: source.progress || 0,
                plantTime: source.plantTime,
                growthDuration: source.growthDuration,
                greenhouseUnlocked,
            } : { ...this.createEmptyBlock(id), greenhouseUnlocked });
        });
        this.greenhouseBlocks = nextBlocks;
    }
}
