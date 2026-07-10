import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

export interface SaveData {
    playerLevel: number;
    gold: number;
    diamond: number;
    experience: number;
    landBlocks: any[];
    plantCounts?: Record<string, number>;
    inventory: Array<{ itemId: string; count: number }>;
    inventoryMaxSlots?: number;
    activeCrafts?: any[];
    nextCraftId?: number;
    unlockedRecipes: string[];
    discoveredItems?: string[];
    totalPlayTime: number;
    lastLoginDate: string;
    completedQuests: string[];
    dailyQuestProgress?: Record<string, number>;
    claimedDailyQuests?: string[];
    lastQuestDate?: string;
    taskProgress?: Record<string, number>;
    claimedTasks?: string[];
    totalCraftCount?: number;
    achievements: string[];
    adState?: any;
    timestamp: number;
}

/**
 * 数据管理器 - 负责存档的本地持久化
 */
@ccclass('DataManager')
export class DataManager extends Component {
    private static instance: DataManager;
    private readonly SAVE_KEY = 'MoeFarm_SaveData';
    private readonly AUTO_SAVE_INTERVAL = 60000; // 60秒

    static getInstance(): DataManager {
        return DataManager.instance;
    }

    onLoad() {
        DataManager.instance = this;
    }

    start() {
        this.startAutoSave();
    }

    /** 保存游戏 */
    saveGame(data: SaveData) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(this.SAVE_KEY, json);
        } catch (error) {
            console.error('保存失败:', error);
        }
    }

    /** 加载游戏 */
    loadGame(): SaveData | null {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('加载失败:', error);
            return null;
        }
    }

    /** 清除存档 */
    clearGame() {
        localStorage.removeItem(this.SAVE_KEY);
    }

    private startAutoSave() {
        setInterval(() => {
            const gm = (window as any).gameManager;
            if (gm && typeof gm.saveGame === 'function') {
                gm.saveGame();
            }
        }, this.AUTO_SAVE_INTERVAL);
    }
}
