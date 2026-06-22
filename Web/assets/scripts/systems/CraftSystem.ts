import { _decorator, Component } from 'cc';
import { GameValues } from '../config/GameConfig';
import { getRecipe, RecipeDef } from '../config/RecipeConfig';
import { InventorySystem } from './InventorySystem';
import { GameManager } from '../core/GameManager';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';
const { ccclass } = _decorator;
const TAG = 'CraftSystem';

interface CraftProcess {
    craftId: number;
    recipeId: string;
    startTime: number;
    craftDuration: number; // 秒
    progress: number;      // 0-100
    isComplete: boolean;
}

/**
 * 合成系统
 */
@ccclass('CraftSystem')
export class CraftSystem extends Component {
    private static instance: CraftSystem;
    private activeCrafts: Map<number, CraftProcess> = new Map();
    private nextId: number = 0;
    private updateTimer: number = 0;
    private maxCraftTables: number = 1;

    static getInstance(): CraftSystem { return CraftSystem.instance; }
    onLoad() { CraftSystem.instance = this; }

    update(dt: number) {
        this.updateTimer += dt;
        if (this.updateTimer >= 0.2) {
            this.updateTimer = 0;
            this.updateCrafts();
        }
    }

    private updateCrafts() {
        for (const [id, process] of this.activeCrafts.entries()) {
            if (process.isComplete) continue;
            const elapsed = (Date.now() - process.startTime) / 1000;
            process.progress = Math.min(100, (elapsed / process.craftDuration) * 100);
            if (process.progress >= 100) {
                this.completeCraft(id);
            }
        }
    }

    /** 开始合成 */
    startCraft(recipeId: string): number {
        const recipe = getRecipe(recipeId);
        if (!recipe) return -1;

        const inv = InventorySystem.getInstance();
        const gm = GameManager.getInstance();

        // 检查材料
        for (const m of recipe.materials) {
            if (!inv.hasItems(m.itemId, m.count)) {
                Logger.warn(TAG, `材料不足: ${m.itemId}`);
                return -1;
            }
        }

        // 检查等级
        if (gm.playerLevel < recipe.requiredLevel) {
            Logger.warn(TAG, '等级不足');
            return -1;
        }

        // 消耗金币
        if (!gm.spendGold(recipe.cost)) {
            Logger.warn(TAG, '金币不足');
            return -1;
        }

        // 消耗材料
        for (const m of recipe.materials) {
            inv.removeItem(m.itemId, m.count);
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
        Logger.info(TAG, `开始合成: ${recipe.name}`);
        return craftId;
    }

    private completeCraft(craftId: number) {
        const process = this.activeCrafts.get(craftId);
        if (!process || process.isComplete) return;

        const recipe = getRecipe(process.recipeId)!;
        process.isComplete = true;

        // 添加产物
        InventorySystem.getInstance().addItem(recipe.product.itemId, recipe.product.count);
        // 加经验
        GameManager.getInstance().addExperience(recipe.exp);

        EventManager.getInstance().emit('craftCompleted', { craftId, recipe });
        Logger.info(TAG, `合成完成: ${recipe.name}`);
    }

    /** 加速合成 */
    speedUpCraft(craftId: number): boolean {
        const process = this.activeCrafts.get(craftId);
        if (!process || process.isComplete) return false;
        process.progress = 100;
        this.completeCraft(craftId);
        return true;
    }

    /** 获取活跃合成数 */
    getActiveCraftCount(): number {
        let count = 0;
        for (const p of this.activeCrafts.values()) {
            if (!p.isComplete) count++;
        }
        return count;
    }

    /** 获取所有活跃合成 */
    getAllActiveCrafts(): CraftProcess[] {
        return Array.from(this.activeCrafts.values()).filter(p => !p.isComplete);
    }

    /** 升级合成台数量 */
    upgradeMaxTables() {
        if (this.maxCraftTables < GameValues.MAX_CRAFT_TABLES) {
            this.maxCraftTables++;
            EventManager.getInstance().emit('craftTablesChanged', this.maxCraftTables);
        }
    }
}
