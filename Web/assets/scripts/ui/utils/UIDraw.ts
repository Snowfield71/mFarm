/**
 * 绘图工具函数
 * 封装 Cocos Creator 的 Graphics 常用绘制操作
 */
import { Color, Graphics, Node } from 'cc';

export function fillRect(node: Node, w: number, h: number, color: Color) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.clear();
    g.fillColor = color;
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
}

export function fillRoundRect(node: Node, w: number, h: number, r: number, color: Color) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.clear();
    g.fillColor = color;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
}

export function strokeRoundRect(node: Node, w: number, h: number, r: number, color: Color, lineW = 2) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.strokeColor = color;
    g.lineWidth = lineW;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
}

export function drawCatalogStyleProgress(
    track: Node,
    width: number,
    ratio: number,
    trackColor: Color,
    fillColor: Color,
    fillName = 'CatalogProgressFill',
    knobName = 'CatalogProgressKnob',
    showKnob = true,
) {
    const normalized = Math.max(0, Math.min(1, ratio));
    fillRoundRect(track, width, 13, 7, trackColor);

    let fill = track.getChildByName(fillName);
    if (!fill) {
        fill = new Node(fillName);
        track.addChild(fill);
    }
    const fillWidth = width * normalized;
    fill.active = fillWidth > 0;
    if (fill.active) {
        fill.setPosition(-width / 2 + fillWidth / 2, 0);
        fillRoundRect(fill, fillWidth, 9, 5, fillColor);
    }

    let knob = track.getChildByName(knobName);
    if (!showKnob) {
        if (knob) knob.active = false;
        return;
    }
    if (!knob) {
        knob = new Node(knobName);
        track.addChild(knob);
    }
    knob.active = true;
    knob.setPosition(-width / 2 + width * normalized, 0);
    const graphics = knob.getComponent(Graphics) || knob.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = new Color(255, 247, 226, 255);
    graphics.circle(0, 0, 9);
    graphics.fill();
    graphics.strokeColor = new Color(126, 78, 48, 225);
    graphics.lineWidth = 1.6;
    graphics.circle(0, 0, 9);
    graphics.stroke();
}
