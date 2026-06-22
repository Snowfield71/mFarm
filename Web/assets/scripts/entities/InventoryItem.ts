import { _decorator, Component, Node, Label, Sprite, Color, UITransform } from 'cc';
import { Colors } from '../config/GameConfig';
const { ccclass } = _decorator;

/**
 * 物品栏中的单个物品显示
 */
@ccclass('InventoryItem')
export class InventoryItem extends Component {
    private itemIcon!: Label;
    private countLabel!: Label;

    onLoad() {
        // 图标
        const iconNode = new Node('Icon');
        iconNode.addComponent(UITransform).setContentSize(48, 48);
        this.itemIcon = iconNode.addComponent(Label);
        this.itemIcon.fontSize = 28;
        this.itemIcon.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.itemIcon.verticalAlign = Label.VerticalAlign.CENTER;
        this.node.addChild(iconNode);

        // 数量
        const countNode = new Node('Count');
        countNode.addComponent(UITransform).setContentSize(24, 16);
        countNode.setPosition(24, -24);
        this.countLabel = countNode.addComponent(Label);
        this.countLabel.fontSize = 10;
        this.countLabel.color = new Color(255, 255, 255);
        this.node.addChild(countNode);
    }

    /** 设置物品显示 */
    setItem(emoji: string, count: number) {
        this.itemIcon.string = emoji;
        this.countLabel.node.active = count > 1;
        if (count > 1) {
            this.countLabel.string = count.toString();
        }
    }
}
