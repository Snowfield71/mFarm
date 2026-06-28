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
import type { PanelName } from './mainui/MainUITypes';
import * as MainUIScene from './mainui/MainUIScene';
import * as MainUILand from './mainui/MainUILand';
import * as MainUIPanels from './mainui/MainUIPanels';
import * as MainUIDialogs from './mainui/MainUIDialogs';
import * as MainUIEvents from './mainui/MainUIEvents';
import {
    createLabel, createItemIcon, applyUiIcon,
    getItemDisplayName, getRecipeDisplayName, seededRandom,
} from './utils/UIWidgetFactory';

const { ccclass } = _decorator;

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
        this.createTaskEntry();
        this.createDialogRoot();
        this.createBubbleRoot();
        this.bindEvents();
        this.refreshAll();
    }

    update(dt: number) {
        this.progressRefreshTimer += dt;
        if (this.progressRefreshTimer < 0.16) return;
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
        return MainUIScene.createBackground.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createGrassPatches(parent: Node, viewWidth: number, grassHeight: number, grassTop: number) {
        return MainUIScene.createGrassPatches.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private drawGrassPatch(parent: Node, x: number, y: number, size: number, color: Color) {
        return MainUIScene.drawGrassPatch.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createSun(x: number, y: number): Node {
        return MainUIScene.createSun.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createCloud(x: number, y: number, size: number) {
        return MainUIScene.createCloud.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createTopBar() {
        return MainUIScene.createTopBar.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createCurrencyArea() {
        return MainUIScene.createCurrencyArea.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createCurrencyEntry(parent: Node, icon: string, labelName: string, value: string, x: number, color: Color) {
        return MainUIScene.createCurrencyEntry.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createLandArea() {
        return MainUIScene.createLandArea.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private layoutLandArea() {
        return MainUIScene.layoutLandArea.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private getLandGridSize(): { width: number; height: number } {
        return MainUIScene.getLandGridSize(this);
    }

    private createBottomNav() {
        return MainUIScene.createBottomNav.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createPanels() {
        return MainUIScene.createPanels.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createTaskEntry() {
        return MainUIScene.createTaskEntry.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createPanel(title: string, w: number, h: number): Node {
        return MainUIScene.createPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createDialogRoot() {
        return MainUIScene.createDialogRoot.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createBubbleRoot() {
        return MainUIScene.createBubbleRoot.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    // Land
    private refreshLand() {
        return MainUILand.refreshLand.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private refreshLandBlock(blockId: number) {
        return MainUILand.refreshLandBlock.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private animateUnlockLand(index: number) {
        return MainUILand.animateUnlockLand.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private updateGrowingProgress(blockId: number, progress: number) {
        return MainUILand.updateGrowingProgress.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createLandTile(block: LandBlock): Node {
        return MainUILand.createLandTile.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createLockedTile(index: number): Node {
        return MainUILand.createLockedTile.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private drawTileBase(tile: Node, color: Color, locked = false) {
        return MainUILand.drawTileBase.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private drawOccupiedMarker(tile: Node) {
        return MainUILand.drawOccupiedMarker.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private createWaterProgress(progress: number): Node {
        return MainUILand.createWaterProgress.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private drawWaterProgress(node: Node, progress: number) {
        return MainUILand.drawWaterProgress.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private animatePlanting(blockId: number) {
        return MainUILand.animatePlanting.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private getLandPosition(index: number): { x: number; y: number } {
        return MainUILand.getLandPosition(this, index);
    }

    private ensureLandCountForLevel() {
        return MainUILand.ensureLandCountForLevel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private getAutoUnlockedLandCount(): number {
        return MainUILand.getAutoUnlockedLandCount.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private getNextLandUnlockLevel(index: number): number {
        return MainUILand.getNextLandUnlockLevel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    // Actions
    private handleLandClick(blockId: number) {
        return MainUILand.handleLandClick.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private handleLockedLandClick(index: number) {
        return MainUILand.handleLockedLandClick.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private harvestAllMatureCrops() {
        return MainUILand.harvestAllMatureCrops.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private plantCrop(blockId: number, cropId: string) {
        return MainUILand.plantCrop.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private ownedPlantableCrops(): ItemDef[] {
        return MainUILand.ownedPlantableCrops.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private openSeedBubble(blockId: number) {
        return MainUILand.openSeedBubble.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private closeSeedBubble() {
        return MainUILand.closeSeedBubble.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    // Panels
    private showPanel(name: PanelName) {
        return MainUIPanels.showPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private clearPanelBody(panel: Node): Node {
        return MainUIPanels.clearPanelBody.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private renderInventoryPanel() {
        return MainUIPanels.renderInventoryPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private renderShopPanel() {
        return MainUIPanels.renderShopPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private renderShopPanelScrollable() {
        return MainUIPanels.renderShopPanelScrollable.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private renderCraftPanel() {
        return MainUIPanels.renderCraftPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private renderQuestPanel() {
        return MainUIPanels.renderQuestPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private renderTaskPanel() {
        return MainUIPanels.renderTaskPanel.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private buySeed(crop: ItemDef) {
        return MainUIPanels.buySeed.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private getSeedBuyPrice(crop: ItemDef): number {
        return MainUIPanels.getSeedBuyPrice.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private startCraft(recipeId: string) {
        return MainUIPanels.startCraft.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private openSellDialog(slotIndex: number) {
        return MainUIDialogs.openSellDialog.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private applyEditBoxTextColor(editBox: EditBox, color: Color, placeholderColor: Color) {
        return MainUIDialogs.applyEditBoxTextColor.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    // Dialogs and feedback
    private showDialog(title: string, message: string, buttons: Array<{ text: string; cb: () => void }>) {
        return MainUIDialogs.showDialog(this, title, message, buttons);
    }

    private toast(text: string) {
        return MainUIDialogs.toast.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    // Refresh
    private bindEvents() {
        return MainUIEvents.bindEvents.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private refreshAll() {
        return MainUIEvents.refreshAll.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private refreshTopBar() {
        return MainUIEvents.refreshTopBar.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
    }

    private updateCraftProgressViews() {
        return MainUIEvents.updateCraftProgressViews.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
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
