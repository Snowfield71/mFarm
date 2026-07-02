import { Button, Color, EditBox, Graphics, Label, Mask, Node, ScrollView, UIOpacity, UITransform, Vec3, tween, view } from 'cc';
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
import { ImageCache } from '../../utils/ImageCache';

export function showPanel(ui: any, name: PanelName) {
    ui.closeSeedBubble();
    if (ui.panels[name]?.active) {
        closeActivePanel(ui, name);
        return;
    }
    if (ui.panels.inventory) ui.panels.inventory.active = name === 'inventory';
    if (ui.panels.craft) ui.panels.craft.active = name === 'craft';
    if (ui.panels.shop) ui.panels.shop.active = name === 'shop';
    if (ui.panels.quest) ui.panels.quest.active = name === 'quest';
    if (ui.panels.task) ui.panels.task.active = name === 'task';
    updateBottomNavState(ui, name);

    if (name === 'inventory') ui.renderInventoryPanel();
    if (name === 'craft') ui.renderCraftPanel();
    if (name === 'shop') ui.renderShopPanel();
    if (name === 'quest') {
        ImageCache.getInstance().preloadUiIcons(['catalogBgRight', 'catalogBgLeft']);
        ui.renderQuestPanel();
    }
    if (name === 'task') ui.renderTaskPanel();

}

function closeActivePanel(ui: any, name: PanelName) {
    const panel = ui.panels[name];
    if (panel) panel.active = false;
    clearBottomNavState(ui);
}

function updateBottomNavState(ui: any, active: PanelName) {
    const nav = ui.node.getChildByName('BottomNav');
    if (!nav) return;

    const panels: PanelName[] = ['inventory', 'craft', 'task', 'quest'];
    for (const panel of panels) {
        const btn = nav.getChildByName(`Nav_${panel}`);
        if (!btn) continue;
        const isActive = panel === active;
        fillRoundRect(btn, 76, 58, 13, isActive ? new Color(255, 238, 174, 255) : new Color(255, 247, 210, 255));
        strokeRoundRect(btn, 76, 58, 13, isActive ? new Color(102, 55, 34, 235) : new Color(126, 78, 48, 225), isActive ? 2.6 : 2.2);

        const halo = btn.getChildByName('Halo');
        if (halo) {
            fillRoundRect(halo, isActive ? 44 : 38, isActive ? 34 : 30, 14, isActive ? new Color(255, 219, 126, 160) : new Color(255, 234, 170, 120));
        }
        const shade = btn.getChildByName('Shade');
        if (shade) {
            fillRoundRect(shade, isActive ? 52 : 46, 8, 4, new Color(118, 70, 42, isActive ? 92 : 70));
        }
        const icon = btn.getChildByName('Icon');
        if (icon) {
            const baseIconY = panel === 'quest' ? 16 : 18;
            icon.setPosition(0, isActive ? baseIconY + 2 : baseIconY);
            tween(icon)
                .to(0.12, { scale: new Vec3(isActive ? 1.08 : 1, isActive ? 1.08 : 1, 1) }, { easing: 'backOut' })
                .start();
        }
        const indicator = btn.getChildByName('Indicator');
        if (indicator) indicator.active = isActive;
    }
}

function clearBottomNavState(ui: any) {
    const nav = ui.node.getChildByName('BottomNav');
    if (!nav) return;

    const panels: PanelName[] = ['inventory', 'craft', 'task', 'quest'];
    for (const panel of panels) {
        const btn = nav.getChildByName(`Nav_${panel}`);
        if (!btn) continue;
        fillRoundRect(btn, 76, 58, 13, new Color(255, 247, 210, 255));
        strokeRoundRect(btn, 76, 58, 13, new Color(126, 78, 48, 225), 2.2);

        const icon = btn.getChildByName('Icon');
        if (icon) {
            icon.setScale(new Vec3(1, 1, 1));
            icon.setPosition(0, panel === 'quest' ? 16 : 18);
        }
        const indicator = btn.getChildByName('Indicator');
        if (indicator) indicator.active = false;
    }
}

export function clearPanelBody(ui: any, panel: Node): Node {
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

export function renderInventoryPanel(ui: any) {
    const panel = ui.panels.inventory!;
    const body = ui.clearPanelBody(panel);
    const inv = InventorySystem.getInstance();
    const usage = inv.getUsage();

    const info = ui.makeLabel(`容量 ${usage.used}/${usage.max}`, 13, new Color(92, 104, 82), false, -100, 152, 120, 20);
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
            const icon = ui.createItemIcon(slot.itemId, 36);
            icon.setPosition(0, 4);
            cell.addChild(icon);

            const badge = new Node('CountBadge');
            badge.setPosition(13, -15);
            badge.addComponent(UITransform).setContentSize(28, 15);
            fillRoundRect(badge, 28, 15, 7, new Color(54, 112, 55, 225));
            const countLabel = ui.makeLabel(`x${slot.count}`, 10, new Color(255, 255, 255), true, 0, 0, 26, 13);
            badge.addChild(countLabel);
            cell.addChild(badge);
            cell.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.openSellDialog(index));
        }
        body.addChild(cell);
    });

}

export function renderShopPanel(ui: any) {
    ui.renderShopPanelScrollable();
    return;

    const panel = ui.panels.shop!;
    const body = ui.clearPanelBody(panel);
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

        const icon = ui.createItemIcon(crop.id, 28);
        icon.setPosition(-120, 0);
        row.addChild(icon);
        const name = ui.makeLabel(`${ui.itemName(crop.id)} Lv.${crop.unlockLevel}`, 13, new Color(54, 72, 46), true, -60, 7, 105, 16);
        name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(name);
        const price = ui.makeLabel(`${Math.max(5, Math.floor(crop.sellPrice * 0.8))}金`, 11, new Color(194, 132, 20), false, -60, -9, 86, 14);
        price.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(price);

        const buy = new Node('Buy');
        buy.addComponent(UITransform).setContentSize(62, 26);
        buy.setPosition(103, 0);
        fillRoundRect(buy, 62, 26, 9, unlocked ? new Color(76, 188, 83) : new Color(165, 170, 160));
        buy.addChild(ui.makeLabel(unlocked ? '购买' : '未解锁', 12, new Color(255, 255, 255), true, 0, 0, 60, 22));
        buy.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.buySeed(crop));
        row.addChild(buy);
        body.addChild(row);
    });

}

export function renderShopPanelScrollable(ui: any) {
    const panel = ui.panels.shop!;
    const body = ui.clearPanelBody(panel);
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

        const icon = ui.createItemIcon(crop.id, 34);
        icon.setPosition(-112, 0);
        row.addChild(icon);

        const name = ui.makeLabel(`${ui.itemName(crop.id)} Lv.${crop.unlockLevel}`, 12, new Color(54, 72, 46), true, -52, 8, 124, 16);
        name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(name);

        const price = ui.getSeedBuyPrice(crop);
        const priceLabel = ui.makeLabel(`${price} 金`, 10, new Color(194, 132, 20), false, -52, -9, 90, 14);
        priceLabel.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(priceLabel);

        const buy = new Node('Buy');
        buy.addComponent(UITransform).setContentSize(58, 26);
        buy.setPosition(101, 0);
        fillRoundRect(buy, 58, 26, 9, unlocked ? new Color(76, 188, 83) : new Color(165, 170, 160));
        buy.addChild(ui.makeLabel(unlocked ? '购买' : '未解锁', 11, new Color(255, 255, 255), true, 0, 0, 54, 22));
        buy.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.buySeed(crop));
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
    ui.scheduleOnce(() => {
        if (!viewport.isValid || !content.isValid) return;
        scrollView.scrollToTop(0);
        syncThumb();
    }, 0);

}

export function renderCraftPanel(ui: any) {
    const panel = ui.panels.craft!;
    const body = ui.clearPanelBody(panel);
    const gm = GameManager.getInstance();
    const craft = CraftSystem.getInstance();
    const inv = InventorySystem.getInstance();
    const recipes = getRecipesByLevel(gm.playerLevel);
    const active = craft.getAllActiveCrafts();

    const status = ui.makeLabel(`进行中 ${active.length}/${GameValues.MAX_CRAFT_TABLES}`, 12, new Color(92, 104, 82), false, -8, 152, 260, 20);
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

        const icon = ui.createItemIcon(recipe.product.itemId, 22);
        icon.setPosition(-118, 0);
        row.addChild(icon);

        const title = ui.makeLabel(ui.recipeName(recipe), 10, new Color(54, 72, 46), true, -48, 5, 120, 14);
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

        const percent = ui.makeLabel(`${Math.floor(progress)}%`, 10, new Color(76, 166, 78), true, 106, 0, 46, 16);
        percent.name = 'CraftProgressText';
        row.addChild(percent);
        body.addChild(row);
    });

    if (active.length > visibleActiveRows) {
        const more = ui.makeLabel(`还有 ${active.length - visibleActiveRows} 个合成中`, 10, new Color(92, 104, 82), false, -8, 102, 180, 16);
        more.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        body.addChild(more);
    }

    const recipeTop = active.length > 0
        ? (active.length > visibleActiveRows ? 76 : 92)
        : 136;
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

        const productIcon = ui.createItemIcon(recipe.product.itemId, 28);
        productIcon.setPosition(-114, 0);
        row.addChild(productIcon);
        const name = ui.makeLabel(`${ui.recipeName(recipe)} x${recipe.product.count}`, 12, new Color(54, 72, 46), true, -18, 9, 128, 16);
        name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(name);
        const materialText = recipe.materials.map(m => `${ui.itemName(m.itemId)} ${inv.getItemCount(m.itemId)}/${m.count}`).join(' ');
        const mats = ui.makeLabel(materialText, 10, new Color(108, 112, 96), false, -18, -9, 128, 14);
        mats.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(mats);

        const start = new Node('Start');
        start.addComponent(UITransform).setContentSize(58, 28);
        start.setPosition(104, 0);
        fillRoundRect(start, 58, 28, 9, new Color(76, 188, 83));
        start.addChild(ui.makeLabel('合成', 12, new Color(255, 255, 255), true, 0, 0, 54, 22));
        start.addComponent(Button).node.on(Node.EventType.TOUCH_END, () => ui.startCraft(recipe.id));
        row.addChild(start);
        content.addChild(row);
    });

    ui.scheduleOnce(() => {
        if (!recipeViewport.isValid || !content.isValid) return;
        scrollView.scrollToTop(0);
    }, 0);

}

export function renderQuestPanel(ui: any) {
    const panel = ui.panels.quest!;
    const body = ui.clearPanelBody(panel);
    const gm = GameManager.getInstance();
    clearCatalogPanelChrome(panel);
    body.getComponent(UITransform)!.setContentSize(Design.WIDTH, 540);
    body.setPosition(0, 0);
    const close = panel.getChildByName('Close');
    if (close) close.active = false;

    const items: ItemDef[] = [];
    for (const id in ITEM_DB) {
        if (Object.prototype.hasOwnProperty.call(ITEM_DB, id)) items.push(ITEM_DB[id]);
    }
    items.sort((a, b) => {
        const levelA = ui.catalogLevel(a);
        const levelB = ui.catalogLevel(b);
        if (levelA !== levelB) return levelA - levelB;
        if (a.rarity !== b.rarity) return a.rarity - b.rarity;
        return a.category - b.category;
    });

    const progress = gm.getCatalogProgress();
    const pageSize = 9;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    ui.catalogPage = Math.max(0, Math.min(pageCount - 1, ui.catalogPage || 0));

    drawCatalogBackground(ui, body, ui.catalogPage === 0);

    const pageItems = items.slice(ui.catalogPage * pageSize, ui.catalogPage * pageSize + pageSize);
    pageItems.forEach((item, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const card = createCatalogCard(ui, gm, item, row, col);
        card.setPosition(-95 + col * 98 - (col > 0 ? 5 : 0) - (col === 0 ? 3 : 0), 94 - row * 126 - row * 5 - (row === 2 ? 5 : 0));
        body.addChild(card);
    });

    drawCatalogProgress(ui, body, progress.unlocked, progress.total, ui.catalogPage + 1, pageCount);
    createCatalogCloseHitArea(ui, panel, body);
    createCatalogPageTurnHitArea(ui, body, ui.catalogPage, pageCount);
}

function clearCatalogPanelChrome(panel: Node) {
    const graphics = panel.getComponents(Graphics);
    graphics.forEach(g => g.clear());
}

function drawCatalogBackground(ui: any, body: Node, firstPage: boolean) {
    const bg = new Node('CatalogImageBackground');
    bg.addComponent(UITransform).setContentSize(Design.WIDTH + 10, 540);
    bg.setPosition(-17, 0);
    ui.applyUiIcon(firstPage ? 'catalogBgRight' : 'catalogBgLeft', bg);
    body.addChild(bg);
}

function createCatalogCard(ui: any, gm: GameManager, item: ItemDef, row = 0, col = 0): Node {
    const discovered = gm.hasDiscoveredItem(item.id);
    const displayUnlockLevel = ui.catalogLevel(item);
    const levelUnlocked = displayUnlockLevel <= gm.playerLevel;
    const card = new Node(`CatalogCard_${item.id}`);
    card.addComponent(UITransform).setContentSize(96, 116);

    const icon = ui.createItemIcon(item.id, item.id === 'pasta' ? 64 : 70, true);
    icon.setPosition(item.id === 'pasta' ? 3 : 0, 28);
    if (!discovered) {
        const opacity = icon.addComponent(UIOpacity);
        opacity.opacity = levelUnlocked ? 120 : 72;
    }
    card.addChild(icon);

    const name = ui.makeLabel(ui.itemName(item.id), 14, new Color(88, 45, 24), true, 0, -30, 92, 18);
    name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.CENTER;
    card.addChild(name);

    if (!discovered || !levelUnlocked) {
        const lockH = row === 0 ? 123 : row === 1 ? 124 : 125;
        const lockY = row === 0 ? 16 : row === 1 ? 17 : 21;
        const lockX = -3 - (col > 0 ? 2 : 0) + (col > 0 ? 5 : 0);
        const lock = new Node('LockShade');
        lock.addComponent(UITransform).setContentSize(85, lockH);
        lock.setPosition(lockX, lockY);
        fillRoundRect(lock, 85, lockH, 9, new Color(80, 68, 54, 38));
        if (!levelUnlocked) {
            lock.addChild(ui.makeLabel(`Lv.${displayUnlockLevel}`, 11, new Color(255, 248, 218), true, 0, 0, 46, 16));
        }
        card.addChild(lock);
    }

    return card;
}

function drawCatalogProgress(ui: any, body: Node, unlocked: number, total: number, page: number, pageCount: number) {
    const ratio = total > 0 ? Math.max(0, Math.min(1, unlocked / total)) : 0;
    const trackW = 148;
    const track = new Node('CatalogProgressTrack');
    track.setPosition(-6, -237);
    fillRoundRect(track, trackW, 13, 7, new Color(154, 104, 80, 230));
    body.addChild(track);

    const fill = new Node('CatalogProgressFill');
    fill.setPosition(-trackW / 2 + (trackW * ratio) / 2, 0);
    fillRoundRect(fill, trackW * ratio, 9, 5, new Color(255, 203, 79, 255));
    track.addChild(fill);

    const knob = new Node('CatalogProgressKnob');
    knob.setPosition(-trackW / 2 + trackW * ratio, 0);
    const kg = knob.addComponent(Graphics);
    kg.fillColor = new Color(255, 247, 226, 255);
    kg.circle(0, 0, 9);
    kg.fill();
    kg.strokeColor = new Color(126, 78, 48, 225);
    kg.lineWidth = 1.6;
    kg.circle(0, 0, 9);
    kg.stroke();
    track.addChild(knob);

    body.addChild(ui.makeLabel(`${unlocked}/${total}`, 18, new Color(88, 45, 24), true, 98, -237, 70, 24));
}

function createCatalogCloseHitArea(ui: any, panel: Node, body: Node) {
    const close = new Node('CatalogCloseHitArea');
    close.addComponent(UITransform).setContentSize(54, 54);
    close.setPosition(131, 212);
    const g = close.addComponent(Graphics);
    g.strokeColor = new Color(132, 72, 32, 255);
    g.lineWidth = 4;
    g.moveTo(-7.5, 7.5);
    g.lineTo(7.5, -7.5);
    g.moveTo(7.5, 7.5);
    g.lineTo(-7.5, -7.5);
    g.stroke();
    close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
        event?.stopPropagation?.();
        panel.active = false;
        clearBottomNavState(ui);
    });
    body.addChild(close);
}

function createCatalogPageTurnHitArea(ui: any, body: Node, pageIndex: number, pageCount: number) {
    if (pageIndex > 0) {
        const prev = new Node('CatalogPrevPageHitArea');
        prev.addComponent(UITransform).setContentSize(74, 64);
        prev.setPosition(-102, -228);
        prev.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            ui.catalogPage = Math.max(0, pageIndex - 1);
            ui.renderQuestPanel();
        });
        body.addChild(prev);
    }

    if (pageCount > 1 && pageIndex < pageCount - 1) {
        const next = new Node('CatalogNextPageHitArea');
        next.addComponent(UITransform).setContentSize(74, 64);
        next.setPosition(151, -228);
        next.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
            if (pageIndex >= pageCount - 1) return;
            ui.catalogPage = Math.min(pageCount - 1, pageIndex + 1);
            ui.renderQuestPanel();
        });
        body.addChild(next);
    } else if (pageCount > 1) {
        const nextBlocker = new Node('CatalogNextPageBlocker');
        nextBlocker.addComponent(UITransform).setContentSize(74, 64);
        nextBlocker.setPosition(151, -228);
        nextBlocker.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
            event?.stopPropagation?.();
        });
        body.addChild(nextBlocker);
    }
}

function renderQuestPanelLegacy(ui: any) {
    const panel = ui.panels.quest!;
    const body = ui.clearPanelBody(panel);
    const gm = GameManager.getInstance();
    const inv = InventorySystem.getInstance();
    const land = LandSystem.getInstance();
    const items: ItemDef[] = [];
    for (const id in ITEM_DB) {
        if (Object.prototype.hasOwnProperty.call(ITEM_DB, id)) items.push(ITEM_DB[id]);
    }
    items.sort((a, b) => {
        const levelA = ui.catalogLevel(a);
        const levelB = ui.catalogLevel(b);
        if (levelA !== levelB) return levelA - levelB;
        if (a.rarity !== b.rarity) return a.rarity - b.rarity;
        return a.category - b.category;
    });

    const progress = gm.getCatalogProgress();
    const summary = ui.makeLabel(`收集 ${progress.unlocked}/${progress.total}  成就 ${gm.achievements.length}`, 12, new Color(92, 104, 82), false, -94, 152, 190, 20);
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

        const icon = ui.createItemIcon(item.id, 32);
        icon.setPosition(-112, 0);
        row.addChild(icon);
        if (!discovered) icon.setScale(0.75, 0.75, 1);

        const name = ui.makeLabel(`${discovered ? ui.itemName(item.id) : '未发现'} Lv.${ui.catalogLevel(item)}`, 12, new Color(54, 72, 46), true, -52, 11, 140, 16);
        name.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(name);

        const own = inv.getItemCount(item.id);
        const plantText = item.isCrop ? ` 种植 ${land.getPlantCount(item.id)} 次` : '';
        const info = ui.makeLabel(`拥有 ${own}${plantText}`, 10, new Color(108, 112, 96), false, -52, -6, 160, 14);
        info.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(info);

        const rarity = ui.makeLabel(discovered ? `${item.rarity}星` : (levelUnlocked ? '待获得' : '未解锁'), 10, discovered ? new Color(194, 132, 20) : new Color(150, 156, 140), true, 104, 0, 56, 18);
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
    ui.scheduleOnce(() => {
        if (!viewport.isValid || !content.isValid) return;
        scrollView.scrollToTop(0);
        syncThumb();
    }, 0);

}

export function renderTaskPanel(ui: any) {
    const panel = ui.panels.task!;
    const body = ui.clearPanelBody(panel);
    const gm = GameManager.getInstance();
    const quests = gm.getDailyQuests();
    const done = quests.filter(q => q.claimed || q.progress >= q.target).length;

    const summary = ui.makeLabel(`今日进度 ${done}/${quests.length}`, 13, new Color(92, 104, 82), false, -92, 152, 190, 20);
    summary.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
    body.addChild(summary);

    const rowH = 48;
    const gap = 8;
    quests.forEach((quest, index) => {
        const y = 116 - index * (rowH + gap);
        const complete = quest.progress >= quest.target;
        const row = new Node(`Task_${quest.id}`);
        row.addComponent(UITransform).setContentSize(276, rowH);
        row.setPosition(0, y);
        fillRoundRect(row, 276, rowH, 9, complete ? new Color(248, 252, 238, 248) : new Color(238, 244, 226, 238));
        strokeRoundRect(row, 276, rowH, 9, complete ? new Color(116, 190, 96, 150) : new Color(154, 196, 138, 100), 1.2);

        const title = ui.makeLabel(quest.title, 13, new Color(54, 72, 46), true, -58, 12, 138, 16);
        title.getComponent(Label)!.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(title);

        const progressW = 116;
        const progressBg = new Node('TaskProgressBg');
        progressBg.setPosition(-58, -10);
        fillRoundRect(progressBg, progressW, 8, 4, new Color(184, 210, 172, 170));
        row.addChild(progressBg);
        const fillW = Math.max(4, progressW * Math.min(quest.progress, quest.target) / quest.target);
        const progressFill = new Node('TaskProgressFill');
        progressFill.setPosition(-progressW / 2 + fillW / 2, 0);
        fillRoundRect(progressFill, fillW, 8, 4, complete ? new Color(76, 188, 83, 245) : new Color(255, 218, 72, 245));
        progressBg.addChild(progressFill);

        const progressText = ui.makeLabel(`${quest.progress}/${quest.target}`, 10, new Color(92, 104, 82), true, 10, -10, 56, 14);
        row.addChild(progressText);

        const rewardText = `${quest.rewardGold ? `+${quest.rewardGold}金` : ''}${quest.rewardDiamond ? `+${quest.rewardDiamond}钻` : ''}`;
        const reward = ui.makeLabel(rewardText, 11, new Color(194, 132, 20), true, 48, 12, 62, 16);
        row.addChild(reward);

        const button = new Node('TaskButton');
        button.addComponent(UITransform).setContentSize(54, 28);
        button.setPosition(105, 0);
        const buttonColor = quest.claimed
            ? new Color(178, 188, 174)
            : complete
                ? new Color(76, 188, 83)
                : new Color(190, 198, 184);
        fillRoundRect(button, 54, 28, 9, buttonColor);
        button.addChild(ui.makeLabel(quest.claimed ? '已领' : (complete ? '领取' : '未完'), 12, new Color(255, 255, 255), true, 0, 0, 50, 20));
        if (complete && !quest.claimed) {
            button.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
                event?.stopPropagation?.();
                if (gm.claimDailyQuest(quest.id)) {
                    ui.toast('任务奖励已领取');
                    ui.renderTaskPanel();
                }
            });
        }
        row.addChild(button);
        body.addChild(row);
    });
}

export function buySeed(ui: any, crop: ItemDef) {
    const gm = GameManager.getInstance();
    if (crop.unlockLevel > gm.playerLevel) {
        ui.toast(`Lv.${crop.unlockLevel} 解锁`);
        return;
    }
    const price = ui.getSeedBuyPrice(crop);
    if (!gm.spendGold(price)) {
        ui.toast('金币不足');
        return;
    }
    InventorySystem.getInstance().addItem(crop.id, 1);
    ui.toast(`购买 ${ui.itemName(crop.id)} x1`);

}

export function getSeedBuyPrice(ui: any, crop: ItemDef): number {
    return Math.max(crop.sellPrice, Math.ceil(crop.sellPrice * 1.2));

}

export function startCraft(ui: any, recipeId: string) {
    const id = CraftSystem.getInstance().startCraft(recipeId);
    if (id < 0) {
        ui.toast('材料或等级不足');
        return;
    }
    ui.toast('开始合成');

}
