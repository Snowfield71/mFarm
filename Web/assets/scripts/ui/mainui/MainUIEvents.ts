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

export function bindEvents(ui: any) {
    const evt = EventManager.getInstance();
    evt.on('goldChanged', () => ui.refreshTopBar());
    evt.on('diamondChanged', () => ui.refreshTopBar());
    evt.on('experienceChanged', () => ui.refreshTopBar());
    evt.on('levelUp', () => ui.refreshAll());
    evt.on('inventoryChanged', () => {
        if (ui.panels.inventory?.active) ui.renderInventoryPanel();
        if (ui.panels.quest?.active) ui.renderQuestPanel();
        updateTaskEntryState(ui);
    });
    evt.on('craftStarted', () => {
        if (ui.panels.craft?.active) ui.renderCraftPanel();
    });
    evt.on('craftCompleted', (data: any) => {
        ui.toast(`${ui.recipeName(data.recipe)} 完成`);
        if (ui.panels.craft?.active) ui.renderCraftPanel();
        if (ui.panels.inventory?.active) ui.renderInventoryPanel();
        if (ui.panels.quest?.active) ui.renderQuestPanel();
        updateTaskEntryState(ui);
    });
    evt.on('achievementUnlocked', () => {
        if (ui.panels.quest?.active) ui.renderQuestPanel();
    });
    evt.on('dailyQuestChanged', () => {
        if (ui.panels.task?.active) ui.renderTaskPanel();
        updateTaskEntryState(ui);
    });
    evt.on('cropMatured', (data: any) => {
        ui.refreshLandBlock(data.blockId);
    });
    evt.on('landExpanded', () => {
        if (ui.suppressNextLandExpandedRefresh) {
            ui.suppressNextLandExpandedRefresh = false;
            return;
        }
        ui.refreshLand();
    });

}

export function refreshAll(ui: any) {
    ui.refreshTopBar();
    ui.refreshLand();
    if (ui.panels.inventory?.active) ui.renderInventoryPanel();
    if (ui.panels.shop?.active) ui.renderShopPanel();
    if (ui.panels.craft?.active) ui.renderCraftPanel();
    if (ui.panels.quest?.active) ui.renderQuestPanel();
    if (ui.panels.task?.active) ui.renderTaskPanel();
    updateTaskEntryState(ui);

}

export function refreshTopBar(ui: any) {
    const gm = GameManager.getInstance();
    const level = ui.topBar.getChildByName('LevelBadge')?.getChildByName('LevelText');
    if (level) level.getComponent(Label)!.string = `Lv.${gm.playerLevel}`;
    const gold = ui.topBar.getChildByName('CurrencyArea')?.getChildByName('GoldDisplay');
    if (gold) {
        const label = gold.getComponent(Label)!;
        label.string = formatCurrency(gm.gold);
        label.fontSize = label.string.length > 4 ? 13 : 15;
    }
    const diamond = ui.topBar.getChildByName('CurrencyArea')?.getChildByName('DiamondDisplay');
    if (diamond) {
        const label = diamond.getComponent(Label)!;
        label.string = formatCurrency(gm.diamond);
        label.fontSize = label.string.length > 4 ? 13 : 15;
    }
    const expText = ui.topBar.getChildByName('ExpBg')?.getChildByName('ExpText');
    if (expText) expText.getComponent(Label)!.string = `${gm.experience}/${gm.nextLevelExp}`;
    const fill = ui.topBar.getChildByName('ExpBg')?.getChildByName('ExpFill');
    if (fill) {
        const expBg = ui.topBar.getChildByName('ExpBg');
        const expW = expBg?.getComponent(UITransform)?.width || 100;
        const width = Math.max(0, Math.min(expW, expW * gm.experience / gm.nextLevelExp));
        fillRoundRect(fill, width, 9, 5, new Color(255, 218, 72, 255));
        fill.setPosition(-expW / 2 + width / 2, 0);
    }

}

function formatCurrency(value: number): string {
    const n = Math.max(0, Math.floor(value || 0));
    if (n < 10000) return `${n}`;
    if (n < 100000000) {
        const v = n / 10000;
        return `${v >= 10 ? Math.floor(v) : Math.floor(v * 10) / 10}万`;
    }
    const v = n / 100000000;
    return `${v >= 10 ? Math.floor(v) : Math.floor(v * 10) / 10}亿`;
}

function updateTaskEntryState(ui: any) {
    const entry = ui.node.getChildByName('TaskEntry');
    const badge = entry?.getChildByName('Badge');
    if (!badge) return;
    const quests = GameManager.getInstance().getDailyQuests();
    badge.active = quests.some(q => q.progress >= q.target && !q.claimed);
}

export function updateCraftProgressViews(ui: any) {
    const body = ui.panels.craft?.getChildByName('Body');
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
