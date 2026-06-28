import { _decorator, Component, Node, Label, Sprite, Color, Button, UITransform } from 'cc';
import { Colors } from '../config/GameConfig';
import { GameManager } from '../core/GameManager';
import { InventorySystem } from '../systems/InventorySystem';
import { PopupDialog } from './PopupDialog';
const { ccclass } = _decorator;

/**
 * 物品栏 UI 组件
 */
@ccclass('InventoryUI')
export class InventoryUI extends Component {
    private gridContainer!: Node;
    private usageLabel!: Node;

    start() {
        this.createInventoryUI();
    }

    private createInventoryUI() {
        // 面板背景
        const bg = new Node('Bg');
        bg.addComponent(UITransform).setContentSize(310, 400);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(255, 250, 205);
        this.node.addChild(bg);

        // 标题
        const title = new Node('Title');
        title.addComponent(UITransform).setContentSize(310, 35);
        title.setPosition(0, 185);
        const titleLabel = title.addComponent(Label);
        titleLabel.string = '🎒 物品栏';
        titleLabel.fontSize = 18;
        titleLabel.isBold = true;
        titleLabel.color = new Color(51, 51, 51);
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.node.addChild(title);

        // 使用情况
        this.usageLabel = new Node('Usage');
        this.usageLabel.addComponent(UITransform).setContentSize(200, 20);
        this.usageLabel.setPosition(0, 160);
        const usageText = this.usageLabel.addComponent(Label);
        usageText.fontSize = 12;
        usageText.color = new Color(102, 102, 102);
        usageText.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.node.addChild(this.usageLabel);

        // 物品格子容器
        this.gridContainer = new Node('Grid');
        this.gridContainer.addComponent(UITransform).setContentSize(290, 330);
        this.gridContainer.setPosition(0, -10);
        this.node.addChild(this.gridContainer);

        this.refreshGrid();
    }

    refreshGrid() {
        const inv = InventorySystem.getInstance();
        const slots = inv.slots.slice(0, inv.maxSlots);
        const info = inv.getUsage();

        // 更新使用情况
        this.usageLabel.getComponent(Label)!.string = `已使用 ${info.used}/${info.max} 格`;

        // 清空旧格子
        this.gridContainer.children.forEach(c => c.destroy());

        const cols = 5;
        const cellSize = 54;
        const spacing = 4;
        const startX = -(cols * (cellSize + spacing)) / 2 + cellSize / 2;

        slots.forEach((slot, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);

            const cell = new Node(`Slot_${i}`);
            cell.addComponent(UITransform).setContentSize(cellSize, cellSize);
            cell.setPosition(startX + col * (cellSize + spacing), -row * (cellSize + spacing) - 10);

            const cellBg = cell.addComponent(Sprite);
            cellBg.color = new Color(144, 238, 144, 80);

            if (!slot.itemId) {
                this.gridContainer.addChild(cell);
                return;
            }

            const lbl = cell.addComponent(Label);
            // 使用物品emoji
            const emojiMap: Record<string, string> = {
                wheat: '🌾', flour: '🌾', bread: '🍞', cake: '🍰',
                strawberry: '🍓', egg: '🥚', milk: '🥛', butter: '🧈',
                honey: '🍯', sugar: '🧂', tomato: '🍅', carrot: '🥕',
                corn: '🌽', pumpkin: '🎃', potato: '🥔',
            };
            lbl.string = emojiMap[slot.itemId] || '📦';
            lbl.fontSize = 24;
            lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
            lbl.verticalAlign = Label.VerticalAlign.CENTER;

            // 数量角标
            if (slot.count > 0) {
                const countNode = new Node('Count');
                countNode.addComponent(UITransform).setContentSize(24, 16);
                countNode.setPosition(13, -18);
                const countBg = countNode.addComponent(Sprite);
                countBg.color = new Color(54, 112, 55, 225);
                const countLabelNode = new Node('CountLabel');
                countLabelNode.addComponent(UITransform).setContentSize(24, 16);
                const countLbl = countLabelNode.addComponent(Label);
                countLbl.string = `x${slot.count}`;
                countLbl.fontSize = 10;
                countLbl.color = new Color(255, 255, 255);
                countLbl.horizontalAlign = Label.HorizontalAlign.CENTER;
                countLbl.verticalAlign = Label.VerticalAlign.CENTER;
                countNode.addChild(countLabelNode);
                cell.addChild(countNode);
            }

            this.gridContainer.addChild(cell);
        });
    }
}
