import { _decorator, Component, Node, Sprite, Color, Label, UITransform, Button } from 'cc';
import { Colors } from '../config/GameConfig';
const { ccclass } = _decorator;

/**
 * 地块实体 - 每个地块的可视化对象
 */
@ccclass('LandTile')
export class LandTile extends Component {
    private stateSprite!: Sprite;
    private iconLabel!: Label;
    private progressBar!: Node;

    onLoad() {
        this.stateSprite = this.node.getComponent(Sprite) || this.node.addComponent(Sprite);
    }

    /** 设置地块外观 */
    setAppearance(state: string, cropType?: string, progress?: number) {
        switch (state) {
            case 'empty':
                this.stateSprite.color = new Color(144, 238, 144, 180);
                this.setIcon('➕');
                break;
            case 'growing':
                this.stateSprite.color = new Color(139, 205, 139, 200);
                this.setIcon('🌱');
                break;
            case 'harvesting':
                this.stateSprite.color = new Color(255, 215, 0, 200);
                this.setIcon('🌟');
                break;
            case 'occupied':
                this.stateSprite.color = new Color(139, 115, 85, 200);
                this.setIcon('🏠');
                break;
        }
    }

    private setIcon(emoji: string) {
        if (!this.iconLabel) {
            const iconNode = new Node('Icon');
            iconNode.addComponent(UITransform).setContentSize(40, 40);
            iconNode.setPosition(0, 5);
            this.iconLabel = iconNode.addComponent(Label);
            this.iconLabel.fontSize = 24;
            this.iconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.iconLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.node.addChild(iconNode);
        }
        this.iconLabel.string = emoji;
    }
}
