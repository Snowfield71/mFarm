import { _decorator, Component } from 'cc';
import { GameValues, CropGrowthTimes, FARM_LAND_UNLOCK_ORDER } from '../config/GameConfig';
import { getItem, getPlantableCrops, ItemCategory } from '../config/ItemConfig';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';
import { ENFORCE_FARM_SEASON_RESTRICTION, isSeasonAllowed } from '../config/SeasonConfig';

const { ccclass } = _decorator;
const TAG = 'LandSystem';

export type LandState = 'empty' | 'growing' | 'harvesting' | 'occupied';

export interface LivestockProductionSlot {
    id: number;
    unlocked: boolean;
    lastCollectTime: number;
    readyNotified?: boolean;
    collectCount?: number;
    feedCount?: number;
}

export interface FlowerHouseProductionSlot {
    id: number;
    unlocked: boolean;
    flowerId?: string;
    plantedTime?: number;
}

export interface BeehiveProductionSlot {
    id: number;
    unlocked: boolean;
    flowerId?: string;
    startedTime?: number;
}

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
    livestockSlots?: LivestockProductionSlot[];
    flowerHouseSlots?: FlowerHouseProductionSlot[];
    beehiveSlots?: BeehiveProductionSlot[];
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
    // Hens lay one egg every 30 seconds and keep at most five eggs per cycle.
    chickenCoop: { itemId: 'egg', count: 5, duration: 150 },
    barn: { itemId: 'milk', count: 2, duration: 150 },
    well: { itemId: 'water', count: 2, duration: 140 },
    beehive: { itemId: 'honey', count: 1, duration: 180 },
    garden: { itemIds: ['flower', 'sunflower', 'tulip', 'rose'], count: 2, duration: 150 },
    tent: { itemId: 'speedTicket', count: 1, duration: 300 },
};

const FLOWER_HOUSE_PLANTING: Record<string, { cost: number; duration: number }> = {
    flower: { cost: 20, duration: 90 },
    sunflower: { cost: 30, duration: 120 },
    tulip: { cost: 40, duration: 150 },
    rose: { cost: 60, duration: 180 },
};
const FLOWER_HOUSE_SLOT_COUNT = 8;
const FLOWER_HOUSE_SLOT_UNLOCK_COSTS = [0, 500, 800, 1200, 1800, 2500, 3500, 4800];

const BEEHIVE_FLOWERS = ['flower', 'sunflower', 'tulip', 'rose'];
const BEEHIVE_SLOT_COUNT = 9;
const INITIAL_BEEHIVE_SLOTS = 2;
const BEEHIVE_SLOT_UNLOCK_COSTS = [0, 0, 600, 900, 1200, 1600, 2000, 2600, 3200];
const BEEHIVE_HONEY_DURATIONS: Record<string, number> = {
    flower: 120,
    sunflower: 160,
    tulip: 200,
    rose: 240,
};

const DECORATION_GROWTH_BONUS = 0.01;
const MAX_DECORATION_GROWTH_BONUS = 0.15;
const WAREHOUSE_PRODUCTION_BONUS = 0.1;
const MAX_WAREHOUSE_PRODUCTION_BONUS = 0.3;

const PASTURE_SLOT_COUNT = 12;
const INITIAL_PASTURE_SLOTS = [0, 1, 3, 4];
// Pasture expansion follows one deterministic prefix, just like farm land.
// Keep the original four starter pads, then unlock the remaining pad IDs in
// visual/numeric order. A later pad can never be unlocked before this prefix.
const PASTURE_SLOT_UNLOCK_ORDER = INITIAL_PASTURE_SLOTS.concat(
    Array.from({ length: PASTURE_SLOT_COUNT }, (_, id) => id)
        .filter(id => INITIAL_PASTURE_SLOTS.indexOf(id) < 0),
);
const LIVESTOCK_SLOT_COUNT = 4;
const CHICKEN_COOP_SLOT_COUNT = 3;
const LIVESTOCK_SLOT_UNLOCK_COSTS = [0, 600, 1200, 2400];
const LIVESTOCK_FEED_SECONDS: Record<string, number> = {
    wheat: 30,
    corn: 35,
    carrot: 25,
    beetroot: 45,
    sweetPotato: 40,
    pumpkin: 50,
};

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
        for (const id of FARM_LAND_UNLOCK_ORDER.slice(0, this.maxBlocks)) {
            this.landBlocks.set(id, this.createEmptyBlock(id));
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
        const validSaved = new Set(
            unlockedSource.filter(id => Number.isInteger(id) && id >= 0 && id < PASTURE_SLOT_COUNT),
        );
        // Repair legacy/non-sequential saves to a contiguous unlock prefix.
        // Using the furthest saved order position preserves every formerly
        // unlocked/occupied pad while filling any skipped predecessors.
        const furthestSavedOrder = PASTURE_SLOT_UNLOCK_ORDER.reduce(
            (furthest, id, order) => validSaved.has(id) ? Math.max(furthest, order) : furthest,
            INITIAL_PASTURE_SLOTS.length - 1,
        );
        this.pastureUnlockedSlots = new Set(
            PASTURE_SLOT_UNLOCK_ORDER.slice(0, furthestSavedOrder + 1),
        );
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
                livestockSlots: source.livestockSlots?.map(livestockSlot => ({
                    id: livestockSlot.id,
                    unlocked: !!livestockSlot.unlocked,
                    lastCollectTime: livestockSlot.lastCollectTime || source.buildingLastCollectTime || source.buildingPlacedTime || Date.now(),
                    readyNotified: !!livestockSlot.readyNotified,
                    collectCount: Math.max(0, livestockSlot.collectCount || 0),
                    feedCount: Math.max(0, Math.min(3, livestockSlot.feedCount || 0)),
                })),
                flowerHouseSlots: source.flowerHouseSlots?.slice(0, FLOWER_HOUSE_SLOT_COUNT).map((flowerSlot, index) => ({
                    id: index,
                    unlocked: typeof flowerSlot.unlocked === 'boolean'
                        ? flowerSlot.unlocked
                        : index === 0 || !!flowerSlot.flowerId,
                    flowerId: ['flower', 'sunflower', 'tulip', 'rose'].indexOf(flowerSlot.flowerId || '') >= 0
                        ? flowerSlot.flowerId
                        : undefined,
                    plantedTime: flowerSlot.plantedTime,
                })),
                beehiveSlots: source.beehiveSlots?.slice(0, BEEHIVE_SLOT_COUNT).map((beehiveSlot, index) => ({
                    id: index,
                    unlocked: typeof beehiveSlot.unlocked === 'boolean'
                        ? beehiveSlot.unlocked
                        : index < INITIAL_BEEHIVE_SLOTS || !!beehiveSlot.flowerId,
                    flowerId: BEEHIVE_FLOWERS.indexOf(beehiveSlot.flowerId || '') >= 0
                        ? beehiveSlot.flowerId
                        : undefined,
                    startedTime: beehiveSlot.startedTime,
                })),
            });
        }
        this.syncGreenhouseBlocks(savedGreenhouseBlocks, resetGreenhouseUnlocks);

        for (let i = 0; i < count; i++) {
            const source = blocks[i];
            const fallbackId = FARM_LAND_UNLOCK_ORDER[i];
            const id = source && Number.isInteger(source.id) && source.id >= 0 && source.id < GameValues.MAX_LAND
                ? source.id
                : fallbackId;
            if (id === undefined) continue;
            if (!source) {
                this.landBlocks.set(id, this.createEmptyBlock(id));
                continue;
            }
            if (source.state === 'occupied' && source.buildingId) {
                this.migrateBuildingToPasture(source);
                this.landBlocks.set(id, this.createEmptyBlock(id));
                continue;
            }
            this.landBlocks.set(id, {
                id,
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
            buildingSlots: this.getBuildingSlots().map(slot => ({
                ...slot,
                livestockSlots: slot.livestockSlots?.map(livestockSlot => ({ ...livestockSlot })),
                flowerHouseSlots: slot.flowerHouseSlots?.map(flowerSlot => ({ ...flowerSlot })),
                beehiveSlots: slot.beehiveSlots?.map(beehiveSlot => ({ ...beehiveSlot })),
            })),
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

    getNextPastureUnlockSlotId(): number | null {
        return PASTURE_SLOT_UNLOCK_ORDER.find(id => !this.pastureUnlockedSlots.has(id)) ?? null;
    }

    expandPastureSlot(slotId: number): boolean {
        if (!this.buildingSlots.has(slotId) || this.pastureUnlockedSlots.has(slotId)) return false;
        if (slotId !== this.getNextPastureUnlockSlotId()) return false;
        this.pastureUnlockedSlots.add(slotId);
        EventManager.getInstance().emit('pastureExpanded', { slotId, count: this.pastureUnlockedSlots.size });
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    getUnlockedCount(): number {
        return this.maxBlocks;
    }

    getNextUnlockBlockId(): number | null {
        return FARM_LAND_UNLOCK_ORDER[this.maxBlocks] ?? null;
    }

    expandBlocks(newMax: number) {
        const target = Math.min(Math.max(newMax, this.maxBlocks), GameValues.MAX_LAND);
        if (target === this.maxBlocks) return;

        for (let i = this.maxBlocks; i < target; i++) {
            const id = FARM_LAND_UNLOCK_ORDER[i];
            if (id !== undefined) this.landBlocks.set(id, this.createEmptyBlock(id));
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
        slot.livestockSlots = this.isLivestockBuilding(buildingId)
            ? this.createLivestockSlots(buildingId, slot.buildingPlacedTime)
            : undefined;
        slot.flowerHouseSlots = buildingId === 'garden'
            ? this.createFlowerHouseSlots()
            : undefined;
        slot.beehiveSlots = buildingId === 'beehive'
            ? this.createBeehiveSlots()
            : undefined;
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
        if (slot.buildingId === 'garden') {
            const states = this.ensureFlowerHouseSlots(slot)
                .map(flowerSlot => this.getFlowerHouseSlotProduction(slotId, flowerSlot.id))
                .filter((state): state is NonNullable<typeof state> => !!state);
            if (states.length === 0) return null;
            return states.find(state => state.ready)
                || states.reduce((nearest, state) => state.remaining < nearest.remaining ? state : nearest);
        }
        if (slot.buildingId === 'beehive') {
            const states = this.ensureBeehiveSlots(slot)
                .map(beehiveSlot => this.getBeehiveSlotProduction(slotId, beehiveSlot.id))
                .filter((state): state is NonNullable<typeof state> => !!state);
            if (states.length === 0) return null;
            return states.find(state => state.ready)
                || states.reduce((nearest, state) => state.remaining < nearest.remaining ? state : nearest);
        }
        if (this.isLivestockBuilding(slot.buildingId)) {
            const states = this.ensureLivestockSlots(slot)
                .filter(livestockSlot => livestockSlot.unlocked)
                .map(livestockSlot => this.getLivestockSlotProduction(slotId, livestockSlot.id))
                .filter((state): state is NonNullable<typeof state> => !!state);
            if (states.length === 0) return null;
            return states.find(state => state.ready)
                || states.reduce((nearest, state) => state.remaining < nearest.remaining ? state : nearest);
        }
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

    getFlowerHouseSlots(buildingSlotId: number): FlowerHouseProductionSlot[] {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'garden') return [];
        return this.ensureFlowerHouseSlots(slot).map(flowerSlot => ({ ...flowerSlot }));
    }

    getFlowerHouseSlotProduction(buildingSlotId: number, flowerSlotId: number) {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'garden') return null;
        const flowerSlot = this.ensureFlowerHouseSlots(slot)[flowerSlotId];
        if (!flowerSlot?.unlocked || !flowerSlot.flowerId || !flowerSlot.plantedTime) return null;
        const flowerConfig = FLOWER_HOUSE_PLANTING[flowerSlot.flowerId];
        const duration = Math.max(
            1,
            (flowerConfig?.duration ?? BUILDING_PRODUCTION.garden.duration) *
                this.getBuildingProductionMultiplier(),
        );
        const elapsed = Math.max(0, (Date.now() - flowerSlot.plantedTime) / 1000);
        return {
            itemId: flowerSlot.flowerId,
            count: 1,
            duration,
            ready: elapsed >= duration,
            remaining: Math.max(0, Math.ceil(duration - elapsed)),
        };
    }

    getFlowerHousePlantCost(flowerId: string): number {
        return FLOWER_HOUSE_PLANTING[flowerId]?.cost ?? 20;
    }

    getFlowerHouseSlotUnlockCost(flowerSlotId: number): number {
        return FLOWER_HOUSE_SLOT_UNLOCK_COSTS[flowerSlotId]
            ?? FLOWER_HOUSE_SLOT_UNLOCK_COSTS[FLOWER_HOUSE_SLOT_UNLOCK_COSTS.length - 1];
    }

    unlockFlowerHouseSlot(buildingSlotId: number, flowerSlotId: number): boolean {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'garden') return false;
        const slots = this.ensureFlowerHouseSlots(slot);
        const target = slots[flowerSlotId];
        if (!target || target.unlocked) return false;
        if (flowerSlotId > 0 && !slots[flowerSlotId - 1]?.unlocked) return false;
        target.unlocked = true;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    plantFlowerHouseSlot(
        buildingSlotId: number,
        flowerSlotId: number,
        flowerId: string,
    ): boolean {
        if (['flower', 'sunflower', 'tulip', 'rose'].indexOf(flowerId) < 0) return false;
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'garden') return false;
        const flowerSlot = this.ensureFlowerHouseSlots(slot)[flowerSlotId];
        if (!flowerSlot?.unlocked || flowerSlot.flowerId) return false;
        flowerSlot.flowerId = flowerId;
        flowerSlot.plantedTime = Date.now();
        slot.buildingReadyNotified = false;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    clearFlowerHouseSlot(buildingSlotId: number, flowerSlotId: number): boolean {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'garden') return false;
        const flowerSlot = this.ensureFlowerHouseSlots(slot)[flowerSlotId];
        if (!flowerSlot?.flowerId) return false;
        flowerSlot.flowerId = undefined;
        flowerSlot.plantedTime = undefined;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    finishFlowerHouseSlot(buildingSlotId: number, flowerSlotId: number): boolean {
        const slot = this.buildingSlots.get(buildingSlotId);
        const production = this.getFlowerHouseSlotProduction(buildingSlotId, flowerSlotId);
        if (!slot || slot.buildingId !== 'garden' || !production || production.ready) return false;
        const flowerSlot = this.ensureFlowerHouseSlots(slot)[flowerSlotId];
        if (!flowerSlot?.plantedTime) return false;
        // Keep the normal production calculation authoritative by moving the
        // planted timestamp back by exactly one completed production cycle.
        flowerSlot.plantedTime = Date.now() - production.duration * 1000;
        slot.buildingReadyNotified = false;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    collectFlowerHouseSlot(
        buildingSlotId: number,
        flowerSlotId: number,
    ): { itemId: string; count: number } | null {
        const slot = this.buildingSlots.get(buildingSlotId);
        const production = this.getFlowerHouseSlotProduction(buildingSlotId, flowerSlotId);
        if (!slot || slot.buildingId !== 'garden' || !production?.ready) return null;
        const flowerSlot = this.ensureFlowerHouseSlots(slot)[flowerSlotId];
        const harvestCount = 1 + Math.floor(Math.random() * 3);
        flowerSlot.flowerId = undefined;
        flowerSlot.plantedTime = undefined;
        slot.buildingReadyNotified = false;
        slot.buildingCollectCount = (slot.buildingCollectCount || 0) + 1;
        EventManager.getInstance().emit('buildingCollected', {
            slotId: buildingSlotId,
            buildingId: 'garden',
            itemId: production.itemId,
            count: harvestCount,
        });
        EventManager.getInstance().emit('pastureChanged');
        return { itemId: production.itemId, count: harvestCount };
    }

    getBeehiveSlots(buildingSlotId: number): BeehiveProductionSlot[] {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'beehive') return [];
        return this.ensureBeehiveSlots(slot).map(beehiveSlot => ({ ...beehiveSlot }));
    }

    getBeehiveSlotUnlockCost(beehiveSlotId: number): number {
        return BEEHIVE_SLOT_UNLOCK_COSTS[beehiveSlotId]
            ?? BEEHIVE_SLOT_UNLOCK_COSTS[BEEHIVE_SLOT_UNLOCK_COSTS.length - 1];
    }

    unlockBeehiveSlot(buildingSlotId: number, beehiveSlotId: number): boolean {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'beehive') return false;
        const slots = this.ensureBeehiveSlots(slot);
        const target = slots[beehiveSlotId];
        if (!target || target.unlocked) return false;
        if (beehiveSlotId > 0 && !slots[beehiveSlotId - 1]?.unlocked) return false;
        target.unlocked = true;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    getBeehiveSlotProduction(buildingSlotId: number, beehiveSlotId: number) {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'beehive') return null;
        const beehiveSlot = this.ensureBeehiveSlots(slot)[beehiveSlotId];
        if (!beehiveSlot?.unlocked || !beehiveSlot.flowerId || !beehiveSlot.startedTime) return null;
        const definition = BUILDING_PRODUCTION.beehive;
        const duration = Math.max(
            1,
            (BEEHIVE_HONEY_DURATIONS[beehiveSlot.flowerId] || definition.duration)
                * this.getBuildingProductionMultiplier(),
        );
        const elapsed = Math.max(0, (Date.now() - beehiveSlot.startedTime) / 1000);
        return {
            itemId: definition.itemId || 'honey',
            sourceFlowerId: beehiveSlot.flowerId,
            count: definition.count,
            duration,
            ready: elapsed >= duration,
            remaining: Math.max(0, Math.ceil(duration - elapsed)),
        };
    }

    feedBeehiveSlot(
        buildingSlotId: number,
        beehiveSlotId: number,
        flowerId: string,
    ): boolean {
        if (BEEHIVE_FLOWERS.indexOf(flowerId) < 0) return false;
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || slot.buildingId !== 'beehive') return false;
        const beehiveSlot = this.ensureBeehiveSlots(slot)[beehiveSlotId];
        if (!beehiveSlot?.unlocked || beehiveSlot.flowerId) return false;
        beehiveSlot.flowerId = flowerId;
        beehiveSlot.startedTime = Date.now();
        slot.buildingReadyNotified = false;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    finishBeehiveSlot(buildingSlotId: number, beehiveSlotId: number): boolean {
        const slot = this.buildingSlots.get(buildingSlotId);
        const production = this.getBeehiveSlotProduction(buildingSlotId, beehiveSlotId);
        if (!slot || slot.buildingId !== 'beehive' || !production || production.ready) return false;
        const beehiveSlot = this.ensureBeehiveSlots(slot)[beehiveSlotId];
        if (!beehiveSlot?.startedTime) return false;
        beehiveSlot.startedTime = Date.now() - production.duration * 1000;
        slot.buildingReadyNotified = false;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    collectBeehiveSlot(
        buildingSlotId: number,
        beehiveSlotId: number,
    ): { itemId: string; count: number } | null {
        const slot = this.buildingSlots.get(buildingSlotId);
        const production = this.getBeehiveSlotProduction(buildingSlotId, beehiveSlotId);
        if (!slot || slot.buildingId !== 'beehive' || !production?.ready) return null;
        const beehiveSlot = this.ensureBeehiveSlots(slot)[beehiveSlotId];
        beehiveSlot.flowerId = undefined;
        beehiveSlot.startedTime = undefined;
        slot.buildingReadyNotified = false;
        slot.buildingCollectCount = (slot.buildingCollectCount || 0) + 1;
        EventManager.getInstance().emit('buildingCollected', {
            slotId: buildingSlotId,
            beehiveSlotId,
            buildingId: 'beehive',
            itemId: production.itemId,
            count: production.count,
        });
        EventManager.getInstance().emit('pastureChanged');
        return { itemId: production.itemId, count: production.count };
    }

    getLivestockSlots(buildingSlotId: number): LivestockProductionSlot[] {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || !this.isLivestockBuilding(slot.buildingId)) return [];
        return this.ensureLivestockSlots(slot).map(livestockSlot => ({ ...livestockSlot }));
    }

    getLivestockSlotUnlockCost(livestockSlotId: number): number {
        return LIVESTOCK_SLOT_UNLOCK_COSTS[livestockSlotId] ?? LIVESTOCK_SLOT_UNLOCK_COSTS[LIVESTOCK_SLOT_UNLOCK_COSTS.length - 1];
    }

    getLivestockSlotProduction(buildingSlotId: number, livestockSlotId: number) {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot?.buildingId || !this.isLivestockBuilding(slot.buildingId)) return null;
        const livestockSlot = this.ensureLivestockSlots(slot).find(candidate => candidate.id === livestockSlotId);
        if (!livestockSlot?.unlocked) return null;
        const production = BUILDING_PRODUCTION[slot.buildingId];
        const itemId = production.itemId;
        if (!itemId) return null;
        const duration = Math.max(1, production.duration * this.getBuildingProductionMultiplier());
        const elapsed = Math.max(0, (Date.now() - livestockSlot.lastCollectTime) / 1000);
        if (slot.buildingId === 'chickenCoop') {
            const eggInterval = duration / production.count;
            const producedCount = Math.min(
                production.count,
                Math.floor(elapsed / eggInterval),
            );
            const nextEggAt = Math.min(
                duration,
                Math.max(eggInterval, (producedCount + 1) * eggInterval),
            );
            return {
                ...production,
                count: producedCount,
                producedCount,
                itemId,
                duration,
                livestockSlotId,
                feedCount: livestockSlot.feedCount || 0,
                ready: producedCount > 0,
                remaining: producedCount >= production.count
                    ? 0
                    : Math.max(0, Math.ceil(nextEggAt - elapsed)),
            };
        }
        return {
            ...production,
            itemId,
            duration,
            livestockSlotId,
            feedCount: livestockSlot.feedCount || 0,
            producedCount: elapsed >= duration ? production.count : 0,
            ready: elapsed >= duration,
            remaining: Math.max(0, Math.ceil(duration - elapsed)),
        };
    }

    unlockLivestockSlot(buildingSlotId: number, livestockSlotId: number): boolean {
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!slot || !this.isLivestockBuilding(slot.buildingId)) return false;
        const slots = this.ensureLivestockSlots(slot);
        const target = slots.find(candidate => candidate.id === livestockSlotId);
        if (!target || target.unlocked || (livestockSlotId > 0 && !slots[livestockSlotId - 1]?.unlocked)) return false;
        target.unlocked = true;
        target.lastCollectTime = Date.now();
        target.readyNotified = false;
        target.feedCount = 0;
        EventManager.getInstance().emit('pastureChanged');
        return true;
    }

    feedLivestockSlot(buildingSlotId: number, livestockSlotId: number, feedItemId: string): number {
        const seconds = LIVESTOCK_FEED_SECONDS[feedItemId] || 0;
        const slot = this.buildingSlots.get(buildingSlotId);
        if (!seconds || !slot || !this.isLivestockBuilding(slot.buildingId)) return 0;
        const livestockSlot = this.ensureLivestockSlots(slot).find(candidate => candidate.id === livestockSlotId);
        if (!livestockSlot?.unlocked) return 0;
        if (slot.buildingId === 'barn' && (livestockSlot.feedCount || 0) >= 3) return 0;
        const state = this.getLivestockSlotProduction(buildingSlotId, livestockSlotId);
        if (!state || state.ready) return 0;
        const appliedSeconds = Math.min(seconds, state.remaining);
        livestockSlot.lastCollectTime -= appliedSeconds * 1000;
        livestockSlot.readyNotified = false;
        if (slot.buildingId === 'barn') {
            livestockSlot.feedCount = (livestockSlot.feedCount || 0) + 1;
        }
        EventManager.getInstance().emit('pastureChanged');
        return appliedSeconds;
    }

    collectLivestockSlotProduct(buildingSlotId: number, livestockSlotId: number): { itemId: string; count: number } | null {
        const slot = this.buildingSlots.get(buildingSlotId);
        const production = this.getLivestockSlotProduction(buildingSlotId, livestockSlotId);
        if (!slot || !production?.ready) return null;
        const livestockSlot = this.ensureLivestockSlots(slot).find(candidate => candidate.id === livestockSlotId);
        if (!livestockSlot) return null;
        livestockSlot.lastCollectTime = Date.now();
        livestockSlot.readyNotified = false;
        livestockSlot.collectCount = (livestockSlot.collectCount || 0) + 1;
        livestockSlot.feedCount = 0;
        slot.buildingLastCollectTime = livestockSlot.lastCollectTime;
        slot.buildingCollectCount = (slot.buildingCollectCount || 0) + 1;
        EventManager.getInstance().emit('buildingCollected', {
            slotId: buildingSlotId,
            livestockSlotId,
            buildingId: slot.buildingId,
            itemId: production.itemId,
            count: production.count,
        });
        EventManager.getInstance().emit('pastureChanged');
        return { itemId: production.itemId, count: production.count };
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
        if (itemId === 'garden') return '四个花位可独立培育鲜花、向日葵、郁金香和玫瑰';
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
        if (slot?.buildingId === 'garden') {
            const readySlot = this.ensureFlowerHouseSlots(slot)
                .find(candidate => this.getFlowerHouseSlotProduction(slotId, candidate.id)?.ready);
            return readySlot ? this.collectFlowerHouseSlot(slotId, readySlot.id) : null;
        }
        if (slot?.buildingId === 'beehive') {
            const readySlot = this.ensureBeehiveSlots(slot)
                .find(candidate => this.getBeehiveSlotProduction(slotId, candidate.id)?.ready);
            return readySlot ? this.collectBeehiveSlot(slotId, readySlot.id) : null;
        }
        if (slot && this.isLivestockBuilding(slot.buildingId)) {
            const readySlot = this.ensureLivestockSlots(slot)
                .find(candidate => candidate.unlocked && this.getLivestockSlotProduction(slotId, candidate.id)?.ready);
            return readySlot ? this.collectLivestockSlotProduct(slotId, readySlot.id) : null;
        }
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
            if (this.isLivestockBuilding(slot.buildingId)) {
                for (const livestockSlot of this.ensureLivestockSlots(slot)) {
                    if (!livestockSlot.unlocked) continue;
                    const production = this.getLivestockSlotProduction(slot.id, livestockSlot.id);
                    if (production?.ready && !livestockSlot.readyNotified) {
                        livestockSlot.readyNotified = true;
                        pastureChanged = true;
                        EventManager.getInstance().emit('buildingReady', {
                            slotId: slot.id,
                            livestockSlotId: livestockSlot.id,
                            buildingId: slot.buildingId,
                        });
                    }
                }
                continue;
            }
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
            livestockSlots: source.livestockSlots?.map(slot => ({ ...slot })),
            flowerHouseSlots: source.flowerHouseSlots?.map(slot => ({ ...slot })),
            beehiveSlots: source.beehiveSlots?.map(slot => ({ ...slot })),
        });
    }

    private isLivestockBuilding(buildingId: string | undefined): buildingId is 'chickenCoop' | 'barn' {
        return buildingId === 'chickenCoop' || buildingId === 'barn';
    }

    private createLivestockSlots(
        buildingId: string | undefined,
        startTime = Date.now(),
    ): LivestockProductionSlot[] {
        return Array.from({ length: this.getLivestockSlotCount(buildingId) }, (_, id) => ({
            id,
            unlocked: id === 0 || (buildingId === 'barn' && id === 1),
            lastCollectTime: startTime,
            readyNotified: false,
            collectCount: 0,
            feedCount: 0,
        }));
    }

    private createFlowerHouseSlots(): FlowerHouseProductionSlot[] {
        return Array.from({ length: FLOWER_HOUSE_SLOT_COUNT }, (_, id) => ({
            id,
            unlocked: id === 0,
        }));
    }

    private createBeehiveSlots(): BeehiveProductionSlot[] {
        return Array.from({ length: BEEHIVE_SLOT_COUNT }, (_, id) => ({
            id,
            unlocked: id < INITIAL_BEEHIVE_SLOTS,
        }));
    }

    private ensureFlowerHouseSlots(slot: LandBlock): FlowerHouseProductionSlot[] {
        if (!slot.flowerHouseSlots?.length) {
            slot.flowerHouseSlots = this.createFlowerHouseSlots();
        }
        while (slot.flowerHouseSlots.length < FLOWER_HOUSE_SLOT_COUNT) {
            const id = slot.flowerHouseSlots.length;
            slot.flowerHouseSlots.push({ id, unlocked: id === 0 });
        }
        if (slot.flowerHouseSlots.length > FLOWER_HOUSE_SLOT_COUNT) {
            slot.flowerHouseSlots = slot.flowerHouseSlots.slice(0, FLOWER_HOUSE_SLOT_COUNT);
        }
        slot.flowerHouseSlots.forEach((flowerSlot, index) => {
            flowerSlot.id = index;
            if (typeof flowerSlot.unlocked !== 'boolean') {
                flowerSlot.unlocked = index === 0 || !!flowerSlot.flowerId;
            }
        });
        return slot.flowerHouseSlots;
    }

    private ensureBeehiveSlots(slot: LandBlock): BeehiveProductionSlot[] {
        if (!slot.beehiveSlots?.length) {
            slot.beehiveSlots = this.createBeehiveSlots();
            // Preserve the legacy single-timer beehive as the first active
            // hive when loading a save created before independent slots.
            const legacyStartedTime = slot.buildingLastCollectTime || slot.buildingPlacedTime;
            if (legacyStartedTime) {
                slot.beehiveSlots[0].flowerId = 'flower';
                slot.beehiveSlots[0].startedTime = legacyStartedTime;
            }
        }
        while (slot.beehiveSlots.length < BEEHIVE_SLOT_COUNT) {
            const id = slot.beehiveSlots.length;
            slot.beehiveSlots.push({
                id,
                unlocked: id < INITIAL_BEEHIVE_SLOTS,
            });
        }
        if (slot.beehiveSlots.length > BEEHIVE_SLOT_COUNT) {
            slot.beehiveSlots = slot.beehiveSlots.slice(0, BEEHIVE_SLOT_COUNT);
        }
        slot.beehiveSlots.forEach((beehiveSlot, index) => {
            beehiveSlot.id = index;
            if (typeof beehiveSlot.unlocked !== 'boolean') {
                // Existing saves had no lock state. Keep any active legacy
                // production accessible, while new empty slots follow the
                // two-default-hives rule.
                beehiveSlot.unlocked = index < INITIAL_BEEHIVE_SLOTS || !!beehiveSlot.flowerId;
            }
        });
        return slot.beehiveSlots;
    }

    private ensureLivestockSlots(slot: LandBlock): LivestockProductionSlot[] {
        const expectedSlotCount = this.getLivestockSlotCount(slot.buildingId);
        if (!slot.livestockSlots?.length) {
            slot.livestockSlots = this.createLivestockSlots(
                slot.buildingId,
                slot.buildingLastCollectTime || slot.buildingPlacedTime || Date.now(),
            );
        }
        while (slot.livestockSlots.length < expectedSlotCount) {
            const id = slot.livestockSlots.length;
            slot.livestockSlots.push({
                id,
                unlocked: false,
                lastCollectTime: Date.now(),
                readyNotified: false,
                collectCount: 0,
                feedCount: 0,
            });
        }
        // Chicken coop has exactly three visible/usable positions. Trim the
        // legacy fourth placeholder so it cannot keep producing off-screen.
        if (slot.livestockSlots.length > expectedSlotCount) {
            slot.livestockSlots = slot.livestockSlots.slice(0, expectedSlotCount);
        }
        slot.livestockSlots[0].unlocked = true;
        if (slot.buildingId === 'barn' && slot.livestockSlots[1]) {
            slot.livestockSlots[1].unlocked = true;
        }
        return slot.livestockSlots;
    }

    private getLivestockSlotCount(buildingId: string | undefined): number {
        return buildingId === 'chickenCoop'
            ? CHICKEN_COOP_SLOT_COUNT
            : LIVESTOCK_SLOT_COUNT;
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
