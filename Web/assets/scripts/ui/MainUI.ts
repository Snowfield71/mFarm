import { _decorator, Button, Color, Component, EditBox, Graphics, Label, Mask, Node, ScrollView, UITransform, Vec3, tween, view } from 'cc';
import { Design, GameValues } from '../config/GameConfig';
import { GameManager } from '../core/GameManager';
import { EventManager } from '../core/EventManager';
import { InventorySystem } from '../systems/InventorySystem';
import { LandBlock, LandSystem } from '../systems/LandSystem';
import { CraftSystem } from '../systems/CraftSystem';
import { getItem, getPlantableCrops, ITEM_DB, ItemCategory, ItemDef } from '../config/ItemConfig';
import { getRecipe, getRecipesByLevel, RecipeDef } from '../config/RecipeConfig';
import { fillRect, fillRoundRect, strokeRoundRect } from './utils/UIDraw';
import {
    createLabel, createItemIcon, applyUiIcon,
    getItemDisplayName, getRecipeDisplayName, seededRandom,
} from './utils/UIWidgetFactory';

const { ccclass } = _decorator;

type PanelName = 'inventory' | 'craft' | 'shop' | 'quest';

@ccclass('MainUI')
export class MainUI extends Component {
    private topBar!: Node;
    private landRoot!: Node;
    private bubbleRoot!: Node;
    private dialogRoot!: Node;
    private panels: Partial<Record<PanelName, Node>> = {};

    private landTiles: Node[] = [];
    private selectedSeedId: string | null = null;
    private activeBubbleLandId = -1;
    private progressRefreshTimer = 0;
    private suppressNextLandExpandedRefresh = false;

    private static readonly LAND_COLS = 3;
    private static readonly LAND_ROWS = 5;
    private static readonly TILE_SIZE = 68;
    private static readonly TILE_GAP = 8;
    private static readonly LAND_UNLOCK_DIAMOND = 10;
    private static readonly BOTTOM_NAV_HEIGHT = 66;

    start() {
        this.createBackground();
        this.createTopBar();
        this.createLandArea();
        this.createBottomNav();
        this.createPanels();
        this.createDialogRoot();
        this.createBubbleRoot();
        this.bindEvents();
        this.refreshAll();
    }

    update(dt: number) {
        this.progressRefreshTimer += dt;
        if (this.progressRefreshTimer < 0.5) return;
        this.progressRefreshTimer = 0;

        LandSystem.getInstance()
            .getAllBlocks()
            .filter(block => block.state === 'growing')
            .forEach(block => this.updateGrowingProgress(block.id, block.progress));

        if (this.panels.craft?.active && CraftSystem.getInstance().getActiveCraftCount() > 0) {
            this.updateCraftProgressViews();
        }
    }

    // Scene
    private createBackground() {
        const vs = view.getVisibleSize();
        const sky = new Node('Sky');
        sky.addComponent(UITransform).setContentSize(vs.width * 2, vs.height * 2);
        const g = sky.addComponent(Graphics);
        const steps = 16;
        const skyHeight = vs.height * 0.66;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            g.fillColor = new Color(
                Math.round(139 + 87 * t),
                Math.round(211 + 28 * t),
                Math.round(238 - 4 * t),
                255,
            );
            const y = vs.height - (i + 1) * (skyHeight / steps);
            g.rect(-vs.width, y - vs.height / 2, vs.width * 2, skyHeight / steps + 2);
            g.fill();
        }
        this.node.addChild(sky);

        const grass = new Node('Grass');
        const grassTop = vs.height * 0.14;
        const grassHeight = vs.height;
        grass.setPosition(0, grassTop - grassHeight / 2);
        fillRect(grass, vs.width * 2, grassHeight, new Color(148, 236, 158, 255));
        this.node.addChild(grass);
        this.createGrassPatches(grass, vs.width, grassHeight, grassTop);

        const sun = this.createSun(vs.width * 0.31, vs.height * 0.39);
        this.node.addChild(sun);

        const cloudScale = Math.max(0.86, Math.min(1.12, vs.width / Design.WIDTH));
        const cloudData: Array<[number, number, number]> = [
            [-0.34, 0.33, 42],
            [-0.16, 0.25, 32],
            [0.16, 0.28, 32],
            [0.39, 0.19, 26],
        ];
        for (const [xRatio, yRatio, s] of cloudData) {
            this.createCloud(vs.width * xRatio, vs.height * yRatio, s * cloudScale);
        }
    }

    private createGrassPatches(parent: Node, viewWidth: number, grassHeight: number, grassTop: number) {
        const colors = [
            new Color(76, 164, 73, 175),
            new Color(94, 184, 78, 165),
            new Color(116, 198, 88, 150),
        ];
        const rows = 10;
        const cols = 10;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if ((row + col * 2) % 7 === 0 && row > 2) continue;
                const seed = row * 17 + col * 29;
                const x = -viewWidth / 2 + 14 + col * (viewWidth - 28) / (cols - 1) + (this.rng(seed, 1) - 0.5) * 20;
                const worldY = grassTop - 16 - row * 38 + (this.rng(seed, 2) - 0.5) * 16;
                const localY = worldY - (grassTop - grassHeight / 2);
                this.drawGrassPatch(parent, x, localY, 6 + this.rng(seed, 3) * 4, colors[(row + col) % colors.length]);
            }
        }
    }

    private drawGrassPatch(parent: Node, x: number, y: number, size: number, color: Color) {
        const patch = new Node('GrassPatch');
        patch.setPosition(x, y);
        const g = patch.addComponent(Graphics);
        g.strokeColor = color;
        g.lineWidth = 1.2;
        const blades = 3 + Math.floor(this.rng(x, y) * 3);
        for (let i = 0; i < blades; i++) {
            const center = (blades - 1) / 2;
            const offset = (i - center) * 2.5;
            const height = size * (0.66 + this.rng(x + y, i) * 0.42);
            const bend = (i - center) * 2.1;
            g.moveTo(offset, 0);
            g.quadraticCurveTo(offset + bend * 0.5, height * 0.48, offset + bend, height);
        }
        g.stroke();
        parent.addChild(patch);
    }

    private createSun(x: number, y: number): Node {
        const sun = new Node('Sun');
        sun.setPosition(x, y);

        const rays = new Node('SunRays');
        const rg = rays.addComponent(Graphics);
        rg.fillColor = new Color(255, 221, 94, 120);
        for (let i = 0; i < 14; i++) {
            const angle = (Math.PI * 2 * i) / 14;
            const half = 0.07;
            const inner = 38;
            const outer = i % 2 === 0 ? 57 : 51;
            rg.moveTo(Math.cos(angle - half) * inner, Math.sin(angle - half) * inner);
            rg.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            rg.lineTo(Math.cos(angle + half) * inner, Math.sin(angle + half) * inner);
            rg.close();
            rg.fill();
        }
        sun.addChild(rays);

        const glow = new Node('SunGlow');
        const gg = glow.addComponent(Graphics);
        gg.fillColor = new Color(255, 214, 72, 48);
        gg.circle(0, 0, 50);
        gg.fill();
        gg.fillColor = new Color(255, 226, 104, 72);
        gg.circle(0, 0, 42);
        gg.fill();
        sun.addChild(glow);

        const body = new Node('SunBody');
        const bg = body.addComponent(Graphics);
        bg.fillColor = new Color(255, 194, 42, 255);
        bg.circle(0, 0, 34);
        bg.fill();
        bg.fillColor = new Color(255, 218, 79, 255);
        bg.circle(-5, 6, 24);
        bg.fill();
        bg.fillColor = new Color(255, 242, 156, 185);
        bg.circle(-12, 13, 11);
        bg.fill();
        sun.addChild(body);

        return sun;
    }

    private createCloud(x: number, y: number, size: number) {
        const cloud = new Node('Cloud');
        cloud.setPosition(x, y);
        const g = cloud.addComponent(Graphics);
        g.fillColor = new Color(217, 243, 250, 62);
        g.roundRect(-size * 0.68, -size * 0.25, size * 1.36, size * 0.42, size * 0.2);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 160);
        g.roundRect(-size * 0.62, -size * 0.2, size * 1.24, size * 0.36, size * 0.18);
        g.fill();
        g.circle(-size * 0.38, -size * 0.02, size * 0.34);
        g.circle(-size * 0.08, size * 0.16, size * 0.42);
        g.circle(size * 0.34, size * 0.02, size * 0.33);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 72);
        g.circle(-size * 0.28, size * 0.15, size * 0.22);
        g.circle(size * 0.1, size * 0.24, size * 0.18);
        g.fill();
        this.node.addChild(cloud);
    }

    private createTopBar() {
        const vs = view.getVisibleSize();
        this.topBar = new Node('TopBar');
        this.topBar.setPosition(0, vs.height / 2 - 31);
        this.topBar.addComponent(UITransform).setContentSize(Design.WIDTH, 62);

        const bg = new Node('Bg');
        fillRoundRect(bg, Design.WIDTH + 8, 64, 0, new Color(70, 170, 76, 245));
        this.topBar.addChild(bg);

        const levelBadge = new Node('LevelBadge');
        levelBadge.setPosition(-124, 0);
        fillRoundRect(levelBadge, 70, 42, 20, new Color(84, 190, 86, 245));
        strokeRoundRect(levelBadge, 70, 42, 20, new Color(47, 135, 58, 105), 2);
        this.topBar.addChild(levelBadge);

        const expBg = new Node('ExpBg');
        expBg.setPosition(-27, -1);
        fillRoundRect(expBg, 108, 14, 8, new Color(45, 116, 55, 190));
        this.topBar.addChild(expBg);

        const level = this.makeLabel('Lv.1', 22, new Color(255, 255, 255), true, 0, 1, 64, 30);
        level.name = 'LevelText';
        levelBadge.addChild(level);

        const expFill = new Node('ExpFill');
        expFill.name = 'ExpFill';
        expFill.setPosition(-50, 0);
        expBg.addChild(expFill);

        const expText = this.makeLabel('0/100', 11, new Color(255, 255, 255), false, 0, 0, 70, 14);
        expText.name = 'ExpText';
        expBg.addChild(expText);
        this.createCurrencyArea();

        this.node.addChild(this.topBar);
    }

    private createCurrencyArea() {
        const holder = new Node('CurrencyArea');
        holder.setPosition(96, 0);
        holder.addComponent(UITransform).setContentSize(124, 30);
        fillRoundRect(holder, 124, 30, 15, new Color(55, 145, 63, 220));
        this.topBar.addChild(holder);

        this.createCurrencyEntry(holder, 'gold', 'GoldDisplay', '200', -32, new Color(255, 217, 59));
        this.createCurrencyEntry(holder, 'diamond', 'DiamondDisplay', '50', 30, new Color(255, 144, 205));
    }

    private createCurrencyEntry(parent: Node, icon: string, labelName: string, value: string, x: number, color: Color) {
        const iconNode = new Node(`${icon}Icon`);
        iconNode.addComponent(UITransform).setContentSize(22, 22);
        iconNode.setPosition(x - 20, 0);
        parent.addChild(iconNode);
        this.applyUiIcon(icon, iconNode);

        const label = this.makeLabel(value, 14, color, true, x + 8, -1, 38, 20);
        label.name = labelName;
        parent.addChild(label);
    }

    private createLandArea() {
        this.landRoot = new Node('LandRoot');
        const size = this.getLandGridSize();
        this.landRoot.addComponent(UITransform).setContentSize(size.width, size.height);
        this.layoutLandArea();
        this.node.addChild(this.landRoot);
    }

    private layoutLandArea() {
        if (!this.landRoot) return;

        const vs = view.getVisibleSize();
        const grid = this.getLandGridSize();
        const grassTopY = vs.height * 0.14;
        const topLimit = grassTopY - 12;
        const navTop = -vs.height / 2 + 32 + MainUI.BOTTOM_NAV_HEIGHT / 2;
        const bottomLimit = navTop + 14;
        const availableH = Math.max(240, topLimit - bottomLimit);
        const availableW = Math.max(Design.WIDTH - 42, 220);
        const scale = Math.min(1, availableW / grid.width, availableH / grid.height);
        const centerY = (topLimit + bottomLimit) / 2;

        this.landRoot.setPosition(0, centerY);
        this.landRoot.setScale(new Vec3(scale, scale, 1));
    }

    private getLandGridSize(): { width: number; height: number } {
        return {
            width: MainUI.LAND_COLS * MainUI.TILE_SIZE + (MainUI.LAND_COLS - 1) * MainUI.TILE_GAP,
            height: MainUI.LAND_ROWS * MainUI.TILE_SIZE + (MainUI.LAND_ROWS - 1) * MainUI.TILE_GAP,
        };
    }

    private createBottomNav() {
        const vs = view.getVisibleSize();
        const nav = new Node('BottomNav');
        nav.setPosition(0, -vs.height / 2 + 32);
        fillRoundRect(nav, Design.WIDTH + 8, 66, 12, new Color(60, 154, 65, 245));
        this.node.addChild(nav);

        const buttons: Array<{ name: string; icon: string; panel: PanelName }> = [
            { name: '背包', icon: 'bag', panel: 'inventory' },
            { name: '合成', icon: 'gear', panel: 'craft' },
            { name: '商店', icon: 'shop', panel: 'shop' },
            { name: '图鉴', icon: 'catalog', panel: 'quest' },
        ];

        const slotW = Design.WIDTH / buttons.length;
        buttons.forEach((item, index) => {
            const btn = new Node(`Nav_${item.panel}`);
            btn.addComponent(UITransform).setContentSize(74, 48);
            btn.setPosition(-Design.WIDTH / 2 + slotW * index + slotW / 2, 1);
            fillRoundRect(btn, 74, 46, 9, new Color(76, 181, 78, 235));

            const icon = new Node('Icon');
            icon.addComponent(UITransform).setContentSize(22, 22);
            icon.setPosition(0, 9);
            this.applyUiIcon(item.icon, icon);
            btn.addChild(icon);

            const navLabels: Record<PanelName, string> = { inventory: '背包', craft: '合成', shop: '商店', quest: '任务' };
            const displayName = item.panel === 'quest' ? '图鉴' : navLabels[item.panel];
            const label = this.makeLabel(displayName, 10, new Color(255, 255, 255), true, 0, -15, 66, 16);
            btn.addChild(label);

            btn.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.showPanel(item.panel));
            nav.addChild(btn);
        });
    }

    private createPanels() {
        this.panels.inventory = this.createPanel('背包仓库', 318, 398);
        this.panels.craft = this.createPanel('合成工坊', 318, 398);
        this.panels.shop = this.createPanel('集市商店', 318, 398);
        this.panels.quest = this.createPanel('图鉴', 318, 398);
        for (const panel of [this.panels.inventory, this.panels.craft, this.panels.shop, this.panels.quest]) {
            if (!panel) continue;
            panel.active = false;
            this.node.addChild(panel);
        }
    }

    private createPanel(title: string, w: number, h: number): Node {
        const panel = new Node(`Panel_${title}`);
        panel.setPosition(0, -55);
        panel.addComponent(UITransform).setContentSize(w, h);
        fillRoundRect(panel, w, h, 14, new Color(255, 250, 230, 252));
        strokeRoundRect(panel, w, h, 14, new Color(124, 184, 105, 160), 2);
        panel.addComponent(Button);

        const close = new Node('Close');
        close.addComponent(UITransform).setContentSize(32, 32);
        close.setPosition(w / 2 - 24, h / 2 - 24);
        fillRoundRect(close, 28, 28, 14, new Color(232, 238, 219, 255));
        const x = this.makeLabel('x', 18, new Color(92, 104, 82), true, 0, 1, 28, 28);
        close.addChild(x);
        close.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { panel.active = false; });
        panel.addChild(close);

        return panel;
    }

    private createDialogRoot() {
        this.dialogRoot = new Node('DialogRoot');
        this.dialogRoot.active = false;
        this.node.addChild(this.dialogRoot);
    }

    private createBubbleRoot() {
        this.bubbleRoot = new Node('BubbleRoot');
        this.node.addChild(this.bubbleRoot);
    }

    // Land
    private refreshLand() {
        this.layoutLandArea();
        this.ensureLandCountForLevel();
        this.landTiles.forEach(tile => tile.destroy());
        this.landTiles = [];

        const blocks = LandSystem.getInstance().getAllBlocks();
        const totalSlots = Math.min(GameValues.MAX_LAND, MainUI.LAND_COLS * MainUI.LAND_ROWS);
        for (let index = 0; index < totalSlots; index++) {
            const block = blocks[index];
            const tile = block ? this.createLandTile(block) : this.createLockedTile(index);
            const pos = this.getLandPosition(index);
            tile.setPosition(pos.x, pos.y);
            this.landRoot.addChild(tile);
            this.landTiles.push(tile);
        }
    }

    private refreshLandBlock(blockId: number) {
        const index = this.landTiles.findIndex(tile => tile.name === `Land_${blockId}`);
        const block = LandSystem.getInstance().getBlock(blockId);
        if (index < 0 || !block) return;

        const oldTile = this.landTiles[index];
        const newTile = this.createLandTile(block);
        newTile.setPosition(oldTile.position);
        oldTile.removeFromParent();
        oldTile.destroy();
        this.landRoot.addChild(newTile);
        newTile.setSiblingIndex(index);
        this.landTiles[index] = newTile;
    }

    private animateUnlockLand(index: number) {
        const block = LandSystem.getInstance().getBlock(index);
        const oldTile = this.landTiles[index];
        if (!block || !oldTile) {
            this.refreshLand();
            return;
        }

        const newTile = this.createLandTile(block);
        newTile.setPosition(oldTile.position);
        newTile.scale = new Vec3(0, 1, 1);
        oldTile.addComponent(Button).interactable = false;
        this.landRoot.addChild(newTile);
        newTile.setSiblingIndex(index + 1);

        tween(oldTile)
            .to(0.16, { scale: new Vec3(0, 1, 1) }, { easing: 'quadIn' })
            .call(() => {
                oldTile.removeFromParent();
                oldTile.destroy();
                this.landTiles[index] = newTile;
            })
            .start();

        tween(newTile)
            .delay(0.12)
            .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private updateGrowingProgress(blockId: number, progress: number) {
        const tile = this.landTiles.find(tile => tile.name === `Land_${blockId}`);
        const water = tile?.getChildByName('WaterProgress');
        if (!tile || !water) {
            this.refreshLandBlock(blockId);
            return;
        }
        this.drawWaterProgress(water, progress);
    }

    private createLandTile(block: LandBlock): Node {
        const tile = new Node(`Land_${block.id}`);
        tile.addComponent(UITransform).setContentSize(MainUI.TILE_SIZE, MainUI.TILE_SIZE);

        const stateColor: Record<string, Color> = {
            empty: new Color(143, 117, 78, 235),
            growing: new Color(143, 117, 78, 235),
            harvesting: new Color(235, 188, 70, 245),
            occupied: new Color(130, 115, 95, 235),
        };
        this.drawTileBase(tile, stateColor[block.state] || stateColor.empty);

        if ((block.state === 'growing' || block.state === 'harvesting') && block.cropType) {
            const cropIcon = this.createItemIcon(block.cropType, block.state === 'harvesting' ? 52 : 46);
            cropIcon.name = 'CropIcon';
            cropIcon.setPosition(0, 6);
            tile.addChild(cropIcon);
            if (block.state === 'growing') {
                tile.addChild(this.createWaterProgress(block.progress));
            }
        } else if (block.state === 'occupied') {
            this.drawOccupiedMarker(tile);
        }

        if (block.state === 'harvesting') {
            const ring = new Node('HarvestRing');
            ring.setPosition(0, 2);
            const g = ring.addComponent(Graphics);
            g.strokeColor = new Color(255, 244, 138, 220);
            g.lineWidth = 3;
            g.roundRect(-31, -31, 62, 62, 8);
            g.stroke();
            tile.addChild(ring);
        }

        tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.handleLandClick(block.id));
        return tile;
    }

    private createLockedTile(index: number): Node {
        const tile = new Node(`Locked_${index}`);
        tile.addComponent(UITransform).setContentSize(MainUI.TILE_SIZE, MainUI.TILE_SIZE);
        this.drawTileBase(tile, new Color(92, 145, 80, 225), true);

        tile.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.handleLockedLandClick(index));
        return tile;
    }

    private drawTileBase(tile: Node, color: Color, locked = false) {
        const shadow = new Node('Shadow');
        shadow.setPosition(3, -3);
        fillRoundRect(shadow, MainUI.TILE_SIZE - 2, MainUI.TILE_SIZE - 2, 9, new Color(44, 40, 28, 75));
        tile.addChild(shadow);

        const base = new Node('Base');
        base.setPosition(0, 1);
        fillRoundRect(base, MainUI.TILE_SIZE - 2, MainUI.TILE_SIZE - 2, 9, new Color(Math.max(color.r - 42, 0), Math.max(color.g - 42, 0), Math.max(color.b - 32, 0), color.a));
        tile.addChild(base);

        const face = new Node('Face');
        face.setPosition(0, 3);
        fillRoundRect(face, MainUI.TILE_SIZE - 7, MainUI.TILE_SIZE - 7, 7, color);
        strokeRoundRect(face, MainUI.TILE_SIZE - 7, MainUI.TILE_SIZE - 7, 7, locked ? new Color(92, 168, 76, 120) : new Color(104, 81, 50, 120), 1.5);
        tile.addChild(face);

        const detail = new Node('Detail');
        detail.setPosition(0, 3);
        const g = detail.addComponent(Graphics);
        g.fillColor = locked ? new Color(66, 156, 58, 105) : new Color(82, 64, 39, 100);
        for (let i = 0; i < 14; i++) {
            const px = (this.rng(Number(tile.name.replace(/\D/g, '')) || 1, i * 3) - 0.5) * 48;
            const py = (this.rng(Number(tile.name.replace(/\D/g, '')) || 1, i * 3 + 1) - 0.5) * 48;
            g.circle(px, py, 1.3 + this.rng(i + 1, i + 7) * 2.2);
            g.fill();
        }
        tile.addChild(detail);
    }

    private drawOccupiedMarker(tile: Node) {
        const marker = new Node('OccupiedMarker');
        marker.setPosition(0, 2);
        const g = marker.addComponent(Graphics);
        g.fillColor = new Color(112, 94, 72, 210);
        g.roundRect(-16, -10, 32, 22, 4);
        g.fill();
        g.fillColor = new Color(154, 124, 82, 235);
        g.moveTo(-19, 1);
        g.lineTo(0, 17);
        g.lineTo(19, 1);
        g.close();
        g.fill();
        g.fillColor = new Color(82, 64, 48, 230);
        g.roundRect(-4, -10, 8, 12, 2);
        g.fill();
        tile.addChild(marker);
    }

    private createWaterProgress(progress: number): Node {
        const node = new Node('WaterProgress');
        node.addComponent(UITransform).setContentSize(MainUI.TILE_SIZE, MainUI.TILE_SIZE);
        node.setPosition(0, 3);
        this.drawWaterProgress(node, progress);
        return node;
    }

    private drawWaterProgress(node: Node, progress: number) {
        const g = node.getComponent(Graphics) || node.addComponent(Graphics);
        g.clear();
        const pct = Math.max(0, Math.min(100, progress)) / 100;
        const radius = 31;

        g.strokeColor = new Color(96, 160, 220, 72);
        g.lineWidth = 4;
        g.arc(0, 0, radius, 0, Math.PI * 2, false);
        g.stroke();

        if (pct <= 0) return;
        const start = Math.PI / 2;
        const end = start - Math.PI * 2 * pct;
        g.strokeColor = new Color(78, 188, 246, 230);
        g.lineWidth = 5;
        g.arc(0, 0, radius, start, end, true);
        g.stroke();

        const capRadius = 2.5;
        g.fillColor = new Color(78, 188, 246, 230);
        g.circle(Math.cos(start) * radius, Math.sin(start) * radius, capRadius);
        g.circle(Math.cos(end) * radius, Math.sin(end) * radius, capRadius);
        g.fill();

        const particleCount = Math.min(5, Math.max(1, Math.floor(pct * 5)));
        g.fillColor = new Color(136, 224, 255, 165);
        for (let i = 0; i < particleCount; i++) {
            const t = (i + 0.55) / (particleCount + 0.8);
            const angle = start - Math.PI * 2 * pct * t;
            const pr = radius + (i % 2 === 0 ? 6 : -6);
            g.circle(Math.cos(angle) * pr, Math.sin(angle) * pr, 1.2 + (i % 2) * 0.35);
        }
        g.fill();
    }

    private animatePlanting(blockId: number) {
        const tile = this.landTiles.find(tile => tile.name === `Land_${blockId}`);
        if (!tile) return;

        const cropIcon = tile.getChildByName('CropIcon');
        if (cropIcon) {
            cropIcon.setScale(new Vec3(0.28, 0.28, 1));
            cropIcon.setPosition(0, -12);
            tween(cropIcon)
                .to(0.18, { position: new Vec3(0, 9, 0), scale: new Vec3(1.18, 1.18, 1) }, { easing: 'backOut' })
                .to(0.1, { position: new Vec3(0, 5, 0), scale: new Vec3(0.96, 0.96, 1) }, { easing: 'quadOut' })
                .to(0.12, { position: new Vec3(0, 6, 0), scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }

        const pulse = new Node('PlantPulse');
        pulse.setPosition(0, 3);
        pulse.setScale(new Vec3(0.58, 0.58, 1));
        const g = pulse.addComponent(Graphics);
        g.strokeColor = new Color(78, 188, 246, 205);
        g.lineWidth = 5;
        g.circle(0, 0, 30);
        g.stroke();
        tile.addChild(pulse);

        tween(pulse)
            .to(0.28, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'quadOut' })
            .call(() => pulse.destroy())
            .start();

        const burst = new Node('WaterBurst');
        burst.setPosition(0, 3);
        burst.setScale(new Vec3(0.72, 0.72, 1));
        const bg = burst.addComponent(Graphics);
        bg.fillColor = new Color(136, 224, 255, 185);
        for (let i = 0; i < 9; i++) {
            const angle = Math.PI / 2 - (Math.PI * 2 * i) / 9;
            const radius = 24 + (i % 3) * 4;
            bg.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.2 + (i % 2) * 0.45);
        }
        bg.fill();
        tile.addChild(burst);
        tween(burst)
            .to(0.32, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'quadOut' })
            .call(() => burst.destroy())
            .start();

        const soilRipple = new Node('SoilRipple');
        soilRipple.setPosition(0, -2);
        soilRipple.setScale(new Vec3(0.72, 0.72, 1));
        const rg = soilRipple.addComponent(Graphics);
        rg.strokeColor = new Color(114, 96, 62, 95);
        rg.lineWidth = 3;
        rg.roundRect(-23, -12, 46, 24, 12);
        rg.stroke();
        tile.addChild(soilRipple);
        tween(soilRipple)
            .to(0.24, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
            .call(() => soilRipple.destroy())
            .start();

        const water = tile.getChildByName('WaterProgress');
        if (water) {
            water.setScale(new Vec3(0.86, 0.86, 1));
            tween(water)
                .to(0.24, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    private getLandPosition(index: number): { x: number; y: number } {
        const col = index % MainUI.LAND_COLS;
        const row = Math.floor(index / MainUI.LAND_COLS);
        const totalW = MainUI.LAND_COLS * MainUI.TILE_SIZE + (MainUI.LAND_COLS - 1) * MainUI.TILE_GAP;
        const totalH = MainUI.LAND_ROWS * MainUI.TILE_SIZE + (MainUI.LAND_ROWS - 1) * MainUI.TILE_GAP;
        return {
            x: -totalW / 2 + col * (MainUI.TILE_SIZE + MainUI.TILE_GAP) + MainUI.TILE_SIZE / 2,
            y: totalH / 2 - row * (MainUI.TILE_SIZE + MainUI.TILE_GAP) - MainUI.TILE_SIZE / 2,
        };
    }

    private ensureLandCountForLevel() {
        const land = LandSystem.getInstance();
        const target = this.getAutoUnlockedLandCount();
        if (land.getAllBlocks().length < target) land.expandBlocks(target);
    }

    private getAutoUnlockedLandCount(): number {
        const gm = GameManager.getInstance();
        let count = GameValues.INITIAL_LAND;
        const levels = Object.keys(GameValues.LAND_UNLOCK).map(Number).sort((a, b) => a - b);
        for (const lv of levels) {
            if (gm.playerLevel >= lv) count += GameValues.LAND_UNLOCK[lv];
        }
        return Math.min(count, GameValues.MAX_LAND);
    }

    private getNextLandUnlockLevel(index: number): number {
        const levels = Object.keys(GameValues.LAND_UNLOCK).map(Number).sort((a, b) => a - b);
        let count = GameValues.INITIAL_LAND;
        for (const lv of levels) {
            count += GameValues.LAND_UNLOCK[lv];
            if (index < count) return lv;
        }
        return 99;
    }

    // Actions
    private handleLandClick(blockId: number) {
        const land = LandSystem.getInstance();
        const block = land.getBlock(blockId);
        if (!block) return;

        if (block.state === 'empty') {
            if (this.selectedSeedId) {
                this.plantCrop(blockId, this.selectedSeedId);
            } else {
                this.openSeedBubble(blockId);
            }
            return;
        }

        if (block.state === 'growing') {
            this.showDialog(
                '作物生长中',
                `当前进度 ${Math.floor(block.progress)}%\n消耗 ${GameValues.SPEEDUP_DIAMOND} 钻石立即成熟`,
                [
                    { text: '取消', cb: () => {} },
                    { text: '加速', cb: () => {
                        const gm = GameManager.getInstance();
                        if (!gm.spendDiamond(GameValues.SPEEDUP_DIAMOND)) {
                            this.toast('钻石不足');
                            return;
                        }
                        land.speedUpCrop(blockId);
                        this.refreshTopBar();
                        this.refreshLandBlock(blockId);
                        this.toast('加速成功');
                    }},
                ],
            );
            return;
        }

        if (block.state === 'harvesting') {
            const cropId = land.harvestCrop(blockId);
            if (!cropId) return;
            const def = getItem(cropId);
            const count = def?.harvestCount ?? 1;
            InventorySystem.getInstance().addItem(cropId, count);
            GameManager.getInstance().addExperience(5);
            this.toast(`收获 ${this.itemName(cropId)} x${count}`);
            this.refreshTopBar();
            this.refreshLandBlock(blockId);
            if (this.panels.inventory?.active) this.renderInventoryPanel();
            return;
        }

        this.toast('这块田地暂时被占用');
    }

    private handleLockedLandClick(index: number) {
        const land = LandSystem.getInstance();
        const gm = GameManager.getInstance();
        const currentCount = land.getAllBlocks().length;
        const unlockIndex = currentCount;
        const maxVisibleLand = Math.min(GameValues.MAX_LAND, MainUI.LAND_COLS * MainUI.LAND_ROWS);

        if (unlockIndex >= maxVisibleLand) {
            this.toast('田地已全部解锁');
            return;
        }

        const needLevel = this.getNextLandUnlockLevel(unlockIndex);
        if (gm.playerLevel >= needLevel) {
            this.suppressNextLandExpandedRefresh = true;
            land.expandBlocks(unlockIndex + 1);
            this.toast('新田地解锁');
            this.animateUnlockLand(unlockIndex);
            return;
        }

        this.showDialog(
            '扩建田地',
            `Lv.${needLevel} 自动解锁\n也可消耗 ${MainUI.LAND_UNLOCK_DIAMOND} 钻石提前扩建`,
            [
                { text: '稍后', cb: () => {} },
                { text: '扩建', cb: () => {
                    if (!gm.spendDiamond(MainUI.LAND_UNLOCK_DIAMOND)) {
                        this.toast('钻石不足');
                        return;
                    }
                    this.suppressNextLandExpandedRefresh = true;
                    land.expandBlocks(unlockIndex + 1);
                    this.refreshTopBar();
                    this.animateUnlockLand(unlockIndex);
                    this.toast('扩建成功');
                }},
            ],
        );
    }

    private plantCrop(blockId: number, cropId: string) {
        const inv = InventorySystem.getInstance();
        if (!inv.hasItems(cropId, 1)) {
            this.selectedSeedId = null;
            this.toast('种子不足');
            return;
        }
        if (!LandSystem.getInstance().plantCrop(blockId, cropId)) {
            this.toast('这块田不能种植');
            return;
        }
        inv.removeItem(cropId, 1);
        this.selectedSeedId = null;
        this.closeSeedBubble();
        this.toast('种植成功');
        this.refreshLandBlock(blockId);
        this.animatePlanting(blockId);
        if (this.panels.inventory?.active) this.renderInventoryPanel();
    }

    private ownedPlantableCrops(): ItemDef[] {
        const gm = GameManager.getInstance();
        const inv = InventorySystem.getInstance();
        return getPlantableCrops().filter(c => c.unlockLevel <= gm.playerLevel && inv.hasItems(c.id, 1));
    }

    private openSeedBubble(blockId: number) {
        const crops = this.ownedPlantableCrops();
        if (crops.length === 0) {
            this.toast('没有种子，去商店购买');
            this.showPanel('shop');
            return;
        }

        this.closeSeedBubble();
        this.activeBubbleLandId = blockId;

        const mask = new Node('BubbleMask');
        mask.addComponent(UITransform).setContentSize(Design.WIDTH, view.getVisibleSize().height);
        fillRect(mask, Design.WIDTH, view.getVisibleSize().height, new Color(0, 0, 0, 0));
        mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.scheduleOnce(() => this.closeSeedBubble(), 0));
        this.bubbleRoot.addChild(mask);

        const itemSize = 54;
        const cols = Math.min(3, crops.length);
        const rows = Math.ceil(crops.length / cols);
        const gap = 6;
        const w = cols * itemSize + (cols - 1) * gap + 18;
        const h = rows * itemSize + (rows - 1) * gap + 20;
        const landPos = this.getLandPosition(blockId);

        const bubble = new Node('SeedBubble');
        bubble.addComponent(UITransform).setContentSize(w, h);
        bubble.setPosition(Design.WIDTH / 2 - w / 2 - 12, this.landRoot.position.y + landPos.y * this.landRoot.scale.y);
        fillRoundRect(bubble, w, h, 12, new Color(255, 250, 231, 250));
        strokeRoundRect(bubble, w, h, 12, new Color(118, 184, 96, 170), 2);
        bubble.on(Node.EventType.TOUCH_END, (event: any) => event?.stopPropagation?.());
        this.bubbleRoot.addChild(bubble);

        const startX = -w / 2 + itemSize / 2 + 9;
        const startY = h / 2 - itemSize / 2 - 10;
        crops.forEach((crop, index) => {
            const cell = new Node(`Seed_${crop.id}`);
            cell.addComponent(UITransform).setContentSize(itemSize, itemSize);
            cell.setPosition(startX + (index % cols) * (itemSize + gap), startY - Math.floor(index / cols) * (itemSize + gap));
            fillRoundRect(cell, itemSize, itemSize, 10, new Color(236, 247, 226, 245));
            strokeRoundRect(cell, itemSize, itemSize, 10, new Color(140, 200, 120, 120), 1);

            const icon = this.createItemIcon(crop.id, 38);
            icon.setPosition(0, 6);
            cell.addChild(icon);
            cell.addChild(this.makeLabel(this.itemName(crop.id), 9, new Color(50, 78, 44), false, 0, -20, itemSize - 4, 12));

            cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
                const target = this.activeBubbleLandId;
                this.scheduleOnce(() => {
                    if (target >= 0) this.plantCrop(target, crop.id);
                }, 0);
            });
            bubble.addChild(cell);
        });

        bubble.scale = new Vec3(0.7, 0.7, 1);
        tween(bubble).to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    private closeSeedBubble() {
        this.bubbleRoot.removeAllChildren();
        this.activeBubbleLandId = -1;
    }

    // Panels
    private showPanel(name: PanelName) {
        this.closeSeedBubble();
        if (this.panels.inventory) this.panels.inventory.active = name === 'inventory';
        if (this.panels.craft) this.panels.craft.active = name === 'craft';
        if (this.panels.shop) this.panels.shop.active = name === 'shop';
        if (this.panels.quest) this.panels.quest.active = name === 'quest';

        if (name === 'inventory') this.renderInventoryPanel();
        if (name === 'craft') this.renderCraftPanel();
        if (name === 'shop') this.renderShopPanel();
        if (name === 'quest') this.renderQuestPanel();
    }

    private clearPanelBody(panel: Node): Node {
        const old = panel.getChildByName('Body');
        if (old) {
            old.removeFromParent();
            old.destroy();
        }
        const body = new Node('Body');
        body.addComponent(UITransform).setContentSize(288, 360);
        body.setPosition(0, -8);
        panel.addChild(body);
        return body;
    }

    private renderInventoryPanel() {
        const panel = this.panels.inventory!;
        const body = this.clearPanelBody(panel);
        const inv = InventorySystem.getInstance();
        const usage = inv.getUsage();

        const info = this.makeLabel(`容量 ${usage.used}/${usage.max}`, 13, new Color(92, 104, 82), false, -100, 152, 120, 20);
        body.addChild(info);

        const slots = inv.slots.slice(0, inv.maxSlots);
        const cellSize = 48;
        const cols = 5;
        slots.forEach((slot, index) => {
            const x = -112 + (index % cols) * 56;
            const y = 112 - Math.floor(index / cols) * 58;
            const cell = new Node(`Slot_${index}`);
            cell.addComponent(UITransform).setContentSize(cellSize, cellSize);
            cell.setPosition(x, y);
            fillRoundRect(cell, cellSize, cellSize, 8, slot.itemId ? new Color(246, 250, 236, 255) : new Color(225, 235, 218, 220));
            strokeRoundRect(cell, cellSize, cellSize, 8, new Color(160, 190, 145, 130), 1);

            if (slot.itemId) {
                const icon = this.createItemIcon(slot.itemId, 36);
                icon.setPosition(0, 4);
                cell.addChild(icon);

                const badge = new Node('CountBadge');
                badge.setPosition(13, -15);
                badge.addComponent(UITransform).setContentSize(28, 15);
                fillRoundRect(badge, 28, 15, 7, new Color(54, 112, 55, 225));
                const countLabel = this.makeLabel(`x${slot.count}`, 10, new Color(255, 255, 255), true, 0, 0, 26, 13);
                badge.addChild(countLabel);
                cell.addChild(badge);
                cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.openSellDialog(index));
            }
            body.addChild(cell);
        });
    }

    private renderShopPanel() {
        this.renderShopPanelScrollable();
        return;

        const panel = this.panels.shop!;
        const body = this.clearPanelBody(panel);
        const gm = GameManager.getInstance();
        const crops = getPlantableCrops().filter(c => c.unlockLevel <= gm.playerLevel + 2).slice(0, 8);

        crops.forEach((crop, index) => {
            const y = 128 - index * 38;
            const row = new Node(`Shop_${crop.id}`);
            row.addComponent(UITransform).setContentSize(276, 34);
            row.setPosition(0, y);
            const unlocked = crop.unlockLevel <= gm.playerLevel;
            fillRoundRect(row, 276, 34, 8, unlocked ? new Color(248, 252, 238, 245) : new Color(222, 226, 216, 235));
            strokeRoundRect(row, 276, 34, 8, new Color(154, 196, 138, 120), 1);

            const icon = this.createItemIcon(crop.id, 28);
            icon.setPosition(-120, 0);
            row.addChild(icon);
            const name = this.makeLabel(`${this.itemName(crop.id)} Lv.${crop.unlockLevel}`, 13, new Color(54, 72, 46), true, -60, 7, 105, 16);
            name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(name);
            const price = this.makeLabel(`${Math.max(5, Math.floor(crop.sellPrice * 0.8))}金`, 11, new Color(194, 132, 20), false, -60, -9, 86, 14);
            price.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(price);

            const buy = new Node('Buy');
            buy.addComponent(UITransform).setContentSize(62, 26);
            buy.setPosition(103, 0);
            fillRoundRect(buy, 62, 26, 9, unlocked ? new Color(76, 188, 83) : new Color(165, 170, 160));
            buy.addChild(this.makeLabel(unlocked ? '购买' : '未解锁', 12, new Color(255, 255, 255), true, 0, 0, 60, 22));
            buy.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.buySeed(crop));
            row.addChild(buy);
            body.addChild(row);
        });
    }

    private renderShopPanelScrollable() {
        const panel = this.panels.shop!;
        const body = this.clearPanelBody(panel);
        const gm = GameManager.getInstance();
        const crops = getPlantableCrops()
            .filter(c => c.unlockLevel <= gm.playerLevel + 5)
            .sort((a, b) => a.unlockLevel === b.unlockLevel ? a.sellPrice - b.sellPrice : a.unlockLevel - b.unlockLevel);

        const viewportH = 336;
        const viewport = new Node('ShopViewport');
        viewport.addComponent(UITransform).setContentSize(284, viewportH);
        viewport.setPosition(0, -4);
        viewport.addComponent(Mask);
        body.addChild(viewport);

        const rowH = 48;
        const gap = 6;
        const contentH = Math.max(viewportH, crops.length * (rowH + gap) - gap + 8);
        const content = new Node('ShopContent');
        content.addComponent(UITransform).setContentSize(274, contentH);
        content.setPosition(0, 0);
        viewport.addChild(content);

        const scrollView = viewport.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;
        scrollView.content = content;

        crops.forEach((crop, index) => {
            const y = contentH / 2 - 4 - rowH / 2 - index * (rowH + gap);
            const row = new Node(`Shop_${crop.id}`);
            row.addComponent(UITransform).setContentSize(266, rowH);
            row.setPosition(-4, y);
            const unlocked = crop.unlockLevel <= gm.playerLevel;
            fillRoundRect(row, 266, rowH, 8, unlocked ? new Color(248, 252, 238, 245) : new Color(224, 228, 216, 232));
            strokeRoundRect(row, 266, rowH, 8, new Color(154, 196, 138, 120), 1);

            const icon = this.createItemIcon(crop.id, 34);
            icon.setPosition(-112, 0);
            row.addChild(icon);

            const name = this.makeLabel(`${this.itemName(crop.id)} Lv.${crop.unlockLevel}`, 12, new Color(54, 72, 46), true, -52, 8, 124, 16);
            name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(name);

            const price = this.getSeedBuyPrice(crop);
            const priceLabel = this.makeLabel(`${price} 金`, 10, new Color(194, 132, 20), false, -52, -9, 90, 14);
            priceLabel.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(priceLabel);

            const buy = new Node('Buy');
            buy.addComponent(UITransform).setContentSize(58, 26);
            buy.setPosition(101, 0);
            fillRoundRect(buy, 58, 26, 9, unlocked ? new Color(76, 188, 83) : new Color(165, 170, 160));
            buy.addChild(this.makeLabel(unlocked ? '购买' : '未解锁', 11, new Color(255, 255, 255), true, 0, 0, 54, 22));
            buy.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.buySeed(crop));
            row.addChild(buy);
            content.addChild(row);
        });

        const track = new Node('ShopScrollTrack');
        track.setPosition(140, -4);
        fillRoundRect(track, 4, viewportH, 2, new Color(167, 192, 145, 100));
        body.addChild(track);

        const thumbH = Math.max(34, viewportH * viewportH / contentH);
        const thumb = new Node('ShopScrollThumb');
        thumb.setPosition(0, (viewportH - thumbH) / 2);
        fillRoundRect(thumb, 4, thumbH, 2, new Color(105, 174, 86, 210));
        track.addChild(thumb);

        const syncThumb = () => {
            if (!thumb.isValid) return;
            const maxOffset = scrollView.getMaxScrollOffset().y;
            if (maxOffset <= 0) return;
            const ratio = Math.max(0, Math.min(1, scrollView.getScrollOffset().y / maxOffset));
            thumb.setPosition(0, (viewportH - thumbH) / 2 - ratio * (viewportH - thumbH));
        };
        scrollView.node.on(ScrollView.EventType.SCROLLING, syncThumb);
        scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, syncThumb);
        this.scheduleOnce(() => {
            if (!viewport.isValid || !content.isValid) return;
            scrollView.scrollToTop(0);
            syncThumb();
        }, 0);
    }

    private renderCraftPanel() {
        const panel = this.panels.craft!;
        const body = this.clearPanelBody(panel);
        const gm = GameManager.getInstance();
        const craft = CraftSystem.getInstance();
        const inv = InventorySystem.getInstance();
        const recipes = getRecipesByLevel(gm.playerLevel);
        const active = craft.getAllActiveCrafts();

        const status = this.makeLabel(`进行中 ${active.length}/${GameValues.MAX_CRAFT_TABLES}`, 12, new Color(92, 104, 82), false, -8, 152, 260, 20);
        status.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        body.addChild(status);

        const visibleActiveRows = Math.min(active.length, 1);
        active.slice(0, visibleActiveRows).forEach((process, index) => {
            const recipe = getRecipe(process.recipeId);
            if (!recipe) return;
            const y = 124 - index * 34;
            const row = new Node(`Crafting_${process.craftId}`);
            row.addComponent(UITransform).setContentSize(276, 30);
            row.setPosition(0, y);
            fillRoundRect(row, 276, 30, 8, new Color(238, 248, 232, 245));
            strokeRoundRect(row, 276, 30, 8, new Color(134, 190, 122, 125), 1);

            const icon = this.createItemIcon(recipe.product.itemId, 22);
            icon.setPosition(-118, 0);
            row.addChild(icon);

            const title = this.makeLabel(this.recipeName(recipe), 10, new Color(54, 72, 46), true, -48, 5, 120, 14);
            title.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(title);

            const progress = Math.max(0, Math.min(100, process.progress));
            const barBg = new Node('CraftProgressBg');
            barBg.setPosition(-8, -8);
            fillRoundRect(barBg, 124, 7, 4, new Color(184, 210, 172, 180));
            row.addChild(barBg);
            const barFill = new Node('CraftProgressFill');
            const fillW = Math.max(4, 124 * progress / 100);
            barFill.setPosition(-62 + fillW / 2, 0);
            fillRoundRect(barFill, fillW, 7, 4, new Color(78, 188, 214, 235));
            barBg.addChild(barFill);

            const percent = this.makeLabel(`${Math.floor(progress)}%`, 10, new Color(76, 166, 78), true, 106, 0, 46, 16);
            percent.name = 'CraftProgressText';
            row.addChild(percent);
            body.addChild(row);
        });

        if (active.length > visibleActiveRows) {
            const more = this.makeLabel(`还有 ${active.length - visibleActiveRows} 个合成中`, 10, new Color(92, 104, 82), false, -8, 102, 180, 16);
            more.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            body.addChild(more);
        }

        const recipeTop = active.length > 0 ? 88 : 112;
        const recipeBottom = -154;
        const recipeViewportH = Math.max(90, recipeTop - recipeBottom);
        const recipeViewport = new Node('CraftRecipeViewport');
        recipeViewport.addComponent(UITransform).setContentSize(284, recipeViewportH);
        recipeViewport.setPosition(0, recipeBottom + recipeViewportH / 2);
        recipeViewport.addComponent(Mask);
        body.addChild(recipeViewport);

        const rowH = 48;
        const gap = 6;
        const contentH = Math.max(recipeViewportH, recipes.length * (rowH + gap) - gap + 8);
        const content = new Node('CraftRecipeContent');
        content.addComponent(UITransform).setContentSize(274, contentH);
        recipeViewport.addChild(content);

        const scrollView = recipeViewport.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;
        scrollView.content = content;

        recipes.forEach((recipe, index) => {
            const y = contentH / 2 - 4 - rowH / 2 - index * (rowH + gap);
            const row = new Node(`Recipe_${recipe.id}`);
            row.addComponent(UITransform).setContentSize(276, rowH);
            row.setPosition(0, y);
            fillRoundRect(row, 276, rowH, 8, new Color(248, 252, 238, 245));
            strokeRoundRect(row, 276, rowH, 8, new Color(154, 196, 138, 120), 1);

            const productIcon = this.createItemIcon(recipe.product.itemId, 28);
            productIcon.setPosition(-114, 0);
            row.addChild(productIcon);
            const name = this.makeLabel(`${this.recipeName(recipe)} x${recipe.product.count}`, 12, new Color(54, 72, 46), true, -18, 9, 128, 16);
            name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(name);
            const materialText = recipe.materials.map(m => `${this.itemName(m.itemId)} ${inv.getItemCount(m.itemId)}/${m.count}`).join(' ');
            const mats = this.makeLabel(materialText, 10, new Color(108, 112, 96), false, -18, -9, 128, 14);
            mats.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(mats);

            const start = new Node('Start');
            start.addComponent(UITransform).setContentSize(58, 28);
            start.setPosition(104, 0);
            fillRoundRect(start, 58, 28, 9, new Color(76, 188, 83));
            start.addChild(this.makeLabel('合成', 12, new Color(255, 255, 255), true, 0, 0, 54, 22));
            start.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => this.startCraft(recipe.id));
            row.addChild(start);
            content.addChild(row);
        });

        this.scheduleOnce(() => {
            if (!recipeViewport.isValid || !content.isValid) return;
            scrollView.scrollToTop(0);
        }, 0);
    }

    private renderQuestPanel() {
        const panel = this.panels.quest!;
        const body = this.clearPanelBody(panel);
        const gm = GameManager.getInstance();
        const inv = InventorySystem.getInstance();
        const land = LandSystem.getInstance();
        const items: ItemDef[] = [];
        for (const id in ITEM_DB) {
            if (Object.prototype.hasOwnProperty.call(ITEM_DB, id)) items.push(ITEM_DB[id]);
        }
        items.sort((a, b) => {
            const levelA = this.catalogLevel(a);
            const levelB = this.catalogLevel(b);
            if (levelA !== levelB) return levelA - levelB;
            if (a.rarity !== b.rarity) return a.rarity - b.rarity;
            return a.category - b.category;
        });

        const progress = gm.getCatalogProgress();
        const summary = this.makeLabel(`收集 ${progress.unlocked}/${progress.total}  成就 ${gm.achievements.length}`, 12, new Color(92, 104, 82), false, -94, 152, 190, 20);
        summary.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        body.addChild(summary);

        const viewportH = 316;
        const viewport = new Node('CatalogViewport');
        viewport.addComponent(UITransform).setContentSize(284, viewportH);
        viewport.setPosition(0, -12);
        viewport.addComponent(Mask);
        body.addChild(viewport);

        const rowH = 52;
        const gap = 6;
        const contentH = Math.max(viewportH, items.length * (rowH + gap) - gap + 8);
        const content = new Node('CatalogContent');
        content.addComponent(UITransform).setContentSize(274, contentH);
        viewport.addChild(content);

        const scrollView = viewport.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;
        scrollView.content = content;

        items.forEach((item, index) => {
            const y = contentH / 2 - 4 - rowH / 2 - index * (rowH + gap);
            const discovered = gm.hasDiscoveredItem(item.id);
            const levelUnlocked = item.unlockLevel <= gm.playerLevel;
            const row = new Node(`Catalog_${item.id}`);
            row.addComponent(UITransform).setContentSize(266, rowH);
            row.setPosition(-4, y);
            fillRoundRect(row, 266, rowH, 8, discovered ? new Color(248, 252, 238, 245) : new Color(224, 228, 216, 232));
            strokeRoundRect(row, 266, rowH, 8, new Color(154, 196, 138, 120), 1);

            const icon = this.createItemIcon(item.id, 32);
            icon.setPosition(-112, 0);
            row.addChild(icon);
            if (!discovered) icon.setScale(0.75, 0.75, 1);

            const name = this.makeLabel(`${discovered ? this.itemName(item.id) : '未发现'} Lv.${this.catalogLevel(item)}`, 12, new Color(54, 72, 46), true, -52, 11, 140, 16);
            name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(name);

            const own = inv.getItemCount(item.id);
            const plantText = item.isCrop ? ` 种植 ${land.getPlantCount(item.id)} 次` : '';
            const info = this.makeLabel(`拥有 ${own}${plantText}`, 10, new Color(108, 112, 96), false, -52, -6, 160, 14);
            info.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
            row.addChild(info);

            const rarity = this.makeLabel(discovered ? `${item.rarity}星` : (levelUnlocked ? '待获得' : '未解锁'), 10, discovered ? new Color(194, 132, 20) : new Color(150, 156, 140), true, 104, 0, 56, 18);
            row.addChild(rarity);
            content.addChild(row);
        });

        const track = new Node('CatalogScrollTrack');
        track.setPosition(140, -12);
        fillRoundRect(track, 4, viewportH, 2, new Color(167, 192, 145, 100));
        body.addChild(track);

        const thumbH = Math.max(34, viewportH * viewportH / contentH);
        const thumb = new Node('CatalogScrollThumb');
        thumb.setPosition(0, (viewportH - thumbH) / 2);
        fillRoundRect(thumb, 4, thumbH, 2, new Color(105, 174, 86, 210));
        track.addChild(thumb);

        const syncThumb = () => {
            if (!thumb.isValid) return;
            const maxOffset = scrollView.getMaxScrollOffset().y;
            if (maxOffset <= 0) return;
            const ratio = Math.max(0, Math.min(1, scrollView.getScrollOffset().y / maxOffset));
            thumb.setPosition(0, (viewportH - thumbH) / 2 - ratio * (viewportH - thumbH));
        };
        scrollView.node.on(ScrollView.EventType.SCROLLING, syncThumb);
        scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, syncThumb);
        this.scheduleOnce(() => {
            if (!viewport.isValid || !content.isValid) return;
            scrollView.scrollToTop(0);
            syncThumb();
        }, 0);
    }

    private buySeed(crop: ItemDef) {
        const gm = GameManager.getInstance();
        if (crop.unlockLevel > gm.playerLevel) {
            this.toast(`Lv.${crop.unlockLevel} 解锁`);
            return;
        }
        const price = this.getSeedBuyPrice(crop);
        if (!gm.spendGold(price)) {
            this.toast('金币不足');
            return;
        }
        InventorySystem.getInstance().addItem(crop.id, 1);
        this.toast(`购买 ${this.itemName(crop.id)} x1`);
    }

    private getSeedBuyPrice(crop: ItemDef): number {
        return Math.max(crop.sellPrice, Math.ceil(crop.sellPrice * 1.2));
    }

    private startCraft(recipeId: string) {
        const id = CraftSystem.getInstance().startCraft(recipeId);
        if (id < 0) {
            this.toast('材料或等级不足');
            return;
        }
        this.toast('开始合成');
        return;
        if (id < 0) {
            this.toast('材料、金币或等级不足');
            return;
        }
        this.toast('开始合成');
    }

    private openSellDialog(slotIndex: number) {
        const inv = InventorySystem.getInstance();
        const slot = inv.slots[slotIndex];
        if (!slot || !slot.itemId || slot.count <= 0) {
            this.toast('物品数量不足');
            return;
        }

        const itemId = slot.itemId;
        const def = getItem(itemId);
        if (!def || def.sellPrice <= 0) {
            this.toast('该物品不能出售');
            return;
        }
        const count = slot.count;
        if (count <= 0) {
            this.toast('物品数量不足');
            return;
        }

        this.dialogRoot.removeAllChildren();
        this.dialogRoot.active = true;

        const vs = view.getVisibleSize();
        const mask = new Node('Mask');
        mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
        fillRect(mask, Design.WIDTH, vs.height, new Color(0, 0, 0, 120));
        mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { this.dialogRoot.active = false; });
        this.dialogRoot.addChild(mask);

        const dialog = new Node('SellDialog');
        dialog.addComponent(UITransform).setContentSize(286, 232);
        fillRoundRect(dialog, 286, 232, 16, new Color(255, 250, 230, 255));
        strokeRoundRect(dialog, 286, 232, 16, new Color(124, 184, 105, 160), 2);
        this.dialogRoot.addChild(dialog);

        dialog.addChild(this.makeLabel(`出售 ${this.itemName(itemId)}`, 17, new Color(52, 72, 45), true, 0, 84, 230, 26));

        const icon = this.createItemIcon(itemId, 38);
        icon.setPosition(-94, 42);
        dialog.addChild(icon);

        const owned = this.makeLabel(`拥有 ${count}    单价 ${def.sellPrice} 金`, 12, new Color(92, 104, 82), false, 18, 44, 176, 18);
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
            button.addChild(this.makeLabel(text, 20, new Color(255, 255, 255), true, 0, 1, 30, 26));
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

        const displayNode = this.makeLabel('1', 16, new Color(54, 72, 46), true, 0, 0, 64, 28);
        displayNode.name = 'QuantityValue';
        quantityLabel = displayNode.getComponent(Label)!;
        inputNode.addChild(displayNode);
        dialog.addChild(inputNode);
        this.applyEditBoxTextColor(amountInput, new Color(54, 72, 46, 0), new Color(150, 156, 140, 0));

        makeStepper('Plus', '+', 72, () => setQuantity(selected + 1));

        const total = this.makeLabel(`合计 ${def.sellPrice} 金`, 13, new Color(194, 132, 20), true, 0, -38, 220, 20);
        totalLabel = total.getComponent(Label)!;
        dialog.addChild(total);

        const cancel = new Node('Cancel');
        cancel.addComponent(UITransform).setContentSize(88, 34);
        cancel.setPosition(-50, -78);
        fillRoundRect(cancel, 88, 34, 10, new Color(185, 190, 178));
        cancel.addChild(this.makeLabel('取消', 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
        cancel.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { this.dialogRoot.active = false; });
        dialog.addChild(cancel);

        const sell = new Node('Sell');
        sell.addComponent(UITransform).setContentSize(88, 34);
        sell.setPosition(50, -78);
        fillRoundRect(sell, 88, 34, 10, new Color(76, 188, 83));
        sell.addChild(this.makeLabel('出售', 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
        sell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
            const finalCount = Math.max(1, Math.min(count, Number(amountInput.string || selected)));
            if (!InventorySystem.getInstance().sellSlotItem(slotIndex, finalCount, gold => GameManager.getInstance().addGold(gold))) {
                this.toast('出售失败');
                return;
            }
            this.dialogRoot.active = false;
            this.toast(`获得 ${def.sellPrice * finalCount} 金`);
        });
        dialog.addChild(sell);

        dialog.scale = new Vec3(0.72, 0.72, 1);
        tween(dialog).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    private applyEditBoxTextColor(editBox: EditBox, color: Color, placeholderColor: Color) {
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
        this.scheduleOnce(apply, 0);
    }

    // Dialogs and feedback
    private showDialog(title: string, message: string, buttons: Array<{ text: string; cb: () => void }>) {
        this.dialogRoot.removeAllChildren();
        this.dialogRoot.active = true;

        const vs = view.getVisibleSize();
        const mask = new Node('Mask');
        mask.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
        fillRect(mask, Design.WIDTH, vs.height, new Color(0, 0, 0, 120));
        mask.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => { this.dialogRoot.active = false; });
        this.dialogRoot.addChild(mask);

        const dialog = new Node('Dialog');
        dialog.addComponent(UITransform).setContentSize(274, 184);
        fillRoundRect(dialog, 274, 184, 16, new Color(255, 250, 230, 255));
        strokeRoundRect(dialog, 274, 184, 16, new Color(124, 184, 105, 160), 2);
        this.dialogRoot.addChild(dialog);

        dialog.addChild(this.makeLabel(title, 17, new Color(52, 72, 45), true, 0, 58, 230, 26));
        const msg = this.makeLabel(message, 13, new Color(92, 104, 82), false, 0, 9, 230, 60);
        msg.getComponent(Label)!.lineHeight = 21;
        dialog.addChild(msg);

        const startX = -((buttons.length - 1) * 98) / 2;
        buttons.forEach((button, index) => {
            const node = new Node(`Button_${index}`);
            node.addComponent(UITransform).setContentSize(88, 34);
            node.setPosition(startX + index * 98, -58);
            fillRoundRect(node, 88, 34, 10, index === buttons.length - 1 ? new Color(76, 188, 83) : new Color(185, 190, 178));
            node.addChild(this.makeLabel(button.text, 13, new Color(255, 255, 255), true, 0, 0, 82, 24));
            node.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => {
                this.dialogRoot.active = false;
                button.cb();
            });
            dialog.addChild(node);
        });

        dialog.scale = new Vec3(0.72, 0.72, 1);
        tween(dialog).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    private toast(text: string) {
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
        node.addChild(this.makeLabel(text, 13, new Color(54, 86, 46), true, 8, 0, 166, 28));
        this.node.addChild(node);
        node.setScale(0.92, 0.92, 1);
        tween(node)
            .to(0.16, { position: new Vec3(0, targetY, 0), scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .delay(0.9)
            .to(0.18, { position: new Vec3(0, targetY + 20, 0), scale: new Vec3(0.94, 0.94, 1) })
            .call(() => node.destroy())
            .start();
    }

    // Refresh
    private bindEvents() {
        const evt = EventManager.getInstance();
        evt.on('goldChanged', () => this.refreshTopBar());
        evt.on('diamondChanged', () => this.refreshTopBar());
        evt.on('experienceChanged', () => this.refreshTopBar());
        evt.on('levelUp', () => this.refreshAll());
        evt.on('inventoryChanged', () => {
            if (this.panels.inventory?.active) this.renderInventoryPanel();
            if (this.panels.quest?.active) this.renderQuestPanel();
        });
        evt.on('craftStarted', () => {
            if (this.panels.craft?.active) this.renderCraftPanel();
        });
        evt.on('craftCompleted', (data: any) => {
            this.toast(`${this.recipeName(data.recipe)} 完成`);
            if (this.panels.craft?.active) this.renderCraftPanel();
            if (this.panels.inventory?.active) this.renderInventoryPanel();
            if (this.panels.quest?.active) this.renderQuestPanel();
        });
        evt.on('achievementUnlocked', () => {
            if (this.panels.quest?.active) this.renderQuestPanel();
        });
        evt.on('cropMatured', (data: any) => this.refreshLandBlock(data.blockId));
        evt.on('landExpanded', () => {
            if (this.suppressNextLandExpandedRefresh) {
                this.suppressNextLandExpandedRefresh = false;
                return;
            }
            this.refreshLand();
        });
    }

    private refreshAll() {
        this.refreshTopBar();
        this.refreshLand();
        if (this.panels.inventory?.active) this.renderInventoryPanel();
        if (this.panels.shop?.active) this.renderShopPanel();
        if (this.panels.craft?.active) this.renderCraftPanel();
        if (this.panels.quest?.active) this.renderQuestPanel();
    }

    private refreshTopBar() {
        const gm = GameManager.getInstance();
        const level = this.topBar.getChildByName('LevelBadge')?.getChildByName('LevelText');
        if (level) level.getComponent(Label)!.string = `Lv.${gm.playerLevel}`;
        const gold = this.topBar.getChildByName('CurrencyArea')?.getChildByName('GoldDisplay');
        if (gold) gold.getComponent(Label)!.string = gm.gold.toString();
        const diamond = this.topBar.getChildByName('CurrencyArea')?.getChildByName('DiamondDisplay');
        if (diamond) diamond.getComponent(Label)!.string = gm.diamond.toString();
        const expText = this.topBar.getChildByName('ExpBg')?.getChildByName('ExpText');
        if (expText) expText.getComponent(Label)!.string = `${gm.experience}/${gm.nextLevelExp}`;
        const fill = this.topBar.getChildByName('ExpBg')?.getChildByName('ExpFill');
        if (fill) {
            const width = Math.max(0, Math.min(100, 100 * gm.experience / gm.nextLevelExp));
            fillRoundRect(fill, width, 9, 5, new Color(255, 218, 72, 255));
            fill.setPosition(-50 + width / 2, 0);
        }
    }

    private updateCraftProgressViews() {
        const body = this.panels.craft?.getChildByName('Body');
        if (!body) return;

        for (const process of CraftSystem.getInstance().getAllActiveCrafts()) {
            const row = body.getChildByName(`Crafting_${process.craftId}`);
            if (!row) continue;
            const progress = Math.max(0, Math.min(100, process.progress));
            const barBg = row.getChildByName('CraftProgressBg');
            const barFill = barBg?.getChildByName('CraftProgressFill');
            if (barFill) {
                const fillW = Math.max(4, 124 * progress / 100);
                barFill.setPosition(-62 + fillW / 2, 0);
                fillRoundRect(barFill, fillW, 7, 4, new Color(78, 188, 214, 235));
            }
            const text = row.getChildByName('CraftProgressText');
            if (text) text.getComponent(Label)!.string = `${Math.floor(progress)}%`;
        }
    }

    private makeLabel(text: string, fontSize: number, color: Color, bold: boolean, x: number, y: number, w: number, h: number): Node {
        return createLabel(text, fontSize, color, bold, x, y, w, h);
    }

    private createItemIcon(itemId: string, size: number): Node {
        return createItemIcon(itemId, size);
    }

    private applyUiIcon(name: string, node: Node) {
        applyUiIcon(name, node);
    }

    private itemName(itemId: string): string {
        return getItemDisplayName(itemId);
    }

    private recipeName(recipe: RecipeDef | undefined): string {
        return getRecipeDisplayName(recipe);
    }

    private catalogLevel(item: ItemDef): number {
        switch (item.category) {
            case ItemCategory.CROP:
            case ItemCategory.PROCESSED:
            case ItemCategory.FOOD:
                return item.unlockLevel;
            case ItemCategory.BUILDING:
                return item.unlockLevel + 3;
            case ItemCategory.DECORATION:
                return item.unlockLevel + 4;
            case ItemCategory.TOOL:
                return item.unlockLevel + 5;
            case ItemCategory.SPECIAL:
                return item.unlockLevel + 6;
            case ItemCategory.AD_REWARD:
                return item.unlockLevel + 7;
            default:
                return item.unlockLevel;
        }
    }

    private categoryName(category: ItemCategory): string {
        switch (category) {
            case ItemCategory.CROP: return '农产品';
            case ItemCategory.PROCESSED: return '加工品';
            case ItemCategory.FOOD: return '料理';
            case ItemCategory.BUILDING: return '建筑';
            case ItemCategory.DECORATION: return '装饰';
            case ItemCategory.SPECIAL: return '特殊';
            case ItemCategory.TOOL: return '道具';
            case ItemCategory.AD_REWARD: return '广告';
            default: return '物品';
        }
    }

    private rng(seed: number, offset: number): number {
        return seededRandom(seed, offset);
    }

}
