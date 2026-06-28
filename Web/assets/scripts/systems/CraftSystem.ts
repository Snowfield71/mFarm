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

@ccclass('CraftSystem')
export class CraftSystem extends Component {
    private static instance: CraftSystem;
    private activeCrafts: Map<number, CraftProcess> = new Map();
    private nextId = 0;
    private updateTimer = 0;
    private maxCraftTables = 1;

    static getInstance(): CraftSystem { return CraftSystem.instance; }

    onLoad() {
        CraftSystem.instance = this;
    }

    loadFromSave(processes: CraftProcess[] = [], nextCraftId: number = 0) {
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
        this.updateCrafts();
        EventManager.getInstance().emit('craftRestored');
    }

    exportSave(): { activeCrafts: CraftProcess[]; nextCraftId: number } {
        return {
            nextCraftId: this.nextId,
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
        const recipe = getRecipe(recipeId);
        if (!recipe) return -1;

        const inv = InventorySystem.getInstance();
        const gm = GameManager.getInstance();

        for (const material of recipe.materials) {
            if (!inv.hasItems(material.itemId, material.count)) {
                Logger.warn(TAG, `Not enough material: ${material.itemId}`);
                return -1;
            }
        }

        if (gm.playerLevel < recipe.requiredLevel) {
            Logger.warn(TAG, 'Level is too low');
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

    upgradeMaxTables() {
        if (this.maxCraftTables >= GameValues.MAX_CRAFT_TABLES) return;
        this.maxCraftTables++;
        EventManager.getInstance().emit('craftTablesChanged', this.maxCraftTables);
    }
}
