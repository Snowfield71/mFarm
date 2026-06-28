import { _decorator, Component } from 'cc';
import { GameValues } from '../config/GameConfig';
import { getItem, getPlantableCrops } from '../config/ItemConfig';
import { EventManager } from '../core/EventManager';
import { Logger } from '../utils/Logger';
const { ccclass } = _decorator;
const TAG = 'InventorySystem';

export interface InventorySlot {
    itemId: string;
    count: number;
}

/**
 * 物品栏系统 - 管理物品的增删查
 */
@ccclass('InventorySystem')
export class InventorySystem extends Component {
    private static instance: InventorySystem;
    slots: InventorySlot[] = [];
    maxSlots: number = GameValues.INVENTORY_SLOTS;

    static getInstance(): InventorySystem { return InventorySystem.instance; }
    onLoad() { InventorySystem.instance = this; }

    start() {
        this.initSlots();
    }

    private initSlots() {
        this.slots = [];
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push({ itemId: '', count: 0 });
        }
        getPlantableCrops()
            .filter(crop => crop.unlockLevel <= 1)
            .forEach((crop, index) => {
                if (index < this.slots.length) this.slots[index] = { itemId: crop.id, count: 3 };
            });
    }

    loadFromSave(slots: InventorySlot[] = [], maxSlots: number = GameValues.INVENTORY_SLOTS) {
        this.maxSlots = Math.max(GameValues.INVENTORY_SLOTS, maxSlots || GameValues.INVENTORY_SLOTS);
        this.slots = [];
        for (let i = 0; i < this.maxSlots; i++) {
            const source = slots[i];
            this.slots.push(source?.itemId && source.count > 0
                ? { itemId: source.itemId, count: Math.min(source.count, GameValues.MAX_STACK) }
                : { itemId: '', count: 0 });
        }
        this.compactSlots();
        EventManager.getInstance().emit('inventoryChanged');
    }

    exportSave(): { slots: InventorySlot[]; maxSlots: number } {
        this.compactSlots();
        return {
            maxSlots: this.maxSlots,
            slots: this.slots.slice(0, this.maxSlots).map(slot => ({ itemId: slot.itemId, count: slot.count })),
        };
    }

    /** 添加物品 */
    addItem(itemId: string, count: number = 1): boolean {
        let remaining = count;
        const def = getItem(itemId);
        if (!def) { Logger.warn(TAG, `未知物品: ${itemId}`); return false; }

        // 先尝试堆叠到已有物品
        for (const slot of this.slots) {
            if (slot.itemId === itemId && slot.count < GameValues.MAX_STACK) {
                const canAdd = Math.min(remaining, GameValues.MAX_STACK - slot.count);
                slot.count += canAdd;
                remaining -= canAdd;
                if (remaining === 0) {
                    EventManager.getInstance().emit('inventoryChanged');
                    return true;
                }
            }
        }

        // 放入空格
        for (const slot of this.slots) {
            if (slot.itemId === '') {
                const canAdd = Math.min(remaining, GameValues.MAX_STACK);
                slot.itemId = itemId;
                slot.count = canAdd;
                remaining -= canAdd;
                if (remaining === 0) {
                    EventManager.getInstance().emit('inventoryChanged');
                    return true;
                }
            }
        }

        if (remaining > 0) Logger.warn(TAG, '物品栏已满');
        EventManager.getInstance().emit('inventoryChanged');
        return remaining === 0;
    }

    /** 移除物品 */
    removeItem(itemId: string, count: number = 1): boolean {
        if (this.getItemCount(itemId) < count) {
            Logger.warn(TAG, `物品不足: ${itemId}`);
            return false;
        }

        let remaining = count;
        for (const slot of this.slots) {
            if (slot.itemId === itemId) {
                const canRemove = Math.min(remaining, slot.count);
                slot.count -= canRemove;
                remaining -= canRemove;
                if (slot.count === 0) {
                    slot.itemId = '';
                    slot.count = 0;
                }
                if (remaining === 0) {
                    this.compactSlots();
                    EventManager.getInstance().emit('inventoryChanged');
                    return true;
                }
            }
        }
        Logger.warn(TAG, `物品不足: ${itemId}`);
        return false;
    }

    removeFromSlot(slotIndex: number, count: number = 1): boolean {
        const slot = this.slots[slotIndex];
        if (!slot || !slot.itemId || slot.count < count) return false;

        slot.count -= count;
        if (slot.count <= 0) {
            slot.itemId = '';
            slot.count = 0;
        }

        this.compactSlots();
        EventManager.getInstance().emit('inventoryChanged');
        return true;
    }

    /** 整理空槽，让后续物品自动前移 */
    private compactSlots() {
        const occupied = this.slots.filter(slot => slot.itemId && slot.count > 0);
        const emptyCount = this.maxSlots - occupied.length;
        this.slots = occupied.concat(
            Array.from({ length: Math.max(0, emptyCount) }, () => ({ itemId: '', count: 0 })),
        );
    }

    getItemCount(itemId: string): number {
        return this.slots.filter(s => s.itemId === itemId).reduce((sum, s) => sum + s.count, 0);
    }

    /** 检查是否有足够物品 */
    hasItems(itemId: string, count: number): boolean {
        return this.getItemCount(itemId) >= count;
    }

    /** 获取所有非空格子 */
    getNonEmptySlots(): InventorySlot[] {
        this.compactSlots();
        return this.slots.filter(s => s.count > 0 && s.itemId !== '');
    }

    /** 获取物品栏使用信息 */
    getUsage(): { used: number; max: number; percent: number } {
        this.compactSlots();
        const used = this.slots.filter(s => s.itemId !== '').length;
        return { used, max: this.maxSlots, percent: (used / this.maxSlots) * 100 };
    }

    /** 扩展物品栏 */
    expandBy(amount: number = GameValues.EXPAND_INVENTORY_SLOTS) {
        this.maxSlots += amount;
        for (let i = 0; i < amount; i++) {
            this.slots.push({ itemId: '', count: 0 });
        }
        EventManager.getInstance().emit('inventoryChanged');
    }

    /** 出售物品 */
    sellItem(itemId: string, count: number, goldCallback: (price: number) => void): boolean {
        const def = getItem(itemId);
        if (!def || def.sellPrice <= 0) return false;
        if (!this.removeItem(itemId, count)) return false;
        const total = def.sellPrice * count;
        goldCallback(total);
        Logger.info(TAG, `出售 ${def.name}×${count} 获得 ${total}金币`);
        return true;
    }

    sellSlotItem(slotIndex: number, count: number, goldCallback: (price: number) => void): boolean {
        const slot = this.slots[slotIndex];
        if (!slot || !slot.itemId || count <= 0 || count > slot.count) return false;

        const def = getItem(slot.itemId);
        if (!def || def.sellPrice <= 0) return false;

        const itemId = slot.itemId;
        if (!this.removeFromSlot(slotIndex, count)) return false;

        const total = def.sellPrice * count;
        goldCallback(total);
        Logger.info(TAG, `出售 ${itemId}×${count} 获得 ${total}金币`);
        return true;
    }
}
