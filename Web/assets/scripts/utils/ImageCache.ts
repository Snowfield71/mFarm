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
import { getSeasonInfo } from "../config/SeasonConfig";

const TAG = "[ImageCache]";
// Bump when item PNGs are replaced. This versions both remote URLs and local
// SpriteFrame cache keys so hot reloads cannot reuse stale artwork.
const ITEM_ASSET_REVISION = "20260718-6";
// UI backgrounds are served from the same static server and are also cached
// by both the browser and this SpriteFrame cache. Version them independently
// so replacing a dialog PNG is visible without clearing site data.
const UI_ASSET_REVISION = "20260719-2";

/** 物品 ID -> 静态资源分类目录 */
const CATEGORY_MAP: Record<string, string> = {
  // Vegetables
  wheat: "Vegetables/wheat",
  corn: "Vegetables/corn",
  tomato: "Vegetables/tomato",
  wheat_stage_1: "Vegetables/wheat",
  wheat_stage_2: "Vegetables/wheat",
  wheat_stage_3: "Vegetables/wheat",
  corn_stage_1: "Vegetables/corn",
  corn_stage_2: "Vegetables/corn",
  corn_stage_3: "Vegetables/corn",
  tomato_stage_1: "Vegetables/tomato",
  tomato_stage_2: "Vegetables/tomato",
  tomato_stage_3: "Vegetables/tomato",
  carrot_stage_1: "Vegetables/carrot",
  carrot_stage_2: "Vegetables/carrot",
  carrot_stage_3: "Vegetables/carrot",
  lettuce_stage_1: "Vegetables/lettuce",
  lettuce_stage_2: "Vegetables/lettuce",
  lettuce_stage_3: "Vegetables/lettuce",
  pumpkin_stage_1: "Vegetables/pumpkin",
  pumpkin_stage_2: "Vegetables/pumpkin",
  pumpkin_stage_3: "Vegetables/pumpkin",
  carrot: "Vegetables/carrot",
  pumpkin: "Vegetables/pumpkin",
  lettuce: "Vegetables/lettuce",
  potato: "Vegetables/potato",
  potato_stage_1: "Vegetables/potato",
  potato_stage_2: "Vegetables/potato",
  potato_stage_3: "Vegetables/potato",
  cucumber: "Vegetables/cucumber",
  cucumber_stage_1: "Vegetables/cucumber",
  cucumber_stage_2: "Vegetables/cucumber",
  cucumber_stage_3: "Vegetables/cucumber",
  sweetPotato: "Vegetables/sweetPotato",
  sweetPotato_stage_1: "Vegetables/sweetPotato",
  sweetPotato_stage_2: "Vegetables/sweetPotato",
  sweetPotato_stage_3: "Vegetables/sweetPotato",
  spinach: "Vegetables/spinach",
  spinach_stage_1: "Vegetables/spinach",
  spinach_stage_2: "Vegetables/spinach",
  spinach_stage_3: "Vegetables/spinach",
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
  seedPotato: "Seeds",
  seedCucumber: "Seeds",
  seedSweetPotato: "Seeds",
  seedSpinach: "Seeds",
  // Fruits
  strawberry: "Fruits/strawberry",
  cherry: "Fruits/cherry",
  banana: "Fruits/banana",
  apple: "Fruits/apple",
  strawberry_stage_1: "Fruits/strawberry",
  strawberry_stage_2: "Fruits/strawberry",
  strawberry_stage_3: "Fruits/strawberry",
  cherry_stage_1: "Fruits/cherry",
  cherry_stage_2: "Fruits/cherry",
  cherry_stage_3: "Fruits/cherry",
  banana_stage_1: "Fruits/banana",
  banana_stage_2: "Fruits/banana",
  banana_stage_3: "Fruits/banana",
  apple_stage_1: "Fruits/apple",
  apple_stage_2: "Fruits/apple",
  apple_stage_3: "Fruits/apple",
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
  fourSeasonGreenhouse: "Buildings",
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
  cropSpeedTicket: "Tools",
  doubleHarvestCard: "Tools",
  goldBoostCard: "Tools",
  universalSeed: "Tools",
  makeUpSignInCard: "Tools",
  greenhouseCard: "Tools",
};

function resolveItemImageId(itemId: string): string {
  return itemId;
}

/** UI 图标 -> 文件名映射 */
const UI_ICON_MAP: Record<string, string> = {
  gold: "common/currency/icon_gold",
  diamond: "common/currency/icon_diamond",
  bag: "common/navigation/icon_bag",
  gear: "common/navigation/icon_gear",
  quest: "common/navigation/icon_quest",
  catalog: "common/navigation/icon_catalog",
  bagSpring: "common/navigation/seasons/spring/icon_bag",
  bagSummer: "common/navigation/seasons/summer/icon_bag",
  bagAutumn: "common/navigation/seasons/autumn/icon_bag",
  bagWinter: "common/navigation/seasons/winter/icon_bag",
  gearSpring: "common/navigation/seasons/spring/icon_gear",
  gearSummer: "common/navigation/seasons/summer/icon_gear",
  gearAutumn: "common/navigation/seasons/autumn/icon_gear",
  gearWinter: "common/navigation/seasons/winter/icon_gear",
  questSpring: "common/navigation/seasons/spring/icon_quest",
  questSummer: "common/navigation/seasons/summer/icon_quest",
  questAutumn: "common/navigation/seasons/autumn/icon_quest",
  questWinter: "common/navigation/seasons/winter/icon_quest",
  catalogSpring: "common/navigation/seasons/spring/icon_catalog",
  catalogSummer: "common/navigation/seasons/summer/icon_catalog",
  catalogAutumn: "common/navigation/seasons/autumn/icon_catalog",
  catalogWinter: "common/navigation/seasons/winter/icon_catalog",
  entryShop: "common/entries/icon_entry_shop",
  entryHarvest: "common/entries/icon_entry_harvest",
  entryShovel: "farm/icon_shovel",
  billboard: "farm/icon_billboard",
  pastureBillboard: "farm/icon_pasture_billboard",
  field: "farm/icon_field",
  fieldSpring: "farm/seasons/spring/icon_field",
  fieldSummer: "farm/seasons/summer/icon_field",
  fieldAutumn: "farm/seasons/autumn/icon_field",
  fieldWinter: "farm/seasons/winter/icon_field",
  greenField: "farm/icon_green_field",
  seedSelectorBg: "farm/dialogs/bg_seed_selector",
  btnCropSpeedUp: "farm/dialogs/btn_crop_speedup",
  greenhouseDialogBg: "farm/greenhouse/bg_greenhouse_dialog",
  greenhousePot: "farm/greenhouse/pot_greenhouse",
  avatarFarmgirl: "../avatar/avatar_farmgirl",
  avatarFarmgirlSpring: "../avatar/seasons/spring/avatar_farmgirl",
  avatarFarmgirlSummer: "../avatar/seasons/summer/avatar_farmgirl",
  avatarFarmgirlAutumn: "../avatar/seasons/autumn/avatar_farmgirl",
  avatarFarmgirlWinter: "../avatar/seasons/winter/avatar_farmgirl",
  bgFarmSkyHills: "farm/bg_farm_sky_hills",
  bgPastureFence: "farm/bg_pasture_fence",
  bgFarmSummer: "farm/bg_farm_summer",
  bgFarmAutumn: "farm/bg_farm_autumn",
  bgFarmWinter: "farm/bg_farm_winter",
  bgPastureSummer: "farm/bg_pasture_summer",
  bgPastureAutumn: "farm/bg_pasture_autumn",
  bgPastureWinter: "farm/bg_pasture_winter",
  buildingPad: "farm/icon_building_pad",
  buildingPadSpring: "farm/seasons/spring/icon_building_pad",
  buildingPadSummer: "farm/seasons/summer/icon_building_pad",
  buildingPadAutumn: "farm/seasons/autumn/icon_building_pad",
  buildingPadWinter: "farm/seasons/winter/icon_building_pad",
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
  inventorySellDialogBg: "inventory/dialogs/bg_sell_dialog",
  inventorySellResultBg: "inventory/dialogs/bg_sell_result",
  btnSellCancel: "inventory/buttons/btn_sell_cancel",
  btnSellConfirm: "inventory/buttons/btn_sell_confirm",
  btnSellMinus: "inventory/buttons/btn_sell_minus",
  btnSellPlus: "inventory/buttons/btn_sell_plus",
  btnSellMax: "inventory/buttons/btn_sell_max",
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
  titleUnlocked: "title/buttons/btn_title_unlocked",
  titleLocked: "title/buttons/btn_title_locked",
  achievementFirstPlant: "achievement/icons/icon_achievement_first_plant",
  achievementPlant50: "achievement/icons/icon_achievement_plant_50",
  achievementGold100: "achievement/icons/icon_achievement_gold_100",
  achievementGold10000: "achievement/icons/icon_achievement_gold_10000",
  achievementDiamond50: "achievement/icons/icon_achievement_diamond_50",
  achievementLevel10: "achievement/icons/icon_achievement_level_10",
  achievementLevel20: "achievement/icons/icon_achievement_level_20",
  achievementFirstCraft: "achievement/icons/icon_achievement_first_craft",
  achievementCraft50: "achievement/icons/icon_achievement_craft_50",
  achievementRecipesAll: "achievement/icons/icon_achievement_recipes_all",
  achievementCatalog20: "achievement/icons/icon_achievement_catalog_20",
  achievementCatalogAll: "achievement/icons/icon_achievement_catalog_all",
  achievementCatalogAllLocked: "achievement/icons/icon_achievement_catalog_all_locked",
  achievementPastureFirst: "achievement/icons/icon_achievement_pasture_first",
  achievementPasture50: "achievement/icons/icon_achievement_pasture_50",
  achievementCategoryPlanting: "achievement/categories/icon_achievement_category_planting",
  achievementCategoryCrafting: "achievement/categories/icon_achievement_category_crafting",
  achievementCategoryGrowth: "achievement/categories/icon_achievement_category_growth",
  achievementCategoryCollection: "achievement/categories/icon_achievement_category_collection",
  achievementMedalWallEntry: "achievement/medal_wall/icon_medal_wall_entry",
  achievementMedalWallBg: "achievement/medal_wall/bg_medal_wall",
  achievementMedalSlot: "achievement/medal_wall/bg_medal_slot",
  achievementMedalWallOrnamentLeft:
    "achievement/medal_wall/ornament_medal_wall_left",
  achievementMedalWallOrnamentRight:
    "achievement/medal_wall/ornament_medal_wall_right",
  seasonSpring: "shop/seasons/icon_season_spring",
  seasonSummer: "shop/seasons/icon_season_summer",
  seasonAutumn: "shop/seasons/icon_season_autumn",
  seasonWinter: "shop/seasons/icon_season_winter",
  btnTitleEquip: "title/buttons/btn_title_equip",
  btnTitleUnequip: "title/buttons/btn_title_unequip",
  titleCategoryLevel: "title/categories/icon_title_category_level",
  titleCategoryAchievement: "title/categories/icon_title_category_achievement",
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
    const imageId = resolveItemImageId(itemId);
    const cat = CATEGORY_MAP[imageId] || "Vegetables";
    const url = ServerConfig.getItemImageUrl(cat, imageId);
    return `${url}${url.includes("?") ? "&" : "?"}v=${ITEM_ASSET_REVISION}`;
  }

  /** 获取 UI 图标 URL */
  getUiIconUrl(iconName: string): string {
    const filename = UI_ICON_MAP[iconName] || iconName;
    const url = ServerConfig.getUiImageUrl(filename);
    return `${url}${url.includes("?") ? "&" : "?"}v=${UI_ASSET_REVISION}`;
  }

  /** 加载 UI 图标，带缓存和并发去重 */
  async loadUiIcon(
    iconName: string,
    timeout = 8000,
  ): Promise<SpriteFrame | null> {
    const cacheKey = `_ui_${iconName}@${UI_ASSET_REVISION}`;
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
    const cacheKey = this.getItemCacheKey(itemId);
    // 内存缓存
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // 防止并发重复请求
    const pending = this.pending.get(cacheKey);
    if (pending) return pending;

    const url = this.getItemUrl(itemId);
    const promise = this.downloadSpriteFrame(url, timeout)
      .then((sf) => {
        if (sf) this.cache.set(cacheKey, sf);
        this.pending.delete(cacheKey);
        return sf;
      })
      .catch((err) => {
        console.warn(`${TAG} ${itemId} 加载失败:`, err);
        this.pending.delete(cacheKey);
        return null;
      });

    this.pending.set(cacheKey, promise);
    return promise;
  }

  /** 批量预加载，只加载已映射到静态资源目录的物品 */
  async preload(itemIds: string[]): Promise<number> {
    // 只预加载 CATEGORY_MAP 中存在的物品。
    const realIds = itemIds.filter((id) => CATEGORY_MAP[resolveItemImageId(id)]);
    const results = await Promise.all(realIds.map((id) => this.load(id)));
    const loaded = results.filter(Boolean).length;
    return loaded;
  }

  /** 初始化阶段一次性预加载所有运行时会使用的物品与 UI 图片。 */
  async preloadAllRequired(): Promise<{ items: number; ui: number }> {
    const itemIds = Object.keys(CATEGORY_MAP);
    const activeSeason = getSeasonInfo().season;
    const seasonalBackgrounds = new Set([
      "bgFarmSkyHills", "bgPastureFence",
      "bgFarmSummer", "bgPastureSummer",
      "bgFarmAutumn", "bgPastureAutumn",
      "bgFarmWinter", "bgPastureWinter",
    ]);
    const activeBackgrounds: Record<string, string[]> = {
      spring: ["bgFarmSkyHills", "bgPastureFence"],
      summer: ["bgFarmSummer", "bgPastureSummer"],
      autumn: ["bgFarmAutumn", "bgPastureAutumn"],
      winter: ["bgFarmWinter", "bgPastureWinter"],
    };
    const activeSeasonBackgrounds = new Set(activeBackgrounds[activeSeason]);
    const seasonSuffix: Record<string, string> = {
      spring: "Spring",
      summer: "Summer",
      autumn: "Autumn",
      winter: "Winter",
    };
    const seasonalFamilies = [
      "avatarFarmgirl",
      "bag",
      "gear",
      "quest",
      "catalog",
      "field",
      "buildingPad",
    ];
    const allSeasonalVariants = new Set<string>();
    for (const family of seasonalFamilies) {
      for (const suffix of ["Spring", "Summer", "Autumn", "Winter"]) {
        allSeasonalVariants.add(`${family}${suffix}`);
      }
    }
    const activeSeasonalVariants = new Set(
      seasonalFamilies.map((family) => `${family}${seasonSuffix[activeSeason]}`),
    );
    const uiNames = Object.keys(UI_ICON_MAP).filter(
      (name) =>
        name !== "entryFarm" &&
        name !== "entryPasture" &&
        (!seasonalBackgrounds.has(name) || activeSeasonBackgrounds.has(name)) &&
        (!allSeasonalVariants.has(name) || activeSeasonalVariants.has(name)),
    );
    const [items, ui] = await Promise.all([
      this.preload(itemIds),
      this.preloadUiIcons(uiNames),
    ]);
    return { items, ui };
  }

  getCachedItem(itemId: string): SpriteFrame | null {
    return this.cache.get(this.getItemCacheKey(itemId)) || null;
  }

  getCachedUiIcon(iconName: string): SpriteFrame | null {
    return this.cache.get(`_ui_${iconName}@${UI_ASSET_REVISION}`) || null;
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
    return this.cache.has(this.getItemCacheKey(itemId));
  }

  private getItemCacheKey(itemId: string): string {
    return `${itemId}@${ITEM_ASSET_REVISION}`;
  }
}

function configureUiTexture(texture: Texture2D) {
  const runtimeTexture = texture as any;
  runtimeTexture.setFilters?.(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
  runtimeTexture.setMipFilter?.(0);
}
