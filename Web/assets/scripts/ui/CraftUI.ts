import { _decorator, Component, Node, Label, Sprite, Color, Button, UITransform } from 'cc';
import { Colors } from '../config/GameConfig';
import { GameManager } from '../core/GameManager';
import { CraftSystem } from '../systems/CraftSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { getRecipesByLevel, RecipeDef } from '../config/RecipeConfig';
import { getItem } from '../config/ItemConfig';
const { ccclass } = _decorator;

/**
 * 合成界面 UI
 */
@ccclass('CraftUI')
export class CraftUI extends Component {
    private listContainer!: Node;
    private activeInfo!: Node;

    start() {
        this.createCraftUI();
    }

    private createCraftUI() {
        const bg = new Node('Bg');
        bg.addComponent(UITransform).setContentSize(310, 420);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(255, 250, 205);
        this.node.addChild(bg);

        const title = new Node('Title');
        title.addComponent(UITransform).setContentSize(310, 35);
        title.setPosition(0, 195);
        const titleLabel = title.addComponent(Label);
        titleLabel.string = '⚙️ 合成台';
        titleLabel.fontSize = 18;
        titleLabel.bold = true;
        titleLabel.color = new Color(51, 51, 51);
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.node.addChild(title);

        // 活跃合成信息
        this.activeInfo = new Node('ActiveInfo');
        this.activeInfo.addComponent(UITransform).setContentSize(300, 20);
        this.activeInfo.setPosition(0, 170);
        this.node.addChild(this.activeInfo);

        // 配方列表
        this.listContainer = new Node('RecipeList');
        this.listContainer.addComponent(UITransform).setContentSize(300, 340);
        this.listContainer.setPosition(0, -20);
        this.node.addChild(this.listContainer);

        this.refreshList();
    }

    refreshList() {
        const gm = GameManager.getInstance();
        const recipes = getRecipesByLevel(gm.playerLevel);
        const cs = CraftSystem.getInstance();

        // 更新活跃合成信息
        const activeCount = cs.getActiveCraftCount();
        this.activeInfo.getComponent(Label)!.string = activeCount > 0
            ? `⏳ 进行中: ${activeCount} 个`
            : '选择配方开始合成';

        // 清空列表
        this.listContainer.children.forEach(c => c.destroy());

        recipes.forEach((recipe, i) => {
            const row = this.createRecipeRow(recipe, i);
            this.listContainer.addChild(row);
        });
    }

    private createRecipeRow(recipe: RecipeDef, index: number): Node {
        const row = new Node(`Recipe_${recipe.id}`);
        row.addComponent(UITransform).setContentSize(290, 55);
        row.setPosition(0, 155 - index * 58);

        const bg = row.addComponent(Sprite);
        bg.color = new Color(240, 248, 232, 200);

        // 配方名
        const nameLabel = new Node('Name');
        nameLabel.addComponent(UITransform).setContentSize(100, 20);
        nameLabel.setPosition(-80, 12);
        const nameText = nameLabel.addComponent(Label);
        nameText.string = recipe.name;
        nameText.fontSize = 13;
        nameText.color = new Color(51, 51, 51);
        row.addChild(nameLabel);

        // 材料
        const matStr = recipe.materials.map(m => `${m.itemId}×${m.count}`).join(' ');
        const matLabel = new Node('Mat');
        matLabel.addComponent(UITransform).setContentSize(160, 18);
        matLabel.setPosition(-65, -6);
        const matText = matLabel.addComponent(Label);
        matText.string = matStr;
        matText.fontSize = 10;
        matText.color = new Color(102, 102, 102);
        row.addChild(matLabel);

        // 产出
        const prodLabel = new Node('Prod');
        prodLabel.addComponent(UITransform).setContentSize(60, 18);
        prodLabel.setPosition(50, -6);
        const prodText = prodLabel.addComponent(Label);
        prodText.string = `→ ${recipe.product.itemId}×${recipe.product.count}`;
        prodText.fontSize = 11;
        prodText.color = new Color(255, 215, 0);
        row.addChild(prodLabel);

        // 合成按钮
        const btn = new Node('Btn');
        btn.addComponent(UITransform).setContentSize(55, 26);
        btn.setPosition(120, 0);
        const btnSprite = btn.addComponent(Sprite);
        btnSprite.color = new Color(144, 238, 144);
        const btnLabel = btn.addComponent(Label);
        btnLabel.string = '合成';
        btnLabel.fontSize = 12;
        btnLabel.color = new Color(255, 255, 255);
        btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        const button = btn.addComponent(Button);
        button.node.on(Node.EventType.TOUCH_END, () => {
            const cs = CraftSystem.getInstance();
            const id = cs.startCraft(recipe.id);
            if (id >= 0) {
                this.refreshList();
            }
        });
        row.addChild(btn);

        return row;
    }
}
