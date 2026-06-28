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
