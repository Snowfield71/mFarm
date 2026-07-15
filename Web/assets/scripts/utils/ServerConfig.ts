/**
 * 后端服务器配置
 *
 * 萌田农场后端 (Rust/Axum) 默认运行在 localhost:3000
 * 静态图片通过 /assets/ 路径提供
 */

export const ServerConfig = {
  /** 后端基础地址 */
  baseUrl: "http://192.168.2.3:3000",

  /** 图片的基础路径 */
  get imageBaseUrl(): string {
    return `${this.baseUrl}/assets/textures/items`;
  },

  /** UI 图片的基础路径 */
  get uiImageBaseUrl(): string {
    return `${this.baseUrl}/assets/textures/ui`;
  },

  /** 构建物品图片 URL */
  getItemImageUrl(category: string, itemId: string): string {
    return `${this.imageBaseUrl}/${category}/item_${itemId}.png`;
  },

  /** 构建 UI 图片 URL */
  getUiImageUrl(filename: string): string {
    return `${this.uiImageBaseUrl}/${filename}.png`;
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
