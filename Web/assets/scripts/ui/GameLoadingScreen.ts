import {
    BlockInputEvents,
    Color,
    Graphics,
    Label,
    LabelOutline,
    Node,
    Sprite,
    SpriteFrame,
    tween,
    UIOpacity,
    UITransform,
    Vec3,
    view,
} from 'cc';

export type GameLoadingScreen = {
    node: Node;
    setArtwork: (spriteFrame: SpriteFrame | null) => void;
    setTitleArtwork: (spriteFrame: SpriteFrame | null) => void;
    setPanelArtwork: (spriteFrame: SpriteFrame | null) => void;
    setProgressArtwork: (spriteFrame: SpriteFrame | null) => void;
    setProgress: (completed: number, total: number) => void;
    finish: () => Promise<void>;
    destroy: () => void;
};

export type GameLoadingScreenLayout = {
    /** Subject/character bottom edge measured from the artwork's top, normalized to 0..1. */
    subjectBottomFromTop: number;
};

function createLabel(
    parent: Node,
    name: string,
    text: string,
    fontSize: number,
    width: number,
    height: number,
    color: Color,
    outlineWidth = 0,
): Label {
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = color;
    label.isBold = true;
    if (outlineWidth > 0) {
        const outline = node.addComponent(LabelOutline);
        outline.color = new Color(255, 250, 224, 255);
        outline.width = outlineWidth;
    }
    parent.addChild(node);
    return label;
}

function drawCloudCurtain(
    graphics: Graphics,
    width: number,
    height: number,
    innerSide: 'left' | 'right',
): void {
    graphics.clear();
    const edgeX = innerSide === 'left' ? -width / 2 : width / 2;
    const direction = innerSide === 'left' ? -1 : 1;

    // A warm white body prevents a one-frame glimpse of either scene while
    // the two organic cloud edges overlap in the middle.
    graphics.fillColor = new Color(250, 250, 239, 252);
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();

    const puffCount = Math.max(6, Math.ceil(height / 118));
    for (let index = 0; index <= puffCount; index++) {
        const y = -height / 2 + (height * index) / puffCount;
        const radiusX = 68 + (index % 3) * 13;
        const radiusY = 54 + ((index + 1) % 3) * 11;
        const offset = index % 2 === 0 ? 18 : 48;
        graphics.ellipse(
            edgeX + direction * offset,
            y,
            radiusX,
            radiusY,
        );
        graphics.fill();
    }

    // Soft internal highlights make the wipe read as cloud/mist rather than
    // two plain white panels, without requiring another texture request.
    graphics.fillColor = new Color(255, 255, 255, 116);
    for (let index = 0; index < puffCount; index += 2) {
        const y = -height / 2 + (height * (index + 0.5)) / puffCount;
        graphics.ellipse(
            edgeX + direction * 30,
            y,
            52 + (index % 3) * 8,
            28 + ((index + 1) % 2) * 8,
        );
        graphics.fill();
    }
}

function createCloudTransitionLayer(parent: Node): {
    node: Node;
    left: Node;
    right: Node;
    closedLeftX: number;
    closedRightX: number;
    openLeftX: number;
    openRightX: number;
} {
    const visibleSize = view.getVisibleSize();
    const width = visibleSize.width;
    const height = visibleSize.height;
    const overlap = Math.max(92, width * 0.16);
    const curtainWidth = width / 2 + overlap;

    const layer = new Node('CloudTransition');
    layer.addComponent(UITransform).setContentSize(width, height);
    layer.addComponent(BlockInputEvents);
    parent.addChild(layer);
    layer.setSiblingIndex(parent.children.length - 1);

    const createCurtain = (name: string, innerSide: 'left' | 'right') => {
        const curtain = new Node(name);
        curtain.addComponent(UITransform).setContentSize(curtainWidth, height);
        curtain.addComponent(UIOpacity);
        const graphics = curtain.addComponent(Graphics);
        drawCloudCurtain(graphics, curtainWidth, height, innerSide);
        layer.addChild(curtain);
        return curtain;
    };

    const left = createCurtain('CloudCurtainLeft', 'right');
    const right = createCurtain('CloudCurtainRight', 'left');
    const closedLeftX = -width / 4;
    const closedRightX = width / 4;
    const openLeftX = -width - overlap;
    const openRightX = width + overlap;
    left.setPosition(openLeftX, 0);
    right.setPosition(openRightX, 0);

    return {
        node: layer,
        left,
        right,
        closedLeftX,
        closedRightX,
        openLeftX,
        openRightX,
    };
}

/**
 * Web builds show the loading artwork as a native DOM image before Cocos has
 * created or painted GameCanvas. Remove that direct image only after the
 * cloud curtains completely cover the switch to MainUI.
 */
function removeDirectStartupArtwork(): void {
    const remove = (globalThis as any).__removeMoefarmStartupArtwork;
    if (typeof remove === 'function') remove();
}

/** Wait for the newly assigned loading SpriteFrame to survive two browser
 * paint opportunities before exposing GameCanvas. This prevents the WebGL
 * clear frame from replacing the direct DOM artwork with black. */
function removeDirectStartupArtworkAfterCanvasPaint(): void {
    const requestFrame = (globalThis as any).requestAnimationFrame;
    if (typeof requestFrame !== 'function') {
        (globalThis as any).setTimeout(removeDirectStartupArtwork, 34);
        return;
    }
    requestFrame(() => requestFrame(removeDirectStartupArtwork));
}

/** 启动阶段专用加载界面，进度只由实际图片请求的完成数量驱动。 */
export function createGameLoadingScreen(
    parent: Node,
    layout: GameLoadingScreenLayout = { subjectBottomFromTop: 727 / 1280 },
): GameLoadingScreen {
    const root = new Node('GameLoadingScreen');
    const rootTransform = root.addComponent(UITransform);
    const rootOpacity = root.addComponent(UIOpacity);
    parent.addChild(root);

    const artworkNode = new Node('Artwork');
    const artworkTransform = artworkNode.addComponent(UITransform);
    const artwork = artworkNode.addComponent(Sprite);
    artwork.sizeMode = Sprite.SizeMode.CUSTOM;
    artwork.trim = false;
    root.addChild(artworkNode);

    const titleNode = new Node('GameTitleArtwork');
    const titleTransform = titleNode.addComponent(UITransform);
    titleTransform.setContentSize(300, 112);
    const titleSprite = titleNode.addComponent(Sprite);
    titleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    titleSprite.trim = false;
    root.addChild(titleNode);

    const progressPanel = new Node('ProgressPanel');
    const progressPanelTransform = progressPanel.addComponent(UITransform);
    progressPanelTransform.setContentSize(344, 104);
    const panelSprite = progressPanel.addComponent(Sprite);
    panelSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    panelSprite.trim = false;
    root.addChild(progressPanel);

    const counterLabel = createLabel(
        progressPanel,
        'ImageCounter',
        '加载资源：0 / 0',
        15,
        260,
        24,
        new Color(118, 74, 38, 255),
    );
    counterLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    counterLabel.node.setPosition(0, 5);

    // Measured from loading_panel.png:
    // the 704 x 35 px inner cavity becomes about 245 x 12 at 344 x 104.
    const progressCavityWidth = 245;
    const progressCavityHeight = 12;
    const progressCavityCenterY = -29.5;
    const progressTrack = new Node('ProgressTrack');
    progressTrack.setPosition(0, progressCavityCenterY);
    progressTrack
        .addComponent(UITransform)
        .setContentSize(progressCavityWidth, progressCavityHeight);
    progressPanel.addChild(progressTrack);

    const progressFill = new Node('ProgressFill');
    // The painted sprite fills the measured cavity; its own rounded ends
    // preserve the inset-frame appearance.
    progressFill
        .addComponent(UITransform)
        .setContentSize(progressCavityWidth, progressCavityHeight);
    const fillSprite = progressFill.addComponent(Sprite);
    fillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    progressTrack.addChild(progressFill);

    let currentProgress = 0;
    const redrawProgress = (ratio: number) => {
        currentProgress = Math.max(0, Math.min(1, ratio));
        if (fillSprite.spriteFrame) {
            fillSprite.fillRange = currentProgress;
        }
    };
    redrawProgress(0);

    const updateLayout = () => {
        if (!root.isValid) return;
        const visibleSize = view.getVisibleSize();
        const visibleWidth = visibleSize.width;
        const visibleHeight = visibleSize.height;
        rootTransform.setContentSize(visibleWidth, visibleHeight);

        const spriteFrame = artwork.spriteFrame;
        if (spriteFrame) {
            const sourceSize = spriteFrame.originalSize;
            const scale = Math.max(
                visibleWidth / Math.max(1, sourceSize.width),
                visibleHeight / Math.max(1, sourceSize.height),
            );
            artworkTransform.setContentSize(
                Math.ceil(sourceSize.width * scale),
                Math.ceil(sourceSize.height * scale),
            );
        } else {
            artworkTransform.setContentSize(visibleWidth, visibleHeight);
        }

        const progressPanelCenterY = -visibleHeight * 0.28;
        progressPanel.setPosition(0, progressPanelCenterY);

        // The girl's boots end at source Y=727 in the 1280 px-tall artwork.
        // Center the title between that visual boundary and the panel's top.
        const girlBottomY =
            artworkTransform.contentSize.height * (0.5 - layout.subjectBottomFromTop);
        const progressPanelTopY =
            progressPanelCenterY + progressPanelTransform.contentSize.height * 0.5;
        titleNode.setPosition(0, (girlBottomY + progressPanelTopY) * 0.5);
    };

    const resizeEvent = 'canvas-resize';
    view.on(resizeEvent, updateLayout);
    updateLayout();

    const destroy = () => {
        view.off(resizeEvent, updateLayout);
        if (root.isValid) root.destroy();
    };

    return {
        node: root,
        setArtwork: (spriteFrame) => {
            if (!root.isValid || !spriteFrame) return;
            artwork.spriteFrame = spriteFrame;
            updateLayout();
            removeDirectStartupArtworkAfterCanvasPaint();
        },
        setTitleArtwork: (spriteFrame) => {
            if (!root.isValid || !spriteFrame) return;
            titleSprite.spriteFrame = spriteFrame;
        },
        setPanelArtwork: (spriteFrame) => {
            if (!root.isValid || !spriteFrame) return;
            panelSprite.spriteFrame = spriteFrame;
        },
        setProgressArtwork: (spriteFrame) => {
            if (!root.isValid || !spriteFrame) return;
            fillSprite.spriteFrame = spriteFrame;
            // Cocos 在 SpriteFrame 为空时切换 FILLED 模式可能中断节点创建，
            // 因此必须先绑定贴图，再启用横向裁切。
            fillSprite.type = Sprite.Type.FILLED;
            fillSprite.fillType = Sprite.FillType.HORIZONTAL;
            fillSprite.fillStart = 0;
            fillSprite.fillRange = currentProgress;
        },
        setProgress: (completed, total) => {
            if (!root.isValid) return;
            const safeTotal = Math.max(0, total);
            const safeCompleted = Math.max(0, Math.min(completed, safeTotal));
            const ratio = safeTotal > 0 ? safeCompleted / safeTotal : 0;
            counterLabel.string = `加载资源：${safeCompleted} / ${safeTotal}`;
            redrawProgress(ratio);
        },
        finish: () =>
            new Promise<void>((resolve) => {
                if (!root.isValid || !root.parent?.isValid) {
                    resolve();
                    return;
                }

                const parentNode = root.parent;
                root.setSiblingIndex(parentNode.children.length - 1);
                const clouds = createCloudTransitionLayer(parentNode);
                const enterDuration = 0.42;
                const revealDuration = 0.58;
                let entered = 0;
                const onEntered = () => {
                    entered += 1;
                    if (entered < 2) return;

                    // Switch scenes only after the cloud curtains overlap, so
                    // neither a black frame nor a partially built MainUI leaks.
                    removeDirectStartupArtwork();
                    rootOpacity.opacity = 0;
                    destroy();

                    let revealed = 0;
                    const onRevealed = () => {
                        revealed += 1;
                        if (revealed < 2) return;
                        if (clouds.node.isValid) clouds.node.destroy();
                        resolve();
                    };
                    tween(clouds.left)
                        .delay(0.08)
                        .to(
                            revealDuration,
                            { position: new Vec3(clouds.openLeftX, 0, 0) },
                            { easing: 'sineInOut' },
                        )
                        .call(onRevealed)
                        .start();
                    tween(clouds.right)
                        .delay(0.08)
                        .to(
                            revealDuration,
                            { position: new Vec3(clouds.openRightX, 0, 0) },
                            { easing: 'sineInOut' },
                        )
                        .call(onRevealed)
                        .start();
                };

                tween(clouds.left)
                    .to(
                        enterDuration,
                        { position: new Vec3(clouds.closedLeftX, 0, 0) },
                        { easing: 'sineOut' },
                    )
                    .call(onEntered)
                    .start();
                tween(clouds.right)
                    .to(
                        enterDuration,
                        { position: new Vec3(clouds.closedRightX, 0, 0) },
                        { easing: 'sineOut' },
                    )
                    .call(onEntered)
                    .start();
            }),
        destroy,
    };
}
