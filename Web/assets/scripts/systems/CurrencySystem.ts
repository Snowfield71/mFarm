import { _decorator, Component } from 'cc';
import { GameManager } from '../core/GameManager';
import { GameValues } from '../config/GameConfig';
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

    /** 格式化金币显示（如 1,234） */
    formatGold(amount?: number): string {
        const val = amount ?? this.gm.gold;
        return val.toLocaleString();
    }

    /** 检查金币是否足够并显示提示 */
    canAfford(amount: number): boolean {
        return this.gm.gold >= amount;
    }

    /** 检查钻石是否足够 */
    canAffordDiamond(amount: number): boolean {
        return this.gm.diamond >= amount;
    }
}
