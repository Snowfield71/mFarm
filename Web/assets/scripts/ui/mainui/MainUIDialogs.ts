import { Button, Color, EditBox, Graphics, Label, LabelOutline, Mask, Node, UITransform, Vec3, tween, view } from 'cc';
import { Design, GameValues } from '../../config/GameConfig';
import { GameManager } from '../../core/GameManager';
import { EventManager } from '../../core/EventManager';
import { InventorySystem } from '../../systems/InventorySystem';
import { LandBlock, LandSystem } from '../../systems/LandSystem';
import { CraftSystem } from '../../systems/CraftSystem';
import { getItem, getPlantableCrops, ITEM_DB, ItemCategory, ItemDef } from '../../config/ItemConfig';
import { getRecipe, getRecipesByLevel, RecipeDef } from '../../config/RecipeConfig';
import { fillRect, fillRoundRect, strokeRoundRect } from '../utils/UIDraw';
import type { PanelName } from './MainUITypes';

export function openSellDialog(ui: any, slotIndex: number) {
    const inv = InventorySystem.getInstance();
    const slot = inv.slots[slotIndex];
    if (!slot || !slot.itemId || slot.count <= 0) {
        ui.toast('物品数量不足');
        return;
    }

    const itemId = slot.itemId;
    const def = getItem(itemId);
    if (!def || def.sellPrice <= 0) {
        ui.toast('该物品不能出售');
        return;
    }
    const count = slot.count;
    if (count <= 0) {
        ui.toast('物品数量不足');
        return;
    }

    ui.dialogRoot.removeAllChildren();
    ui.dialogRoot.active = true;

    const vs = view.getVisibleSize();
    const mask = new Node('Mask');
    mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
    fillRect(mask, Design.WIDTH, vs.height, new Color(0, 0, 0, 120));
    mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { ui.dialogRoot.active = false; });
    ui.dialogRoot.addChild(mask);

    const dialog = new Node('SellDialog');
    dialog.addComponent(UITransform).setContentSize(300, 224);
    ui.dialogRoot.addChild(dialog);
    const background = new Node('SellDialogBackground');
    background.addComponent(UITransform).setContentSize(300, 224);
    ui.applyUiIcon('inventorySellDialogBg', background);
    dialog.addChild(background);

    const sellTitle = ui.makeLabel(`出售 ${ui.itemName(itemId)}`, 18, new Color(88, 45, 24), true, 0, 86, 240, 28);
    sellTitle.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
    const titleOutline = sellTitle.addComponent(LabelOutline);
    titleOutline.color = new Color(255, 246, 225, 255);
    titleOutline.width = 2;
    dialog.addChild(sellTitle);

    const iconShadow = new Node('ItemIconShadow');
    iconShadow.setPosition(-91, 21);
    fillRoundRect(iconShadow, 52, 12, 6, new Color(104, 67, 38, 42));
    dialog.addChild(iconShadow);
    const iconBackground = new Node('ItemIconBackground');
    iconBackground.setPosition(-91, 43);
    fillRoundRect(iconBackground, 62, 62, 14, new Color(255, 254, 245, 255));
    strokeRoundRect(iconBackground, 62, 62, 14, new Color(218, 190, 139, 185), 1.5);
    dialog.addChild(iconBackground);
    const icon = ui.createItemIcon(itemId, 56);
    icon.setPosition(-91, 43);
    dialog.addChild(icon);

    const owned = ui.makeLabel(`持有数量：${count}`, 12, new Color(92, 104, 82), false, 43, 51, 150, 18);
    owned.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    dialog.addChild(owned);
    const unitPrice = ui.makeLabel(`单价：${def.sellPrice} 金币`, 12, new Color(92, 104, 82), false, 43, 28, 150, 18);
    unitPrice.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    dialog.addChild(unitPrice);

    let selected = 1;
    let amountInput: EditBox;
    let totalLabel: Label;
    let quantityLabel: Label | null = null;
    let syncingInput = false;

    const setQuantity = (next: number) => {
        selected = Math.max(1, Math.min(count, Math.floor(next || 1)));
        const text = selected.toString();
        if (quantityLabel) quantityLabel.string = text;
        if (amountInput.string !== text) {
            syncingInput = true;
            amountInput.string = text;
            syncingInput = false;
        }
        totalLabel.string = `合计 ${selected * def.sellPrice} 金`;
    };

    const makeStepper = (name: string, image: string, x: number, artSize: number, hitWidth: number, onTap: () => void) => {
        const art = new Node(`${name}Art`);
        art.addComponent(UITransform).setContentSize(artSize, artSize);
        art.setPosition(x, -9);
        ui.applyUiIcon(image, art);
        dialog.addChild(art);
        const hit = new Node(name);
        hit.addComponent(UITransform).setContentSize(hitWidth, 34);
        hit.setPosition(x, -9);
        hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            tween(art)
                .to(0.06, { position: new Vec3(x, -11, 0), scale: new Vec3(0.93, 0.93, 1) }, { easing: 'quadOut' })
                .to(0.1, { position: new Vec3(x, -9, 0), scale: Vec3.ONE }, { easing: 'backOut' })
                .call(onTap)
                .start();
        });
        dialog.addChild(hit);
    };

    makeStepper('Minus', 'btnSellMinus', -91, 42, 36, () => setQuantity(selected - 1));

    const inputNode = new Node('QuantityInput');
    inputNode.addComponent(UITransform).setContentSize(66, 32);
    inputNode.setPosition(-40, -9);
    fillRoundRect(inputNode, 66, 32, 10, new Color(255, 253, 235, 255));
    strokeRoundRect(inputNode, 66, 32, 10, new Color(121, 154, 101, 220), 2);

    const editNode = new Node('QuantityEditBox');
    editNode.addComponent(UITransform).setContentSize(58, 28);
    editNode.setPosition(0, 0);
    inputNode.addChild(editNode);
    amountInput = editNode.addComponent(EditBox);
    amountInput.string = '1';
    amountInput.placeholder = '1';
    (amountInput as any).inputMode = 2;
    (amountInput as any).maxLength = Math.max(1, count.toString().length);
    editNode.on('text-changed', () => {
        if (syncingInput) return;
        const raw = amountInput.string.replace(/[^\d]/g, '');
        const value = Number(raw || '1');
        setQuantity(value);
    });
    editNode.on('editing-did-ended', () => setQuantity(Number(amountInput.string || '1')));

    const displayNode = ui.makeLabel('1', 16, new Color(54, 72, 46), true, 0, 0, 58, 28);
    displayNode.name = 'QuantityValue';
    quantityLabel = displayNode.getComponent(Label)!;
    inputNode.addChild(displayNode);
    dialog.addChild(inputNode);
    ui.applyEditBoxTextColor(amountInput, new Color(54, 72, 46, 0), new Color(150, 156, 140, 0));

    makeStepper('Plus', 'btnSellPlus', 11, 42, 36, () => setQuantity(selected + 1));
    makeStepper('Max', 'btnSellMax', 71, 64, 54, () => setQuantity(count));

    const total = ui.makeLabel(`合计 ${def.sellPrice} 金`, 16, new Color(210, 142, 21), true, 0, -48, 220, 24);
    const totalOutline = total.addComponent(LabelOutline);
    totalOutline.color = new Color(255, 242, 188, 255);
    totalOutline.width = 1.5;
    totalLabel = total.getComponent(Label)!;
    dialog.addChild(total);

    const makeImageAction = (name: string, image: string, x: number, onTap: () => void) => {
        const art = new Node(`${name}Art`);
        art.addComponent(UITransform).setContentSize(80, 80);
        art.setPosition(x, -78);
        ui.applyUiIcon(image, art);
        dialog.addChild(art);
        const hit = new Node(name);
        hit.addComponent(UITransform).setContentSize(70, 34);
        hit.setPosition(x, -78);
        hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            tween(art)
                .to(0.07, { scale: new Vec3(0.93, 0.93, 1) }, { easing: 'quadOut' })
                .to(0.11, { scale: Vec3.ONE }, { easing: 'backOut' })
                .call(onTap)
                .start();
        });
        dialog.addChild(hit);
    };
    makeImageAction('Cancel', 'btnSellCancel', -52, () => { ui.dialogRoot.active = false; });
    makeImageAction('Sell', 'btnSellConfirm', 52, () => {
        const finalCount = Math.max(1, Math.min(count, Number(amountInput.string || selected)));
        let awardedGold = 0;
        if (!InventorySystem.getInstance().sellSlotItem(slotIndex, finalCount, gold => {
            awardedGold = GameManager.getInstance().applySaleGold(gold);
        })) {
            ui.toast('出售失败');
            return;
        }
        ui.dialogRoot.active = false;
        showSellResultToast(ui, `出售成功，获得 ${awardedGold} 金`);
    });

    dialog.scale = new Vec3(0.72, 0.72, 1);
    tween(dialog).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

}

function showSellResultToast(ui: any, text: string) {
    showStyledToast(ui, text, 'SellResultToast', 1.05);
}

function showStyledToast(ui: any, text: string, name = 'Toast', holdDuration = 0.9) {
    const vs = view.getVisibleSize();
    const targetY = vs.height * 0.39 - 30;
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(250, 70.3125);
    node.setPosition(0, targetY - 16);
    const background = new Node(`${name}Background`);
    background.addComponent(UITransform).setContentSize(250, 70.3125);
    ui.applyUiIcon('inventorySellResultBg', background);
    node.addChild(background);
    const message = ui.makeLabel(text, 13, new Color(88, 45, 24), true, 0, 0, 210, 28);
    message.getComponent(Label)!.overflow = Label.Overflow.SHRINK;
    node.addChild(message);
    ui.node.addChild(node);
    node.setScale(0.9, 0.9, 1);
    tween(node)
        .to(0.16, { position: new Vec3(0, targetY, 0), scale: Vec3.ONE }, { easing: 'backOut' })
        .delay(holdDuration)
        .to(0.18, { position: new Vec3(0, targetY + 20, 0), scale: new Vec3(0.94, 0.94, 1) })
        .call(() => node.destroy())
        .start();
}

export function applyEditBoxTextColor(ui: any, editBox: EditBox, color: Color, placeholderColor: Color) {
    const apply = () => {
        const box = editBox as any;
        const tintLabel = (target: any, targetColor: Color) => {
            const label = target instanceof Label
                ? target
                : target?.getComponent?.(Label) || target?.node?.getComponent?.(Label);
            if (label) label.color = targetColor;
        };

        tintLabel(box.textLabel, color);
        tintLabel(box._textLabel, color);
        tintLabel(box.placeholderLabel, placeholderColor);
        tintLabel(box._placeholderLabel, placeholderColor);

        for (const child of editBox.node.children) {
            const label = child.getComponent(Label);
            if (!label) continue;
            const isPlaceholder = child.name.toLowerCase().indexOf('placeholder') >= 0;
            label.color = isPlaceholder ? placeholderColor : color;
        }
    };

    apply();
    ui.scheduleOnce(apply, 0);

}

export function showDialog(ui: any, title: string, message: string | (() => string), buttons: Array<{ text: string; cb: () => void; image?: string }>) {
    ui.dialogRoot.removeAllChildren();
    ui.dialogRoot.active = true;

    const vs = view.getVisibleSize();
    const mask = new Node('Mask');
    mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
    fillRect(mask, Design.WIDTH, vs.height, new Color(0, 0, 0, 120));
    mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { ui.dialogRoot.active = false; });
    ui.dialogRoot.addChild(mask);

    const dialog = new Node('Dialog');
    dialog.addComponent(UITransform).setContentSize(274, 192);
    ui.dialogRoot.addChild(dialog);
    const background = new Node('DialogBackground');
    background.addComponent(UITransform).setContentSize(274, 192);
    ui.applyUiIcon('inventorySellDialogBg', background);
    dialog.addChild(background);

    const dialogTitle = ui.makeLabel(title, 18, new Color(88, 45, 24), true, 0, 62, 230, 28);
    const dialogTitleOutline = dialogTitle.addComponent(LabelOutline);
    dialogTitleOutline.color = new Color(255, 246, 225, 255);
    dialogTitleOutline.width = 2;
    dialog.addChild(dialogTitle);
    const resolveMessage = () => typeof message === 'function' ? message() : message;
    const msg = ui.makeLabel(resolveMessage(), 13, new Color(92, 104, 82), false, 0, 9, 230, 60);
    msg.name = 'DialogMessage';
    msg.getComponent(Label)!.lineHeight = 21;
    dialog.addChild(msg);
    if (typeof message === 'function') {
        const refreshMessage = () => {
            if (!dialog.isValid || !ui.dialogRoot.active) {
                ui.unschedule(refreshMessage);
                return;
            }
            msg.getComponent(Label)!.string = resolveMessage();
        };
        ui.schedule(refreshMessage, 0.16);
    }

    const startX = -((buttons.length - 1) * 98) / 2;
    buttons.forEach((button, index) => {
        const x = startX + index * 98;
        if (button.image) {
            const art = new Node(`ButtonArt_${index}`);
            art.addComponent(UITransform).setContentSize(80, 80);
            art.setPosition(x, -65);
            ui.applyUiIcon(button.image, art);
            dialog.addChild(art);
            const hit = new Node(`Button_${index}`);
            hit.addComponent(UITransform).setContentSize(70, 34);
            hit.setPosition(x, -65);
            hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
                event?.stopPropagation?.();
                tween(art)
                    .to(0.07, { scale: new Vec3(0.93, 0.93, 1) }, { easing: 'quadOut' })
                    .to(0.11, { scale: Vec3.ONE }, { easing: 'backOut' })
                    .call(() => {
                        ui.dialogRoot.active = false;
                        button.cb();
                    })
                    .start();
            });
            dialog.addChild(hit);
            return;
        }
        const node = new Node(`Button_${index}`);
        node.addComponent(UITransform).setContentSize(88, 34);
        node.setPosition(x, -58);
        fillRoundRect(node, 88, 34, 10, index === buttons.length - 1 ? new Color(76, 188, 83) : new Color(185, 190, 178));
        node.addChild(ui.makeLabel(button.text, 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
        node.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            ui.dialogRoot.active = false;
            button.cb();
        });
        dialog.addChild(node);
    });

    dialog.scale = new Vec3(0.72, 0.72, 1);
    tween(dialog).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
}

export function toast(ui: any, text: string) {
    showStyledToast(ui, text);

}
