import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

type EventCallback = (...args: any[]) => void;

/**
 * 全局事件系统 - 解耦模块间通信
 */
@ccclass('EventManager')
export class EventManager extends Component {
    private static instance: EventManager;
    private events: Map<string, Set<EventCallback>> = new Map();

    static getInstance(): EventManager {
        return EventManager.instance;
    }

    onLoad() {
        EventManager.instance = this;
    }

    /** 监听事件 */
    on(event: string, callback: EventCallback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(callback);
    }

    /** 移除监听 */
    off(event: string, callback: EventCallback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) this.events.delete(event);
        }
    }

    /** 触发事件 */
    emit(event: string, ...args: any[]) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try { cb(...args); } catch (e) { console.error(e); }
            });
        }
    }

    /** 清空所有事件 */
    clear() {
        this.events.clear();
    }
}
