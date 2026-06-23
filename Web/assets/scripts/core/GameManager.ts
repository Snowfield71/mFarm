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
    completedQuests: string[] = [];
    achievements: string[] = [];
    hasLoaded: boolean = false;

    static getInstance(): GameManager {
        return GameManager.instance;
    }
    get dataManager(): DataManager { return DataManager.getInstance(); }
    get eventManager(): EventManager { return EventManager.getInstance(); }

    onLoad() {
        GameManager.instance = this;
        (window as any).gameManager = this;

        // 1. 设置设计分辨率
        view.setDesignResolutionSize(Design.WIDTH, Design.HEIGHT, ResolutionPolicy.FIXED_WIDTH);

        // 2. 创建所有管理器节点
        this.createSubNodes();

        Logger.info(TAG, '🎮 萌田农场初始化中...');
    }

    start() {
        // 延迟一帧初始化，确保所有子管理器 start 已调用
        this.scheduleOnce(() => {
            this.loadGameData();
            this.createMainUI();
            this.hasLoaded = true;
            Logger.info(TAG, '✅ 萌田农场启动完成');
            // 后台预加载物品图片
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
            this.completedQuests = saveData.completedQuests || [];
            this.achievements = saveData.achievements || [];
            this.totalPlayTime = saveData.totalPlayTime || 0;
            this.nextLevelExp = Math.floor(GameValues.EXP_PER_LEVEL * Math.pow(GameValues.EXP_GROWTH_RATE, this.playerLevel - 1));
            Logger.info(TAG, '📂 存档加载完成', `等级:${this.playerLevel}`);
        }
        this.eventManager.emit('gameDataLoaded');
    }

    /** 保存游戏 */
    saveGame() {
        const data: SaveData = {
            playerLevel: this.playerLevel,
            gold: this.gold,
            diamond: this.diamond,
            experience: this.experience,
            landBlocks: [],
            inventory: [],
            unlockedRecipes: this.unlockedRecipes,
            totalPlayTime: Math.floor(this.totalPlayTime),
            lastLoginDate: new Date().toISOString().split('T')[0],
            completedQuests: this.completedQuests,
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
}
