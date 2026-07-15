import { _decorator, Component } from 'cc';
import { GameValues } from '../config/GameConfig';
import { getRecipe } from '../config/RecipeConfig';
import { InventorySystem } from './InventorySystem';
import { GameManager } from '../core/GameManager';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';

const { ccclass } = _decorator;
const TAG = 'CraftSystem';

export interface CraftProcess {
    craftId: number;
    recipeId: string;
    startTime: number;
    craftDuration: number;
    progress: number;
    isComplete: boolean;
}

export type CraftStartError = 'none' | 'recipe' | 'level' | 'materials' | 'gold' | 'capacity';

@ccclass('CraftSystem')
export class CraftSystem extends Component {
    private static instance: CraftSystem;
    private activeCrafts: Map<number, CraftProcess> = new Map();
    private nextId = 0;
    private updateTimer = 0;
    private maxCraftTables = 1;
    private lastStartError: CraftStartError = 'none';

    static getInstance(): CraftSystem { return CraftSystem.instance; }

    onLoad() {
        CraftSystem.instance = this;
    }

    loadFromSave(processes: CraftProcess[] = [], nextCraftId: number = 0, maxCraftTables: number = 1) {
        this.activeCrafts.clear();
        let maxId = -1;
        for (const process of processes) {
            if (!getRecipe(process.recipeId)) continue;
            const craftId = Number(process.craftId);
            maxId = Math.max(maxId, craftId);
            this.activeCrafts.set(craftId, {
                craftId,
                recipeId: process.recipeId,
                startTime: process.startTime || Date.now(),
                craftDuration: process.craftDuration || 1,
                progress: process.progress || 0,
                isComplete: !!process.isComplete,
            });
        }
        this.nextId = Math.max(nextCraftId || 0, maxId + 1);
        this.maxCraftTables = Math.max(1, Math.min(GameValues.MAX_CRAFT_TABLES, maxCraftTables || 1));
        this.updateCrafts();
        EventManager.getInstance().emit('craftRestored');
    }

    exportSave(): { activeCrafts: CraftProcess[]; nextCraftId: number; maxCraftTables: number } {
        return {
            nextCraftId: this.nextId,
            maxCraftTables: this.maxCraftTables,
            activeCrafts: Array.from(this.activeCrafts.values())
                .filter(process => !process.isComplete)
                .map(process => ({ ...process })),
        };
    }

    update(dt: number) {
        this.updateTimer += dt;
        if (this.updateTimer < 0.2) return;
        this.updateTimer = 0;
        this.updateCrafts();
    }

    private updateCrafts() {
        for (const [id, process] of this.activeCrafts.entries()) {
            if (process.isComplete) continue;
            const elapsed = (Date.now() - process.startTime) / 1000;
            process.progress = Math.min(100, (elapsed / process.craftDuration) * 100);
            if (process.progress >= 100) this.completeCraft(id);
        }
    }

    startCraft(recipeId: string): number {
        this.lastStartError = 'none';
        const recipe = getRecipe(recipeId);
        if (!recipe) {
            this.lastStartError = 'recipe';
            return -1;
        }

        const inv = InventorySystem.getInstance();
        const gm = GameManager.getInstance();

        if (gm.playerLevel < recipe.requiredLevel) {
            this.lastStartError = 'level';
            return -1;
        }

        if (this.getActiveCraftCount() >= this.maxCraftTables) {
            this.lastStartError = 'capacity';
            return -1;
        }

        for (const material of recipe.materials) {
            if (!inv.hasItems(material.itemId, material.count)) {
                Logger.warn(TAG, `Not enough material: ${material.itemId}`);
                this.lastStartError = 'materials';
                return -1;
            }
        }

        if (gm.gold < recipe.cost) {
            this.lastStartError = 'gold';
            return -1;
        }

        if (recipe.cost > 0 && !gm.spendGold(recipe.cost)) {
            this.lastStartError = 'gold';
            return -1;
        }
        for (const material of recipe.materials) {
            inv.removeItem(material.itemId, material.count);
        }

        const craftId = this.nextId++;
        this.activeCrafts.set(craftId, {
            craftId,
            recipeId,
            startTime: Date.now(),
            craftDuration: recipe.craftTime,
            progress: 0,
            isComplete: false,
        });

        EventManager.getInstance().emit('craftStarted', { craftId, recipe });
        Logger.info(TAG, `Craft started: ${recipe.name}`);
        return craftId;
    }

    private completeCraft(craftId: number) {
        const process = this.activeCrafts.get(craftId);
        if (!process || process.isComplete) return;

        const recipe = getRecipe(process.recipeId);
        if (!recipe) return;

        process.isComplete = true;
        InventorySystem.getInstance().addItem(recipe.product.itemId, recipe.product.count);
        GameManager.getInstance().addExperience(recipe.exp);

        this.activeCrafts.delete(craftId);
        EventManager.getInstance().emit('craftCompleted', { craftId, recipe });
        Logger.info(TAG, `Craft completed: ${recipe.name}`);
    }

    speedUpCraft(craftId: number): boolean {
        const process = this.activeCrafts.get(craftId);
        if (!process || process.isComplete) return false;
        process.progress = 100;
        this.completeCraft(craftId);
        return true;
    }

    getActiveCraftCount(): number {
        let count = 0;
        for (const process of this.activeCrafts.values()) {
            if (!process.isComplete) count++;
        }
        return count;
    }

    getAllActiveCrafts(): CraftProcess[] {
        return Array.from(this.activeCrafts.values()).filter(process => !process.isComplete);
    }

    accelerateCraft(craftId: number, seconds: number): boolean {
        const process = this.activeCrafts.get(craftId);
        if (!process || process.isComplete || seconds <= 0) return false;
        process.startTime -= seconds * 1000;
        this.updateCrafts();
        EventManager.getInstance().emit('craftAccelerated', { craftId, seconds });
        return true;
    }

    useSpeedTicket(craftId: number): boolean {
        const process = this.activeCrafts.get(craftId);
        if (!process || process.isComplete) return false;
        const inventory = InventorySystem.getInstance();
        if (!inventory.hasItems('speedTicket', 1)) return false;
        if (!this.accelerateCraft(craftId, GameValues.SPEEDUP_DURATION)) return false;
        inventory.removeItem('speedTicket', 1);
        return true;
    }

    getMaxCraftTables(): number { return this.maxCraftTables; }

    getLastStartError(): CraftStartError { return this.lastStartError; }

    getCraftTableUpgradeCost(): number {
        return GameValues.CRAFT_TABLE_COST * this.maxCraftTables;
    }

    upgradeMaxTables(): boolean {
        if (this.maxCraftTables >= GameValues.MAX_CRAFT_TABLES) return false;
        const gm = GameManager.getInstance();
        if (!gm.spendGold(this.getCraftTableUpgradeCost())) return false;
        this.maxCraftTables++;
        EventManager.getInstance().emit('craftTablesChanged', this.maxCraftTables);
        return true;
    }
}
