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
import { TASK_DEFINITIONS, TaskCategory, TaskEvent, getTaskDefinition } from '../config/TaskConfig';

const { ccclass } = _decorator;
const TAG = 'GameManager';

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
    taskProgress: Record<string, number> = {};
    claimedTasks: string[] = [];
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
            ImageCache.getInstance().preloadUiIcons([
                'catalogBg',
                'panelBg',
                'taskMain',
                'taskDaily',
                'taskBranch',
                'taskSpecial',
                'taskTabsMain',
                'taskTabsDaily',
                'taskTabsBranch',
                'taskTabsSpecial',
                'btnGo',
                'btnDetail',
                'btnClaim',
                'btnClaimed',
                'task1',
                'task2',
                'task3',
                'rewardGold',
                'rewardSeed',
            ]);
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
            this.taskProgress = saveData.taskProgress || { ...this.dailyQuestProgress };
            this.claimedTasks = saveData.claimedTasks || [...this.claimedDailyQuests];
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
            taskProgress: this.taskProgress,
            claimedTasks: this.claimedTasks,
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
        evt.on('cropPlanted', (data: any) => { this.advanceTaskProgress('cropPlanted', data); this.evaluateAchievements(); this.requestSave(); });
        evt.on('cropHarvested', (data: any) => { this.advanceTaskProgress('cropHarvested', data); this.evaluateAchievements(); this.requestSave(); });
        evt.on('craftStarted', () => this.requestSave());
        evt.on('craftCompleted', (data: any) => {
            this.totalCraftCount++;
            this.advanceTaskProgress('craftCompleted', data);
            this.evaluateAchievements();
            this.requestSave();
        });
        evt.on('itemSold', (data: any) => { this.advanceTaskProgress('itemSold', data); this.requestSave(); });
        evt.on('landExpanded', (data: any) => { this.advanceTaskProgress('landExpanded', data); this.evaluateAchievements(); this.requestSave(); });
        evt.on('goldChanged', () => this.requestSave());
        evt.on('diamondChanged', () => this.requestSave());
        evt.on('experienceChanged', () => this.requestSave());
        evt.on('levelUp', (data: any) => { this.advanceTaskProgress('levelUp', data); this.requestSave(); });
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
        if (this.lastQuestDate !== today) {
            this.lastQuestDate = today;
            const dailyIds = new Set(
                TASK_DEFINITIONS.filter(task => task.category === 'daily').map(task => task.id),
            );
            for (const id of dailyIds) this.taskProgress[id] = 0;
            this.claimedTasks = this.claimedTasks.filter(id => !dailyIds.has(id));
        }
        for (const task of TASK_DEFINITIONS) {
            if (this.taskProgress[task.id] === undefined) this.taskProgress[task.id] = 0;
        }
        this.syncLegacyDailyTaskState();
    }

    private syncLegacyDailyTaskState() {
        const dailyIds = TASK_DEFINITIONS
            .filter(task => task.category === 'daily')
            .map(task => task.id);
        this.dailyQuestProgress = {};
        for (const id of dailyIds) this.dailyQuestProgress[id] = this.taskProgress[id] || 0;
        this.claimedDailyQuests = this.claimedTasks.filter(id => dailyIds.indexOf(id) >= 0);
    }

    private taskEventItemId(event: TaskEvent, data: any): string | undefined {
        if (event === 'cropPlanted' || event === 'cropHarvested') return data?.cropType;
        if (event === 'craftCompleted') return data?.recipe?.product?.itemId;
        if (event === 'itemSold') return data?.itemId;
        return undefined;
    }

    private advanceTaskProgress(event: TaskEvent, data?: any) {
        this.ensureDailyQuests();
        const eventItemId = this.taskEventItemId(event, data);
        let changed = false;
        let dailyChanged = false;
        for (const task of TASK_DEFINITIONS) {
            if (task.trigger.event !== event || this.claimedTasks.indexOf(task.id) >= 0) continue;
            if (task.trigger.itemId && task.trigger.itemId !== eventItemId) continue;
            const amount = task.trigger.useEventCount ? Math.max(1, Number(data?.count) || 1) : 1;
            const current = this.taskProgress[task.id] || 0;
            const next = Math.min(task.target, current + amount);
            if (next === current) continue;
            this.taskProgress[task.id] = next;
            changed = true;
            if (task.category === 'daily') dailyChanged = true;
        }
        if (!changed) return;
        this.syncLegacyDailyTaskState();
        this.eventManager.emit('taskChanged');
        if (dailyChanged) this.eventManager.emit('dailyQuestChanged');
    }

    getTasks(category?: TaskCategory) {
        this.ensureDailyQuests();
        return TASK_DEFINITIONS
            .filter(task => !category || task.category === category)
            .map(task => ({
                ...task,
                progress: Math.min(this.taskProgress[task.id] || 0, task.target),
                claimed: this.claimedTasks.indexOf(task.id) >= 0,
            }));
    }

    getDailyQuests() {
        return this.getTasks('daily');
    }

    claimTask(id: string): boolean {
        this.ensureDailyQuests();
        const task = getTaskDefinition(id);
        if (!task || this.claimedTasks.indexOf(id) >= 0) return false;
        if ((this.taskProgress[id] || 0) < task.target) return false;
        const itemRewards = task.rewards
            .filter(reward => reward.type === 'item' && reward.itemId)
            .map(reward => ({ itemId: reward.itemId!, count: reward.count }));
        const inventory = InventorySystem.getInstance();
        if (!inventory.canAddItems(itemRewards)) return false;

        for (const reward of task.rewards) {
            if (reward.type === 'gold') this.addGold(reward.count);
            else if (reward.type === 'diamond') this.addDiamond(reward.count);
            else if (reward.itemId) inventory.addItem(reward.itemId, reward.count);
        }
        this.claimedTasks.push(id);
        this.completedQuests.push(
            task.category === 'daily' ? `${this.lastQuestDate}:${id}` : id,
        );
        this.syncLegacyDailyTaskState();
        this.eventManager.emit('taskChanged', id);
        if (task.category === 'daily') this.eventManager.emit('dailyQuestChanged', id);
        this.requestSave();
        return true;
    }

    claimDailyQuest(id: string): boolean {
        return this.claimTask(id);
    }
}
