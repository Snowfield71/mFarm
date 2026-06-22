/**
 * 后端服务器配置
 * 
 * 萌田农场后端 (Rust/Axum) 默认运行在 localhost:3000
 * 静态图片通过 /assets/ 路径提供
 */

export const ServerConfig = {
    /** 后端基础地址 */
    baseUrl: 'http://localhost:3000',

    /** 图片的基础路径 */
    get imageBaseUrl(): string {
        return `${this.baseUrl}/assets/textures/items`;
    },

    /** 构建物品图片 URL */
    getItemImageUrl(category: string, itemId: string): string {
        return `${this.imageBaseUrl}/${category}/item_${itemId}.png`;
    },

    /** API 基础路径 */
    get apiBaseUrl(): string {
        return `${this.baseUrl}/api`;
    },

    /** 构建 API URL */
    getApiUrl(path: string): string {
        return `${this.apiBaseUrl}${path}`;
    },
};
