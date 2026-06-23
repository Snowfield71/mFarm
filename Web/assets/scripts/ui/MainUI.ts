import { _decorator, Component, Node, Color, UITransform, Label, Button, Vec3, tween, Graphics, Sprite, view } from 'cc';
import { Design } from '../config/GameConfig';
import { GameManager } from '../core/GameManager';
import { EventManager } from '../core/EventManager';
import { InventorySystem } from '../systems/InventorySystem';
import { LandSystem, LandBlock } from '../systems/LandSystem';
import { CraftSystem } from '../systems/CraftSystem';
import { getItem, getPlantableCrops, ItemDef } from '../config/ItemConfig';
import { getRecipesByLevel } from '../config/RecipeConfig';
import { ImageCache } from '../utils/ImageCache';

const { ccclass } = _decorator;

// ===== 绘图工具函数 =====
function fillRect(node: Node, w: number, h: number, color: Color) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.fillColor = color;
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
}
function fillRoundRect(node: Node, w: number, h: number, r: number, color: Color) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.fillColor = color;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
}
function strokeRoundRect(node: Node, w: number, h: number, r: number, color: Color, lineW: number = 2) {
    const g = node.getComponent(Graphics) || node.addComponent(Graphics);
    g.strokeColor = color;
    g.lineWidth = lineW;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
}

@ccclass('MainUI')
export class MainUI extends Component {
    private topBar!: Node;
    private landContainer!: Node;
    private bottomNav!: Node;
    private inventoryPanel!: Node;
    private craftPanel!: Node;
    private shopPanel!: Node;
    private popupDialog!: Node;
    private landTiles: Node[] = [];
    private currentCropForPlanting: string | null = null;

    start() {
        this.createSkyBackground();
        this.createTopBar();
        this.createLandGrid();
        this.createGrassDecoration();
        this.createBottomNav();
        this.createPanels();
        this.createPopupDialog();
        this.bindEvents();
        this.refreshAll();
    }

    // ============================
    //  1. 天空背景（自适应屏幕比例）
    // ============================
    private createSkyBackground() {
        const sky = new Node('Sky');
        const vs = view.getVisibleSize();
        const vw = vs.width;
        const vh = vs.height;
        const bigW = vw * 2;
        const bigH = vh * 2;
        const g = sky.addComponent(Graphics);
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const r = Math.round(135 + (240 - 135) * t);
            const gr = Math.round(206 + (248 - 206) * t);
            const b = Math.round(235 + (232 - 235) * t);
            g.fillColor = new Color(r, gr, b);
            const y0 = bigH / 2 - (i / steps) * bigH;
            const y1 = bigH / 2 - ((i + 1) / steps) * bigH;
            g.rect(-bigW / 2, y1, bigW, y0 - y1);
            g.fill();
        }

        // 太阳（位置按可见区域比例）
        const sun = new Node('Sun');
        sun.setPosition(vw * 0.3, vh * 0.38);

        // 最外层光晕（大）
        const sunGlow = new Node('Glow');
        const sgg = sunGlow.addComponent(Graphics);
        sgg.fillColor = new Color(255, 240, 150, 40);
        sgg.circle(0, 0, 55);
        sgg.fill();
        sgg.fillColor = new Color(255, 230, 120, 60);
        sgg.circle(0, 0, 45);
        sgg.fill();
        sun.addChild(sunGlow);

        // 中层主体（橙色）
        const sunBody = new Node('Body');
        const sb = sunBody.addComponent(Graphics);
        sb.fillColor = new Color(255, 200, 50, 220);
        sb.circle(0, 0, 38);
        sb.fill();
        // 高光1
        sb.fillColor = new Color(255, 220, 80, 180);
        sb.circle(-8, 8, 25);
        sb.fill();
        // 高光2（亮白）
        sb.fillColor = new Color(255, 255, 200, 120);
        sb.circle(-12, 12, 15);
        sb.fill();
        sun.addChild(sunBody);

        // 柔和光芒（圆角射线）
        const sunRays = new Node('Rays');
        const sr = sunRays.addComponent(Graphics);
        sr.fillColor = new Color(255, 220, 100, 100);
        for (let a = 0; a < 8; a++) {
            const angle = (a * Math.PI * 2) / 8;
            const rx = 48 * Math.cos(angle);
            const ry = 48 * Math.sin(angle);
            sr.circle(rx, ry, 6);
        }
        sr.fill();
        // 小光芒点
        sr.fillColor = new Color(255, 240, 150, 80);
        for (let a = 0; a < 8; a++) {
            const angle = (a * Math.PI * 2) / 8 + Math.PI / 8;
            const rx = 58 * Math.cos(angle);
            const ry = 58 * Math.sin(angle);
            sr.circle(rx, ry, 3);
        }
        sr.fill();
        sun.addChild(sunRays);

        sky.addChild(sun);

        // 云朵（按可见区域比例分布，覆盖天空上半部分）
        const cloudTemplates: [number, number, number][] = [
            [-0.30, 0.42, 48], [-0.42, 0.32, 52], [-0.24, 0.22, 40],
            [0.06, 0.26, 45],  [0.18, 0.18, 35],
        ];
        for (const [cxRatio, cyRatio, size] of cloudTemplates) {
            const cloud = new Node('Cloud');
            cloud.setPosition(cxRatio * vw, cyRatio * vh);
            const cg = cloud.addComponent(Graphics);
            cg.fillColor = new Color(255, 255, 255, 100);
            const s = size;
            cg.circle(0, 0, s * 0.5);
            cg.circle(-s * 0.4, s * 0.1, s * 0.35);
            cg.circle(s * 0.4, s * 0.05, s * 0.38);
            cg.circle(-s * 0.15, s * 0.25, s * 0.28);
            cg.circle(s * 0.2, s * 0.2, s * 0.3);
            cg.fill();
            sky.addChild(cloud);
        }

        sky.setPosition(0, 0);
        this.node.addChild(sky);

        // 下方草地（自适应：顶部在天空与地面分界处，向下覆盖）
        const grass = new Node('Grass');
        const grassTop = vh * 0.12;
        const grassH = bigH;
        const gg = grass.addComponent(Graphics);
        gg.fillColor = new Color(144, 238, 144, 180);
        gg.rect(-bigW / 2, -grassH / 2, bigW, grassH);
        gg.fill();
        grass.setPosition(0, grassTop - grassH / 2);
        this.node.addChild(grass);
    }

    // ============================
    //  3. 顶部栏（固定在顶部）
    // ============================
    // ============================
    //  装饰小星星
    // ============================
    private drawStar(parent: Node, cx: number, cy: number, size: number, color: Color) {
        const star = new Node('Star');
        star.setPosition(cx, cy);
        const g = star.addComponent(Graphics);
        g.fillColor = color;
        const s = size;
        const points = 5;
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? s : s * 0.4;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            if (i === 0) g.moveTo(r * Math.cos(angle), r * Math.sin(angle));
            else g.lineTo(r * Math.cos(angle), r * Math.sin(angle));
        }
        g.close();
        g.fill();
        parent.addChild(star);
    }

    // ============================
    //  装饰小叶子
    // ============================
    private drawLeafDeco(parent: Node, cx: number, cy: number, size: number, color: Color, flip: boolean = false) {
        const leaf = new Node('Leaf');
        leaf.setPosition(cx, cy);
        if (flip) leaf.setScale(-1, 1);
        const g = leaf.addComponent(Graphics);
        g.fillColor = color;
        // 绘制简单的叶子形状
        g.moveTo(0, 0);
        g.bezierCurveTo(size * 0.3, size * 0.5, size * 0.7, size * 0.4, size, 0);
        g.bezierCurveTo(size * 0.7, -size * 0.4, size * 0.3, -size * 0.5, 0, 0);
        g.fill();
        parent.addChild(leaf);
    }

    // ============================
    //  简约卡通草（单个叶片）
    // ============================
    private drawGrassBlade(parent: Node, cx: number, cy: number, height: number, color: Color, bendX: number = 0) {
        const blade = new Node('GrassBlade');
        blade.setPosition(cx, cy);
        const g = blade.addComponent(Graphics);
        g.fillColor = color;
        g.moveTo(0, 0);
        g.quadraticCurveTo(bendX - 2.5, height * 0.5, bendX + 1, height);
        g.quadraticCurveTo(bendX + 2.5, height * 0.5, 0, 0);
        g.fill();
        // 叶片中间细线装饰（增强立体感）
        g.strokeColor = new Color(color.r - 30, color.g - 30, color.b - 20, 60);
        g.lineWidth = 0.8;
        g.moveTo(0, 2);
        g.quadraticCurveTo(bendX, height * 0.4, bendX + 0.5, height - 2);
        g.stroke();
        parent.addChild(blade);
    }

    // ============================
    //  一簇草（多个叶片组合）
    // ============================
    private drawGrassCluster(parent: Node, cx: number, cy: number, size: number, color: Color) {
        const cluster = new Node('GrassCluster');
        cluster.setPosition(cx, cy);
        const count = 4;
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const offsetX = (t - 0.5) * 8;
            const h = size * (0.7 + 0.3 * (1 - Math.abs(t - 0.5) * 0.6));
            const bend = (t - 0.5) * 6;
            this.drawGrassBlade(cluster, offsetX, 0, h, color, bend);
        }
        parent.addChild(cluster);
    }

    // ============================
    //  在田地两侧绘制草装饰
    // ============================
    private createGrassDecoration() {
        const grassColors = [
            new Color(120, 200, 100, 200),
            new Color(100, 185, 80, 200),
            new Color(140, 215, 110, 180),
            new Color(80, 170, 70, 190),
        ];

        // 计算田地区域
        const tileSize = 68;
        const gap = 8;
        const cols = 3;
        const totalW = cols * tileSize + (cols - 1) * gap;
        const rows = Math.ceil(9 / cols);
        const totalH = rows * tileSize + (rows - 1) * gap;
        const leftEdge = -totalW / 2;
        const rightEdge = totalW / 2;

        const rand = (min: number, max: number) => min + Math.random() * (max - min);

        // 底部空白填充范围（landContainer 坐标系）
        const fillTop = -totalH / 2;  // 田地底部边缘
        const fillBottom = -220;      // 底部导航栏上方约30px

        // === 1. 底部大量留白填充草（最多、分布最广，填补留白）===
        const fillContainer = new Node('BottomFillLayer');
        fillContainer.setPosition(0, 0);
        this.landContainer.addChild(fillContainer);

        // 基础填充 22 簇（覆盖整个底部，增加数量）
        for (let i = 0; i < 22; i++) {
            this.drawGrassCluster(
                fillContainer,
                rand(-150, 150),
                rand(fillTop + 5, fillBottom),
                rand(10, 17),
                grassColors[Math.floor(rand(0, 4))],
            );
        }
        // 左下额外 5 簇（集中在左侧偏下区域加深填充）
        for (let i = 0; i < 5; i++) {
            this.drawGrassCluster(
                fillContainer,
                rand(-150, -40),
                rand(fillTop - 20, fillBottom + 20),
                rand(11, 16),
                grassColors[Math.floor(rand(0, 4))],
            );
        }

        // === 2. 左右侧草（中等层级）===
        const sideContainer = new Node('SideGrassLayer');
        sideContainer.setPosition(0, 0);
        this.landContainer.addChild(sideContainer);

        // 左侧 5 簇（整体往左5px）
        for (let i = 0; i < 5; i++) {
            this.drawGrassCluster(
                sideContainer,
                rand(leftEdge - 31, leftEdge - 13),
                rand(-totalH / 2 + 10, totalH / 2 - 10),
                rand(11, 18),
                grassColors[Math.floor(rand(0, 4))],
            );
        }
        // 右侧 3 簇
        for (let i = 0; i < 3; i++) {
            this.drawGrassCluster(
                sideContainer,
                rand(rightEdge + 8, rightEdge + 26),
                rand(-totalH / 2 + 10, totalH / 2 - 10),
                rand(12, 17),
                grassColors[Math.floor(rand(0, 4))],
            );
        }
        // 右上额外 3 簇（集中在右侧上方）
        for (let i = 0; i < 3; i++) {
            this.drawGrassCluster(
                sideContainer,
                rand(rightEdge + 8, rightEdge + 28),
                rand(0, totalH / 2 - 10),
                rand(12, 17),
                grassColors[Math.floor(rand(0, 4))],
            );
        }

        // === 3. 预留扩展背景草（最底层，远离tile避免重叠）===
        const extendContainer = new Node('ExtendGrassLayer');
        extendContainer.setPosition(0, 0);
        this.landContainer.insertChild(extendContainer, 0);

        const extendCount = Math.floor(rand(3, 5));
        for (let i = 0; i < extendCount; i++) {
            this.drawGrassCluster(
                extendContainer,
                rand(-totalW / 2 + 15, totalW / 2 - 15),
                rand(-totalH / 2 - 35, -totalH / 2 - 20),
                rand(9, 13),
                grassColors[Math.floor(rand(0, 4))],
            );
        }
    }

    // ============================
    private createTopBar() {
        const visibleH = view.getVisibleSize().height;
        this.topBar = new Node('TopBar');
        const barH = 64;
        this.topBar.setPosition(0, visibleH / 2 - barH / 2);

        // 主背景（深绿渐变底）
        const bg = new Node('Bg');
        bg.addComponent(UITransform).setContentSize(Design.WIDTH, barH);
        const bgG = bg.addComponent(Graphics);
        // 上半截深绿
        bgG.fillColor = new Color(65, 165, 65, 235);
        bgG.roundRect(-Design.WIDTH / 2, -barH / 2, Design.WIDTH, barH / 2, 0);
        bgG.fill();
        // 下半截稍浅
        bgG.fillColor = new Color(85, 185, 85, 235);
        bgG.roundRect(-Design.WIDTH / 2, 0, Design.WIDTH, barH / 2, 0);
        bgG.fill();
        // 底部圆角过渡
        bgG.fillColor = new Color(75, 175, 75, 235);
        bgG.roundRect(-Design.WIDTH / 2, -barH / 2, Design.WIDTH, barH, 14);
        bgG.fill();
        this.topBar.addChild(bg);

        // 底部深色阴影带（更明显的边界）
        const shadow = new Node('Shadow');
        shadow.setPosition(0, -barH / 2);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = new Color(45, 130, 45, 160);
        sg.rect(-Design.WIDTH / 2, -3, Design.WIDTH, 5);
        sg.fill();
        sg.fillColor = new Color(40, 110, 40, 80);
        sg.rect(-Design.WIDTH / 2, -8, Design.WIDTH, 5);
        sg.fill();
        this.topBar.addChild(shadow);

        // 装饰条（白色细线）
        const deco = new Node('Deco');
        const dg = deco.addComponent(Graphics);
        dg.fillColor = new Color(255, 255, 255, 25);
        dg.rect(-Design.WIDTH / 2, -barH / 2 + 10, Design.WIDTH, 2);
        dg.fill();
        this.topBar.addChild(deco);

        // 等级标签（堆叠卡片效果）
        const lvX = -138, lvY = 6;
        // 底层阴影（偏移）
        const lvShadow = new Node('LvShadow');
        lvShadow.setPosition(lvX + 2, lvY - 2);
        fillRoundRect(lvShadow, 68, 38, 18, new Color(0, 80, 0, 80));
        this.topBar.addChild(lvShadow);
        // 中层高光边
        const lvMid = new Node('LvMid');
        lvMid.setPosition(lvX, lvY);
        fillRoundRect(lvMid, 68, 38, 18, new Color(100, 200, 100, 180));
        this.topBar.addChild(lvMid);
        // 顶层主体
        const lvBg = new Node('LvBg');
        lvBg.setPosition(lvX, lvY + 1);
        fillRoundRect(lvBg, 64, 34, 16, new Color(80, 180, 80, 220));
        // 内发光边框
        const lvBorder = lvBg.addComponent(Graphics);
        lvBorder.strokeColor = new Color(200, 255, 200, 100);
        lvBorder.lineWidth = 1.5;
        lvBorder.roundRect(-32, -17, 64, 34, 16);
        lvBorder.stroke();
        this.topBar.addChild(lvBg);
        const lvNode = this.makeLabel('Lv.1', 22, new Color(255, 255, 255), true, 0, 0, 64, 34);
        lvNode.setPosition(lvX, lvY + 1);
        lvNode.name = 'LevelText';
        this.topBar.addChild(lvNode);

        // 等级两侧艺术星星
        const starColor = new Color(255, 255, 200, 150);
        this.drawStar(this.topBar, lvX - 42, lvY + 2, 6, starColor);
        this.drawStar(this.topBar, lvX + 42, lvY + 2, 6, starColor);
        this.drawStar(this.topBar, lvX + 50, lvY - 4, 4, starColor);
        this.drawStar(this.topBar, lvX - 50, lvY - 4, 4, starColor);

        // 经验条（堆叠3层效果）
        const expBarW = 140, expBarH = 14;
        const expX = -25, expY = -8;
        // 底层阴影
        const expShadow = new Node('ExpShadow');
        expShadow.setPosition(expX + 2, expY - 2);
        const esg = expShadow.addComponent(Graphics);
        esg.fillColor = new Color(0, 60, 0, 80);
        esg.roundRect(-expBarW / 2, -expBarH / 2, expBarW, expBarH, 7);
        esg.fill();
        this.topBar.addChild(expShadow);
        // 中层背景（灰色槽）
        const expBg = new Node('ExpBg');
        expBg.setPosition(expX, expY);
        const ebg = expBg.addComponent(Graphics);
        ebg.fillColor = new Color(60, 60, 60, 100);
        ebg.roundRect(-expBarW / 2, -expBarH / 2, expBarW, expBarH, 7);
        ebg.fill();
        this.topBar.addChild(expBg);

        // 顶层填充条（当前经验）
        const expFill = new Node('ExpFill');
        expFill.setPosition(-expBarW / 2, 0);
        expFill.name = 'ExpFill';
        const efg = expFill.addComponent(Graphics);
        efg.fillColor = new Color(255, 215, 0);
        efg.roundRect(0, -expBarH / 2, 0, expBarH, 7);
        efg.fill();
        // 填充条上再加一层高光亮条
        const expHighlight = new Node('ExpHighlight');
        expHighlight.setPosition(0, -expBarH / 2 + 3);
        const ehg = expHighlight.addComponent(Graphics);
        ehg.fillColor = new Color(255, 255, 200, 60);
        ehg.roundRect(0, -2, 0, 4, 2);
        ehg.fill();
        expFill.addChild(expHighlight);
        expBg.addChild(expFill);

        // 经验文字
        const expText = this.makeLabel('0/100', 12, new Color(255, 255, 255, 220), false, 0, 0, 56, 16);
        expText.setPosition(0, 1);
        expText.name = 'ExpText';
        expText.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
        expBg.addChild(expText);

        // 经验条旁边的装饰叶子
        const leafColor = new Color(180, 230, 150, 150);
        this.drawLeafDeco(this.topBar, expX + expBarW / 2 + 18, expY, 10, leafColor);
        this.drawLeafDeco(this.topBar, expX - expBarW / 2 - 18, expY, 10, leafColor, true);

        // 右侧货币区（堆叠卡片效果）
        const cy = 6;
        // 底层阴影
        const curShadow = new Node('CurShadow');
        curShadow.setPosition(113, cy - 2);
        fillRoundRect(curShadow, 116, 42, 12, new Color(0, 80, 0, 70));
        this.topBar.addChild(curShadow);
        // 背景主体
        const currencyBg = new Node('CurrencyBg');
        currencyBg.setPosition(113, cy + 1);
        fillRoundRect(currencyBg, 116, 42, 12, new Color(255, 255, 255, 35));
        // 边框
        const curBorder = currencyBg.addComponent(Graphics);
        curBorder.strokeColor = new Color(255, 255, 255, 50);
        curBorder.lineWidth = 1;
        curBorder.roundRect(-58, -21, 116, 42, 12);
        curBorder.stroke();
        // 内部分隔竖线
        const curDiv = currencyBg.addComponent(Graphics);
        curDiv.fillColor = new Color(255, 255, 255, 18);
        curDiv.rect(4, -17, 1, 34);
        curDiv.fill();
        this.topBar.addChild(currencyBg);

        // 金币组（图标 + 3px间距 + 文字，整体居中左半边）
        const goldGroupX = 90;
        const goldIcon = new Node('GoldIcon');
        goldIcon.addComponent(UITransform).setContentSize(26, 26);
        goldIcon.setPosition(goldGroupX - 12, cy + 1);
        this.createUiIcon('gold', goldIcon, 26);
        this.topBar.addChild(goldIcon);

        const goldNode = this.makeLabel('200', 16, new Color(255, 215, 0), true, 0, 4, 50, 20);
        goldNode.setPosition(goldGroupX + 9, cy + 1);
        goldNode.name = 'GoldDisplay';
        this.topBar.addChild(goldNode);

        // 分隔竖线（金币和钻石之间）
        const divider = new Node('Divider');
        divider.setPosition(113, cy + 1);
        const ddg = divider.addComponent(Graphics);
        ddg.fillColor = new Color(255, 255, 255, 25);
        ddg.rect(-1, -16, 2, 32);
        ddg.fill();
        this.topBar.addChild(divider);

        // 钻石组（图标 + 3px间距 + 文字，整体居中右半边）
        const diaGroupX = 138;
        const diamondIcon = new Node('DiamondIcon');
        diamondIcon.addComponent(UITransform).setContentSize(26, 26);
        diamondIcon.setPosition(diaGroupX - 10, cy + 1);
        this.createUiIcon('diamond', diamondIcon, 26);
        this.topBar.addChild(diamondIcon);

        const diamondNode = this.makeLabel('50', 16, new Color(255, 150, 200), true, 0, 4, 40, 20);
        diamondNode.setPosition(diaGroupX + 14, cy + 1);
        diamondNode.name = 'DiamondDisplay';
        this.topBar.addChild(diamondNode);

        this.node.addChild(this.topBar);
    }

    // ============================
    //  4. 农田网格（3×3 精致地块）
    // ============================
    private createLandGrid() {
        this.landContainer = new Node('LandContainer');
        // 放在地面区域中间偏上
        this.landContainer.setPosition(0, -40);
        this.node.addChild(this.landContainer);
        this.renderLandTiles();
    }

    private renderLandTiles() {
        for (const t of this.landTiles) t.destroy();
        this.landTiles = [];

        const land = LandSystem.getInstance();
        const blocks = land.getAllBlocks();
        const total = blocks.length;
        const cols = 3;
        const tileSize = 68;
        const gap = 8;
        const totalW = cols * tileSize + (cols - 1) * gap;
        const rows = Math.ceil(total / cols);
        const totalH = rows * tileSize + (rows - 1) * gap;

        blocks.forEach((block, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const tile = this.createLandTile(block, tileSize);
            tile.setPosition(
                -totalW / 2 + col * (tileSize + gap) + tileSize / 2,
                totalH / 2 - row * (tileSize + gap) - tileSize / 2
            );
            this.landContainer.addChild(tile);
            this.landTiles.push(tile);
        });
    }

    // ============================

    private createLandTile(block: LandBlock, size: number): Node {
        const tile = new Node(`Tile_${block.id}`);
        tile.addComponent(UITransform).setContentSize(size, size);

        // 地块底色（带泥土纹理感的颜色）
        const stateColors: Record<string, [number, number, number, number]> = {
            empty: [139, 119, 80, 200],     // 泥土色
            growing: [100, 160, 80, 220],   // 生长期的绿色
            harvesting: [255, 215, 0, 220], // 成熟金色
            occupied: [139, 115, 85, 200],  // 建筑灰棕
        };
        const c = stateColors[block.state] || [180, 160, 130, 180];

        // 底层阴影（右下偏移，营造浮起感）
        const shadowTile = new Node('Shadow');
        shadowTile.setPosition(3, -3);
        fillRoundRect(shadowTile, size - 2, size - 2, 8, new Color(60, 40, 20, 80));
        tile.addChild(shadowTile);

        // 中层主体（略大一圈的深色底，营造厚度）
        const midTile = new Node('Mid');
        midTile.setPosition(0, 1);
        fillRoundRect(midTile, size - 2, size - 2, 8, new Color(Math.max(c[0]-40,0), Math.max(c[1]-40,0), Math.max(c[2]-30,0), c[3]));
        tile.addChild(midTile);

        // 顶层主体（实际地块面）
        const bg = new Node('Bg');
        bg.setPosition(0, 2);
        fillRoundRect(bg, size - 6, size - 6, 6, new Color(c[0], c[1], c[2], c[3]));
        tile.addChild(bg);

        // ---- 土壤质感效果（仅泥土态地块） ----
        if (block.state === 'empty' || block.state === 'occupied') {
            const soilNode = new Node('SoilDetail');
            const soilG = soilNode.addComponent(Graphics);
            soilNode.setPosition(0, 2);

            // 深浅颗粒点（模拟土壤颗粒）
            const darkBrown = new Color(c[0] - 40, c[1] - 35, c[2] - 25, 120);
            const midBrown = new Color(c[0] - 20, c[1] - 15, c[2] - 10, 90);
            for (let i = 0; i < 18; i++) {
                const px = (Math.random() - 0.5) * (size - 18);
                const py = (Math.random() - 0.5) * (size - 18);
                const pr = 1.8 + Math.random() * 2.5;
                soilG.fillColor = i % 2 === 0 ? darkBrown : midBrown;
                soilG.circle(px, py, pr);
                soilG.fill();
            }

            // 细腻泥土纹路（短弧线）
            soilG.strokeColor = new Color(c[0] - 30, c[1] - 25, c[2] - 20, 80);
            soilG.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const sx = (Math.random() - 0.5) * (size - 18);
                const sy = (Math.random() - 0.5) * (size - 18);
                soilG.moveTo(sx, sy);
                soilG.quadraticCurveTo(
                    sx + (Math.random() - 0.5) * 10,
                    sy + (Math.random() - 0.5) * 10,
                    sx + (Math.random() - 0.5) * 12,
                    sy + (Math.random() - 0.5) * 12,
                );
                soilG.stroke();
            }

            tile.addChild(soilNode);
        }

        // 田埂外框（凸起效果）
        const borderOut = new Node('BorderOut');
        borderOut.setPosition(0, 2);
        strokeRoundRect(borderOut, size - 4, size - 4, 7, new Color(120, 100, 70, 120), 1.5);
        tile.addChild(borderOut);

        // 内框高光线（左上亮边）
        const highlight = new Node('Highlight');
        highlight.setPosition(0, 2);
        const hg = highlight.addComponent(Graphics);
        hg.strokeColor = new Color(255, 255, 255, 30);
        hg.lineWidth = 1;
        hg.roundRect(-(size-8)/2, -(size-8)/2, size-8, size-8, 5);
        hg.stroke();
        tile.addChild(highlight);

        // 状态图标
        const iconMap: Record<string, string> = {
            empty: '🌱',
            growing: '🌿',
            harvesting: '⭐',
            occupied: '🏡',
        };
        const iconLbl = tile.addComponent(Label);
        iconLbl.string = iconMap[block.state] || '?';
        iconLbl.fontSize = block.state === 'harvesting' ? 28 : 22;
        iconLbl.horizontalAlign = Label.HorizontalAlign.CENTER;
        iconLbl.verticalAlign = Label.VerticalAlign.CENTER;
        iconLbl.color = new Color(255, 255, 255);

        // 进度文字（生长中显示进度）
        if (block.state === 'growing') {
            const pct = this.makeLabel(`${Math.floor(block.progress)}%`, 10, new Color(255, 255, 255, 200), false, 0, -size / 2 + 8, 40, 14);
            pct.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
            tile.addChild(pct);
        }


        // 点击事件
        const btn = tile.addComponent(Button);
        btn.node.on(Node.EventType.TOUCH_END, () => this.onTileClick(block.id));

        return tile;
    }

    // ============================
    //  5. 底部导航（固定在底部）
    // ============================
    private createBottomNav() {
        const visibleH = view.getVisibleSize().height;
        this.bottomNav = new Node('BottomNav');
        const navH = 66;
        this.bottomNav.setPosition(0, -visibleH / 2 + navH / 2);

        // 主背景（上圆角 + 渐变效果）
        const bg = new Node('Bg');
        bg.addComponent(UITransform).setContentSize(Design.WIDTH, navH);
        const bgG = bg.addComponent(Graphics);
        // 上半截深色
        bgG.fillColor = new Color(55, 145, 55, 240);
        bgG.roundRect(-Design.WIDTH / 2, 0, Design.WIDTH, navH / 2, 0);
        bgG.fill();
        // 下半截（带圆角顶部）
        bgG.fillColor = new Color(65, 155, 65, 240);
        bgG.roundRect(-Design.WIDTH / 2, -navH / 2, Design.WIDTH, navH, 14);
        bgG.fill();
        this.bottomNav.addChild(bg);

        // 顶部装饰光晕
        const glow = new Node('Glow');
        glow.setPosition(0, navH / 2 - 8);
        const gg = glow.addComponent(Graphics);
        gg.fillColor = new Color(255, 255, 255, 12);
        gg.roundRect(-Design.WIDTH / 2 + 20, -4, Design.WIDTH - 40, 6, 3);
        gg.fill();
        this.bottomNav.addChild(glow);

        // 散落五角星装饰（底部一排，增强效果）
        const starPositions2: [number, number, number, [number, number, number, number]][] = [
            [-Design.WIDTH / 2 + 26, -navH / 2 + 12, 7, [255, 255, 200, 200]],
            [-Design.WIDTH / 2 + 80, -navH / 2 + 6, 4, [255, 220, 120, 160]],
            [-Design.WIDTH / 2 + 130, -navH / 2 + 14, 6, [255, 255, 220, 180]],
            [-70, -navH / 2 + 7, 5, [255, 220, 150, 170]],
            [-10, -navH / 2 + 13, 7, [200, 255, 200, 190]],
            [50, -navH / 2 + 6, 4, [255, 255, 200, 160]],
            [110, -navH / 2 + 12, 6, [255, 230, 130, 180]],
            [Design.WIDTH / 2 - 110, -navH / 2 + 7, 5, [255, 255, 220, 170]],
            [Design.WIDTH / 2 - 60, -navH / 2 + 14, 7, [200, 255, 200, 200]],
            [Design.WIDTH / 2 - 20, -navH / 2 + 7, 4, [255, 220, 120, 160]],
        ];
        for (const [sx, sy, ssize, scol] of starPositions2) {
            this.drawStar(this.bottomNav, sx, sy, ssize, new Color(scol[0], scol[1], scol[2], scol[3]));
        }

        // 按钮分割竖线
        const spacing = Design.WIDTH / 4;
        for (let i = 1; i < 4; i++) {
            const line = new Node(`Divider_${i}`);
            line.setPosition(-Design.WIDTH / 2 + spacing * i, 0);
            const lg = line.addComponent(Graphics);
            lg.fillColor = new Color(255, 255, 255, 18);
            lg.rect(-1, -navH / 2 + 8, 2, navH - 16);
            lg.fill();
            this.bottomNav.addChild(line);
        }

        const items = [
            { name: '物品', icon: 'bag', handler: () => this.showPanel('inventory') },
            { name: '合成', icon: 'gear', handler: () => this.showPanel('craft') },
            { name: '商店', icon: 'shop', handler: () => this.showPanel('shop') },
            { name: '种植', icon: 'leaf', handler: () => this.showPlantMenu() },
        ];

        items.forEach((item, i) => {
            const btn = new Node(`Btn_${item.name}`);
            btn.addComponent(UITransform).setContentSize(Design.WIDTH / 4 - 10, navH - 10);
            btn.setPosition(-Design.WIDTH / 2 + spacing * i + spacing / 2, 0);

            // 堆叠按钮：阴影层
            const btnShadow = new Node('BtnShadow');
            btnShadow.setPosition(2, -2);
            fillRoundRect(btnShadow, Design.WIDTH / 4 - 10, navH - 10, 10, new Color(30, 90, 30, 100));
            btn.addChild(btnShadow);

            // 按钮主体凸起层
            const btnBg = new Node('BtnBg');
            btnBg.setPosition(0, 1);
            fillRoundRect(btnBg, Design.WIDTH / 4 - 14, navH - 16, 9, new Color(70, 170, 70, 220));
            // 内发光边框
            const btnBorder = btnBg.addComponent(Graphics);
            btnBorder.strokeColor = new Color(150, 255, 150, 60);
            btnBorder.lineWidth = 1;
            btnBorder.roundRect(-((Design.WIDTH / 4 - 14) / 2), -((navH - 16) / 2), Design.WIDTH / 4 - 14, navH - 16, 9);
            btnBorder.stroke();
            btn.addChild(btnBg);

            // 图标
            const iconNode = new Node('Icon');
            iconNode.addComponent(UITransform).setContentSize(34, 34);
            iconNode.setPosition(0, 5);
            this.createUiIcon(item.icon, iconNode, 34);
            btn.addChild(iconNode);

            // 按钮内散落星星
            const btnW2 = (Design.WIDTH / 4 - 10) / 2;
            const btnH2 = (navH - 10) / 2;
            const btnStars = [
                [-btnW2 + 8, btnH2 - 8, 4, [255, 255, 200, 150]],
                [btnW2 - 8, -btnH2 + 8, 3, [255, 220, 120, 130]],
                [i === 1 || i === 3 ? -btnW2 + 8 : btnW2 - 8, -btnH2 + 8, 3, [200, 255, 200, 120]],
            ] as [number, number, number, [number, number, number, number]][];
            for (const [sx, sy, ssize, scol] of btnStars) {
                this.drawStar(btn, sx, sy, ssize, new Color(scol[0], scol[1], scol[2], scol[3]));
            }

            // 文字（单独节点避免被遮挡）
            const labelNode = this.makeLabel(item.name, 13, new Color(255, 255, 255, 230), false, 0, -18, 60, 20);
            labelNode.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
            btn.addChild(labelNode);

            const button = btn.addComponent(Button);
            button.target = btn;
            button.transition = Button.Transition.SCALE;
            button.zoomScale = 0.92;
            button.node.on(Node.EventType.TOUCH_END, item.handler);
            this.bottomNav.addChild(btn);
        });

        this.node.addChild(this.bottomNav);
    }

    // ============================
    //  6. 面板（物品/合成/商店）
    // ============================
    private createPanels() {
        this.inventoryPanel = this.makePanel('🎒 物品栏', 320, 440);
        this.craftPanel = this.makePanel('⚙️ 合成台', 320, 440);
        this.shopPanel = this.makePanel('🏪 种子商店', 320, 440);
        this.inventoryPanel.active = false;
        this.craftPanel.active = false;
        this.shopPanel.active = false;
        this.node.addChild(this.inventoryPanel);
        this.node.addChild(this.craftPanel);
        this.node.addChild(this.shopPanel);
    }

    // ---- 物品栏 ----
    private renderInventoryGrid() {
        const body = this.inventoryPanel.getChildByName('Body');
        if (body) body.destroy();
        const newBody = new Node('Body');
        newBody.addComponent(UITransform).setContentSize(290, 340);
        newBody.setPosition(0, -20);
        this.inventoryPanel.addChild(newBody);

        const inv = InventorySystem.getInstance();
        const slots = inv.getNonEmptySlots();
        const info = inv.getUsage();
        const cols = 4;
        const cellSize = 64;
        const gap = 8;

        // 使用情况提示
        const usageText = this.makeLabel(`📦 ${info.used}/${info.max}`, 11, new Color(120, 120, 120), false, 0, 0, 100, 18);
        usageText.setPosition(-80, 160);
        usageText.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
        newBody.addChild(usageText);

        slots.forEach((slot, i) => {
            const def = getItem(slot.itemId);
            if (!def) return;

            const cell = new Node(`Slot_${i}`);
            const col = i % cols;
            const row = Math.floor(i / cols);
            const startX = -(cols * (cellSize + gap)) / 2 + cellSize / 2;
            cell.setPosition(startX + col * (cellSize + gap), 130 - row * (cellSize + gap));
            cell.addComponent(UITransform).setContentSize(cellSize, cellSize);

            // 格子背景
            fillRoundRect(cell, cellSize, cellSize, 8, new Color(230, 240, 220, 200));
            strokeRoundRect(cell, cellSize, cellSize, 8, new Color(180, 200, 170, 150), 1);

            // 物品图标（优先加载后端图片）
            const icon = this.createItemIcon(slot.itemId, cellSize - 12);
            cell.addChild(icon);

            // 数量角标
            if (slot.count > 1) {
                const cn = this.makeLabel(slot.count.toString(), 11, new Color(255, 255, 255), true, 0, 0, 22, 16);
                cn.setPosition(cellSize / 2 - 12, -cellSize / 2 + 10);
                cn.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
                const cb = new Node('CountBg');
                cb.setPosition(cellSize / 2 - 12, -cellSize / 2 + 10);
                fillRoundRect(cb, 24, 18, 9, new Color(255, 50, 50, 200));
                cell.addChild(cb);
                cell.addChild(cn);
            }

            // 出售点击
            const btn = cell.addComponent(Button);
            btn.node.on(Node.EventType.TOUCH_END, () => this.showSellDialog(slot.itemId, def));
            newBody.addChild(cell);
        });

        if (slots.length === 0) {
            const empty = this.makeLabel('✨ 背包空空的~', 14, new Color(160, 160, 160), false, 0, 20, 200, 24);
            empty.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
            newBody.addChild(empty);
        }
    }

    // ---- 合成台 ----
    private renderCraftPanel() {
        const old = this.craftPanel.getChildByName('Body');
        if (old) old.destroy();
        const body = new Node('Body');
        body.addComponent(UITransform).setContentSize(290, 350);
        body.setPosition(0, -20);
        this.craftPanel.addChild(body);

        const gm = GameManager.getInstance();
        const recipes = getRecipesByLevel(gm.playerLevel);
        const cs = CraftSystem.getInstance();
        const activeCount = cs.getActiveCraftCount();
        const rowH = 60;
        const totalH = (activeCount > 0 ? 28 : 0) + recipes.length * rowH + 10;

        // 活跃合成提示
        let offsetY = totalH / 2 - 10;
        if (activeCount > 0) {
            const info = this.makeLabel(`⏳ 进行中: ${activeCount} 个`, 14, new Color(230, 120, 0), false, 0, 0, 150, 22);
            info.setPosition(0, offsetY);
            info.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
            body.addChild(info);
            offsetY -= 28;
        }

        recipes.forEach((recipe, i) => {
            const y = offsetY - i * rowH - rowH / 2;

            const row = new Node(`R_${recipe.id}`);
            row.addComponent(UITransform).setContentSize(280, 56);
            row.setPosition(0, y);

            fillRoundRect(row, 280, 54, 8, new Color(245, 250, 240, 220));
            strokeRoundRect(row, 280, 54, 8, new Color(200, 220, 190, 120), 1);

            // 产出图标
            const prod = recipe.product;
            const iconNode = this.createItemIcon(prod.itemId, 32);
            iconNode.setPosition(-115, 5);
            row.addChild(iconNode);

            // 配方名
            const nameN = this.makeLabel(recipe.name, 15, new Color(50, 50, 50), true, 0, 12, 90, 22);
            nameN.setPosition(-82, 0);
            row.addChild(nameN);

            // 材料
            const matStr = recipe.materials.map(m => `${m.itemId}×${m.count}`).join(' ');
            const matN = this.makeLabel(matStr, 12, new Color(120, 120, 120), false, 0, -10, 140, 20);
            matN.setPosition(-72, 0);
            row.addChild(matN);

            // 合成按钮
            const btn = new Node('Btn');
            btn.addComponent(UITransform).setContentSize(64, 32);
            btn.setPosition(103, 0);
            fillRoundRect(btn, 64, 32, 8, new Color(80, 200, 80));
            const bl = btn.addComponent(Label);
            bl.string = '合成';
            bl.fontSize = 14;
            bl.color = new Color(255, 255, 255);
            bl.isBold = true;
            bl.horizontalAlign = Label.HorizontalAlign.CENTER;
            bl.verticalAlign = Label.VerticalAlign.CENTER;
            const bb = btn.addComponent(Button);
            bb.node.on(Node.EventType.TOUCH_END, () => {
                const id = CraftSystem.getInstance().startCraft(recipe.id);
                if (id >= 0) { this.toast(`🔨 ${recipe.name}`); this.renderCraftPanel(); }
                else { this.toast('❌ 材料不足'); }
            });
            row.addChild(btn);
            body.addChild(row);
        });

        if (recipes.length === 0) {
            const e = this.makeLabel('提升等级解锁配方', 13, new Color(160, 160, 160), false, 0, 0, 160, 24);
            e.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
            body.addChild(e);
        }
    }

    // ---- 商店 ----
    private renderShopPanel() {
        const old = this.shopPanel.getChildByName('Body');
        if (old) old.destroy();
        const body = new Node('Body');
        body.addComponent(UITransform).setContentSize(290, 350);
        body.setPosition(0, -20);
        this.shopPanel.addChild(body);

        const gm = GameManager.getInstance();
        const crops = getPlantableCrops().filter(c => c.unlockLevel <= gm.playerLevel + 2);
        const rowH = 60;
        const totalH = crops.length * rowH + 10;

        crops.forEach((crop, i) => {
            const y = totalH / 2 - i * rowH - rowH / 2;

            const row = new Node(`Shop_${crop.id}`);
            row.addComponent(UITransform).setContentSize(280, 54);
            row.setPosition(0, y);

            const unlocked = crop.unlockLevel <= gm.playerLevel;
            fillRoundRect(row, 280, 52, 8, new Color(245, 250, 240, 220));
            if (!unlocked) {
                const g = row.addComponent(Graphics);
                g.fillColor = new Color(0, 0, 0, 30);
                g.roundRect(-140, -26, 280, 52, 8);
                g.fill();
            }

            // 物品图标
            const iconNode = this.createItemIcon(crop.id, 36);
            iconNode.setPosition(-115, 0);
            row.addChild(iconNode);

            // 名称
            const nameN = this.makeLabel(crop.name, 15, unlocked ? new Color(50, 50, 50) : new Color(160, 160, 160), false, 0, 10, 60, 20);
            nameN.setPosition(-82, 0);
            row.addChild(nameN);

            // 价格
            const price = crop.sellPrice * 2;
            const priceN = this.makeLabel(`💰${price}`, 14, new Color(255, 180, 0), false, 0, -10, 60, 20);
            priceN.setPosition(-82, 0);
            row.addChild(priceN);

            // 生长时间
            const timeN = this.makeLabel(`⏱${crop.growthTime}s`, 12, new Color(140, 140, 140), false, 0, -10, 50, 18);
            timeN.setPosition(-24, 0);
            row.addChild(timeN);

            // 购买按钮
            const btn = new Node('Btn');
            btn.addComponent(UITransform).setContentSize(60, 32);
            btn.setPosition(103, 0);
            fillRoundRect(btn, 60, 32, 8, unlocked ? new Color(80, 200, 80) : new Color(180, 180, 180));
            const bl = btn.addComponent(Label);
            bl.string = unlocked ? '购买' : '🔒';
            bl.fontSize = 14;
            bl.color = new Color(255, 255, 255);
            bl.horizontalAlign = Label.HorizontalAlign.CENTER;
            bl.verticalAlign = Label.VerticalAlign.CENTER;
            const bb = btn.addComponent(Button);
            bb.node.on(Node.EventType.TOUCH_END, () => {
                if (!unlocked) { this.toast(`需要 Lv.${crop.unlockLevel}`); return; }
                if (gm.spendGold(price)) {
                    InventorySystem.getInstance().addItem(crop.id, 1);
                    this.toast(`✅ 购买了 ${crop.name}`);
                    this.renderShopPanel();
                    this.refreshTopBar();
                } else { this.toast('❌ 金币不足'); }
            });
            row.addChild(btn);
            body.addChild(row);
        });

        if (crops.length === 0) {
            const e = this.makeLabel('暂无可用种子', 13, new Color(160, 160, 160), false, 0, 0, 120, 24);
            e.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
            body.addChild(e);
        }
    }

    // ============================
    //  7. 弹窗
    // ============================
    private createPopupDialog() {
        const visibleH = view.getVisibleSize().height;
        this.popupDialog = new Node('PopupDialog');
        this.popupDialog.addComponent(UITransform).setContentSize(Design.WIDTH, visibleH);
        this.popupDialog.active = false;
        this.node.addChild(this.popupDialog);
    }

    private showDialog(title: string, msg: string, btns: Array<{ text: string; cb: () => void }>) {
        this.popupDialog.active = true;
        // 遮罩
        const oldMask = this.popupDialog.getChildByName('Mask');
        if (oldMask) oldMask.destroy();
        const mask = new Node('Mask');
        const vh = view.getVisibleSize().height;
        mask.addComponent(UITransform).setContentSize(Design.WIDTH, vh);
        fillRect(mask, Design.WIDTH, vh, new Color(0, 0, 0, 130));
        mask.on(Node.EventType.TOUCH_END, () => { this.popupDialog.active = false; });
        this.popupDialog.addChild(mask);

        const oldDlg = this.popupDialog.getChildByName('Dlg');
        if (oldDlg) oldDlg.destroy();
        const dlg = new Node('Dlg');
        const dw = 270, dh = 190;
        dlg.addComponent(UITransform).setContentSize(dw, dh);
        fillRoundRect(dlg, dw, dh, 16, new Color(255, 250, 235));
        strokeRoundRect(dlg, dw, dh, 16, new Color(180, 200, 170), 2);
        this.popupDialog.addChild(dlg);

        const t = this.makeLabel(title, 17, new Color(50, 50, 50), true, 0, 0, dw - 30, 26);
        t.setPosition(0, dh / 2 - 30);
        t.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
        dlg.addChild(t);

        const m = this.makeLabel(msg, 13, new Color(100, 100, 100), false, 0, 5, dw - 30, 70);
        m.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
        m.getComponent(Label)!.lineHeight = 22;
        dlg.addChild(m);

        const startX = -((btns.length - 1) * 100) / 2;
        btns.forEach((btn, i) => {
            const b = new Node(`B_${i}`);
            b.addComponent(UITransform).setContentSize(90, 34);
            b.setPosition(startX + i * 100, -dh / 2 + 30);
            const isPrimary = i === btns.length - 1;
            fillRoundRect(b, 90, 34, 10, isPrimary ? new Color(80, 200, 80) : new Color(200, 200, 200));
            const bl = b.addComponent(Label);
            bl.string = btn.text;
            bl.fontSize = 14;
            bl.color = new Color(255, 255, 255);
            bl.horizontalAlign = Label.HorizontalAlign.CENTER;
            bl.verticalAlign = Label.VerticalAlign.CENTER;
            const bb = b.addComponent(Button);
            bb.node.on(Node.EventType.TOUCH_END, () => { btn.cb(); this.popupDialog.active = false; });
            dlg.addChild(b);
        });

        // 弹入动画
        dlg.scale = new Vec3(0.6, 0.6, 1);
        tween(dlg).to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    // ============================
    //  工具方法
    // ============================
    private makeLabel(text: string, fontSize: number, color: Color, bold: boolean, x: number, y: number, w: number, h: number): Node {
        const node = new Node('Label');
        node.setPosition(x, y);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.color = color;
        label.isBold = bold;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        return node;
    }

    private makePanel(title: string, w: number, h: number): Node {
        const panel = new Node('Panel');
        panel.addComponent(UITransform).setContentSize(w, h);
        // 背景
        fillRoundRect(panel, w, h, 16, new Color(255, 250, 235));
        strokeRoundRect(panel, w, h, 16, new Color(180, 200, 170), 2);
        // 标题
        const t = this.makeLabel(title, 18, new Color(50, 50, 50), true, 0, 0, 200, 28);
        t.setPosition(-w / 2 + 18, h / 2 - 28);
        t.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        panel.addChild(t);
        // 关闭按钮
        const closeBtn = new Node('Close');
        closeBtn.addComponent(UITransform).setContentSize(30, 30);
        closeBtn.setPosition(w / 2 - 22, h / 2 - 24);
        const cl = closeBtn.addComponent(Label);
        cl.string = '✕';
        cl.fontSize = 18;
        cl.color = new Color(150, 150, 150);
        cl.horizontalAlign = Label.HorizontalAlign.CENTER;
        cl.verticalAlign = Label.VerticalAlign.CENTER;
        const cb = closeBtn.addComponent(Button);
        cb.node.on(Node.EventType.TOUCH_END, () => { panel.active = false; });
        panel.addChild(closeBtn);
        return panel;
    }

    /**
     * 创建物品图标节点（优先加载后端图片，失败回退 emoji）
     * @param itemId 物品 ID
     * @param size 图标大小
     * @returns Node 包含 Sprite（图片）或 Label（emoji fallback）
     */
    /**
     * 加载 UI 图标（金币、钻石、导航等），异步加载图片，无 emoji 回退
     */
    private createUiIcon(iconName: string, node: Node, size: number) {
        ImageCache.getInstance().loadUiIcon(iconName).then(sf => {
            if (sf && sf.texture) {
                const sprite = node.addComponent(Sprite);
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.trim = false;
                sprite.spriteFrame = sf;
            }
        });
    }

    /**
     * 创建物品图标节点
     * 立即显示 emoji，后端图片加载成功后替换
     */
    private createItemIcon(itemId: string, size: number): Node {
        const node = new Node(`Icon_${itemId}`);
        node.addComponent(UITransform).setContentSize(size, size);

        // 1. 立即显示 emoji（保证任何时候都有内容）
        const lbl = node.addComponent(Label);
        lbl.string = this.emoji(itemId);
        lbl.fontSize = size * 0.6;
        lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = Label.VerticalAlign.CENTER;

        // 2. 后台加载图片，成功则替换 emoji
        ImageCache.getInstance().load(itemId).then(sf => {
            if (sf && sf.texture) {
                lbl.node.active = false;
                const sprite = node.addComponent(Sprite);
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.trim = false;
                sprite.spriteFrame = sf;
            }
        });
        return node;
    }

    private emoji(itemId: string): string {
        const m: Record<string, string> = {
            wheat: '🌾', corn: '🌽', tomato: '🍅', carrot: '🥕', pumpkin: '🎃',
            strawberry: '🍓', cherry: '🍒', banana: '🍌', apple: '🍎', lettuce: '🥬',
            egg: '🥚', milk: '🥛', flour: '🌾', butter: '🧈', honey: '🍯', sugar: '🧂',
            oatmeal: '🥣', jam: '🍓', cheese: '🧀', ketchup: '🍅',
            bread: '🍞', croissant: '🥐', cake: '🍰', cupcake: '🧁', cookie: '🍪',
            pie: '🥧', strawberryCake: '🍓', baguette: '🥖', donut: '🍩',
            chocolateCake: '🍫', cereal: '🥣', pasta: '🍝',
            butterToast: '🍞', honeyToast: '🍞', jamToast: '🍞',
            craftTable: '⚙️', chickenCoop: '🐔', barn: '🐄',
            mysteryBox: '🎁', luckyStar: '⭐', jade: '💎',
            speedTicket: '⏰', doubleHarvestCard: '🎯', goldBoostCard: '💰', universalSeed: '🌱',
            sunflower: '🌻', tulip: '🌷', rose: '🌹', tree: '🌲',
        };
        return m[itemId] || '📦';
    }

    // ============================
    //  交互
    // ============================
    private onTileClick(blockId: number) {
        const land = LandSystem.getInstance();
        const block = land.getBlock(blockId);
        if (!block) return;
        switch (block.state) {
            case 'empty':
                if (this.currentCropForPlanting) {
                    if (land.plantCrop(blockId, this.currentCropForPlanting)) {
                        InventorySystem.getInstance().removeItem(this.currentCropForPlanting, 1);
                        this.toast('🌱 种植成功!');
                        this.currentCropForPlanting = null;
                        this.refreshLand();
                    }
                } else {
                    this.showPlantMenu();
                }
                break;
            case 'growing': this.toast('⏳ 生长中...'); break;
            case 'harvesting':
                const crop = land.harvestCrop(blockId);
                if (crop) {
                    const def = getItem(crop);
                    const count = def?.harvestCount ?? 1;
                    InventorySystem.getInstance().addItem(crop, count);
                    GameManager.getInstance().addExperience(5);
                    this.toast(`🎉 收获 ${def?.name || crop} ×${count}`);
                    this.refreshLand();
                    this.refreshTopBar();
                }
                break;
            case 'occupied': this.toast('🏠 建筑占用'); break;
        }
    }

    private showPlantMenu() {
        const gm = GameManager.getInstance();
        const inv = InventorySystem.getInstance();
        const owned = getPlantableCrops()
            .filter(c => c.unlockLevel <= gm.playerLevel)
            .filter(c => inv.hasItems(c.id, 1));
        if (owned.length === 0) {
            this.showPanel('shop');
            this.toast('没有种子，去商店买 🌱');
            return;
        }
        this.currentCropForPlanting = owned[0].id;
        this.toast(`选择 ${owned[0].name}，点击空地种植 🌱`);
    }

    private showSellDialog(itemId: string, def: ItemDef) {
        const inv = InventorySystem.getInstance();
        const count = inv.getItemCount(itemId);
        const total = def.sellPrice * count;
        this.showDialog(
            `💼 出售 ${def.name}`,
            `数量: ${count}  单价: 💰${def.sellPrice}\n总价: 💰${total}`,
            [
                { text: '取消', cb: () => {} },
                { text: '全部出售', cb: () => {
                    inv.sellItem(itemId, count, (p) => {
                        GameManager.getInstance().addGold(p);
                        this.refreshAll();
                        this.toast(`💰 +${p} 金币`);
                    });
                }},
            ]
        );
    }

    private toast(text: string) {
        const toast = new Node('Toast');
        toast.addComponent(UITransform).setContentSize(220, 36);
        const tg = toast.addComponent(Graphics);
        tg.fillColor = new Color(40, 40, 40, 210);
        tg.roundRect(-110, -18, 220, 36, 10);
        tg.fill();
        const tl = toast.addComponent(Label);
        tl.string = text;
        tl.fontSize = 13;
        tl.color = new Color(255, 255, 255);
        tl.horizontalAlign = Label.HorizontalAlign.CENTER;
        tl.verticalAlign = Label.VerticalAlign.CENTER;
        this.node.addChild(toast);
        tween(toast)
            .to(0.3, { position: new Vec3(0, 70, 0) }, { easing: 'backOut' })
            .delay(1.2)
            .to(0.25, { position: new Vec3(0, 120, 0), scale: new Vec3(0.8, 0.8, 0.8) })
            .call(() => toast.destroy())
            .start();
    }

    private showPanel(name: string) {
        this.inventoryPanel.active = name === 'inventory';
        this.craftPanel.active = name === 'craft';
        this.shopPanel.active = name === 'shop';
        if (name === 'inventory') this.renderInventoryGrid();
        else if (name === 'craft') this.renderCraftPanel();
        else if (name === 'shop') this.renderShopPanel();
    }

    // ============================
    //  事件 & 刷新
    // ============================
    private bindEvents() {
        const evt = EventManager.getInstance();
        evt.on('goldChanged', () => this.refreshTopBar());
        evt.on('diamondChanged', () => this.refreshTopBar());
        evt.on('levelUp', () => this.refreshAll());
        evt.on('inventoryChanged', () => { if (this.inventoryPanel.active) this.renderInventoryGrid(); });
        evt.on('craftCompleted', (d: any) => {
            this.toast(`🎉 ${d.recipe?.name || ''} 合成完成!`);
            this.refreshAll();
            if (this.craftPanel.active) this.renderCraftPanel();
        });
        evt.on('cropMatured', () => this.refreshLand());
    }

    private refreshAll() { this.refreshTopBar(); this.refreshLand(); }

    private refreshTopBar() {
        const gm = GameManager.getInstance();
        const lt = this.topBar.getChildByName('LevelText');
        if (lt) lt.getComponent(Label)!.string = `Lv.${gm.playerLevel}`;
        const gd = this.topBar.getChildByName('GoldDisplay');
        if (gd) gd.getComponent(Label)!.string = gm.gold.toLocaleString();
        const dd = this.topBar.getChildByName('DiamondDisplay');
        if (dd) dd.getComponent(Label)!.string = gm.diamond.toString();
        // 经验条
        const expFill = this.topBar.getChildByName('ExpFill');
        if (expFill) {
            const pct = gm.experience / gm.nextLevelExp;
            const w = Math.max(0, 120 * pct);
            expFill.getComponent(Graphics)!.clear();
            const efg = expFill.getComponent(Graphics)!;
            efg.fillColor = new Color(255, 215, 0);
            efg.roundRect(0, -5, w, 10, 5);
            efg.fill();
        }
        const expText = this.topBar.getChildByName('ExpText');
        if (expText) expText.getComponent(Label)!.string = `${gm.experience}/${gm.nextLevelExp}`;
    }

    private refreshLand() { this.renderLandTiles(); }
}
