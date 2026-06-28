import { _decorator, Component, Node, Label, Sprite, Color, Button, UITransform } from 'cc';
import { Colors } from '../config/GameConfig';
import { GameManager } from '../core/GameManager';
import { InventorySystem } from '../systems/InventorySystem';
import { getPlantableCrops, getItemsByCategory, ItemCategory, ItemDef } from '../config/ItemConfig';
const { ccclass } = _decorator;

/**
 * 商店界面 UI
 */
@ccclass('ShopUI')
export class ShopUI extends Component {
    private cropContainer!: Node;

    start() {
        this.createShopUI();
    }

    private createShopUI() {
        const bg = new Node('Bg');
        bg.addComponent(UITransform).setContentSize(310, 420);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(255, 250, 205);
        this.node.addChild(bg);

        const title = new Node('Title');
        title.addComponent(UITransform).setContentSize(310, 35);
        title.setPosition(0, 195);
        const titleLabel = title.addComponent(Label);
        titleLabel.string = '🏪 商店';
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(51, 51, 51);
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.node.addChild(title);

        this.cropContainer = new Node('CropList');
        this.cropContainer.addComponent(UITransform).setContentSize(300, 360);
        this.cropContainer.setPosition(0, -20);
        this.node.addChild(this.cropContainer);

        this.refreshShop();
    }

    refreshShop() {
        for (const c of this.cropContainer.children) { c.active = false; c.destroy(); }
        const gm = GameManager.getInstance();
        const crops = getPlantableCrops().filter(c => c.unlockLevel <= gm.playerLevel + 1);

        crops.forEach((crop, i) => {
            const row = this.createShopRow(crop, i);
            this.cropContainer.addChild(row);
        });
    }

    private createShopRow(crop: ItemDef, index: number): Node {
        const row = new Node(`Crop_${crop.id}`);
        row.addComponent(UITransform).setContentSize(290, 50);
        row.setPosition(0, 165 - index * 54);

        const bg = row.addComponent(Sprite);
        bg.color = new Color(240, 248, 232, 200);

        const nameLabel = new Node('Name');
        nameLabel.addComponent(UITransform).setContentSize(80, 20);
        nameLabel.setPosition(-90, 8);
        const nameText = nameLabel.addComponent(Label);
        nameText.string = `${crop.name}`;
        nameText.fontSize = 14;
        nameText.color = new Color(51, 51, 51);
        row.addChild(nameLabel);

        const price = crop.sellPrice * 2;
        const priceLabel = new Node('Price');
        priceLabel.addComponent(UITransform).setContentSize(60, 18);
        priceLabel.setPosition(-90, -8);
        const priceText = priceLabel.addComponent(Label);
        priceText.string = `💰${price}`;
        priceText.fontSize = 12;
        priceText.color = new Color(255, 215, 0);
        row.addChild(priceLabel);

        const growthLabel = new Node('Growth');
        growthLabel.addComponent(UITransform).setContentSize(80, 18);
        growthLabel.setPosition(-20, -8);
        const growthText = growthLabel.addComponent(Label);
        growthText.string = `⏱${crop.growthTime}s`;
        growthText.fontSize = 11;
        growthText.color = new Color(102, 102, 102);
        row.addChild(growthLabel);

        // 购买按钮
        const btn = new Node('Buy');
        btn.addComponent(UITransform).setContentSize(55, 28);
        btn.setPosition(105, 0);
        const btnSprite = btn.addComponent(Sprite);
        btnSprite.color = crop.unlockLevel <= GameManager.getInstance().playerLevel
            ? new Color(144, 238, 144)
            : new Color(200, 200, 200);
        const btnLabel = btn.addComponent(Label);
        btnLabel.string = crop.unlockLevel <= GameManager.getInstance().playerLevel ? '购买' : '🔒';
        btnLabel.fontSize = 12;
        btnLabel.color = new Color(255, 255, 255);
        btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        const button = btn.addComponent(Button);
        button.node.on(Node.EventType.TOUCH_END, () => {
            if (crop.unlockLevel > GameManager.getInstance().playerLevel) return;
            if (GameManager.getInstance().spendGold(price)) {
                InventorySystem.getInstance().addItem(crop.id, 1);
                this.refreshShop();
            }
        });
        row.addChild(btn);

        return row;
    }
}
