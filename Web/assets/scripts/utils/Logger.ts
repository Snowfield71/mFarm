/**
 * 游戏日志工具
 */
export class Logger {
    static info(tag: string, message: string, ...args: any[]) {
        console.log(`[${tag}] ${message}`, ...args);
    }

    static warn(tag: string, message: string, ...args: any[]) {
        console.warn(`[${tag}] ⚠️ ${message}`, ...args);
    }

    static error(tag: string, message: string, ...args: any[]) {
        console.error(`[${tag}] ❌ ${message}`, ...args);
    }

    static debug(tag: string, message: string, ...args: any[]) {
        console.debug(`[${tag}] 🔍 ${message}`, ...args);
    }
}
