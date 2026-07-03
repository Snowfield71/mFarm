import { _decorator, Component, Node, view, ResolutionPolicy } from 'cc';
import { DataManager, SaveData } from './DataManager';
import { EventManager } from './EventManager';
import { GameValues, Design } from '../config/GameConfig';
import { ITEM_DB } from '../config/ItemConfig';
import { getAllRecipes } from '../config/RecipeConfig';
import { Logger } from '../utils/Logger';
import { ImageCache } from '../utils/ImageCache';
import { InventorySystem } from '../systems/InventorySystem';
import { LandSystem } from '../systems/LandSystem';
import { CraftSystem } from '../systems/CraftSystem';
import { MainUI } from '../ui/MainUI';

const { ccclass } = _decorator;
const TAG = 'GameManager';

export interface DailyQuestDef {
    id: string;
    title: string;
    target: number;
    rewardGold?: number;
    rewardDiamond?: number;
}

export const DAILY_QUESTS: DailyQuestDef[] = [
    { id: 'plant_5', title: '种植 5 次', target: 5, rewardGold: 50 },
    { id: 'harvest_3', title: '收获 3 次', target: 3, rewardGold: 100 },
    { id: 'craft_2', title: '合成 2 次', target: 2, rewardGold: 30 },
    { id: 'sell_10', title: '出售 10 个物品', target: 10, rewardDiamond: 1 },
    { id: 'level_1', title: '升级 1 次', target: 1, rewardGold: 100 },
];

/**
 * 🎮 游戏主管理器
 * 
 * 【重要】这是游戏的唯一入口脚本。
 * 只需将此脚本拖到 Canvas 节点上即可运行整个游戏。
 * 它会自动创建所有子系统和 UI。
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private static instance: GameManager;

    // 玩家数据
    playerLevel: number = 1;
    experience: number = 0;
    gold: number = GameValues.INITIAL_GOLD;
    diamond: number = GameValues.INITIAL_DIAMOND;
    nextLevelExp: number = GameValues.EXP_PER_LEVEL;
    totalPlayTime: number = 0;
    unlockedRecipes: string[] = ['R001', 'R002', 'R003'];
    discoveredItems: string[] = [];
    completedQuests: string[] = [];
    dailyQuestProgress: Record<string, number> = {};
    claimedDailyQuests: string[] = [];
    lastQuestDate: string = '';
    totalCraftCount: number = 0;
    achievements: string[] = [];
    hasLoaded: boolean = false;
    private saveQueued = false;

    static getInstance(): GameManager {
        return GameManager.instance;
    }
    get dataManager(): DataManager { return DataManager.getInstance(); }
    get eventManager(): EventManager { return EventManager.getInstance(); }

    onLoad() {
        GameManager.instance = this;
        (window as any).gameManager = this;

        // 1. 设置设计分辨率
        view.resizeWithBrowserSize(true);
        view.setDesignResolutionSize(Design.WIDTH, Design.HEIGHT, ResolutionPolicy.FIXED_WIDTH);

        // 2. 创建所有管理器节点
        this.createSubNodes();

        Logger.info(TAG, '🎮 萌田农场初始化中...');
    }

    start() {
        // 延迟一帧初始化，确保所有子管理器 start 已调用
        this.scheduleOnce(() => {
            this.loadGameData();
            this.bindProgressEvents();
            this.createMainUI();
            this.hasLoaded = true;
            Logger.info(TAG, '✅ 萌田农场启动完成');
            // 后台预加载物品图片
            ImageCache.getInstance().preloadUiIcons(['catalogBg']);
            this.preloadItemImages();
        }, 0.15);
    }

    /** 后台预加载所有物品图片 */
    private async preloadItemImages() {
        const itemIds = Object.keys(ITEM_DB);
        Logger.info(TAG, `🖼️ 开始预加载 ${itemIds.length} 张物品图片...`);
        const loaded = await ImageCache.getInstance().preload(itemIds);
    }

    /** 创建所有子系统节点 */
    private createSubNodes() {
        const nodes: Array<{ name: string; ctor: typeof Component }> = [
            { name: 'EventManager', ctor: EventManager },
            { name: 'DataManager', ctor: DataManager },
            { name: 'InventorySystem', ctor: InventorySystem },
            { name: 'LandSystem', ctor: LandSystem },
            { name: 'CraftSystem', ctor: CraftSystem },
        ];

        for (const { name, ctor } of nodes) {
            const node = new Node(name);
            node.addComponent(ctor);
            this.node.addChild(node);
        }
    }

    /** 创建主游戏 UI */
    private createMainUI() {
        const mainUINode = new Node('MainUI');
        this.node.addChild(mainUINode);
        mainUINode.addComponent(MainUI);
    }

    update(dt: number) {
        this.totalPlayTime += dt;
    }

    /** 加载存档 */
    loadGameData() {
        const saveData = this.dataManager.loadGame();
        if (saveData) {
            this.playerLevel = saveData.playerLevel || 1;
            this.gold = saveData.gold ?? GameValues.INITIAL_GOLD;
            this.diamond = saveData.diamond ?? GameValues.INITIAL_DIAMOND;
            this.experience = saveData.experience || 0;
            this.unlockedRecipes = saveData.unlockedRecipes || ['R001', 'R002', 'R003'];
            this.discoveredItems = saveData.discoveredItems || [];
            this.completedQuests = saveData.completedQuests || [];
            this.dailyQuestProgress = saveData.dailyQuestProgress || {};
            this.claimedDailyQuests = saveData.claimedDailyQuests || [];
            this.lastQuestDate = saveData.lastQuestDate || '';
            this.totalCraftCount = saveData.totalCraftCount || 0;
            this.achievements = saveData.achievements || [];
            this.totalPlayTime = saveData.totalPlayTime || 0;
            this.nextLevelExp = Math.floor(GameValues.EXP_PER_LEVEL * Math.pow(GameValues.EXP_GROWTH_RATE, this.playerLevel - 1));

            InventorySystem.getInstance().loadFromSave(saveData.inventory || [], saveData.inventoryMaxSlots);
            LandSystem.getInstance().loadFromSave(saveData.landBlocks || [], saveData.plantCounts || {});
            CraftSystem.getInstance().loadFromSave(saveData.activeCrafts || [], saveData.nextCraftId || 0);
            Logger.info(TAG, '📂 存档加载完成', `等级:${this.playerLevel}`);
        }
        this.ensureDailyQuests();
        this.syncDiscoveredItems();
        this.evaluateAchievements();
        this.eventManager.emit('gameDataLoaded');
    }

    /** 保存游戏 */
    saveGame() {
        this.syncDiscoveredItems();
        this.evaluateAchievements();
        const inventorySave = InventorySystem.getInstance().exportSave();
        const landSave = LandSystem.getInstance().exportSave();
        const craftSave = CraftSystem.getInstance().exportSave();
        const data: SaveData = {
            playerLevel: this.playerLevel,
            gold: this.gold,
            diamond: this.diamond,
            experience: this.experience,
            landBlocks: landSave.blocks,
            plantCounts: landSave.plantCounts,
            inventory: inventorySave.slots,
            inventoryMaxSlots: inventorySave.maxSlots,
            activeCrafts: craftSave.activeCrafts,
            nextCraftId: craftSave.nextCraftId,
            unlockedRecipes: this.unlockedRecipes,
            discoveredItems: this.discoveredItems,
            totalPlayTime: Math.floor(this.totalPlayTime),
            lastLoginDate: new Date().toISOString().split('T')[0],
            completedQuests: this.completedQuests,
            dailyQuestProgress: this.dailyQuestProgress,
            claimedDailyQuests: this.claimedDailyQuests,
            lastQuestDate: this.lastQuestDate,
            totalCraftCount: this.totalCraftCount,
            achievements: this.achievements,
            timestamp: Date.now(),
        };
        this.dataManager.saveGame(data);
    }

    // ===== 经验/等级 =====
    addExperience(amount: number) {
        this.experience += amount;
        while (this.experience >= this.nextLevelExp) this.levelUp();
        this.eventManager.emit('experienceChanged', { current: this.experience, next: this.nextLevelExp });
    }

    private levelUp() {
        this.playerLevel++;
        this.experience -= this.nextLevelExp;
        this.nextLevelExp = Math.floor(this.nextLevelExp * GameValues.EXP_GROWTH_RATE);
        const newRecipes = getAllRecipes().filter(
            r => r.requiredLevel <= this.playerLevel && this.unlockedRecipes.indexOf(r.id) === -1
        );
        for (const r of newRecipes) {
            if (this.unlockedRecipes.indexOf(r.id) === -1) this.unlockedRecipes.push(r.id);
        }
        this.eventManager.emit('levelUp', { newLevel: this.playerLevel });
        Logger.info(TAG, `🎉 升级! Lv.${this.playerLevel}`);
    }

    // ===== 货币 =====
    addGold(amount: number) { this.gold += amount; this.eventManager.emit('goldChanged', this.gold); }
    spendGold(amount: number): boolean {
        if (this.gold >= amount) { this.gold -= amount; this.eventManager.emit('goldChanged', this.gold); return true; }
        return false;
    }
    addDiamond(amount: number) { this.diamond += amount; this.eventManager.emit('diamondChanged', this.diamond); }
    spendDiamond(amount: number): boolean {
        if (this.diamond >= amount) { this.diamond -= amount; this.eventManager.emit('diamondChanged', this.diamond); return true; }
        return false;
    }

    private bindProgressEvents() {
        const evt = this.eventManager;
        evt.on('inventoryChanged', () => {
            this.syncDiscoveredItems();
            this.evaluateAchievements();
            this.requestSave();
        });
        evt.on('cropPlanted', () => { this.addDailyQuestProgress('plant_5', 1); this.evaluateAchievements(); this.requestSave(); });
        evt.on('cropHarvested', () => { this.addDailyQuestProgress('harvest_3', 1); this.evaluateAchievements(); this.requestSave(); });
        evt.on('craftStarted', () => this.requestSave());
        evt.on('craftCompleted', () => {
            this.totalCraftCount++;
            this.addDailyQuestProgress('craft_2', 1);
            this.evaluateAchievements();
            this.requestSave();
        });
        evt.on('itemSold', (data: any) => { this.addDailyQuestProgress('sell_10', data?.count || 1); this.requestSave(); });
        evt.on('landExpanded', () => { this.evaluateAchievements(); this.requestSave(); });
        evt.on('goldChanged', () => this.requestSave());
        evt.on('diamondChanged', () => this.requestSave());
        evt.on('experienceChanged', () => this.requestSave());
        evt.on('levelUp', () => { this.addDailyQuestProgress('level_1', 1); this.requestSave(); });
    }

    private requestSave() {
        if (!this.hasLoaded || this.saveQueued) return;
        this.saveQueued = true;
        this.scheduleOnce(() => {
            this.saveQueued = false;
            this.saveGame();
        }, 0.5);
    }

    private syncDiscoveredItems() {
        const seen = new Set(this.discoveredItems);
        for (const slot of InventorySystem.getInstance().getNonEmptySlots()) {
            if (slot.itemId) seen.add(slot.itemId);
        }
        for (const block of LandSystem.getInstance().getAllBlocks()) {
            if (block.cropType) seen.add(block.cropType);
            if (block.buildingId) seen.add(block.buildingId);
        }
        this.discoveredItems = Array.from(seen);
    }

    hasDiscoveredItem(itemId: string): boolean {
        return this.discoveredItems.indexOf(itemId) >= 0;
    }

    getCatalogProgress(): { unlocked: number; total: number } {
        let total = 0;
        for (const id in ITEM_DB) {
            if (Object.prototype.hasOwnProperty.call(ITEM_DB, id)) total++;
        }
        return { unlocked: this.discoveredItems.length, total };
    }

    private addAchievement(id: string) {
        if (this.achievements.indexOf(id) >= 0) return;
        this.achievements.push(id);
        this.eventManager.emit('achievementUnlocked', id);
    }

    private evaluateAchievements() {
        const land = LandSystem.getInstance();
        const inv = InventorySystem.getInstance();
        if (land.getTotalPlantCount() >= 1) this.addAchievement('first_plant');
        if (land.getTotalPlantCount() >= 50) this.addAchievement('plant_50');
        if (this.gold >= 100) this.addAchievement('gold_100');
        if (this.playerLevel >= 10) this.addAchievement('level_10');
        if (CraftSystem.getInstance().getAllActiveCrafts().length > 0 || inv.getItemCount('flour') > 0) {
            this.addAchievement('first_craft');
        }
        if (this.totalCraftCount >= 50) this.addAchievement('craft_50');
        if (this.unlockedRecipes.length >= getAllRecipes().length) this.addAchievement('recipes_all');
        if (this.discoveredItems.length >= this.getCatalogProgress().total) this.addAchievement('catalog_all');
    }

    private todayString(): string {
        const now = new Date();
        const month = (`0${now.getMonth() + 1}`).slice(-2);
        const day = (`0${now.getDate()}`).slice(-2);
        return `${now.getFullYear()}-${month}-${day}`;
    }

    private ensureDailyQuests() {
        const today = this.todayString();
        if (this.lastQuestDate === today) return;
        this.lastQuestDate = today;
        this.dailyQuestProgress = {};
        this.claimedDailyQuests = [];
        for (const quest of DAILY_QUESTS) this.dailyQuestProgress[quest.id] = 0;
    }

    private addDailyQuestProgress(id: string, amount: number) {
        this.ensureDailyQuests();
        const quest = DAILY_QUESTS.find(q => q.id === id);
        if (!quest || this.claimedDailyQuests.indexOf(id) >= 0) return;
        const current = this.dailyQuestProgress[id] || 0;
        this.dailyQuestProgress[id] = Math.min(quest.target, current + amount);
        this.eventManager.emit('dailyQuestChanged', id);
    }

    getDailyQuests() {
        this.ensureDailyQuests();
        return DAILY_QUESTS.map(quest => ({
            ...quest,
            progress: Math.min(this.dailyQuestProgress[quest.id] || 0, quest.target),
            claimed: this.claimedDailyQuests.indexOf(quest.id) >= 0,
        }));
    }

    claimDailyQuest(id: string): boolean {
        this.ensureDailyQuests();
        const quest = DAILY_QUESTS.find(q => q.id === id);
        if (!quest || this.claimedDailyQuests.indexOf(id) >= 0) return false;
        if ((this.dailyQuestProgress[id] || 0) < quest.target) return false;
        this.claimedDailyQuests.push(id);
        if (quest.rewardGold) this.addGold(quest.rewardGold);
        if (quest.rewardDiamond) this.addDiamond(quest.rewardDiamond);
        this.completedQuests.push(`${this.lastQuestDate}:${id}`);
        this.eventManager.emit('dailyQuestChanged', id);
        this.requestSave();
        return true;
    }
}
