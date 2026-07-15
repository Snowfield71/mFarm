/**
 * 图片加载缓存系统
 *
 * 从后端静态资源服务下载物品 PNG，并缓存为 SpriteFrame。
 * 前端通过 itemId 获取图片，不需要关心具体 URL。
 *
 * 后端图片路径：/assets/textures/items/{Category}/item_{itemId}.png
 */

import { SpriteFrame, Texture2D, ImageAsset, assetManager, Color } from "cc";
import { ServerConfig } from "./ServerConfig";

const TAG = "[ImageCache]";

/** 物品 ID -> 静态资源分类目录 */
const CATEGORY_MAP: Record<string, string> = {
  // Vegetables
  wheat: "Vegetables",
  corn: "Vegetables",
  tomato: "Vegetables",
  wheat_stage_1: "Vegetables",
  wheat_stage_2: "Vegetables",
  wheat_stage_3: "Vegetables",
  corn_stage_1: "Vegetables",
  corn_stage_2: "Vegetables",
  corn_stage_3: "Vegetables",
  tomato_stage_1: "Vegetables",
  tomato_stage_2: "Vegetables",
  tomato_stage_3: "Vegetables",
  carrot_stage_1: "Vegetables",
  carrot_stage_2: "Vegetables",
  carrot_stage_3: "Vegetables",
  lettuce_stage_1: "Vegetables",
  lettuce_stage_2: "Vegetables",
  lettuce_stage_3: "Vegetables",
  pumpkin_stage_1: "Vegetables",
  pumpkin_stage_2: "Vegetables",
  pumpkin_stage_3: "Vegetables",
  carrot: "Vegetables",
  pumpkin: "Vegetables",
  lettuce: "Vegetables",
  // Seeds
  seedWheat: "Seeds",
  seedCorn: "Seeds",
  seedTomato: "Seeds",
  seedCarrot: "Seeds",
  seedLettuce: "Seeds",
  seedPumpkin: "Seeds",
  seedBanana: "Seeds",
  seedStrawberry: "Seeds",
  seedApple: "Seeds",
  seedCherry: "Seeds",
  // Fruits
  strawberry: "Fruits",
  cherry: "Fruits",
  banana: "Fruits",
  apple: "Fruits",
  strawberry_stage_1: "Fruits",
  strawberry_stage_2: "Fruits",
  strawberry_stage_3: "Fruits",
  cherry_stage_1: "Fruits",
  cherry_stage_2: "Fruits",
  cherry_stage_3: "Fruits",
  banana_stage_1: "Fruits",
  banana_stage_2: "Fruits",
  banana_stage_3: "Fruits",
  apple_stage_1: "Fruits",
  apple_stage_2: "Fruits",
  apple_stage_3: "Fruits",
  // Processed
  flour: "Processed",
  butter: "Processed",
  honey: "Processed",
  milk: "Processed",
  sugar: "Processed",
  oatmeal: "Processed",
  bananaSauce: "Processed",
  jam: "Processed",
  carrotPuree: "Processed",
  cheese: "Processed",
  ketchup: "Processed",
  water: "Processed",
  // Foods
  bread: "Foods",
  cake: "Foods",
  egg: "Foods",
  croissant: "Foods",
  cupcake: "Foods",
  cookie: "Foods",
  pie: "Foods",
  strawberryCake: "Foods",
  baguette: "Foods",
  donut: "Foods",
  chocolateCake: "Foods",
  cereal: "Foods",
  cornFlakes: "Foods",
  pasta: "Foods",
  butterToast: "Foods",
  honeyToast: "Foods",
  jamToast: "Foods",
  // Buildings
  chickenCoop: "Buildings",
  barn: "Buildings",
  warehouse: "Buildings",
  house: "Buildings",
  well: "Buildings",
  garden: "Buildings",
  beehive: "Buildings",
  // Decorations
  sunflower: "Decorations",
  tulip: "Decorations",
  rose: "Decorations",
  tree: "Decorations",
  palmTree: "Decorations",
  stone: "Decorations",
  log: "Decorations",
  fence: "Decorations",
  tent: "Decorations",
  pumpkinLantern: "Decorations",
  flower: "Decorations",
  // Special
  mysteryBox: "Special",
  luckyStar: "Special",
  jade: "Special",
  // Tools
  speedTicket: "Tools",
  doubleHarvestCard: "Tools",
  goldBoostCard: "Tools",
  universalSeed: "Tools",
  makeUpSignInCard: "Tools",
};

/** UI 图标 -> 文件名映射 */
const UI_ICON_MAP: Record<string, string> = {
  gold: "common/currency/icon_gold",
  diamond: "common/currency/icon_diamond",
  bag: "common/navigation/icon_bag",
  gear: "common/navigation/icon_gear",
  quest: "common/navigation/icon_quest",
  catalog: "common/navigation/icon_catalog",
  entryShop: "common/entries/icon_entry_shop",
  entryHarvest: "common/entries/icon_entry_harvest",
  billboard: "farm/icon_billboard",
  pastureBillboard: "farm/icon_pasture_billboard",
  field: "farm/icon_field",
  greenField: "farm/icon_green_field",
  avatarFarmgirl: "../avatar/avatar_farmgirl",
  bgFarmSkyHills: "farm/bg_farm_sky_hills",
  bgPastureFence: "farm/bg_pasture_fence",
  buildingPad: "farm/icon_building_pad",
  // Legacy aliases point at the current arrow billboards so old callers never request removed files.
  entryPasture: "farm/icon_entry_pasture_arrow",
  entryFarm: "farm/icon_entry_farm_arrow",
  entryPastureArrow: "farm/icon_entry_pasture_arrow",
  entryFarmArrow: "farm/icon_entry_farm_arrow",
  pastureCollect: "farm/icon_collect_pasture",
  catalogBg: "catalog/catalog_bg",
  panelBg: "common/panels/panel_bg",
  taskMain: "task/icons/icon_task_main",
  taskDaily: "task/icons/icon_task_daily",
  taskBranch: "task/icons/icon_task_branch",
  taskSpecial: "task/icons/icon_task_special",
  taskTabsMain: "task/tabs/task_tabs_main",
  taskTabsDaily: "task/tabs/task_tabs_daily",
  taskTabsBranch: "task/tabs/task_tabs_branch",
  taskTabsSpecial: "task/tabs/task_tabs_special",
  inventoryAll: "inventory/icons/icon_inventory_all",
  inventorySeeds: "inventory/icons/icon_inventory_seeds",
  inventoryMaterials: "inventory/icons/icon_inventory_materials",
  inventoryProducts: "inventory/icons/icon_inventory_products",
  shopTabsSeeds: "shop/tabs/shop_tabs_seeds",
  shopTabsTools: "shop/tabs/shop_tabs_tools",
  shopSeeds: "shop/icons/icon_shop_seeds",
  shopTools: "shop/icons/icon_shop_tools",
  btnBuy: "shop/buttons/btn_buy",
  btnGo: "task/buttons/btn_go",
  btnDetail: "task/buttons/btn_detail",
  btnClaim: "task/buttons/btn_claim",
  btnClaimed: "task/buttons/btn_claimed",
  signInClaim: "signin/buttons/btn_signin_claim",
  signInClaimed: "signin/buttons/btn_signin_claimed",
  achievementClaim: "achievement/buttons/btn_achievement_claim",
  achievementClaimed: "achievement/buttons/btn_achievement_claimed",
  achievementLocked: "achievement/buttons/btn_achievement_locked",
  achievementFirstPlant: "achievement/icons/icon_achievement_first_plant",
  achievementPlant50: "achievement/icons/icon_achievement_plant_50",
  achievementGold100: "achievement/icons/icon_achievement_gold_100",
  achievementLevel10: "achievement/icons/icon_achievement_level_10",
  achievementFirstCraft: "achievement/icons/icon_achievement_first_craft",
  achievementCraft50: "achievement/icons/icon_achievement_craft_50",
  achievementRecipesAll: "achievement/icons/icon_achievement_recipes_all",
  achievementCatalogAll: "achievement/icons/icon_achievement_catalog_all",
  achievementCatalogAllLocked: "achievement/icons/icon_achievement_catalog_all_locked",
  craftChefTools: "craft/icons/icon_chef_tools",
  craftArrow: "craft/icons/icon_craft_arrow",
  btnCraft: "craft/buttons/btn_craft",
  task1: "task/icons/icon_task_1",
  task2: "task/icons/icon_task_2",
  task3: "task/icons/icon_task_3",
  task4: "task/icons/icon_task_4",
  task5: "task/icons/icon_task_5",
  task6: "task/icons/icon_task_6",
  task7: "task/icons/icon_task_7",
  task8: "task/icons/icon_task_8",
  task9: "task/icons/icon_task_9",
  rewardGold: "task/rewards/icon_reward_gold",
  rewardSeed: "task/rewards/icon_reward_seed",
};

/** 后端当前应存在的物品图片数量 */
const TOTAL_REAL_IMAGES = 62;

export class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, SpriteFrame> = new Map();
  private pending: Map<string, Promise<SpriteFrame | null>> = new Map();
  private failed: Set<string> = new Set();

  static getInstance(): ImageCache {
    if (!ImageCache.instance) ImageCache.instance = new ImageCache();
    return ImageCache.instance;
  }

  /** 获取物品图片 URL */
  getItemUrl(itemId: string): string {
    const cat = CATEGORY_MAP[itemId] || "Vegetables";
    const url = ServerConfig.getItemImageUrl(cat, itemId);
    if (!itemId.startsWith("seed")) return url;
    return `${url}${url.includes("?") ? "&" : "?"}`;
  }

  /** 获取 UI 图标 URL */
  getUiIconUrl(iconName: string): string {
    const filename = UI_ICON_MAP[iconName] || iconName;
    return ServerConfig.getUiImageUrl(filename);
  }

  /** 加载 UI 图标，带缓存和并发去重 */
  async loadUiIcon(
    iconName: string,
    timeout = 8000,
  ): Promise<SpriteFrame | null> {
    const cacheKey = `_ui_${iconName}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (this.failed.has(cacheKey)) return null;

    const pending = this.pending.get(cacheKey);
    if (pending) return pending;

    const url = this.getUiIconUrl(iconName);
    const promise = this.downloadSpriteFrame(url, timeout)
      .then((sf) => {
        if (sf) this.cache.set(cacheKey, sf);
        else this.failed.add(cacheKey);
        this.pending.delete(cacheKey);
        return sf;
      })
      .catch(() => {
        this.failed.add(cacheKey);
        this.pending.delete(cacheKey);
        return null;
      });
    this.pending.set(cacheKey, promise);
    return promise;
  }

  /** 异步加载物品图片，带缓存和并发去重 */
  async preloadUiIcons(iconNames: string[]): Promise<number> {
    const results = await Promise.all(
      iconNames.map((name) => this.loadUiIcon(name)),
    );
    return results.filter(Boolean).length;
  }

  async load(itemId: string, timeout = 8000): Promise<SpriteFrame | null> {
    // 内存缓存
    const cached = this.cache.get(itemId);
    if (cached) return cached;

    // 防止并发重复请求
    const pending = this.pending.get(itemId);
    if (pending) return pending;

    const url = this.getItemUrl(itemId);
    const promise = this.downloadSpriteFrame(url, timeout)
      .then((sf) => {
        if (sf) this.cache.set(itemId, sf);
        this.pending.delete(itemId);
        return sf;
      })
      .catch((err) => {
        console.warn(`${TAG} ${itemId} 加载失败:`, err);
        this.pending.delete(itemId);
        return null;
      });

    this.pending.set(itemId, promise);
    return promise;
  }

  /** 批量预加载，只加载已映射到静态资源目录的物品 */
  async preload(itemIds: string[]): Promise<number> {
    // 只预加载 CATEGORY_MAP 中存在的物品。
    const realIds = itemIds.filter((id) => CATEGORY_MAP[id]);
    const results = await Promise.all(realIds.map((id) => this.load(id)));
    const loaded = results.filter(Boolean).length;
    return loaded;
  }

  /** 初始化阶段一次性预加载所有运行时会使用的物品与 UI 图片。 */
  async preloadAllRequired(): Promise<{ items: number; ui: number }> {
    const itemIds = Object.keys(CATEGORY_MAP);
    const uiNames = Object.keys(UI_ICON_MAP).filter(
      (name) => name !== "entryFarm" && name !== "entryPasture",
    );
    const [items, ui] = await Promise.all([
      this.preload(itemIds),
      this.preloadUiIcons(uiNames),
    ]);
    return { items, ui };
  }

  getCachedItem(itemId: string): SpriteFrame | null {
    return this.cache.get(itemId) || null;
  }

  getCachedUiIcon(iconName: string): SpriteFrame | null {
    return this.cache.get(`_ui_${iconName}`) || null;
  }

  /** 将 SpriteFrame 应用到 Sprite 组件，加载失败时允许外层自行 fallback */
  static async applyToSprite(
    spriteComp: import("cc").Sprite,
    itemId: string,
    fallbackEmoji?: string,
  ): Promise<void> {
    const sf = await ImageCache.getInstance().load(itemId);
    if (sf) {
      spriteComp.spriteFrame = sf;
    } else if (fallbackEmoji) {
      // 加载失败时给 Sprite 一个灰色状态，外层可继续显示文本/emoji 兜底。
      spriteComp.color = new Color(200, 200, 200);
    }
  }

  /**
   * 下载 PNG 并创建 SpriteFrame
   *
   * 流程：优先 assetManager.loadRemote；失败后用 XHR -> Blob -> ImageBitmap -> Texture2D。
   */
  private async downloadSpriteFrame(
    url: string,
    timeout: number,
  ): Promise<SpriteFrame | null> {
    const remote = await this.loadRemoteSpriteFrame(url, timeout);
    if (remote) return remote;

    // 1. XHR 下载 ArrayBuffer
    const buffer = await this.download(url, timeout);
    if (!buffer) return null;

    // 2. 创建 ImageBitmap，部分小游戏环境可能不支持。
    const blob = new Blob([buffer], { type: "image/png" });
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return null;
    }

    // 3. 创建 Cocos 纹理链路
    const imageAsset = new ImageAsset(bitmap as any);
    const texture = new Texture2D();
    texture.image = imageAsset;
    configureUiTexture(texture);

    const spriteFrame = new SpriteFrame();
    spriteFrame.texture = texture;

    return spriteFrame;
  }

  private loadRemoteSpriteFrame(
    url: string,
    timeout: number,
  ): Promise<SpriteFrame | null> {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(null);
      }, timeout);

      assetManager.loadRemote<ImageAsset>(
        url,
        { ext: ".png" },
        (err, imageAsset) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (err || !imageAsset) {
            resolve(null);
            return;
          }

          const texture = new Texture2D();
          texture.image = imageAsset;
          configureUiTexture(texture);
          const spriteFrame = new SpriteFrame();
          spriteFrame.texture = texture;
          resolve(spriteFrame);
        },
      );
    });
  }

  /** XHR 下载二进制数据 */
  private download(url: string, timeout: number): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.timeout = timeout;

      xhr.onload = () => {
        resolve(xhr.status === 200 ? (xhr.response as ArrayBuffer) : null);
      };
      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.send();
    });
  }

  /** 清空缓存 */
  clear() {
    this.cache.clear();
    this.pending.clear();
    this.failed.clear();
  }

  /** 已缓存数量 */
  get size(): number {
    return this.cache.size;
  }

  /** 检查是否已缓存 */
  has(itemId: string): boolean {
    return this.cache.has(itemId);
  }
}

function configureUiTexture(texture: Texture2D) {
  const runtimeTexture = texture as any;
  runtimeTexture.setFilters?.(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
  runtimeTexture.setMipFilter?.(0);
}
