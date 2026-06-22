import { _decorator, Component, Node, Sprite, Color, Label, Button, UITransform, tween, Vec3 } from 'cc';
import { Colors, Design } from '../config/GameConfig';
const { ccclass } = _decorator;

export interface DialogButton {
    text: string;
    callback: () => void;
    isPrimary?: boolean;
}

/**
 * 弹出框组件 - 通用提示/确认/列表弹窗
 * 符合萌田农场美术规范: 圆角16px, 浅黄背景 #FFFACD
 */
@ccclass('PopupDialog')
export class PopupDialog extends Component {
    private dialogNode: Node | null = null;

    /** 显示确认弹窗 */
    showConfirm(title: string, message: string, onConfirm?: () => void, onCancel?: () => void) {
        this.show(title, message, [
            { text: '取消', callback: () => onCancel?.() },
            { text: '确定', callback: () => onConfirm?.(), isPrimary: true },
        ]);
    }

    /** 显示提示弹窗 */
    showAlert(title: string, message: string) {
        this.show(title, message, [
            { text: '确定', callback: () => {}, isPrimary: true },
        ]);
    }

    /** 显示自定义按钮弹窗 */
    show(title: string, message: string, buttons: DialogButton[]) {
        this.node.active = true;
        if (this.dialogNode) {
            this.dialogNode.destroy();
        }

        const dialogW = 280;
        const dialogH = 200;

        this.dialogNode = new Node('DialogContent');

        // 背景
        const bg = new Node('Bg');
        bg.addComponent(UITransform).setContentSize(dialogW, dialogH);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(255, 250, 205); // #FFFACD
        this.dialogNode!.addChild(bg);

        // 标题
        const titleNode = new Node('Title');
        titleNode.addComponent(UITransform).setContentSize(dialogW, 35);
        titleNode.setPosition(0, dialogH / 2 - 25);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 17;
        titleLabel.bold = true;
        titleLabel.color = new Color(51, 51, 51);
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.dialogNode!.addChild(titleNode);

        // 消息
        const msgNode = new Node('Message');
        msgNode.addComponent(UITransform).setContentSize(dialogW - 30, 90);
        msgNode.setPosition(0, 10);
        const msgLabel = msgNode.addComponent(Label);
        msgLabel.string = message;
        msgLabel.fontSize = 13;
        msgLabel.color = new Color(102, 102, 102);
        msgLabel.lineHeight = 24;
        msgLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        msgLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.dialogNode!.addChild(msgNode);

        // 按钮
        const btnSpacing = 110;
        const startX = -(buttons.length - 1) * btnSpacing / 2;
        buttons.forEach((btn, i) => {
            const btnNode = new Node(`Btn_${i}`);
            btnNode.addComponent(UITransform).setContentSize(100, 36);
            btnNode.setPosition(startX + i * btnSpacing, -dialogH / 2 + 30);
            const btnBg = btnNode.addComponent(Sprite);
            btnBg.color = btn.isPrimary
                ? new Color(144, 238, 144)  // 主色绿
                : new Color(200, 200, 200); // 灰色
            const btnLabel = btnNode.addComponent(Label);
            btnLabel.string = btn.text;
            btnLabel.fontSize = 14;
            btnLabel.color = new Color(255, 255, 255);
            btnLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            btnLabel.verticalAlign = Label.VerticalAlign.CENTER;
            const button = btnNode.addComponent(Button);
            button.node.on(Node.EventType.TOUCH_END, () => {
                btn.callback();
                this.hide();
            });
            this.dialogNode!.addChild(btnNode);
        });

        // 动画
        this.dialogNode!.scale = new Vec3(0.5, 0.5, 1);
        this.node.addChild(this.dialogNode);
        tween(this.dialogNode!)
            .to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    /** 隐藏 */
    hide() {
        if (this.dialogNode) {
            this.dialogNode.destroy();
            this.dialogNode = null;
        }
        this.node.active = false;
    }
}
