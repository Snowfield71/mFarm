import { _decorator, Component, Node, Sprite, Color, UITransform, Label, instantiate, Prefab } from 'cc';
import { Colors, Design } from '../config/GameConfig';
import { EventManager } from '../core/EventManager';
import { GameManager } from '../core/GameManager';
import { PopupDialog } from './PopupDialog';
const { ccclass, property } = _decorator;

/**
 * UI 管理器 - 管理面板切换和通用 UI 状态
 */
@ccclass('UIManager')
export class UIManager extends Component {
    private static instance: UIManager;

    @property({ type: Node })
    private mainUIRoot: Node | null = null;

    private currentPanel: string | null = null;
    private panelNodes: Map<string, Node> = new Map();

    static getInstance(): UIManager { return UIManager.instance; }

    onLoad() {
        UIManager.instance = this;
    }

    start() {
        this.createOverlay();
        this.bindEvents();
    }

    private createOverlay() {
        // 背景遮罩
        const overlay = new Node('Overlay');
        overlay.addComponent(UITransform).setContentSize(Design.WIDTH, Design.HEIGHT);
        const overlaySprite = overlay.addComponent(Sprite);
        overlaySprite.color = new Color(0, 0, 0, 0);
        overlay.on(Node.EventType.TOUCH_END, () => this.hidePanel());
        overlay.active = false;
        this.node.addChild(overlay);
        this.panelNodes.set('_overlay', overlay);
    }

    private bindEvents() {
        const evt = EventManager.getInstance();
    }

    /** 注册面板 */
    registerPanel(name: string, node: Node) {
        this.panelNodes.set(name, node);
        node.active = false;
    }

    /** 显示面板 */
    showPanel(name: string) {
        // 关闭当前面板
        if (this.currentPanel) {
            const current = this.panelNodes.get(this.currentPanel);
            if (current) current.active = false;
        }

        const panel = this.panelNodes.get(name);
        if (panel) {
            panel.active = true;
            this.currentPanel = name;
            // 显示遮罩
            const overlay = this.panelNodes.get('_overlay');
            if (overlay) overlay.active = true;
        }
    }

    /** 隐藏当前面板 */
    hidePanel() {
        if (this.currentPanel) {
            const panel = this.panelNodes.get(this.currentPanel);
            if (panel) panel.active = false;
            this.currentPanel = null;
        }
        const overlay = this.panelNodes.get('_overlay');
        if (overlay) overlay.active = false;
    }

    /** 获取当前显示的面板名 */
    getCurrentPanel(): string | null {
        return this.currentPanel;
    }
}
