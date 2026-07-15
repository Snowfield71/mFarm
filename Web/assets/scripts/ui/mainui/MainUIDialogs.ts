import { Button, Color, EditBox, Graphics, Label, Mask, Node, ScrollView, UITransform, Vec3, tween, view } from 'cc';
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
    dialog.addComponent(UITransform).setContentSize(286, 232);
    fillRoundRect(dialog, 286, 232, 16, new Color(255, 250, 230, 255));
    strokeRoundRect(dialog, 286, 232, 16, new Color(124, 184, 105, 160), 2);
    ui.dialogRoot.addChild(dialog);

    dialog.addChild(ui.makeLabel(`出售 ${ui.itemName(itemId)}`, 17, new Color(52, 72, 45), true, 0, 84, 230, 26));

    const icon = ui.createItemIcon(itemId, 38);
    icon.setPosition(-94, 42);
    dialog.addChild(icon);

    const owned = ui.makeLabel(`拥有 ${count}    单价 ${def.sellPrice} 金`, 12, new Color(92, 104, 82), false, 18, 44, 176, 18);
    owned.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    dialog.addChild(owned);

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

    const makeStepper = (name: string, text: string, x: number, onTap: () => void) => {
        const button = new Node(name);
        button.addComponent(UITransform).setContentSize(34, 32);
        button.setPosition(x, 0);
        fillRoundRect(button, 34, 32, 10, new Color(76, 188, 83));
        button.addChild(ui.makeLabel(text, 20, new Color(255, 255, 255), true, 0, 1, 30, 26));
        button.addComponent(Button).node.on(Node.EventType.TOUCH_END, onTap);
        dialog.addChild(button);
    };

    makeStepper('Minus', '-', -72, () => setQuantity(selected - 1));

    const inputNode = new Node('QuantityInput');
    inputNode.addComponent(UITransform).setContentSize(74, 32);
    inputNode.setPosition(0, 0);
    fillRoundRect(inputNode, 74, 32, 10, new Color(246, 250, 236, 255));
    strokeRoundRect(inputNode, 74, 32, 10, new Color(154, 196, 138, 150), 1);

    const editNode = new Node('QuantityEditBox');
    editNode.addComponent(UITransform).setContentSize(64, 28);
    editNode.setPosition(0, 0);
    inputNode.addChild(editNode);
    amountInput = editNode.addComponent(EditBox);
    amountInput.string = '1';
    amountInput.placeholder = '1';
    (amountInput as any).inputMode = 2;
    (amountInput as any).maxLength = 3;
    editNode.on('text-changed', () => {
        if (syncingInput) return;
        const raw = amountInput.string.replace(/[^\d]/g, '');
        const value = Number(raw || '1');
        setQuantity(value);
    });
    editNode.on('editing-did-ended', () => setQuantity(Number(amountInput.string || '1')));

    const displayNode = ui.makeLabel('1', 16, new Color(54, 72, 46), true, 0, 0, 64, 28);
    displayNode.name = 'QuantityValue';
    quantityLabel = displayNode.getComponent(Label)!;
    inputNode.addChild(displayNode);
    dialog.addChild(inputNode);
    ui.applyEditBoxTextColor(amountInput, new Color(54, 72, 46, 0), new Color(150, 156, 140, 0));

    makeStepper('Plus', '+', 72, () => setQuantity(selected + 1));

    const total = ui.makeLabel(`合计 ${def.sellPrice} 金`, 13, new Color(194, 132, 20), true, 0, -38, 220, 20);
    totalLabel = total.getComponent(Label)!;
    dialog.addChild(total);

    const cancel = new Node('Cancel');
    cancel.addComponent(UITransform).setContentSize(88, 34);
    cancel.setPosition(-50, -78);
    fillRoundRect(cancel, 88, 34, 10, new Color(185, 190, 178));
    cancel.addChild(ui.makeLabel('取消', 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
    cancel.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { ui.dialogRoot.active = false; });
    dialog.addChild(cancel);

    const sell = new Node('Sell');
    sell.addComponent(UITransform).setContentSize(88, 34);
    sell.setPosition(50, -78);
    fillRoundRect(sell, 88, 34, 10, new Color(76, 188, 83));
    sell.addChild(ui.makeLabel('出售', 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
    sell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
        const finalCount = Math.max(1, Math.min(count, Number(amountInput.string || selected)));
        let awardedGold = 0;
        if (!InventorySystem.getInstance().sellSlotItem(slotIndex, finalCount, gold => {
            awardedGold = GameManager.getInstance().applySaleGold(gold);
        })) {
            ui.toast('出售失败');
            return;
        }
        ui.dialogRoot.active = false;
        ui.toast(`获得 ${awardedGold} 金`);
    });
    dialog.addChild(sell);

    dialog.scale = new Vec3(0.72, 0.72, 1);
    tween(dialog).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

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

export function showDialog(ui: any, title: string, message: string, buttons: Array<{ text: string; cb: () => void }>) {
    ui.dialogRoot.removeAllChildren();
    ui.dialogRoot.active = true;

    const vs = view.getVisibleSize();
    const mask = new Node('Mask');
    mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
    fillRect(mask, Design.WIDTH, vs.height, new Color(0, 0, 0, 120));
    mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { ui.dialogRoot.active = false; });
    ui.dialogRoot.addChild(mask);

    const dialog = new Node('Dialog');
    dialog.addComponent(UITransform).setContentSize(274, 184);
    fillRoundRect(dialog, 274, 184, 16, new Color(255, 250, 230, 255));
    strokeRoundRect(dialog, 274, 184, 16, new Color(124, 184, 105, 160), 2);
    ui.dialogRoot.addChild(dialog);

    dialog.addChild(ui.makeLabel(title, 17, new Color(52, 72, 45), true, 0, 58, 230, 26));
    const msg = ui.makeLabel(message, 13, new Color(92, 104, 82), false, 0, 9, 230, 60);
    msg.getComponent(Label)!.lineHeight = 21;
    dialog.addChild(msg);

    const startX = -((buttons.length - 1) * 98) / 2;
    buttons.forEach((button, index) => {
        const node = new Node(`Button_${index}`);
        node.addComponent(UITransform).setContentSize(88, 34);
        node.setPosition(startX + index * 98, -58);
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
    const vs = view.getVisibleSize();
    const targetY = vs.height * 0.39 - 30;
    const node = new Node('Toast');
    node.addComponent(UITransform).setContentSize(214, 34);
    node.setPosition(0, targetY - 14);
    fillRoundRect(node, 214, 34, 12, new Color(248, 252, 238, 246));
    strokeRoundRect(node, 214, 34, 12, new Color(124, 184, 105, 165), 1.5);
    const dot = new Node('ToastDot');
    dot.setPosition(-84, 0);
    fillRoundRect(dot, 12, 12, 6, new Color(86, 190, 92, 245));
    node.addChild(dot);
    node.addChild(ui.makeLabel(text, 13, new Color(54, 86, 46), true, 8, 0, 166, 28));
    ui.node.addChild(node);
    node.setScale(0.92, 0.92, 1);
    tween(node)
        .to(0.16, { position: new Vec3(0, targetY, 0), scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .delay(0.9)
        .to(0.18, { position: new Vec3(0, targetY + 20, 0), scale: new Vec3(0.94, 0.94, 1) })
        .call(() => node.destroy())
        .start();

}
