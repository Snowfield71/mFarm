/**
 * 图片加载缓存系统
 *
 * 从后端 (Rust/Axum) 下载物品 PNG 图片并缓存为 SpriteFrame
 * 前端可直接通过 itemId 获取图片，无需关心 URL 和加载过程
 *
 * 后端图片路径: /assets/textures/items/{Category}/item_{itemId}.png
 */

import { SpriteFrame, Texture2D, ImageAsset } from 'cc';
import { ServerConfig } from './ServerConfig';

const TAG = '[ImageCache]';

/** 物品ID → 分类目录 映射（只包含后端实际存在的图片） */
const CATEGORY_MAP: Record<string, string> = {
    // Vegetables
    wheat: 'Vegetables', corn: 'Vegetables', tomato: 'Vegetables',
    carrot: 'Vegetables', pumpkin: 'Vegetables', lettuce: 'Vegetables',
    // Fruits
    strawberry: 'Fruits', cherry: 'Fruits', banana: 'Fruits', apple: 'Fruits',
    // Processed
    flour: 'Processed', butter: 'Processed', honey: 'Processed', milk: 'Processed',
    // Foods
    bread: 'Foods', cake: 'Foods', egg: 'Foods',
};

/** UI 图标 → 文件名 映射 */
const UI_ICON_MAP: Record<string, string> = {
    gold: 'icon_gold',
    diamond: 'icon_diamond',
    bag: 'icon_bag',
    gear: 'icon_gear',
    shop: 'icon_shop',
    leaf: 'icon_leaf',
};

/** 后端实际有的图片数量 */
const TOTAL_REAL_IMAGES = 18;

export class ImageCache {
    private static instance: ImageCache;
    private cache: Map<string, SpriteFrame> = new Map();
    private pending: Map<string, Promise<SpriteFrame | null>> = new Map();

    static getInstance(): ImageCache {
        if (!ImageCache.instance) ImageCache.instance = new ImageCache();
        return ImageCache.instance;
    }

    /** 获取物品图片URL */
    getItemUrl(itemId: string): string {
        const cat = CATEGORY_MAP[itemId] || 'Vegetables';
        return ServerConfig.getItemImageUrl(cat, itemId);
    }

    /** 获取 UI 图标 URL */
    getUiIconUrl(iconName: string): string {
        const filename = UI_ICON_MAP[iconName] || iconName;
        return `${ServerConfig.imageBaseUrl}/../ui/${filename}.png`;
    }

    /** 加载 UI 图标（带缓存） */
    async loadUiIcon(iconName: string, timeout = 8000): Promise<SpriteFrame | null> {
        const cacheKey = `_ui_${iconName}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const url = this.getUiIconUrl(iconName);
        const promise = this.downloadSpriteFrame(url, timeout)
            .then(sf => {
                if (sf) this.cache.set(cacheKey, sf);
                return sf;
            })
            .catch(() => null);
        return promise;
    }

    /** 异步加载物品图片（带缓存） */
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

    /** 批量预加载（只加载后端实际有的图片） */
    async preload(itemIds: string[]): Promise<number> {
        // 只预加载 CATEGORY_MAP 中存在的（即后端有图片的）
        const realIds = itemIds.filter(id => CATEGORY_MAP[id]);
        const results = await Promise.all(realIds.map(id => this.load(id)));
        const loaded = results.filter(Boolean).length;
        console.log(`${TAG} 预加载 ${loaded}/${realIds.length} (跳过 ${itemIds.length - realIds.length} 个无图片物品)`);
        return loaded;
    }

    /** 将 SpriteFrame 应用到 Sprite 组件（异步，自动 fallback） */
    static async applyToSprite(
        spriteComp: import('cc').Sprite,
        itemId: string,
        fallbackEmoji?: string,
    ): Promise<void> {
        const sf = await ImageCache.getInstance().load(itemId);
        if (sf) {
            spriteComp.spriteFrame = sf;
        } else if (fallbackEmoji) {
            // 如果加载失败且提供了 fallback，设置颜色标识
            spriteComp.color = new (await import('cc')).Color(200, 200, 200);
        }
    }

    /**
     * 下载 PNG → 创建 SpriteFrame
     *
     * 流程: XHR → blob → createImageBitmap → ImageAsset → Texture2D → SpriteFrame
     */
    private async downloadSpriteFrame(url: string, timeout: number): Promise<SpriteFrame | null> {
        // 1. XHR 下载 ArrayBuffer
        const buffer = await this.download(url, timeout);
        if (!buffer) return null;

        // 2. 创建 ImageBitmap (浏览器/WeChat 均支持)
        const blob = new Blob([buffer], { type: 'image/png' });
        let bitmap: ImageBitmap;
        try {
            bitmap = await createImageBitmap(blob);
        } catch {
            // WeChat 小游戏可能不支持 createImageBitmap
            return null;
        }

        // 3. 创建 Cocos 纹理链
        const imageAsset = new ImageAsset(bitmap as any);
        const texture = new Texture2D();
        texture.image = imageAsset;

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;

        return spriteFrame;
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
    clear() { this.cache.clear(); this.pending.clear(); }

    /** 已缓存数量 */
    get size(): number { return this.cache.size; }

    /** 检查是否已缓存 */
    has(itemId: string): boolean { return this.cache.has(itemId); }
}
