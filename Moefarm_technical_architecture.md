# 萌田农场 - 项目技术架构和代码实现

## 第一部分：项目结构

### 1.1 项目文件树

```
MoeFarm/
├── assets/
│   ├── scenes/
│   │   ├── Splash.scene           # 启动画面
│   │   ├── Main.scene             # 主农场场景
│   │   ├── Shop.scene             # 商店场景
│   │   └── Inventory.scene        # 物品栏场景
│   │
│   ├── scripts/
│   │   ├── core/
│   │   │   ├── GameManager.ts     # 游戏主管理器
│   │   │   ├── DataManager.ts     # 数据存取管理
│   │   │   └── EventManager.ts    # 事件系统
│   │   │
│   │   ├── systems/
│   │   │   ├── LandSystem.ts      # 地块系统
│   │   │   ├── CropSystem.ts      # 种植系统
│   │   │   ├── CraftSystem.ts     # 合成系统
│   │   │   ├── InventorySystem.ts # 物品栏系统
│   │   │   ├── CurrencySystem.ts  # 货币系统
│   │   │   ├── LevelSystem.ts     # 等级系统
│   │   │   ├── QuestSystem.ts     # 任务系统
│   │   │   └── AdSystem.ts        # 广告系统
│   │   │
│   │   ├── ui/
│   │   │   ├── MainUI.ts          # 主 UI
│   │   │   ├── InventoryUI.ts     # 物品栏 UI
│   │   │   ├── CraftUI.ts         # 合成界面
│   │   │   ├── ShopUI.ts          # 商店界面
│   │   │   ├── PopupDialog.ts     # 弹出框
│   │   │   └── UIManager.ts       # UI 管理器
│   │   │
│   │   ├── entities/
│   │   │   ├── LandTile.ts        # 地块对象
│   │   │   ├── CropItem.ts        # 作物对象
│   │   │   ├── Building.ts        # 建筑对象
│   │   │   └── InventoryItem.ts   # 物品栏项
│   │   │
│   │   ├── utils/
│   │   │   ├── Logger.ts          # 日志工具
│   │   │   ├── ConfigLoader.ts    # 配置加载
│   │   │   ├── TimeHelper.ts      # 时间工具
│   │   │   └── MathHelper.ts      # 数学工具
│   │   │
│   │   └── config/
│   │       ├── GameConfig.ts      # 游戏配置常量
│   │       ├── ItemConfig.ts      # 物品配置
│   │       └── RecipeConfig.ts    # 配方配置
│   │
│   ├── textures/
│   │   ├── items/                 # 物品图标
│   │   ├── ui/                    # UI 贴图
│   │   ├── backgrounds/           # 背景
│   │   └── atlases/               # 图集
│   │
│   ├── sounds/
│   │   ├── bgm.mp3               # 背景音乐
│   │   ├── click.mp3             # 点击音效
│   │   ├── harvest.mp3           # 收获音效
│   │   └── craft_complete.mp3    # 合成完成
│   │
│   └── prefabs/
│       ├── LandTile.prefab       # 地块预制体
│       ├── CropItem.prefab       # 作物预制体
│       ├── InventorySlot.prefab  # 物品栏格子
│       └── PopupDialog.prefab    # 弹出框预制体
│
├── project.json
└── README.md
```

### 1.2 开发框架架构

```
┌─────────────────────────────────────────┐
│         Cocos Creator 引擎               │
├─────────────────────────────────────────┤
│         EventManager（事件系统）         │
├──────────────┬──────────────┬───────────┤
│ DataManager  │ GameManager  │ UIManager │
│ (数据持久化) │ (业务逻辑)   │ (界面显示)│
├──────────────┼──────────────┼───────────┤
│           各个系统模块                   │
│ Land|Crop|Craft|Inventory|Level|Quest │
├─────────────────────────────────────────┤
│    Entity 层（物体实例）                 │
│ LandTile|CropItem|Building|UIPanels   │
└─────────────────────────────────────────┘
```

---

## 第二部分：核心系统实现

### 2.1 游戏管理器（GameManager）

```typescript
import { _decorator, Component, Node } from "cc";
import { DataManager } from "./DataManager";
import { EventManager } from "./EventManager";

const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  private static instance: GameManager;

  @property(DataManager)
  dataManager!: DataManager;

  @property(EventManager)
  eventManager!: EventManager;

  // 游戏状态
  private playerLevel: number = 1;
  private gold: number = 200;
  private diamond: number = 50;
  private experience: number = 0;
  private nextLevelExp: number = 100;

  // 各个系统实例
  private landSystem: any;
  private cropSystem: any;
  private craftSystem: any;
  private inventorySystem: any;

  static getInstance(): GameManager {
    return GameManager.instance;
  }

  onLoad() {
    GameManager.instance = this;
  }

  start() {
    // 初始化游戏
    this.loadGameData();
    this.initializeSystems();
  }

  private loadGameData() {
    // 从存储中加载游戏数据
    const saveData = this.dataManager.loadGame();
    if (saveData) {
      this.playerLevel = saveData.level;
      this.gold = saveData.gold;
      this.diamond = saveData.diamond;
      this.experience = saveData.experience;
    }
  }

  private initializeSystems() {
    // 初始化各个游戏系统
    // 1. 地块系统
    // 2. 种植系统
    // 3. 合成系统
    // 4. 物品栏系统
  }

  // 添加经验值
  public addExperience(amount: number) {
    this.experience += amount;

    // 检查升级
    while (this.experience >= this.nextLevelExp) {
      this.levelUp();
    }

    // 发送事件
    this.eventManager.emit("experienceChanged", {
      current: this.experience,
      next: this.nextLevelExp,
    });
  }

  // 升级
  private levelUp() {
    this.playerLevel++;
    this.experience -= this.nextLevelExp;
    this.nextLevelExp = Math.floor(this.nextLevelExp * 1.2); // 递增升级所需经验

    // 解锁新配方或功能
    this.eventManager.emit("levelUp", { newLevel: this.playerLevel });
  }

  // 增加金币
  public addGold(amount: number) {
    this.gold += amount;
    this.eventManager.emit("goldChanged", this.gold);
  }

  // 消耗金币
  public spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.eventManager.emit("goldChanged", this.gold);
      return true;
    }
    return false;
  }

  // 增加钻石
  public addDiamond(amount: number) {
    this.diamond += amount;
    this.eventManager.emit("diamondChanged", this.diamond);
  }

  // 消耗钻石
  public spendDiamond(amount: number): boolean {
    if (this.diamond >= amount) {
      this.diamond -= amount;
      this.eventManager.emit("diamondChanged", this.diamond);
      return true;
    }
    return false;
  }

  // 保存游戏
  public saveGame() {
    const saveData = {
      level: this.playerLevel,
      experience: this.experience,
      gold: this.gold,
      diamond: this.diamond,
      timestamp: Date.now(),
      // 其他系统的数据...
    };
    this.dataManager.saveGame(saveData);
  }
}
```

### 2.2 数据管理器（DataManager）

```typescript
import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

interface SaveData {
  playerLevel: number;
  gold: number;
  diamond: number;
  experience: number;
  landBlocks: Array<any>;
  inventory: Array<any>;
  unlockedRecipes: number[];
  lastLoginDate: string;
  [key: string]: any;
}

@ccclass("DataManager")
export class DataManager extends Component {
  private readonly SAVE_KEY = "MoeFarm_SaveData";
  private readonly AUTO_SAVE_INTERVAL = 60000; // 60 秒自动保存一次

  start() {
    // 启动自动保存
    this.startAutoSave();
  }

  // 保存游戏数据
  public saveGame(data: SaveData) {
    try {
      if (typeof wx !== "undefined") {
        // 微信小游戏环境
        wx.setStorage({
          key: this.SAVE_KEY,
          data: JSON.stringify(data),
          success: () => {
            console.log("✓ 游戏数据已保存");
          },
          fail: (error) => {
            console.error("✗ 保存失败:", error);
          },
        });
      } else {
        // 浏览器环境（本地调试）
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
        console.log("✓ 游戏数据已保存到本地");
      }
    } catch (error) {
      console.error("保存游戏数据出错:", error);
    }
  }

  // 加载游戏数据
  public loadGame(): SaveData | null {
    try {
      if (typeof wx !== "undefined") {
        const result = wx.getStorageSync(this.SAVE_KEY);
        return result ? JSON.parse(result) : null;
      } else {
        const data = localStorage.getItem(this.SAVE_KEY);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error("加载游戏数据出错:", error);
      return null;
    }
  }

  // 清除游戏数据
  public clearGame() {
    try {
      if (typeof wx !== "undefined") {
        wx.removeStorage({
          key: this.SAVE_KEY,
          success: () => {
            console.log("✓ 游戏数据已清除");
          },
        });
      } else {
        localStorage.removeItem(this.SAVE_KEY);
        console.log("✓ 游戏数据已清除");
      }
    } catch (error) {
      console.error("清除游戏数据出错:", error);
    }
  }

  // 自动保存
  private startAutoSave() {
    setInterval(() => {
      const gameManager = require("./GameManager").GameManager.getInstance();
      if (gameManager) {
        gameManager.saveGame();
      }
    }, this.AUTO_SAVE_INTERVAL);
  }
}
```

### 2.3 地块系统（LandSystem）

```typescript
import { _decorator, Component, Node, Prefab, instantiate } from "cc";

const { ccclass, property } = _decorator;

interface LandBlockData {
  id: number;
  state: "empty" | "growing" | "harvesting" | "occupied";
  cropType?: string;
  progress?: number; // 0-100
  plantTime?: number; // 种植时间戳
  buildingId?: string;
}

@ccclass("LandSystem")
export class LandSystem extends Component {
  @property(Prefab)
  landTilePrefab!: Prefab;

  @property(Node)
  landGrid!: Node;

  private landBlocks: Map<number, LandBlockData> = new Map();
  private maxBlocks: number = 9;
  private tileSize: number = 60;

  start() {
    this.initializeLandBlocks();
    this.renderLandGrid();
  }

  // 初始化地块数据
  private initializeLandBlocks() {
    for (let i = 0; i < this.maxBlocks; i++) {
      this.landBlocks.set(i, {
        id: i,
        state: "empty",
      });
    }
  }

  // 渲染农田网格
  private renderLandGrid() {
    // 创建 3×3 的地块网格
    const cols = 3;
    const rows = 3;

    for (let i = 0; i < this.maxBlocks; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const tile = instantiate(this.landTilePrefab);
      this.landGrid.addChild(tile);

      // 设置位置
      const x = col * this.tileSize;
      const y = -(row * this.tileSize);
      tile.setPosition(x, y, 0);
    }
  }

  // 在地块上种植作物
  public plantCrop(blockId: number, cropType: string) {
    const block = this.landBlocks.get(blockId);
    if (block && block.state === "empty") {
      block.state = "growing";
      block.cropType = cropType;
      block.plantTime = Date.now();
      block.progress = 0;

      // 发送事件
      this.node.emit("cropPlanted", { blockId, cropType });
    }
  }

  // 更新地块状态（定时器调用）
  public updateLandBlocks() {
    for (const block of this.landBlocks.values()) {
      if (block.state === "growing" && block.plantTime) {
        // 计算生长进度
        const cropConfig = this.getCropConfig(block.cropType!);
        const growthTime = cropConfig.growthTime * 1000; // 转换为毫秒
        const elapsed = Date.now() - block.plantTime;

        block.progress = Math.min(100, (elapsed / growthTime) * 100);

        // 如果已成熟
        if (block.progress >= 100) {
          block.state = "harvesting";
          this.node.emit("cropMatured", { blockId: block.id });
        }
      }
    }
  }

  // 收获作物
  public harvestCrop(blockId: number): string | null {
    const block = this.landBlocks.get(blockId);
    if (block && block.state === "harvesting" && block.cropType) {
      const cropType = block.cropType;

      // 重置地块
      block.state = "empty";
      block.cropType = undefined;
      block.progress = 0;
      block.plantTime = undefined;

      return cropType;
    }
    return null;
  }

  // 获取作物配置
  private getCropConfig(cropType: string) {
    // 应从配置文件加载
    const cropConfigs: any = {
      wheat: { name: "小麦", growthTime: 30, harvestCount: 1 },
      corn: { name: "玉米", growthTime: 60, harvestCount: 1 },
      // ... 更多作物配置
    };
    return cropConfigs[cropType];
  }

  // 获取所有地块信息
  public getAllBlocks(): LandBlockData[] {
    return Array.from(this.landBlocks.values());
  }

  // 获取特定地块信息
  public getBlock(blockId: number): LandBlockData | undefined {
    return this.landBlocks.get(blockId);
  }
}
```

### 2.4 合成系统（CraftSystem）

```typescript
import { _decorator, Component } from "cc";
import { InventorySystem } from "./InventorySystem";

const { ccclass, property } = _decorator;

interface CraftRecipe {
  id: string;
  name: string;
  materials: Array<{ itemId: string; count: number }>;
  product: { itemId: string; count: number };
  craftTime: number; // 秒
  cost: number; // 金币成本
  experience: number;
  requiredLevel: number;
}

interface CraftingProcess {
  recipeId: string;
  startTime: number;
  craftTime: number;
  isComplete: boolean;
}

@ccclass("CraftSystem")
export class CraftSystem extends Component {
  @property(InventorySystem)
  inventorySystem!: InventorySystem;

  private recipes: Map<string, CraftRecipe> = new Map();
  private activeCrafts: Map<number, CraftingProcess> = new Map();
  private nextCraftId: number = 0;

  start() {
    this.loadRecipes();
    this.startCraftUpdate();
  }

  // 加载配方
  private loadRecipes() {
    // 配方应从外部配置加载
    const recipeList: CraftRecipe[] = [
      {
        id: "recipe_flour",
        name: "面粉制作",
        materials: [{ itemId: "wheat", count: 3 }],
        product: { itemId: "flour", count: 1 },
        craftTime: 10,
        cost: 20,
        experience: 10,
        requiredLevel: 1,
      },
      // ... 更多配方
    ];

    recipeList.forEach((recipe) => {
      this.recipes.set(recipe.id, recipe);
    });
  }

  // 开始合成
  public startCraft(recipeId: string, gameManager: any): number {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      console.error("配方不存在:", recipeId);
      return -1;
    }

    // 检查材料
    const hasAllMaterials = recipe.materials.every(
      (material) =>
        this.inventorySystem.getItemCount(material.itemId) >= material.count,
    );

    if (!hasAllMaterials) {
      console.warn("材料不足");
      return -1;
    }

    // 检查等级
    if (gameManager.playerLevel < recipe.requiredLevel) {
      console.warn("等级不足");
      return -1;
    }

    // 检查金币
    if (!gameManager.spendGold(recipe.cost)) {
      console.warn("金币不足");
      return -1;
    }

    // 消耗材料
    recipe.materials.forEach((material) => {
      this.inventorySystem.removeItem(material.itemId, material.count);
    });

    // 创建合成进程
    const craftId = this.nextCraftId++;
    const craftProcess: CraftingProcess = {
      recipeId: recipeId,
      startTime: Date.now(),
      craftTime: recipe.craftTime * 1000,
      isComplete: false,
    };

    this.activeCrafts.set(craftId, craftProcess);

    console.log(`开始合成: ${recipe.name}`);
    this.node.emit("craftStarted", { craftId, recipe });

    return craftId;
  }

  // 更新合成进度
  private startCraftUpdate() {
    setInterval(() => {
      this.updateCrafts();
    }, 100); // 每 100ms 检查一次
  }

  private updateCrafts() {
    for (const [craftId, process] of this.activeCrafts.entries()) {
      if (!process.isComplete) {
        const elapsed = Date.now() - process.startTime;
        const progress = (elapsed / process.craftTime) * 100;

        // 发送进度更新
        this.node.emit("craftProgress", { craftId, progress });

        // 合成完成
        if (elapsed >= process.craftTime) {
          this.completeCraft(craftId);
        }
      }
    }
  }

  // 完成合成
  private completeCraft(craftId: number) {
    const process = this.activeCrafts.get(craftId);
    if (!process) return;

    const recipe = this.recipes.get(process.recipeId)!;

    // 添加产物到背包
    this.inventorySystem.addItem(recipe.product.itemId, recipe.product.count);

    // 更新游戏状态
    const gameManager = require("./GameManager").GameManager.getInstance();
    if (gameManager) {
      gameManager.addExperience(recipe.experience);
    }

    process.isComplete = true;

    console.log(`合成完成: ${recipe.name}`);
    this.node.emit("craftComplete", { craftId, recipe });

    // 一段时间后删除记录
    setTimeout(() => {
      this.activeCrafts.delete(craftId);
    }, 5000);
  }

  // 加速合成
  public speedUpCraft(craftId: number, gameManager: any): boolean {
    const process = this.activeCrafts.get(craftId);
    if (!process || process.isComplete) return false;

    // 消耗 5 钻石可加速 30 秒
    const speedUpCost = 5;
    if (gameManager.spendDiamond(speedUpCost)) {
      process.craftTime -= 30000; // 减少 30 秒
      if (process.craftTime < 0) {
        process.craftTime = 0;
      }
      this.node.emit("craftSpedUp", { craftId });
      return true;
    }
    return false;
  }

  // 获取所有配方
  public getAllRecipes(): CraftRecipe[] {
    return Array.from(this.recipes.values());
  }

  // 获取配方详情
  public getRecipe(recipeId: string): CraftRecipe | undefined {
    return this.recipes.get(recipeId);
  }

  // 获取活跃的合成进程
  public getActiveCraft(craftId: number): CraftingProcess | undefined {
    return this.activeCrafts.get(craftId);
  }
}
```

### 2.5 物品栏系统（InventorySystem）

```typescript
import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

interface InventorySlot {
  itemId: string;
  count: number; // 1-99
}

@ccclass("InventorySystem")
export class InventorySystem extends Component {
  private slots: InventorySlot[] = [];
  private maxSlots: number = 20;
  private maxStackSize: number = 99;

  start() {
    // 初始化空物品栏
    for (let i = 0; i < this.maxSlots; i++) {
      this.slots.push({ itemId: "", count: 0 });
    }
  }

  // 添加物品
  public addItem(itemId: string, count: number = 1): boolean {
    let remaining = count;

    // 先尝试添加到现有的堆栈
    for (const slot of this.slots) {
      if (slot.itemId === itemId && slot.count < this.maxStackSize) {
        const canAdd = Math.min(remaining, this.maxStackSize - slot.count);
        slot.count += canAdd;
        remaining -= canAdd;

        if (remaining === 0) {
          this.node.emit("inventoryChanged");
          return true;
        }
      }
    }

    // 如果还有剩余，添加到空格子
    for (const slot of this.slots) {
      if (slot.itemId === "") {
        const canAdd = Math.min(remaining, this.maxStackSize);
        slot.itemId = itemId;
        slot.count = canAdd;
        remaining -= canAdd;

        if (remaining === 0) {
          this.node.emit("inventoryChanged");
          return true;
        }
      }
    }

    // 如果还有剩余但没有空位，返回失败
    if (remaining > 0) {
      console.warn("物品栏已满，无法添加全部物品");
      return false;
    }

    this.node.emit("inventoryChanged");
    return true;
  }

  // 移除物品
  public removeItem(itemId: string, count: number = 1): boolean {
    let remaining = count;

    for (const slot of this.slots) {
      if (slot.itemId === itemId) {
        const canRemove = Math.min(remaining, slot.count);
        slot.count -= canRemove;
        remaining -= canRemove;

        if (slot.count === 0) {
          slot.itemId = "";
        }

        if (remaining === 0) {
          this.node.emit("inventoryChanged");
          return true;
        }
      }
    }

    console.warn(`物品不足或不存在: ${itemId}`);
    return false;
  }

  // 获取物品数量
  public getItemCount(itemId: string): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  // 出售物品
  public sellItem(itemId: string, count: number, gameManager: any): boolean {
    if (this.removeItem(itemId, count)) {
      // 获取物品的出售价格（应从配置加载）
      const sellPrice = this.getItemSellPrice(itemId);
      const totalPrice = sellPrice * count;

      gameManager.addGold(totalPrice);
      this.node.emit("itemSold", { itemId, count, price: totalPrice });

      return true;
    }
    return false;
  }

  // 获取物品的出售价格
  private getItemSellPrice(itemId: string): number {
    // 应从配置文件加载，这里是示例
    const prices: any = {
      wheat: 10,
      corn: 20,
      flour: 25,
      // ... 更多物品
    };
    return prices[itemId] || 10;
  }

  // 扩展物品栏
  public expandInventory(gameManager: any): boolean {
    const expandCost = 10; // 钻石成本

    if (gameManager.spendDiamond(expandCost)) {
      this.maxSlots += 5;

      // 添加新的空格子
      for (let i = 0; i < 5; i++) {
        this.slots.push({ itemId: "", count: 0 });
      }

      this.node.emit("inventoryExpanded", { newSize: this.maxSlots });
      return true;
    }
    return false;
  }

  // 获取所有物品
  public getAllItems(): InventorySlot[] {
    return this.slots.filter((slot) => slot.count > 0);
  }

  // 获取物品栏使用情况
  public getInventoryInfo() {
    const usedSlots = this.slots.filter((slot) => slot.itemId !== "").length;
    return {
      usedSlots,
      maxSlots: this.maxSlots,
      usage: (usedSlots / this.maxSlots) * 100,
    };
  }
}
```

### 2.6 广告系统（AdSystem）

```typescript
import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/** 广告激励类型 */
export enum AdRewardType {
  /** 作物加速 */
  CROP_SPEEDUP = "crop_speedup",
  /** 全局作物加速 */
  GLOBAL_CROP_SPEEDUP = "global_crop_speedup",
  /** 合成加速 */
  CRAFT_SPEEDUP = "craft_speedup",
  /** 全局合成加速 */
  GLOBAL_CRAFT_SPEEDUP = "global_craft_speedup",
  /** 双倍收获 */
  DOUBLE_HARVEST = "double_harvest",
  /** 金币加倍 */
  GOLD_BOOST = "gold_boost",
  /** 钻石领取 */
  DIAMOND_REWARD = "diamond_reward",
  /** 神秘宝箱 */
  MYSTERY_BOX = "mystery_box",
  /** 提前解锁作物 */
  EARLY_UNLOCK_CROP = "early_unlock_crop",
  /** 提前解锁配方 */
  EARLY_UNLOCK_RECIPE = "early_unlock_recipe",
  /** 提前解锁地块 */
  EARLY_UNLOCK_LAND = "early_unlock_land",
  /** 种子免费领取 */
  FREE_SEED = "free_seed",
}

/** 广告位配置 */
interface AdPlacementConfig {
  /** 广告位 ID（微信后台分配） */
  adUnitId: string;
  /** 广告类型 */
  type: "rewardedVideo" | "interstitial" | "banner" | "native";
  /** 每日上限 */
  dailyLimit: number;
  /** 单次间隔（秒） */
  cooldownSeconds: number;
}

/** 广告观看记录 */
interface AdWatchRecord {
  rewardType: AdRewardType;
  watchTime: number;
  date: string; // "YYYY-MM-DD"
  isRewarded: boolean;
}

/** 用户广告状态 */
interface AdUserState {
  /** 各激励类型今日已观看次数 */
  dailyWatches: Record<string, number>;
  /** 今日总观看次数 */
  totalDailyWatches: number;
  /** 累计总观看次数（终身） */
  lifetimeWatches: number;
  /** 上次各广告位观看时间（用于冷却） */
  lastWatchTimes: Record<string, number>;
  /** 昨日最后记录的日期字符串 */
  lastRecordDate: string;
  /** Banner 广告免广告截止时间戳（VIP） */
  bannerFreeUntil: number;
  /** 插屏广告免广告截止时间戳 */
  interstitialFreeUntil: number;
}

@ccclass("AdSystem")
export class AdSystem extends Component {
  // ============ 广告位配置 ============
  private readonly PLACEMENTS: Record<string, AdPlacementConfig> = {
    [AdRewardType.CROP_SPEEDUP]: {
      adUnitId: "adunit_crop_speedup",
      type: "rewardedVideo",
      dailyLimit: 10,
      cooldownSeconds: 30,
    },
    [AdRewardType.GLOBAL_CROP_SPEEDUP]: {
      adUnitId: "adunit_global_crop_speedup",
      type: "rewardedVideo",
      dailyLimit: 5,
      cooldownSeconds: 30,
    },
    [AdRewardType.CRAFT_SPEEDUP]: {
      adUnitId: "adunit_craft_speedup",
      type: "rewardedVideo",
      dailyLimit: 10,
      cooldownSeconds: 30,
    },
    [AdRewardType.DOUBLE_HARVEST]: {
      adUnitId: "adunit_double_harvest",
      type: "rewardedVideo",
      dailyLimit: 5,
      cooldownSeconds: 30,
    },
    [AdRewardType.GOLD_BOOST]: {
      adUnitId: "adunit_gold_boost",
      type: "rewardedVideo",
      dailyLimit: 5,
      cooldownSeconds: 30,
    },
    [AdRewardType.DIAMOND_REWARD]: {
      adUnitId: "adunit_diamond_reward",
      type: "rewardedVideo",
      dailyLimit: 5,
      cooldownSeconds: 30,
    },
    [AdRewardType.MYSTERY_BOX]: {
      adUnitId: "adunit_mystery_box",
      type: "rewardedVideo",
      dailyLimit: 3,
      cooldownSeconds: 30,
    },
    [AdRewardType.FREE_SEED]: {
      adUnitId: "adunit_free_seed",
      type: "rewardedVideo",
      dailyLimit: 3,
      cooldownSeconds: 30,
    },
    [AdRewardType.EARLY_UNLOCK_CROP]: {
      adUnitId: "adunit_early_crop",
      type: "rewardedVideo",
      dailyLimit: 3,
      cooldownSeconds: 30,
    },
  };

  // ============ 状态数据 ============
  private userState: AdUserState = this.getDefaultState();

  // ============ 微信广告实例 ============
  private rewardedVideoAd: any = null;
  private interstitialAd: any = null;
  private bannerAd: any = null;

  // ============ 回调 ============
  private pendingResolve: ((rewarded: boolean) => void) | null = null;

  /** 获取默认广告状态 */
  private getDefaultState(): AdUserState {
    const today = this.getTodayDate();
    return {
      dailyWatches: {},
      totalDailyWatches: 0,
      lifetimeWatches: 0,
      lastWatchTimes: {},
      lastRecordDate: today,
      bannerFreeUntil: 0,
      interstitialFreeUntil: 0,
    };
  }

  /** 获取今日日期 YYYY-MM-DD */
  private getTodayDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // ============ 初始化 ============

  start() {
    this.loadAdState();
    this.initRewardedVideoAd();
    this.initInterstitialAd();
    this.initBannerAd();
  }

  /** 加载广告状态 */
  private loadAdState() {
    const dataManager = require("./DataManager").DataManager.getInstance();
    if (dataManager) {
      const saved = dataManager.loadGame()?.adState;
      if (saved) {
        this.userState = { ...this.getDefaultState(), ...saved };
        // 检查是否跨天，如果是则重置每日计数
        if (this.userState.lastRecordDate !== this.getTodayDate()) {
          this.userState.dailyWatches = {};
          this.userState.totalDailyWatches = 0;
          this.userState.lastRecordDate = this.getTodayDate();
        }
      }
    }
  }

  /** 保存广告状态 */
  public saveAdState() {
    // 状态会通过 GameManager 统一保存
  }

  // ============ 微信广告 API 初始化 ============

  /** 初始化激励视频广告 */
  private initRewardedVideoAd() {
    if (typeof wx === "undefined" || !wx.createRewardedVideoAd) return;

    this.rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: "adunit_rewarded_video", // 微信后台配置的广告位 ID
    });

    // 广告加载成功
    this.rewardedVideoAd.onLoad(() => {
      console.log("[AdSystem] 激励视频广告加载成功");
    });

    // 广告加载失败
    this.rewardedVideoAd.onError((err: any) => {
      console.error("[AdSystem] 激励视频广告加载失败:", err);
      if (this.pendingResolve) {
        this.pendingResolve(false);
        this.pendingResolve = null;
      }
    });

    // 广告关闭（用户关闭或观看完成）
    this.rewardedVideoAd.onClose((res: any) => {
      const isRewarded = res && res.isEnded;
      if (this.pendingResolve) {
        this.pendingResolve(isRewarded);
        this.pendingResolve = null;
      }
      // 重新加载广告
      this.rewardedVideoAd.load();
    });
  }

  /** 初始化插屏广告 */
  private initInterstitialAd() {
    if (typeof wx === "undefined" || !wx.createInterstitialAd) return;

    this.interstitialAd = wx.createInterstitialAd({
      adUnitId: "adunit_interstitial",
    });

    this.interstitialAd.onLoad(() => {
      console.log("[AdSystem] 插屏广告加载成功");
    });

    this.interstitialAd.onError((err: any) => {
      console.error("[AdSystem] 插屏广告加载失败:", err);
    });

    this.interstitialAd.onClose(() => {
      // 重新加载
      this.interstitialAd.load();
    });
  }

  /** 初始化 Banner 广告 */
  private initBannerAd() {
    if (typeof wx === "undefined" || !wx.createBannerAd) return;

    this.bannerAd = wx.createBannerAd({
      adUnitId: "adunit_banner",
      style: {
        left: 0,
        top: 600, // 动态计算位置
        width: 320,
      },
    });
  }

  // ============ 激励视频广告：核心流程 ============

  /**
   * 观看激励视频广告
   * @param rewardType 激励类型
   * @returns Promise<boolean> 是否成功获得奖励（用户完整观看）
   */
  public watchRewardedVideo(rewardType: AdRewardType): Promise<boolean> {
    return new Promise((resolve) => {
      // 1. 检查每日次数限制
      if (!this.canWatchAd(rewardType)) {
        console.warn(`[AdSystem] ${rewardType} 已达每日上限`);
        resolve(false);
        return;
      }

      // 2. 检查冷却时间
      if (!this.isCooldownPassed(rewardType)) {
        console.warn(`[AdSystem] ${rewardType} 尚在冷却中`);
        resolve(false);
        return;
      }

      // 3. 检查未成年人限制
      if (!this.canWatchDueToAge()) {
        console.warn("[AdSystem] 当前账号广告次数受限");
        resolve(false);
        return;
      }

      // 4. 显示广告
      if (this.rewardedVideoAd) {
        this.pendingResolve = (rewarded: boolean) => {
          if (rewarded) {
            this.onAdRewarded(rewardType);
          }
          resolve(rewarded);
        };

        this.rewardedVideoAd.show().catch((err: any) => {
          console.error("[AdSystem] 广告展示失败:", err);
          resolve(false);
          this.pendingResolve = null;
        });
      } else {
        // 非微信环境（调试）：模拟广告观看
        console.log("[AdSystem] 非微信环境，模拟广告观看");
        this.onAdRewarded(rewardType);
        resolve(true);
      }
    });
  }

  // ============ 次数与冷却检查 ============

  /** 检查是否可以观看某类广告 */
  public canWatchAd(rewardType: AdRewardType): boolean {
    const placement = this.PLACEMENTS[rewardType];
    if (!placement) return false;

    const current = this.userState.dailyWatches[rewardType] || 0;
    if (current >= placement.dailyLimit) return false;

    // 总次数上限
    if (this.userState.totalDailyWatches >= 20) return false;

    return true;
  }

  /** 检查冷却是否已过 */
  private isCooldownPassed(rewardType: AdRewardType): boolean {
    const lastTime = this.userState.lastWatchTimes[rewardType] || 0;
    const elapsed = Date.now() - lastTime;
    return elapsed >= 30000; // 30 秒冷却
  }

  /** 检查未成年人广告限制 */
  private canWatchDueToAge(): boolean {
    // 未实名用户每日限制 5 次
    if (!this.isUserVerified()) {
      return this.userState.totalDailyWatches < 5;
    }
    return true;
  }

  /** 模拟用户实名状态（实际应由微信登录信息判断） */
  private isUserVerified(): boolean {
    return true;
  }

  // ============ 广告奖励回调 ============

  /** 广告观看完成，发放奖励 */
  private onAdRewarded(rewardType: AdRewardType) {
    // 更新计数
    this.userState.dailyWatches[rewardType] =
      (this.userState.dailyWatches[rewardType] || 0) + 1;
    this.userState.totalDailyWatches++;
    this.userState.lifetimeWatches++;
    this.userState.lastWatchTimes[rewardType] = Date.now();

    // 记录埋点
    this.logAdEvent(rewardType, true);

    // 发送事件通知其他系统
    this.node.emit("adRewarded", { rewardType });

    // 发放具体奖励
    this.dispatchReward(rewardType);

    // 检查累计奖励
    this.checkCumulativeRewards();
  }

  /** 发放具体奖励 */
  private dispatchReward(rewardType: AdRewardType) {
    const gameManager = require("./GameManager").GameManager.getInstance();
    if (!gameManager) return;

    switch (rewardType) {
      case AdRewardType.CROP_SPEEDUP:
        // 调用地块系统加速指定作物
        this.node.emit("adRequestCropSpeedup", { global: false });
        break;

      case AdRewardType.GLOBAL_CROP_SPEEDUP:
        // 全局所有作物加速 50%
        this.node.emit("adRequestCropSpeedup", { global: true, percent: 50 });
        break;

      case AdRewardType.CRAFT_SPEEDUP:
        this.node.emit("adRequestCraftSpeedup", { global: false });
        break;

      case AdRewardType.DOUBLE_HARVEST:
        // 激活双倍收获状态（下一次收获数量 ×2）
        this.node.emit("adBuffActivated", { buffType: "doubleHarvest", duration: 1 });
        break;

      case AdRewardType.GOLD_BOOST:
        // 激活金币加倍状态（下一次出售 ×2）
        this.node.emit("adBuffActivated", { buffType: "goldBoost", duration: 1 });
        break;

      case AdRewardType.DIAMOND_REWARD:
        // 获得 1-2 钻石
        const diamondAmount = Math.random() < 0.3 ? 2 : 1;
        gameManager.addDiamond(diamondAmount);
        break;

      case AdRewardType.MYSTERY_BOX:
        // 随机获得 1-3 个物品
        this.node.emit("adRequestMysteryBox");
        break;

      case AdRewardType.FREE_SEED:
        // 随机获得一组种子
        this.node.emit("adRequestFreeSeed");
        break;

      case AdRewardType.EARLY_UNLOCK_CROP:
        // 提前解锁作物
        this.node.emit("adEarlyUnlock", { type: "crop" });
        break;

      // ... 更多奖励类型
    }
  }

  // ============ 插屏广告 ============

  /** 展示插屏广告 */
  public showInterstitial(scene: string): Promise<boolean> {
    return new Promise((resolve) => {
      // 检查免广告状态
      if (Date.now() < this.userState.interstitialFreeUntil) {
        resolve(false);
        return;
      }

      // 检查频率（5 分钟）
      const lastInterstitial = this.userState.lastWatchTimes["_interstitial"] || 0;
      if (Date.now() - lastInterstitial < 300000) {
        resolve(false);
        return;
      }

      // 新用户保护：前 3 次不展示
      if (this.userState.lifetimeWatches < 3) {
        resolve(false);
        return;
      }

      if (this.interstitialAd) {
        this.interstitialAd.show().then(() => {
          this.userState.lastWatchTimes["_interstitial"] = Date.now();
          this.logAdEvent("interstitial", true);
          resolve(true);
        }).catch(() => {
          resolve(false);
        });
      } else {
        resolve(false);
      }
    });
  }

  // ============ Banner 广告 ============

  /** 显示 Banner 广告 */
  public showBanner(visible: boolean) {
    if (!this.bannerAd) return;

    // 检查免广告状态
    if (Date.now() < this.userState.bannerFreeUntil) {
      this.hideBanner();
      return;
    }

    if (visible) {
      this.bannerAd.show().catch(() => {});
    } else {
      this.hideBanner();
    }
  }

  /** 隐藏 Banner 广告 */
  public hideBanner() {
    if (this.bannerAd) {
      this.bannerAd.hide();
    }
  }

  // ============ 累计奖励 ============

  private checkCumulativeRewards() {
    const total = this.userState.totalDailyWatches;
    const checked = this.userState.dailyWatches["_cumulativeChecked"] || 0;

    const rewardMap: Record<number, () => void> = {
      3: () => this.node.emit("adRewardCumulative", { reward: "seed_x2" }),
      5: () => this.node.emit("adRewardCumulative", { reward: "diamond_x5" }),
      8: () => this.node.emit("adRewardCumulative", { reward: "speed_ticket_x2" }),
      10: () => this.node.emit("adRewardCumulative", { reward: "mystery_box_x1" }),
    };

    for (const [threshold, rewardFn] of Object.entries(rewardMap)) {
      if (total >= Number(threshold) && checked < Number(threshold)) {
        rewardFn();
        this.userState.dailyWatches["_cumulativeChecked"] = Number(threshold);
      }
    }
  }

  // ============ 埋点日志 ============

  private logAdEvent(rewardType: string, isRewarded: boolean) {
    const event = {
      adType: this.PLACEMENTS[rewardType]?.type || "rewardedVideo",
      placementId: this.PLACEMENTS[rewardType]?.adUnitId || "",
      scene: rewardType,
      isRewarded,
      watchDuration: 0, // 需由广告回调提供
      timestamp: new Date().toISOString(),
    };

    // 发送到事件管理器以便后续上报
    this.node.emit("adLogEvent", event);
    console.log("[AdSystem 埋点]", JSON.stringify(event));
  }

  // ============ 查询接口 ============

  /** 获取某类广告的剩余可用次数 */
  public getRemainingWatches(rewardType: AdRewardType): number {
    const placement = this.PLACEMENTS[rewardType];
    if (!placement) return 0;
    const used = this.userState.dailyWatches[rewardType] || 0;
    return Math.max(0, placement.dailyLimit - used);
  }

  /** 获取今日总观看次数 */
  public getTodayTotalWatches(): number {
    return this.userState.totalDailyWatches;
  }

  /** 获取终身累计观看次数 */
  public getLifetimeWatches(): number {
    return this.userState.lifetimeWatches;
  }

  /** 获取每日最大可观看次数 */
  public getMaxDailyWatches(): number {
    // 总上限 20
    return 20;
  }

  /** 检查是否已到达某类广告的每日上限 */
  public isAdTypeExhausted(rewardType: AdRewardType): boolean {
    return this.getRemainingWatches(rewardType) <= 0;
  }

  /** 获取广告状态（供 UI 使用） */
  public getAdStatus() {
    return {
      totalWatches: this.userState.totalDailyWatches,
      maxWatches: this.getMaxDailyWatches(),
      lifetimeWatches: this.userState.lifetimeWatches,
      isBannerFree: Date.now() < this.userState.bannerFreeUntil,
      isInterstitialFree: Date.now() < this.userState.interstitialFreeUntil,
      placements: Object.keys(this.PLACEMENTS).reduce(
        (acc, key) => {
          acc[key] = {
            remaining: this.getRemainingWatches(key as AdRewardType),
            limit: this.PLACEMENTS[key].dailyLimit,
          };
          return acc;
        },
        {} as Record<string, { remaining: number; limit: number }>,
      ),
    };
  }

  // ============ VIP 免广告 ============

  /** 激活 Banner 广告免广告 */
  public activateBannerFree(durationHours: number = 24) {
    this.userState.bannerFreeUntil = Date.now() + durationHours * 3600 * 1000;
  }

  /** 激活插屏广告免广告 */
  public activateInterstitialFree(durationHours: number = 24) {
    this.userState.interstitialFreeUntil = Date.now() + durationHours * 3600 * 1000;
  }

  /** 月卡特权激活 */
  public activateMonthlyPass() {
    const durationDays = 30;
    this.activateBannerFree(24 * durationDays);
    this.activateInterstitialFree(24 * durationDays);
  }

  // ============ 生命周期 ============

  onDestroy() {
    // 清理广告监听
    if (this.rewardedVideoAd) {
      this.rewardedVideoAd.destroy();
    }
    if (this.interstitialAd) {
      this.interstitialAd.destroy();
    }
    if (this.bannerAd) {
      this.bannerAd.hide();
    }
  }
}
```

### 2.7 GameManager 广告集成

在 `GameManager` 中集成广告系统调用：

```typescript
// GameManager 新增的广告相关方法

/**
 * 尝试用广告替代钻石加速
 * @returns { success: boolean, usedAd: boolean }
 *   - usedAd = true: 观看了广告，免费加速
 *   - usedAd = false: 消耗了钻石加速
 *   - success: 操作是否成功
 */
public async trySpeedUpWithAd(
  adSystem: any,
  target: "crop" | "craft",
  diamondCost: number,
): Promise<{ success: boolean; usedAd: boolean }> {
  // 方案 1：优先尝试广告
  if (adSystem && adSystem.canWatchAd(
    target === "crop" ? "crop_speedup" : "craft_speedup",
  )) {
    const rewarded = await adSystem.watchRewardedVideo(
      target === "crop" ? "crop_speedup" : "craft_speedup",
    );
    if (rewarded) {
      return { success: true, usedAd: true };
    }
  }

  // 方案 2：广告不可用时消耗钻石
  if (this.spendDiamond(diamondCost)) {
    return { success: true, usedAd: false };
  }

  return { success: false, usedAd: false };
}

/**
 * 尝试获取双倍收获（广告方案）
 */
public async tryDoubleHarvestWithAd(adSystem: any): Promise<boolean> {
  if (adSystem && adSystem.canWatchAd("double_harvest")) {
    return await adSystem.watchRewardedVideo("double_harvest");
  }
  return false;
}

/**
 * 尝试用广告提前解锁
 */
public async tryEarlyUnlockWithAd(
  adSystem: any,
  targetLevel: number,
  unlockType: "crop" | "recipe" | "land",
): Promise<boolean> {
  // 检查等级差距：玩家至少达到目标等级 - 2
  if (this.playerLevel < targetLevel - 2) {
    return false;
  }

  const adType =
    unlockType === "crop"
      ? "early_unlock_crop"
      : unlockType === "recipe"
        ? "early_unlock_recipe"
        : "early_unlock_land";

  if (adSystem && adSystem.canWatchAd(adType)) {
    const rewarded = await adSystem.watchRewardedVideo(adType);
    if (rewarded) {
      this.node.emit("earlyUnlockGranted", { type: unlockType, targetLevel });
      return true;
    }
  }
  return false;
}
```

---

## 第三部分：数据结构参考

### 3.1 游戏数据模型

```typescript
// 玩家数据
interface PlayerData {
  playerId: string;
  playerName: string;
  level: number;
  experience: number;
  gold: number;
  diamond: number;
  createTime: number;
  lastLoginTime: number;
  totalPlayTime: number;
}

// 地块数据
interface LandData {
  blockId: number;
  state: "empty" | "growing" | "harvesting" | "occupied";
  cropType?: string;
  progress?: number;
  plantTime?: number;
}

// 物品数据
interface ItemData {
  itemId: string;
  name: string;
  category: number;
  description: string;
  sellPrice: number;
  unlockLevel: number;
  rarity: number;
}

// 完整存档数据
interface GameSaveData {
  player: PlayerData;
  lands: LandData[];
  inventory: InventorySlot[];
  activeCrafts: CraftingProcess[];
  unlockedRecipes: string[];
  completedQuests: string[];
  achievements: string[];
  /** 广告系统状态 */
  adState?: {
    dailyWatches: Record<string, number>;
    totalDailyWatches: number;
    lifetimeWatches: number;
    lastWatchTimes: Record<string, number>;
    lastRecordDate: string;
    bannerFreeUntil: number;
    interstitialFreeUntil: number;
  };
  /** 当前生效的 Buff 状态 */
  activeBuffs?: Array<{
    buffType: string;
    expireTime: number;
    remainingUses: number;
  }>;
  lastSaveTime: number;
}
```

---

## 第四部分：开发流程和最佳实践

### 4.1 开发步骤

```
Week 1：基础框架搭建
├─ 创建项目结构
├─ 实现 DataManager 和 EventManager
└─ 创建主场景基础框架

Week 2：核心系统实现
├─ 地块系统完成
├─ 种植系统完成
├─ 物品栏系统完成
└─ 基础 UI 搭建

Week 3：合成和货币系统
├─ 合成系统完成
├─ 货币系统完成
├─ 合成 UI 实现
└─ 交互测试

Week 4：等级和任务系统
├─ 等级系统实现
├─ 任务系统实现
├─ 成就系统实现
└─ 系统测试

Week 5：广告系统和 UI 完善
├─ 实现 AdSystem 广告管理器
├─ 集成微信广告 API（激励视频/插屏/Banner）
├─ 完善所有 UI 界面
├─ 集成物品图标和背景
├─ 添加音效和动画
├─ 广告 UI 和激励反馈测试

Week 6：性能优化和发布准备
├─ 性能分析和优化
├─ 包体积优化
├─ 广告展示逻辑调优
├─ 微信适配测试
├─ 构建和上传准备
```

### 4.2 代码规范

**命名规范：**

- 类名：PascalCase（GameManager）
- 方法名：camelCase（addExperience）
- 属性名：camelCase（playerLevel）
- 常量：UPPER_SNAKE_CASE（MAX_SLOTS）
- 文件名：PascalCase（GameManager.ts）

**注释规范：**

```typescript
/**
 * 添加经验值
 * @param amount 要添加的经验值数量
 * @returns 返回是否升级
 */
public addExperience(amount: number): boolean {
    // 实现...
}
```

### 4.3 性能优化建议

1. **对象池** - 频繁创建的物体使用对象池
2. **图集** - 使用 TexturePacker 打包图集，减少 draw call
3. **定时器** - 使用统一的定时器更新系统，而非每个对象单独计时
4. **内存管理** - 及时释放不用的资源和引用
5. **渲染优化** - 合理使用相机和图层，减少不必要的渲染

---

## 第五部分：Rust 后端服务架构

### 5.1 整体架构

```
┌────────────────────────────────────────────┐
│              微信小游戏客户端                │
│         (Cocos Creator + TypeScript)        │
├────────────────────────────────────────────┤
│              HTTP/HTTPS (JSON)              │
├────────────────────────────────────────────┤
│              Axum Web 框架                  │
├──────────┬────────┬────────┬───────────────┤
│ 认证模块 │ 存档模块│ 排行模块│ 广告/社交模块  │
├──────────┴────────┴────────┴───────────────┤
│            SQLx ORM (编译时检查)            │
├────────────────────────────────────────────┤
│              SQLite 数据库                  │
└────────────────────────────────────────────┘
```

### 5.2 技术栈

| 组件 | 技术 | 说明 |
| --- | --- | --- |
| **框架** | Axum 0.7 | 高性能异步 Web 框架，基于 Tokio |
| **数据库** | SQLite (via SQLx) | 单文件数据库，无需独立进程，适合小游戏部署 |
| **认证** | JWT (jsonwebtoken) | 微信登录后签发，7 天有效期 |
| **序列化** | Serde + serde_json | 编译时序列化，类型安全 |
| **HTTP 客户端** | reqwest | 调用微信 jscode2session 接口 |
| **日志** | tracing + tracing-subscriber | 结构化日志 |
| **部署** | 单二进制文件 | cargo build --release 后可直接运行 |

### 5.3 项目结构

```
Web/backend/
├── Cargo.toml                     # 依赖管理
├── .env.example                   # 环境变量模板
├── src/
│   ├── main.rs                    # 入口：启动服务器、路由注册
│   ├── config.rs                  # 配置读取（环境变量）
│   ├── db.rs                      # 数据库连接池初始化、迁移
│   ├── errors.rs                  # 统一错误处理、API 响应格式
│   ├── models/
│   │   ├── mod.rs
│   │   ├── user.rs                # 用户模型、微信登录 DTO
│   │   ├── game_data.rs           # 游戏存档模型
│   │   ├── leaderboard.rs         # 排行榜模型
│   │   └── ad.rs                  # 广告记录模型
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── auth.rs                # 微信登录 + JWT 签发
│   │   ├── game.rs                # 存档保存/加载/清除
│   │   ├── leaderboard.rs         # 排行榜查询/更新
│   │   ├── ad.rs                  # 广告观看记录/状态查询
│   │   └── social.rs              # 分享记录/每日重置
│   └── middleware/
│       ├── mod.rs
│       └── auth.rs                # JWT 认证中间件
├── migrations/
│   └── 001_init.sql               # 建表脚本（users/game_saves/leaderboard/ad_records）
└── tests/
```

### 5.4 数据库表设计

```sql
-- 用户表
CREATE TABLE users (
    id              TEXT PRIMARY KEY,          -- UUID
    wx_open_id      TEXT UNIQUE NOT NULL,       -- 微信 OpenID
    nickname        TEXT DEFAULT '萌田农场主',
    avatar_url      TEXT DEFAULT '',
    created_at      TEXT DEFAULT (datetime('now')),
    last_login_at   TEXT DEFAULT (datetime('now'))
);

-- 游戏存档表（JSON 字段存储
CREATE TABLE game_saves (
    user_id         TEXT PRIMARY KEY REFERENCES users(id),
    player_level    INTEGER DEFAULT 1,
    experience      INTEGER DEFAULT 0,
    gold            INTEGER DEFAULT 200,
    diamond         INTEGER DEFAULT 50,
    land_data       TEXT DEFAULT '[]',          -- JSON
    inventory_data  TEXT DEFAULT '[]',          -- JSON
    unlocked_recipes TEXT DEFAULT '[]',          -- JSON
    quest_data      TEXT DEFAULT '{}',           -- JSON
    achievement_data TEXT DEFAULT '[]',          -- JSON
    total_play_time INTEGER DEFAULT 0,
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- 排行榜表
CREATE TABLE leaderboard (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL REFERENCES users(id),
    score_type      TEXT NOT NULL,               -- "level" | "gold" | "crafts"
    score_value     INTEGER DEFAULT 0,
    updated_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, score_type)
);

-- 广告记录表
CREATE TABLE ad_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL REFERENCES users(id),
    reward_type     TEXT NOT NULL,               -- 激励类型枚举
    watch_date      TEXT NOT NULL,               -- YYYY-MM-DD
    watch_count     INTEGER DEFAULT 0,
    lifetime_count  INTEGER DEFAULT 0,
    last_watch_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, reward_type, watch_date)
);
```

### 5.5 API 接口列表

| 方法 | 路径 | 认证 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/wx_login` | 否 | 微信登录，返回 JWT |
| POST | `/api/auth/refresh` | 是 | 刷新 JWT |
| GET | `/api/game/load` | 是 | 加载游戏存档 |
| POST | `/api/game/save` | 是 | 保存游戏存档 |
| POST | `/api/game/clear` | 是 | 清除存档并重置 |
| GET | `/api/leaderboard` | 是 | 获取排行榜（支持类型/数量参数） |
| POST | `/api/leaderboard/update` | 是 | 更新排行榜分数 |
| POST | `/api/ad/record` | 是 | 记录广告观看 |
| GET | `/api/ad/status` | 是 | 查询广告状态和剩余次数 |
| POST | `/api/share` | 是 | 记录分享并获得奖励 |
| GET | `/api/daily/check` | 是 | 检查每日重置时间 |
| GET | `/api/health` | 否 | 健康检查 |

### 5.6 前后端交互流程

```
[启动游戏]
    ↓
微信 wx.login() → 获取临时 code
    ↓
POST /api/auth/wx_login { code } → 返回 JWT token
    ↓
(后续所有请求携带) Authorization: Bearer <token>
    ↓
GET /api/game/load → 获取存档
    ↓
[游戏过程中]
    ├── 每 60 秒自动 → POST /api/game/save
    ├── 广告观看 → POST /api/ad/record
    ├── 分享 → POST /api/share
    └── 排行榜 → GET /api/leaderboard
```

### 5.7 部署说明

```bash
# 1. 进入后端目录
cd Web/backend

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 JWT_SECRET、WX_APP_ID、WX_APP_SECRET

# 3. 构建（Release 模式，生成单文件二进制）
cargo build --release

# 4. 运行
./target/release/moefarm-server

# 或使用 Docker（自行编写 Dockerfile）
# docker build -t moefarm-server .
# docker run -d -p 3000:3000 --env-file .env moefarm-server
```

### 5.8 开发环境快速启动

```bash
# 安装 Rust（如未安装）
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 运行开发服务器
cd Web/backend
cargo run

# 日志输出示例：
# 🚀 萌田农场后端服务启动: http://0.0.0.0:3000
# ✅ 数据库连接成功
# ✅ 数据库迁移完成
```

---

**技术文档版本：** 1.1
**开发时间：** 6-8 周（含后端）
**预计代码行数：** 8000-12000（前后端合计）
**最后更新：** 2024-06-22
