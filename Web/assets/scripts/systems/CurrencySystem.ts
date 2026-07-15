import { _decorator, Component } from 'cc';
import { GameManager } from '../core/GameManager';
const { ccclass } = _decorator;

/**
 * 货币系统 - 金币/钻石的管理
 */
@ccclass('CurrencySystem')
export class CurrencySystem extends Component {
    private static instance: CurrencySystem;

    static getInstance(): CurrencySystem { return CurrencySystem.instance; }
    onLoad() { CurrencySystem.instance = this; }

    get gm(): GameManager { return GameManager.getInstance(); }

    format(amount: number): string {
        const value = Math.max(0, Math.floor(amount || 0));
        if (value < 1000) return `${value}`;
        if (value < 10000) return `${this.compact(value / 1000)}千`;
        if (value < 100000000) return `${this.compact(value / 10000)}万`;
        if (value < 1000000000000) return `${this.compact(value / 100000000)}亿`;
        if (value < 10000000000000000) return `${this.compact(value / 1000000000000)}万亿`;
        return `${this.compact(value / 10000000000000000)}京`;
    }

    formatGold(amount?: number): string { return this.format(amount ?? this.gm.gold); }
    formatDiamond(amount?: number): string { return this.format(amount ?? this.gm.diamond); }

    /** 检查金币是否足够并显示提示 */
    canAfford(amount: number): boolean {
        return this.gm.gold >= amount;
    }

    /** 检查钻石是否足够 */
    canAffordDiamond(amount: number): boolean {
        return this.gm.diamond >= amount;
    }

    addGold(amount: number) { this.gm.addGold(amount); }
    spendGold(amount: number): boolean { return this.gm.spendGold(amount); }
    addDiamond(amount: number) { this.gm.addDiamond(amount); }
    spendDiamond(amount: number): boolean { return this.gm.spendDiamond(amount); }

    private compact(value: number): string {
        const compact = Math.floor(value * 10) / 10;
        return `${compact}`.replace(/\.0$/, '');
    }
}
