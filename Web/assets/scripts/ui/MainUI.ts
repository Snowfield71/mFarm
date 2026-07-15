import { _decorator, Color, Component, EditBox, Label, Node } from 'cc';
import { GameManager } from '../core/GameManager';
import { CraftSystem } from '../systems/CraftSystem';
import { LandBlock, LandSystem } from '../systems/LandSystem';
import { ItemCategory, ItemDef } from '../config/ItemConfig';
import { RecipeDef } from '../config/RecipeConfig';
import type { PanelName } from './mainui/MainUITypes';
import * as MainUIScene from './mainui/MainUIScene';
import * as MainUILand from './mainui/MainUILand';
import * as MainUIPanels from './mainui/MainUIPanels';
import * as MainUIDialogs from './mainui/MainUIDialogs';
import * as MainUIEvents from './mainui/MainUIEvents';
import {
    applyUiIcon,
    createItemIcon,
    createLabel,
    getItemDisplayName,
    getRecipeDisplayName,
    seededRandom,
} from './utils/UIWidgetFactory';

const { ccclass } = _decorator;

@ccclass('MainUI')
export class MainUI extends Component {
    private topBar!: Node;
    private artBackground!: Node;
    private landRoot!: Node;
    private pastureRoot!: Node;
    private bubbleRoot!: Node;
    private dialogRoot!: Node;
    private panels: Partial<Record<PanelName, Node>> = {};

    private landTiles: Node[] = [];
    private pastureTiles: Node[] = [];
    private worldSwitchButton!: Node;
    private activeWorld: 'farm' | 'pasture' = 'farm';
    private worldSwitching = false;
    private selectedSeedId: string | null = null;
    private activeBubbleLandId = -1;
    private activePastureSlotId = -1;
    private progressRefreshTimer = 0;
    private suppressNextLandExpandedRefresh = false;
    private taskDetailId?: string;
    private taskCategory: "main" | "daily" | "branch" | "special" = "main";
    private selectedCraftRecipeId = '';
    private craftRecipeScrollOffset = 0;
    private craftArrowX?: number;
    private inventoryCategory: "all" | "seeds" | "materials" | "products" = "all";
    private inventoryScrollOffset = 0;
    private shopCategory: "seeds" | "tools" = "seeds";
    private shopScrollOffset = 0;

    private static readonly LAND_COLS = 3;
    private static readonly LAND_ROWS = 5;
    private static readonly TILE_SIZE = 68;
    private static readonly TILE_GAP = 18;
    private static readonly LAND_UNLOCK_DIAMOND = 10;
    private static readonly BOTTOM_NAV_HEIGHT = 66;

    start() {
        this.createBackground();
        this.createTopBar();
        this.createLandArea();
        this.createBottomNav();
        this.createPanels();
        this.createShopEntry();
        this.createDailySignInEntry();
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
        this.layoutResponsiveFeaturePanels();
    }

    private createBackground() { return MainUIScene.createBackground(this); }
    private createGrassPatches(parent: Node, viewWidth: number, grassHeight: number, grassTop: number, patchTop?: number) {
        return MainUIScene.createGrassPatches(this, parent, viewWidth, grassHeight, grassTop, patchTop);
    }
    private drawGrassPatch(parent: Node, x: number, y: number, size: number, color: Color) {
        return MainUIScene.drawGrassPatch(this, parent, x, y, size, color);
    }
    private createSun(x: number, y: number): Node { return MainUIScene.createSun(this, x, y); }
    private createCloud(x: number, y: number, size: number) { return MainUIScene.createCloud(this, x, y, size); }
    private createTopBar() { return MainUIScene.createTopBar(this); }
    private createCurrencyArea(x?: number, width?: number, height?: number) { return MainUIScene.createCurrencyArea(this, x, width, height); }
    private createCurrencyEntry(parent: Node, icon: string, labelName: string, value: string, y: number, color: Color, iconSize?: number, pillW?: number, iconOffsetY?: number) {
        return MainUIScene.createCurrencyEntry(this, parent, icon, labelName, value, y, color, iconSize, pillW, iconOffsetY);
    }
    private createLandArea() { return MainUIScene.createLandArea(this); }
    private switchWorld(target?: 'farm' | 'pasture') { return MainUIScene.switchWorld(this, target); }
    private layoutLandArea() { return MainUIScene.layoutLandArea(this); }
    private getLandGridSize(): { width: number; height: number } { return MainUIScene.getLandGridSize(this); }
    private createBottomNav() { return MainUIScene.createBottomNav(this); }
    private createPanels() { return MainUIScene.createPanels(this); }
    private layoutResponsiveFeaturePanels() { return MainUIScene.layoutResponsiveFeaturePanels(this); }
    private createShopEntry() { return MainUIScene.createShopEntry(this); }
    private createDailySignInEntry() { return MainUIScene.createDailySignInEntry(this); }
    private createPanel(title: string, w: number, h: number): Node { return MainUIScene.createPanel(this, title, w, h); }
    private closePanelWithAnimation(panel: Node) { return MainUIScene.closePanelWithAnimation(this, panel); }
    private createDialogRoot() { return MainUIScene.createDialogRoot(this); }
    private createBubbleRoot() { return MainUIScene.createBubbleRoot(this); }

    private refreshLand() { return MainUILand.refreshLand(this); }
    private refreshPasture() { return MainUILand.refreshPasture(this); }
    private refreshPastureSlot(slotId: number) { return MainUILand.refreshPastureSlot(this, slotId); }
    private createPastureTile(slot: LandBlock): Node { return MainUILand.createPastureTile(this, slot); }
    private getPasturePosition(index: number): { x: number; y: number } { return MainUILand.getPasturePosition(this, index); }
    private handlePastureClick(slotId: number) { return MainUILand.handlePastureClick(this, slotId); }
    private openBuildingBubble(slotId: number) { return MainUILand.openBuildingBubble(this, slotId); }
    private closeBuildingBubble() { return MainUILand.closeBuildingBubble(this); }
    private collectAllPastureProducts() { return MainUILand.collectAllPastureProducts(this); }
    private refreshLandBlock(blockId: number, animateStage = false) { return MainUILand.refreshLandBlock(this, blockId, animateStage); }
    private animateUnlockLand(index: number) { return MainUILand.animateUnlockLand(this, index); }
    private updateGrowingProgress(blockId: number, progress: number) { return MainUILand.updateGrowingProgress(this, blockId, progress); }
    private createLandTile(block: LandBlock): Node { return MainUILand.createLandTile(this, block); }
    private createLockedTile(index: number): Node { return MainUILand.createLockedTile(this, index); }
    private drawTileBase(tile: Node, color: Color, locked = false) { return MainUILand.drawTileBase(this, tile, color, locked); }
    private drawOccupiedMarker(tile: Node, block: LandBlock) { return MainUILand.drawOccupiedMarker(this, tile, block); }
    private animatePlanting(blockId: number) { return MainUILand.animatePlanting(this, blockId); }
    private getLandPosition(index: number): { x: number; y: number } { return MainUILand.getLandPosition(this, index); }
    private ensureLandCountForLevel() { return MainUILand.ensureLandCountForLevel(this); }
    private getAutoUnlockedLandCount(): number { return MainUILand.getAutoUnlockedLandCount(this); }
    private getNextLandUnlockLevel(index: number): number { return MainUILand.getNextLandUnlockLevel(this, index); }
    private handleLandClick(blockId: number) { return MainUILand.handleLandClick(this, blockId); }
    private handleLockedLandClick(index: number) { return MainUILand.handleLockedLandClick(this, index); }
    private harvestAllMatureCrops() { return MainUILand.harvestAllMatureCrops(this); }
    private plantCrop(blockId: number, cropId: string) { return MainUILand.plantCrop(this, blockId, cropId); }
    private plantUniversalSeed(blockId: number) { return MainUILand.plantUniversalSeed(this, blockId); }
    private placeBuilding(blockId: number, buildingId: string) { return MainUILand.placeBuilding(this, blockId, buildingId); }
    private handleOccupiedBuilding(blockId: number) { return MainUILand.handleOccupiedBuilding(this, blockId); }
    private ownedPlantableCrops(): ItemDef[] { return MainUILand.ownedPlantableCrops(this); }
    private openSeedBubble(blockId: number) { return MainUILand.openSeedBubble(this, blockId); }
    private closeSeedBubble() { return MainUILand.closeSeedBubble(this); }

    private showPanel(name: PanelName) { return MainUIPanels.showPanel(this, name); }
    private clearPanelBody(panel: Node): Node { return MainUIPanels.clearPanelBody(this, panel); }
    private renderInventoryPanel() { return MainUIPanels.renderInventoryPanel(this); }
    private renderShopPanel() { return MainUIPanels.renderShopPanel(this); }
    private renderShopPanelScrollable() { return MainUIPanels.renderShopPanelScrollable(this); }
    private renderCraftPanel() { return MainUIPanels.renderCraftPanel(this); }
    private refreshCraftPanelDynamicSections() { return MainUIPanels.refreshCraftPanelDynamicSections(this); }
    private renderQuestPanel(enterDirection = 0) { return MainUIPanels.renderQuestPanel(this, enterDirection); }
    private renderTaskPanel() { return MainUIPanels.renderTaskPanel(this); }
    private renderDailySignInPanel() { return MainUIPanels.renderDailySignInPanel(this); }
    private renderAchievementPanel() { return MainUIPanels.renderAchievementPanel(this); }
    private buySeed(crop: ItemDef) { return MainUIPanels.buySeed(this, crop); }
    private getSeedBuyPrice(crop: ItemDef): number { return MainUIPanels.getSeedBuyPrice(this, crop); }
    private startCraft(recipeId: string) { return MainUIPanels.startCraft(this, recipeId); }
    private useInventoryTool(slotIndex: number) { return MainUIPanels.useInventoryTool(this, slotIndex); }
    private useSpecialItem(slotIndex: number) { return MainUIPanels.useSpecialItem(this, slotIndex); }

    private openSellDialog(slotIndex: number) { return MainUIDialogs.openSellDialog(this, slotIndex); }
    private applyEditBoxTextColor(editBox: EditBox, color: Color, placeholderColor: Color) {
        return MainUIDialogs.applyEditBoxTextColor(this, editBox, color, placeholderColor);
    }
    private showDialog(title: string, message: string, buttons: Array<{ text: string; cb: () => void }>) {
        return MainUIDialogs.showDialog(this, title, message, buttons);
    }
    private toast(text: string) { return MainUIDialogs.toast(this, text); }

    private bindEvents() { return MainUIEvents.bindEvents(this); }
    private refreshAll() { return MainUIEvents.refreshAll(this); }
    private refreshTopBar() { return MainUIEvents.refreshTopBar(this); }
    private updateCraftProgressViews() { return MainUIEvents.updateCraftProgressViews(this); }

    private makeLabel(text: string, fontSize: number, color: Color, bold: boolean, x: number, y: number, w: number, h: number): Node {
        return createLabel(text, fontSize, color, bold, x, y, w, h);
    }
    private createItemIcon(itemId: string, size: number, trimTransparent = false): Node { return createItemIcon(itemId, size, trimTransparent); }
    private applyUiIcon(name: string, node: Node) { applyUiIcon(name, node); }
    private itemName(itemId: string): string { return getItemDisplayName(itemId); }
    private recipeName(recipe: RecipeDef | undefined): string { return getRecipeDisplayName(recipe); }
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
    private rng(seed: number, offset: number): number { return seededRandom(seed, offset); }
}
