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

@ccclass('InventorySystem')
export class InventorySystem extends Component {
    private static instance: InventorySystem;
    slots: InventorySlot[] = [];
    private batchDepth = 0;
    private batchChanged = false;

    static getInstance(): InventorySystem { return InventorySystem.instance; }
    onLoad() { InventorySystem.instance = this; }

    start() {
        this.initSlots();
    }

    private initSlots() {
        this.slots = getPlantableCrops()
            .filter(crop => crop.unlockLevel <= 1)
            .map(crop => ({ itemId: crop.id, count: 3 }));
    }

    loadFromSave(slots: InventorySlot[] = []) {
        this.slots = slots
            .filter(source => source?.itemId && source.count > 0 && !!getItem(source.itemId))
            .map(source => ({
                itemId: source.itemId,
                count: Math.min(source.count, GameValues.MAX_STACK),
            }));
        this.compactSlots();
        this.emitChanged();
    }

    exportSave(): { slots: InventorySlot[] } {
        this.compactSlots();
        return {
            slots: this.slots.map(slot => ({ itemId: slot.itemId, count: slot.count })),
        };
    }

    canAddItems(items: Array<{ itemId: string; count: number }>): boolean {
        return items.every(item => !!getItem(item.itemId) && item.count > 0);
    }

    addItem(itemId: string, count: number = 1): boolean {
        let remaining = count;
        const def = getItem(itemId);
        if (!def || count <= 0) {
            Logger.warn(TAG, `Unknown item: ${itemId}`);
            return false;
        }

        for (const slot of this.slots) {
            if (slot.itemId !== itemId || slot.count >= GameValues.MAX_STACK) continue;
            const added = Math.min(remaining, GameValues.MAX_STACK - slot.count);
            slot.count += added;
            remaining -= added;
            if (remaining === 0) break;
        }

        while (remaining > 0) {
            const added = Math.min(remaining, GameValues.MAX_STACK);
            this.slots.push({ itemId, count: added });
            remaining -= added;
        }

        this.emitChanged();
        return true;
    }

    removeItem(itemId: string, count: number = 1): boolean {
        if (count <= 0 || this.getItemCount(itemId) < count) {
            Logger.warn(TAG, `Insufficient item: ${itemId}`);
            return false;
        }

        let remaining = count;
        for (const slot of this.slots) {
            if (slot.itemId !== itemId) continue;
            const removed = Math.min(remaining, slot.count);
            slot.count -= removed;
            remaining -= removed;
            if (remaining === 0) break;
        }
        this.compactSlots();
        this.emitChanged();
        return true;
    }

    removeFromSlot(slotIndex: number, count: number = 1): boolean {
        const slot = this.slots[slotIndex];
        if (!slot || !slot.itemId || count <= 0 || slot.count < count) return false;
        slot.count -= count;
        this.compactSlots();
        this.emitChanged();
        return true;
    }

    runBatch<T>(operation: () => T): T {
        this.batchDepth++;
        try {
            return operation();
        } finally {
            this.batchDepth--;
            if (this.batchDepth === 0 && this.batchChanged) {
                this.batchChanged = false;
                EventManager.getInstance().emit('inventoryChanged');
            }
        }
    }

    private emitChanged() {
        if (this.batchDepth > 0) {
            this.batchChanged = true;
            return;
        }
        EventManager.getInstance().emit('inventoryChanged');
    }

    private compactSlots() {
        this.slots = this.slots.filter(slot => slot.itemId && slot.count > 0);
    }

    getItemCount(itemId: string): number {
        return this.slots
            .filter(slot => slot.itemId === itemId)
            .reduce((sum, slot) => sum + slot.count, 0);
    }

    hasItems(itemId: string, count: number): boolean {
        return this.getItemCount(itemId) >= count;
    }

    getNonEmptySlots(): InventorySlot[] {
        this.compactSlots();
        return this.slots.map(slot => ({ ...slot }));
    }

    sellItem(itemId: string, count: number, goldCallback: (price: number) => void): boolean {
        const def = getItem(itemId);
        if (!def || def.sellPrice <= 0 || !this.removeItem(itemId, count)) return false;
        const total = def.sellPrice * count;
        goldCallback(total);
        EventManager.getInstance().emit('itemSold', { itemId, count, gold: total });
        Logger.info(TAG, `Sold ${itemId} x${count} for ${total} gold`);
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
        EventManager.getInstance().emit('itemSold', { itemId, count, gold: total });
        Logger.info(TAG, `Sold ${itemId} x${count} for ${total} gold`);
        return true;
    }
}
