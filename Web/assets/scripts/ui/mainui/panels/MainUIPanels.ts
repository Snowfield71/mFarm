/**
 * Backward-compatible facade for the modular main UI panel implementation.
 * Feature code lives in focused modules to keep each file reviewable.
 */
export {
  showPanel,
  clearPanelBody,
  renderInventoryPanel,
  refreshInventoryGrid,
} from "./MainUIPanelCore";
export {
  renderShopPanel,
  showTitlePanel,
  renderTitlePanel,
  renderShopPanelScrollable,
  buySeed,
  getSeedBuyPrice,
  useInventoryTool,
  useSpecialItem,
} from "./MainUIShopPanel";
export {
  renderCraftPanel,
  refreshCraftPanelDynamicSections,
  startCraft,
} from "./MainUICraftPanel";
export { renderQuestPanel, drawRibbonTitle } from "./MainUICatalogPanel";
export {
  renderTaskPanel,
  refreshTaskCategoryContent,
  renderDailySignInPanel,
  renderAchievementPanel,
  refreshAchievementCategoryContent,
} from "./MainUITaskPanels";
