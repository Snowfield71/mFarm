/**
 * Backward-compatible facade for the modular land and building implementation.
 * Existing imports can continue to target MainUILand while feature code stays focused.
 */
export {
  refreshLand,
  refreshPasture,
  refreshPastureSlot,
  createPastureTile,
  getPasturePosition,
  handlePastureClick,
  refreshLandBlock,
  animateUnlockLand,
  updateGrowingProgress,
  createLandTile,
  createLockedTile,
  animateUnlockPasture,
  drawTileBase,
  drawOccupiedMarker,
  updateHarvestAllButton,
  animatePlanting,
  animateHarvest,
  getLandPosition,
  getNextLandUnlockLevel,
} from "./MainUILandView";
export {
  handleLandClick,
  harvestAllMatureCrops,
  handleLockedLandClick,
  plantCrop,
  plantUniversalSeed,
  ownedPlantableCrops,
  openSeedBubble,
  openBuildingBubble,
  closeBuildingBubble,
  placeBuilding,
  updatePastureCollectAllButton,
  collectAllPastureProducts,
  closeSeedBubble,
} from "./MainUILandActions";
export {
  handleOccupiedBuilding,
  updateProductionSceneDialog,
} from "../rooms/MainUIProductionRooms";
export {
  refreshLivestockDialog,
  updateLivestockDialogProgress,
} from "../rooms/MainUILivestockRooms";
export {
  refreshGreenhouseDialog,
  updateGreenhouseDialogProgress,
} from "../rooms/MainUIPlantRooms";
