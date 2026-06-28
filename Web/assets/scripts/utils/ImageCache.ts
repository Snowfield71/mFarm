/**
 * 鍥剧墖鍔犺浇缂撳瓨绯荤粺
 *
 * 浠庡悗绔?(Rust/Axum) 涓嬭浇鐗╁搧 PNG 鍥剧墖骞剁紦瀛樹负 SpriteFrame
 * 鍓嶇鍙洿鎺ラ€氳繃 itemId 鑾峰彇鍥剧墖锛屾棤闇€鍏冲績 URL 鍜屽姞杞借繃绋?
 *
 * 鍚庣鍥剧墖璺緞: /assets/textures/items/{Category}/item_{itemId}.png
 */

import { SpriteFrame, Texture2D, ImageAsset, assetManager, Color } from 'cc';
import { ServerConfig } from './ServerConfig';

const TAG = '[ImageCache]';

/** 鐗╁搧ID 鈫?鍒嗙被鐩綍 鏄犲皠锛堝彧鍖呭惈鍚庣瀹為檯瀛樺湪鐨勫浘鐗囷級 */
const CATEGORY_MAP: Record<string, string> = {
    // Vegetables
    wheat: 'Vegetables', corn: 'Vegetables', tomato: 'Vegetables',
    carrot: 'Vegetables', pumpkin: 'Vegetables', lettuce: 'Vegetables',
    // mushroom: 'Vegetables', (鍚庣鏆傛棤鍥剧墖)
    // Fruits
    strawberry: 'Fruits', cherry: 'Fruits', banana: 'Fruits', apple: 'Fruits',
    // Flowers (鍚庣鏆傛棤鍥剧墖锛屼娇鐢?emoji 鍥為€€)
    // Processed
    flour: 'Processed', butter: 'Processed', honey: 'Processed', milk: 'Processed',
    // Foods
    bread: 'Foods', cake: 'Foods', egg: 'Foods',
};

/** UI 鍥炬爣 鈫?鏂囦欢鍚?鏄犲皠 */
const UI_ICON_MAP: Record<string, string> = {
    gold: 'icon_gold',
    diamond: 'icon_diamond',
    bag: 'icon_bag',
    gear: 'icon_gear',
    shop: 'icon_shop',
    leaf: 'icon_leaf',
    billboard: 'icon_billboard',
};

/** 鍚庣瀹為檯鏈夌殑鍥剧墖鏁伴噺 */
const TOTAL_REAL_IMAGES = 17;

export class ImageCache {
    private static instance: ImageCache;
    private cache: Map<string, SpriteFrame> = new Map();
    private pending: Map<string, Promise<SpriteFrame | null>> = new Map();
    private failed: Set<string> = new Set();

    static getInstance(): ImageCache {
        if (!ImageCache.instance) ImageCache.instance = new ImageCache();
        return ImageCache.instance;
    }

    /** 鑾峰彇鐗╁搧鍥剧墖URL */
    getItemUrl(itemId: string): string {
        const cat = CATEGORY_MAP[itemId] || 'Vegetables';
        return ServerConfig.getItemImageUrl(cat, itemId);
    }

    /** 鑾峰彇 UI 鍥炬爣 URL */
    getUiIconUrl(iconName: string): string {
        const filename = UI_ICON_MAP[iconName] || iconName;
        return `${ServerConfig.imageBaseUrl}/../ui/${filename}.png`;
    }

    /** 鍔犺浇 UI 鍥炬爣锛堝甫缂撳瓨锛?*/
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

    /** 寮傛鍔犺浇鐗╁搧鍥剧墖锛堝甫缂撳瓨锛?*/
    async load(itemId: string, timeout = 8000): Promise<SpriteFrame | null> {
        // 鍐呭瓨缂撳瓨
        const cached = this.cache.get(itemId);
        if (cached) return cached;

        // 闃叉骞跺彂閲嶅璇锋眰
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
                console.warn(`${TAG} ${itemId} 鍔犺浇澶辫触:`, err);
                this.pending.delete(itemId);
                return null;
            });

        this.pending.set(itemId, promise);
        return promise;
    }

    /** 鎵归噺棰勫姞杞斤紙鍙姞杞藉悗绔疄闄呮湁鐨勫浘鐗囷級 */
    async preload(itemIds: string[]): Promise<number> {
        // 鍙鍔犺浇 CATEGORY_MAP 涓瓨鍦ㄧ殑锛堝嵆鍚庣鏈夊浘鐗囩殑锛?
        const realIds = itemIds.filter(id => CATEGORY_MAP[id]);
        const results = await Promise.all(realIds.map(id => this.load(id)));
        const loaded = results.filter(Boolean).length;
        console.log(`${TAG} 棰勫姞杞?${loaded}/${realIds.length} (璺宠繃 ${itemIds.length - realIds.length} 涓棤鍥剧墖鐗╁搧)`);
        return loaded;
    }

    /** 灏?SpriteFrame 搴旂敤鍒?Sprite 缁勪欢锛堝紓姝ワ紝鑷姩 fallback锛?*/
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
     * 涓嬭浇 PNG 鈫?鍒涘缓 SpriteFrame
     *
     * 娴佺▼: XHR 鈫?blob 鈫?createImageBitmap 鈫?ImageAsset 鈫?Texture2D 鈫?SpriteFrame
     */
    private async downloadSpriteFrame(url: string, timeout: number): Promise<SpriteFrame | null> {
        const remote = await this.loadRemoteSpriteFrame(url, timeout);
        if (remote) return remote;

        // 1. XHR 涓嬭浇 ArrayBuffer
        const buffer = await this.download(url, timeout);
        if (!buffer) return null;

        // 2. 鍒涘缓 ImageBitmap (娴忚鍣?WeChat 鍧囨敮鎸?
        const blob = new Blob([buffer], { type: 'image/png' });
        let bitmap: ImageBitmap;
        try {
            bitmap = await createImageBitmap(blob);
        } catch {
            // WeChat 灏忔父鎴忓彲鑳戒笉鏀寔 createImageBitmap
            return null;
        }

        // 3. 鍒涘缓 Cocos 绾圭悊閾?
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

    /** XHR 涓嬭浇浜岃繘鍒舵暟鎹?*/
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

    /** 娓呯┖缂撳瓨 */
    clear() { this.cache.clear(); this.pending.clear(); this.failed.clear(); }

    /** 宸茬紦瀛樻暟閲?*/
    get size(): number { return this.cache.size; }

    /** 妫€鏌ユ槸鍚﹀凡缂撳瓨 */
    has(itemId: string): boolean { return this.cache.has(itemId); }
}
