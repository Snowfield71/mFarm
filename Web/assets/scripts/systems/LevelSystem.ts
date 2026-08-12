import { _decorator, Component } from 'cc';
import { GameValues } from '../config/GameConfig';
import { getItemsByCategory, ItemCategory } from '../config/ItemConfig';
import { getAllRecipes, RecipeDef } from '../config/RecipeConfig';
const { ccclass } = _decorator;

/**
 * 等级系统 - 管理等级相关的解锁逻辑
 */
@ccclass('LevelSystem')
export class LevelSystem extends Component {
    private static instance: LevelSystem;

    static getInstance(): LevelSystem { return LevelSystem.instance; }
    onLoad() { LevelSystem.instance = this; }

    /** 获取当前等级可购买的种子 */
    getAvailableSeeds(level: number) {
        return getItemsByCategory(ItemCategory.CROP).filter(i => i.isCrop && i.unlockLevel <= level);
    }

    /** 获取当前等级可用的配方 */
    getAvailableRecipes(level: number): RecipeDef[] {
        return getAllRecipes().filter(r => r.requiredLevel <= level);
    }

    /** 获取总地块数 */
    getMaxLandBlocks(level: number): number {
        let max = GameValues.INITIAL_LAND;
        const levels = Object.keys(GameValues.LAND_UNLOCK).map(Number).sort((a, b) => a - b);
        for (const lv of levels) {
            if (level >= lv) max += GameValues.LAND_UNLOCK[lv];
        }
        return Math.min(max, GameValues.MAX_LAND);
    }

    /** 获取物品栏上限 */
    getMaxInventory(level: number, baseSlots: number): number {
        return baseSlots + Math.floor(level / 5) * 5;
    }
}
