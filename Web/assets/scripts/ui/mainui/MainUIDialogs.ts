import { Button, Color, EditBox, Label, LabelOutline, Node, UITransform, Vec3, tween, view } from 'cc';
import { Design } from '../../config/GameConfig';
import { GameManager } from '../../core/GameManager';
import { InventorySystem } from '../../systems/InventorySystem';
import { getItem } from '../../config/ItemConfig';
import { fillRect, fillRoundRect, strokeRoundRect } from '../utils/UIDraw';

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

function formatToastText(text: string): {
    text: string;
    fontSize: number;
    lineHeight: number;
    multiline: boolean;
} {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const singleLineLimit = 20;
    const totalLimit = 38;
    if (normalized.length <= singleLineLimit) {
        return {
            text: normalized,
            fontSize: 13,
            lineHeight: 20,
            multiline: false,
        };
    }

    const clipped = normalized.length > totalLimit
        ? `${normalized.slice(0, totalLimit - 1)}…`
        : normalized;
    const middle = Math.ceil(clipped.length / 2);
    const candidates: number[] = [];
    for (let index = 3; index < clipped.length - 3; index++) {
        if ('，、；：,; '.includes(clipped[index])) candidates.push(index + 1);
    }
    const splitAt = candidates.length > 0
        ? candidates.reduce((best, value) =>
            Math.abs(value - middle) < Math.abs(best - middle) ? value : best,
        candidates[0])
        : middle;
    const firstLine = clipped.slice(0, splitAt).trim();
    const secondLine = clipped.slice(splitAt).trim();
    return {
        text: `${firstLine}\n${secondLine}`,
        fontSize: clipped.length > 30 ? 10 : 11,
        lineHeight: 17,
        multiline: true,
    };
}

function showStyledToast(ui: any, text: string, name = 'Toast', holdDuration = 0.9) {
    const vs = view.getVisibleSize();
    const targetY = vs.height * 0.39 - 30;
    const toastWidth = 286;
    const toastHeight = 80.4375;
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(toastWidth, toastHeight);
    node.setPosition(0, targetY - 16);
    const background = new Node(`${name}Background`);
    background.addComponent(UITransform).setContentSize(toastWidth, toastHeight);
    ui.applyUiIcon('inventorySellResultBg', background);
    node.addChild(background);
    const formatted = formatToastText(text);
    // bg_sell_result reserves its left side for the coin/leaf artwork. Keep
    // every toast label inside the remaining visual safe area instead of
    // centring it across the full texture, which makes long messages overlap
    // the icon. The asymmetric insets also keep short messages visually
    // centred in the usable text panel.
    const toastIconSafeInset = 58;
    const toastRightInset = 16;
    const messageWidth = toastWidth - toastIconSafeInset - toastRightInset;
    const messageCenterX = (toastIconSafeInset - toastRightInset) / 2;
    const message = ui.makeLabel(
        formatted.text,
        formatted.fontSize,
        new Color(88, 45, 24),
        true,
        messageCenterX,
        0,
        messageWidth,
        formatted.multiline ? 44 : 28,
    );
    const messageLabel = message.getComponent(Label)!;
    messageLabel.overflow = formatted.multiline
        ? Label.Overflow.CLAMP
        : Label.Overflow.SHRINK;
    messageLabel.enableWrapText = formatted.multiline;
    messageLabel.lineHeight = formatted.lineHeight;
    messageLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    messageLabel.verticalAlign = Label.VerticalAlign.CENTER;
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

export function showDialog(ui: any, title: string, message: string | (() => string), buttons: Array<{ text: string; cb: () => void; image?: string; icon?: string; imageWidth?: number; imageHeight?: number; imageOffsetX?: number; inlineText?: string; inlineIconEmbedded?: boolean; compactGap?: number; background?: { fill: Color; stroke: Color; radius?: number } }>, showMask = true, preserveExisting = false, compactButtons = false) {
    if (!preserveExisting) ui.dialogRoot.removeAllChildren();
    ui.dialogRoot.active = true;

    const vs = view.getVisibleSize();
    const blocker = new Node(showMask ? 'Mask' : 'DialogInputBlocker');
    blocker.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
    if (showMask) fillRect(blocker, Design.WIDTH, vs.height, new Color(0, 0, 0, 120));
    let dialog: Node;
    const dismiss = () => {
        if (preserveExisting) {
            if (dialog?.isValid) dialog.destroy();
            if (blocker.isValid) blocker.destroy();
            return;
        }
        ui.dialogRoot.active = false;
    };
    blocker.addComponent(Button).node.on(Node.EventType.TOUCH_END, dismiss);
    ui.dialogRoot.addChild(blocker);

    dialog = new Node(preserveExisting ? 'DialogOverlay' : 'Dialog');
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

    const customCompactGap = buttons.find((button) => button.compactGap !== undefined)?.compactGap;
    const buttonGap = compactButtons ? (buttons.length === 2 ? (customCompactGap ?? 12) : 84) : 98;
    const buttonWidths = buttons.map(button =>
        button.imageWidth ?? (button.icon ? 110 : button.image ? 80 : 88),
    );
    const combinedButtonWidth = buttonWidths.reduce((sum, width) => sum + width, 0) +
        Math.max(0, buttons.length - 1) * buttonGap;
    let compactCursor = -combinedButtonWidth / 2;
    buttons.forEach((button, index) => {
        const width = buttonWidths[index];
        const x = compactButtons
            ? compactCursor + width / 2
            : -((buttons.length - 1) * buttonGap) / 2 + index * buttonGap;
        compactCursor += width + buttonGap;
        if (button.image || button.background) {
            const art = new Node(`ButtonArt_${index}`);
            const artWidth = button.imageWidth ?? 80;
            const artHeight = button.imageHeight ?? 80;
            art.addComponent(UITransform).setContentSize(artWidth, artHeight);
            art.setPosition(x + (button.imageOffsetX ?? 0), -65);
            if (button.image) ui.applyUiIcon(button.image, art);
            if (button.background) {
                fillRoundRect(art, artWidth, artHeight, button.background.radius ?? 11, button.background.fill);
                strokeRoundRect(art, artWidth, artHeight, button.background.radius ?? 11, button.background.stroke, 1.25);
            }
            dialog.addChild(art);
            if ((button.background || button.image) && button.icon) {
                const icon = new Node(`ButtonIcon_${index}`);
                const iconSize = button.inlineText ? 27 : 24;
                icon.addComponent(UITransform).setContentSize(iconSize, iconSize);
                // Treat the diamond and label as one centered group. The icon's
                // left edge and the label's right edge balance around x = 0.
                const iconX = button.inlineText ? -48 : -38;
                icon.setPosition(iconX, 0);
                ui.applyUiIcon(button.icon, icon);
                art.addChild(icon);
            }
            if (button.inlineText) {
                const hasInlineIcon = !!button.icon || !!button.inlineIconEmbedded;
                const labelX = hasInlineIcon ? 6 : button.background || button.icon ? 9 : 14;
                const labelWidth = hasInlineIcon ? 84 : button.background || button.icon ? 74 : 70;
                const inlineLabel = ui.makeLabel(
                    button.inlineText,
                    hasInlineIcon ? 14 : 11,
                    new Color(255, 252, 242),
                    true,
                    labelX,
                    0,
                    labelWidth,
                    hasInlineIcon ? 30 : 24,
                );
                const inlineOutline = inlineLabel.addComponent(LabelOutline);
                inlineOutline.color = new Color(71, 39, 24, 255);
                inlineOutline.width = 2;
                art.addChild(inlineLabel);
            }
            const hit = new Node(`Button_${index}`);
            hit.addComponent(UITransform).setContentSize(artWidth, Math.max(34, artHeight));
            hit.setPosition(x + (button.imageOffsetX ?? 0), -65);
            hit.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
                event?.stopPropagation?.();
                tween(art)
                    .to(0.07, { scale: new Vec3(0.93, 0.93, 1) }, { easing: 'quadOut' })
                    .to(0.11, { scale: Vec3.ONE }, { easing: 'backOut' })
                    .call(() => {
                        dismiss();
                        button.cb();
                    })
                    .start();
            });
            dialog.addChild(hit);
            return;
        }
        const node = new Node(`Button_${index}`);
        const buttonWidth = button.icon ? 110 : 88;
        node.addComponent(UITransform).setContentSize(buttonWidth, 34);
        node.setPosition(x, -58);
        fillRoundRect(node, buttonWidth, 34, 10, index === buttons.length - 1 ? new Color(76, 188, 83) : new Color(185, 190, 178));
        if (button.icon) {
            const icon = new Node(`ButtonIcon_${index}`);
            icon.addComponent(UITransform).setContentSize(24, 24);
            icon.setPosition(-39, 0);
            ui.applyUiIcon(button.icon, icon);
            node.addChild(icon);
            node.addChild(ui.makeLabel(button.text, 11, new Color(255, 255, 255), true, 15, 0, 78, 24));
        } else {
            node.addChild(ui.makeLabel(button.text, 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
        }
        node.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            dismiss();
            button.cb();
        });
        dialog.addChild(node);
    });

    dialog.scale = new Vec3(0.72, 0.72, 1);
    tween(dialog).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
}

export function toast(ui: any, text: string) {
    if (Date.now() <= (ui.__rewardAnimationToastSuppressUntil || 0)) {
        ui.__rewardAnimationToastSuppressUntil = 0;
        return;
    }
    showStyledToast(ui, text);

}
