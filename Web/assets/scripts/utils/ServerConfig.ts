/**
 * 后端服务器配置
 *
 * 萌田农场后端 (Rust/Axum) 默认运行在 localhost:3000
 * 静态图片通过 /assets/ 路径提供
 */

type RuntimeServerConfig = typeof globalThis & {
  __MOEFARM_SERVER_URL__?: string;
};

function resolveServerBaseUrl(): string {
  const override = (globalThis as RuntimeServerConfig).__MOEFARM_SERVER_URL__;
  if (override?.trim()) return override.trim().replace(/\/+$/, "");

  // Use the host that served the web build. This remains correct after DHCP
  // address changes and when another device opens the game over the LAN.
  if (typeof location !== "undefined" && location.hostname) {
    const protocol = location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${location.hostname}:3000`;
  }

  return "http://127.0.0.1:3000";
}

export const ServerConfig = {
  /** 后端基础地址 */
  baseUrl: resolveServerBaseUrl(),

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
