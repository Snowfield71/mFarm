import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

export interface SaveData {
    playerLevel: number;
    gold: number;
    diamond: number;
    experience: number;
    landBlocks: any[];
    buildingSlots?: any[];
    pastureUnlockedSlots?: number[];
    plantCounts?: Record<string, number>;
    inventory: Array<{ itemId: string; count: number }>;
    activeCrafts?: any[];
    nextCraftId?: number;
    maxCraftTables?: number;
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
    dailySignInDay?: number;
    lastDailySignInDate?: string;
    doubleHarvestCharges?: number;
    goldBoostCharges?: number;
    totalCraftCount?: number;
    achievements: string[];
    claimedAchievements?: string[];
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
    private autoSaveTimer?: ReturnType<typeof setInterval>;
    private readonly handlePageExit = () => this.flushGameSave();
    private readonly handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && document.hidden) this.flushGameSave();
    };

    static getInstance(): DataManager {
        return DataManager.instance;
    }

    onLoad() {
        DataManager.instance = this;
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this.handlePageExit);
            window.addEventListener('pagehide', this.handlePageExit);
        }
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }
    }

    onDestroy() {
        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this.handlePageExit);
            window.removeEventListener('pagehide', this.handlePageExit);
        }
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }
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
        this.autoSaveTimer = setInterval(() => this.flushGameSave(), this.AUTO_SAVE_INTERVAL);
    }

    private flushGameSave() {
        const gm = typeof window !== 'undefined' ? (window as any).gameManager : undefined;
        if (gm?.hasLoaded && typeof gm.saveGame === 'function') gm.saveGame();
    }
}
