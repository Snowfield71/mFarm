/**
 * 图片加载缓存系统
 *
 * 从后端静态资源服务下载物品 PNG，并缓存为 SpriteFrame。
 * 前端通过 itemId 获取图片，不需要关心具体 URL。
 *
 * 后端图片路径：/assets/textures/items/{Category}/item_{itemId}.png
 */

import { SpriteFrame, Texture2D, ImageAsset, assetManager, Color } from 'cc';
import { ServerConfig } from './ServerConfig';

const TAG = '[ImageCache]';

/** 物品 ID -> 静态资源分类目录 */
const CATEGORY_MAP: Record<string, string> = {
    // Vegetables
    wheat: 'Vegetables', corn: 'Vegetables', tomato: 'Vegetables',
    wheat_stage_1: 'Vegetables', wheat_stage_2: 'Vegetables', wheat_stage_3: 'Vegetables',
    corn_stage_1: 'Vegetables', corn_stage_2: 'Vegetables', corn_stage_3: 'Vegetables',
    tomato_stage_1: 'Vegetables', tomato_stage_2: 'Vegetables', tomato_stage_3: 'Vegetables',
    carrot: 'Vegetables', pumpkin: 'Vegetables', lettuce: 'Vegetables',
    // Fruits
    strawberry: 'Fruits', cherry: 'Fruits', banana: 'Fruits', apple: 'Fruits',
    // Processed
    flour: 'Processed', butter: 'Processed', honey: 'Processed', milk: 'Processed',
    sugar: 'Processed', oatmeal: 'Processed', bananaSauce: 'Processed',
    jam: 'Processed', carrotPuree: 'Processed', cheese: 'Processed', ketchup: 'Processed',
    // Foods
    bread: 'Foods', cake: 'Foods', egg: 'Foods', croissant: 'Foods',
    cupcake: 'Foods', cookie: 'Foods', pie: 'Foods', strawberryCake: 'Foods',
    baguette: 'Foods', donut: 'Foods', chocolateCake: 'Foods', cereal: 'Foods',
    pasta: 'Foods', butterToast: 'Foods', honeyToast: 'Foods', jamToast: 'Foods',
    // Buildings
    craftTable: 'Buildings', chickenCoop: 'Buildings', barn: 'Buildings',
    warehouse: 'Buildings', house: 'Buildings', well: 'Buildings',
    garden: 'Buildings', beehive: 'Buildings',
    // Decorations
    sunflower: 'Decorations', tulip: 'Decorations', rose: 'Decorations',
    tree: 'Decorations', palmTree: 'Decorations', stone: 'Decorations',
    log: 'Decorations', fence: 'Decorations', tent: 'Decorations',
    pumpkinLantern: 'Decorations',
    // Special
    mysteryBox: 'Special', luckyStar: 'Special', jade: 'Special',
    // Tools
    speedTicket: 'Tools', doubleHarvestCard: 'Tools',
    goldBoostCard: 'Tools', universalSeed: 'Tools',
};

/** UI 图标 -> 文件名映射 */
const UI_ICON_MAP: Record<string, string> = {
    gold: 'icon_gold',
    diamond: 'icon_diamond',
    bag: 'icon_bag',
    gear: 'icon_gear',
    settings: 'icon_settings',
    shop: 'icon_shop',
    quest: 'icon_quest',
    leaf: 'icon_leaf',
    catalog: 'icon_catalog',
    billboard: 'icon_billboard',
    field: 'icon_field',
    greenField: 'icon_green_field',
    cropBubble: 'crop_action_bubble',
    avatarFarmgirl: '../avatar/avatar_farmgirl',
    bgFarmSkyHills: 'bg_farm_sky_hills',
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
        const cat = CATEGORY_MAP[itemId] || 'Vegetables';
        return ServerConfig.getItemImageUrl(cat, itemId);
    }

    /** 获取 UI 图标 URL */
    getUiIconUrl(iconName: string): string {
        const filename = UI_ICON_MAP[iconName] || iconName;
        return ServerConfig.getUiImageUrl(filename);
    }

    /** 加载 UI 图标，带缓存和并发去重 */
    async loadUiIcon(iconName: string, timeout = 8000): Promise<SpriteFrame | null> {
        const cacheKey = `_ui_${iconName}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        if (this.failed.has(cacheKey)) return null;

        const pending = this.pending.get(cacheKey);
        if (pending) return pending;

        const url = this.getUiIconUrl(iconName);
        const promise = this.downloadSpriteFrame(url, timeout)
            .then(sf => {
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
    async load(itemId: string, timeout = 8000): Promise<SpriteFrame | null> {
        // 内存缓存
        const cached = this.cache.get(itemId);
        if (cached) return cached;

        // 防止并发重复请求
        const pending = this.pending.get(itemId);
        if (pending) return pending;

        const url = this.getItemUrl(itemId);
        const promise = this.downloadSpriteFrame(url, timeout)
            .then(sf => {
                if (sf) this.cache.set(itemId, sf);
                this.pending.delete(itemId);
                return sf;
            })
            .catch(err => {
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
        const realIds = itemIds.filter(id => CATEGORY_MAP[id]);
        const results = await Promise.all(realIds.map(id => this.load(id)));
        const loaded = results.filter(Boolean).length;
        return loaded;
    }

    /** 将 SpriteFrame 应用到 Sprite 组件，加载失败时允许外层自行 fallback */
    static async applyToSprite(
        spriteComp: import('cc').Sprite,
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
    private async downloadSpriteFrame(url: string, timeout: number): Promise<SpriteFrame | null> {
        const remote = await this.loadRemoteSpriteFrame(url, timeout);
        if (remote) return remote;

        // 1. XHR 下载 ArrayBuffer
        const buffer = await this.download(url, timeout);
        if (!buffer) return null;

        // 2. 创建 ImageBitmap，部分小游戏环境可能不支持。
        const blob = new Blob([buffer], { type: 'image/png' });
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

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;

        return spriteFrame;
    }

    private loadRemoteSpriteFrame(url: string, timeout: number): Promise<SpriteFrame | null> {
        return new Promise(resolve => {
            let done = false;
            const timer = setTimeout(() => {
                if (done) return;
                done = true;
                resolve(null);
            }, timeout);

            assetManager.loadRemote<ImageAsset>(url, { ext: '.png' }, (err, imageAsset) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                if (err || !imageAsset) {
                    resolve(null);
                    return;
                }

                const texture = new Texture2D();
                texture.image = imageAsset;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                resolve(spriteFrame);
            });
        });
    }

    /** XHR 下载二进制数据 */
    private download(url: string, timeout: number): Promise<ArrayBuffer | null> {
        return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
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
    clear() { this.cache.clear(); this.pending.clear(); this.failed.clear(); }

    /** 已缓存数量 */
    get size(): number { return this.cache.size; }

    /** 检查是否已缓存 */
    has(itemId: string): boolean { return this.cache.has(itemId); }
}
