/**
 * 鍥剧墖鍔犺浇缂撳瓨绯荤粺
 *
 * 浠庡悗绔潤鎬佽祫婧愭湇鍔′笅杞界墿鍝?PNG锛屽苟缂撳瓨涓?SpriteFrame銆?
 * 鍓嶇閫氳繃 itemId 鑾峰彇鍥剧墖锛屼笉闇€瑕佸叧蹇冨叿浣?URL銆?
 *
 * 鍚庣鍥剧墖璺緞锛?assets/textures/items/{Category}/item_{itemId}.png
 */

import { SpriteFrame, Texture2D, ImageAsset, assetManager, Color, Rect, Size } from "cc";
import { ServerConfig } from "./ServerConfig";

const TAG = "[ImageCache]";
// Bump when item PNGs are replaced. This versions both remote URLs and local
// SpriteFrame cache keys so hot reloads cannot reuse stale artwork.
const ITEM_ASSET_REVISION = "20260809-17";
// UI backgrounds are served from the same static server and are also cached
// by both the browser and this SpriteFrame cache. Version them independently
// so replacing a dialog PNG is visible without clearing site data.
const UI_ASSET_REVISION = "20260813-69";

/** 鐗╁搧 ID -> 闈欐€佽祫婧愬垎绫荤洰褰?*/
const CATEGORY_MAP: Record<string, string> = {
  // Vegetables
  wheat: "Vegetables/wheat",
  corn: "Vegetables/corn",
  tomato: "Vegetables/tomato",
  wheat_stage_1: "Vegetables/wheat",
  wheat_stage_2: "Vegetables/wheat",
  wheat_stage_3: "Vegetables/wheat",
  corn_stage_1: "Vegetables/corn",
  corn_stage_2: "Vegetables/corn",
  corn_stage_3: "Vegetables/corn",
  tomato_stage_1: "Vegetables/tomato",
  tomato_stage_2: "Vegetables/tomato",
  tomato_stage_3: "Vegetables/tomato",
  carrot_stage_1: "Vegetables/carrot",
  carrot_stage_2: "Vegetables/carrot",
  carrot_stage_3: "Vegetables/carrot",
  lettuce_stage_1: "Vegetables/lettuce",
  lettuce_stage_2: "Vegetables/lettuce",
  lettuce_stage_3: "Vegetables/lettuce",
  pumpkin_stage_1: "Vegetables/pumpkin",
  pumpkin_stage_2: "Vegetables/pumpkin",
  pumpkin_stage_3: "Vegetables/pumpkin",
  carrot: "Vegetables/carrot",
  pumpkin: "Vegetables/pumpkin",
  lettuce: "Vegetables/lettuce",
  potato: "Vegetables/potato",
  potato_stage_1: "Vegetables/potato",
  potato_stage_2: "Vegetables/potato",
  potato_stage_3: "Vegetables/potato",
  cucumber: "Vegetables/cucumber",
  cucumber_stage_1: "Vegetables/cucumber",
  cucumber_stage_2: "Vegetables/cucumber",
  cucumber_stage_3: "Vegetables/cucumber",
  sweetPotato: "Vegetables/sweetPotato",
  sweetPotato_stage_1: "Vegetables/sweetPotato",
  sweetPotato_stage_2: "Vegetables/sweetPotato",
  sweetPotato_stage_3: "Vegetables/sweetPotato",
  spinach: "Vegetables/spinach",
  spinach_stage_1: "Vegetables/spinach",
  spinach_stage_2: "Vegetables/spinach",
  spinach_stage_3: "Vegetables/spinach",
  pea: "Vegetables/pea",
  pea_stage_1: "Vegetables/pea",
  pea_stage_2: "Vegetables/pea",
  pea_stage_3: "Vegetables/pea",
  asparagus: "Vegetables/asparagus",
  asparagus_stage_1: "Vegetables/asparagus",
  asparagus_stage_2: "Vegetables/asparagus",
  asparagus_stage_3: "Vegetables/asparagus",
  rhubarb: "Vegetables/rhubarb",
  rhubarb_stage_1: "Vegetables/rhubarb",
  rhubarb_stage_2: "Vegetables/rhubarb",
  rhubarb_stage_3: "Vegetables/rhubarb",
  fennel: "Vegetables/fennel",
  fennel_stage_1: "Vegetables/fennel",
  fennel_stage_2: "Vegetables/fennel",
  fennel_stage_3: "Vegetables/fennel",
  artichoke: "Vegetables/artichoke",
  artichoke_stage_1: "Vegetables/artichoke",
  artichoke_stage_2: "Vegetables/artichoke",
  artichoke_stage_3: "Vegetables/artichoke",
  eggplant: "Vegetables/eggplant",
  eggplant_stage_1: "Vegetables/eggplant",
  eggplant_stage_2: "Vegetables/eggplant",
  eggplant_stage_3: "Vegetables/eggplant",
  sweetPepper: "Vegetables/sweetPepper",
  sweetPepper_stage_1: "Vegetables/sweetPepper",
  sweetPepper_stage_2: "Vegetables/sweetPepper",
  sweetPepper_stage_3: "Vegetables/sweetPepper",
  okra: "Vegetables/okra",
  okra_stage_1: "Vegetables/okra",
  okra_stage_2: "Vegetables/okra",
  okra_stage_3: "Vegetables/okra",
  peanut: "Vegetables/peanut",
  peanut_stage_1: "Vegetables/peanut",
  peanut_stage_2: "Vegetables/peanut",
  peanut_stage_3: "Vegetables/peanut",
  broccoli: "Vegetables/broccoli",
  broccoli_stage_1: "Vegetables/broccoli",
  broccoli_stage_2: "Vegetables/broccoli",
  broccoli_stage_3: "Vegetables/broccoli",
  beetroot: "Vegetables/beetroot",
  beetroot_stage_1: "Vegetables/beetroot",
  beetroot_stage_2: "Vegetables/beetroot",
  beetroot_stage_3: "Vegetables/beetroot",
  turnip: "Vegetables/turnip",
  turnip_stage_1: "Vegetables/turnip",
  turnip_stage_2: "Vegetables/turnip",
  turnip_stage_3: "Vegetables/turnip",
  celery: "Vegetables/celery",
  celery_stage_1: "Vegetables/celery",
  celery_stage_2: "Vegetables/celery",
  celery_stage_3: "Vegetables/celery",
  ginger: "Vegetables/ginger",
  ginger_stage_1: "Vegetables/ginger",
  ginger_stage_2: "Vegetables/ginger",
  ginger_stage_3: "Vegetables/ginger",
  kale: "Vegetables/kale",
  kale_stage_1: "Vegetables/kale",
  kale_stage_2: "Vegetables/kale",
  kale_stage_3: "Vegetables/kale",
  chineseCabbage: "Vegetables/chineseCabbage",
  chineseCabbage_stage_1: "Vegetables/chineseCabbage",
  chineseCabbage_stage_2: "Vegetables/chineseCabbage",
  chineseCabbage_stage_3: "Vegetables/chineseCabbage",
  garlic: "Vegetables/garlic",
  garlic_stage_1: "Vegetables/garlic",
  garlic_stage_2: "Vegetables/garlic",
  garlic_stage_3: "Vegetables/garlic",
  leek: "Vegetables/leek",
  leek_stage_1: "Vegetables/leek",
  leek_stage_2: "Vegetables/leek",
  leek_stage_3: "Vegetables/leek",
  brusselsSprouts: "Vegetables/brusselsSprouts",
  brusselsSprouts_stage_1: "Vegetables/brusselsSprouts",
  brusselsSprouts_stage_2: "Vegetables/brusselsSprouts",
  brusselsSprouts_stage_3: "Vegetables/brusselsSprouts",
  // Seed bags live beside their crop artwork. Item IDs remain unchanged so
  // inventories, shops, quests and saves do not need a data migration.
  seedWheat: "Vegetables/wheat",
  seedCorn: "Vegetables/corn",
  seedTomato: "Vegetables/tomato",
  seedCarrot: "Vegetables/carrot",
  seedLettuce: "Vegetables/lettuce",
  seedPumpkin: "Vegetables/pumpkin",
  seedBanana: "Fruits/banana",
  seedStrawberry: "Fruits/strawberry",
  seedApple: "Fruits/apple",
  seedCherry: "Fruits/cherry",
  seedPotato: "Vegetables/potato",
  seedCucumber: "Vegetables/cucumber",
  seedSweetPotato: "Vegetables/sweetPotato",
  seedSpinach: "Vegetables/spinach",
  seedPea: "Vegetables/pea",
  seedAsparagus: "Vegetables/asparagus",
  seedRhubarb: "Vegetables/rhubarb",
  seedFennel: "Vegetables/fennel",
  seedArtichoke: "Vegetables/artichoke",
  seedEggplant: "Vegetables/eggplant",
  seedSweetPepper: "Vegetables/sweetPepper",
  seedWatermelon: "Fruits/watermelon",
  seedOkra: "Vegetables/okra",
  seedPeanut: "Vegetables/peanut",
  seedBroccoli: "Vegetables/broccoli",
  seedBeetroot: "Vegetables/beetroot",
  seedTurnip: "Vegetables/turnip",
  seedCelery: "Vegetables/celery",
  seedGinger: "Vegetables/ginger",
  seedKale: "Vegetables/kale",
  seedChineseCabbage: "Vegetables/chineseCabbage",
  seedGarlic: "Vegetables/garlic",
  seedLeek: "Vegetables/leek",
  seedBrusselsSprouts: "Vegetables/brusselsSprouts",
  // Fruits
  strawberry: "Fruits/strawberry",
  cherry: "Fruits/cherry",
  banana: "Fruits/banana",
  apple: "Fruits/apple",
  strawberry_stage_1: "Fruits/strawberry",
  strawberry_stage_2: "Fruits/strawberry",
  strawberry_stage_3: "Fruits/strawberry",
  cherry_stage_1: "Fruits/cherry",
  cherry_stage_2: "Fruits/cherry",
  cherry_stage_3: "Fruits/cherry",
  banana_stage_1: "Fruits/banana",
  banana_stage_2: "Fruits/banana",
  banana_stage_3: "Fruits/banana",
  apple_stage_1: "Fruits/apple",
  apple_stage_2: "Fruits/apple",
  apple_stage_3: "Fruits/apple",
  watermelon: "Fruits/watermelon",
  watermelon_stage_1: "Fruits/watermelon",
  watermelon_stage_2: "Fruits/watermelon",
  watermelon_stage_3: "Fruits/watermelon",
  // Processed
  flour: "Processed",
  butter: "Processed",
  honey: "Processed",
  milk: "Processed",
  sugar: "Processed",
  oatmeal: "Processed",
  bananaSauce: "Processed",
  cherryJam: "Processed",
  jam: "Processed",
  carrotPuree: "Processed",
  cheese: "Processed",
  ketchup: "Processed",
  water: "Processed",
  // Foods
  bread: "Foods",
  cake: "Foods",
  egg: "Foods",
  croissant: "Foods",
  cupcake: "Foods",
  cookie: "Foods",
  pie: "Foods",
  strawberryCake: "Foods",
  baguette: "Foods",
  donut: "Foods",
  chocolateCake: "Foods",
  cereal: "Foods",
  cornFlakes: "Foods",
  pasta: "Foods",
  butterToast: "Foods",
  honeyToast: "Foods",
  jamToast: "Foods",
  applePie: "Foods",
  watermelonJuice: "Foods",
  broccoliCheeseSoup: "Foods",
  beetrootSalad: "Foods",
  turnipSoup: "Foods",
  celeryJuice: "Foods",
  gingerTea: "Foods",
  kaleSalad: "Foods",
  cabbageRoll: "Foods",
  garlicBread: "Foods",
  leekSoup: "Foods",
  roastedBrusselsSprouts: "Foods",
  autumnVegSoup: "Foods",
  gingerVegStew: "Foods",
  greenEnergyBowl: "Foods",
  garlicWinterRoll: "Foods",
  winterRoastPlatter: "Foods",
  // Buildings
  chickenCoop: "Buildings",
  barn: "Buildings",
  warehouse: "Buildings",
  house: "Buildings",
  well: "Buildings",
  garden: "Buildings",
  fourSeasonGreenhouse: "Buildings",
  beehive: "Buildings",
  // Decorations
  sunflower: "Decorations",
  tulip: "Decorations",
  rose: "Decorations",
  tree: "Decorations",
  palmTree: "Decorations",
  stone: "Decorations",
  log: "Decorations",
  fence: "Decorations",
  tent: "Decorations",
  pumpkinLantern: "Decorations",
  flower: "Decorations",
  // Special
  mysteryBox: "Special",
  luckyStar: "Special",
  jade: "Special",
  // Tools
  speedTicket: "Tools",
  cropSpeedTicket: "Tools",
  doubleHarvestCard: "Tools",
  goldBoostCard: "Tools",
  universalSeed: "Tools",
  makeUpSignInCard: "Tools",
  greenhouseCard: "Tools",
};

const ITEM_IMAGE_ID_MAP: Record<string, string> = {
  seedWheat: "wheat_seed",
  seedCorn: "corn_seed",
  seedTomato: "tomato_seed",
  seedCarrot: "carrot_seed",
  seedLettuce: "lettuce_seed",
  seedPumpkin: "pumpkin_seed",
  seedBanana: "banana_seed",
  seedStrawberry: "strawberry_seed",
  seedApple: "apple_seed",
  seedCherry: "cherry_seed",
  seedPotato: "potato_seed",
  seedCucumber: "cucumber_seed",
  seedSweetPotato: "sweetPotato_seed",
  seedSpinach: "spinach_seed",
  seedPea: "pea_seed",
  seedAsparagus: "asparagus_seed",
  seedRhubarb: "rhubarb_seed",
  seedFennel: "fennel_seed",
  seedArtichoke: "artichoke_seed",
  seedEggplant: "eggplant_seed",
  seedSweetPepper: "sweetPepper_seed",
  seedWatermelon: "watermelon_seed",
  seedOkra: "okra_seed",
  seedPeanut: "peanut_seed",
  seedBroccoli: "broccoli_seed",
  seedBeetroot: "beetroot_seed",
  seedTurnip: "turnip_seed",
  seedCelery: "celery_seed",
  seedGinger: "ginger_seed",
  seedKale: "kale_seed",
  seedChineseCabbage: "chineseCabbage_seed",
  seedGarlic: "garlic_seed",
  seedLeek: "leek_seed",
  seedBrusselsSprouts: "brusselsSprouts_seed",
};

function resolveItemImageId(itemId: string): string {
  return ITEM_IMAGE_ID_MAP[itemId] || itemId;
}

/** UI 鍥炬爣 -> 鏂囦欢鍚嶆槧灏?*/
const UI_ICON_MAP: Record<string, string> = {
  gold: "common/currency/icon_gold",
  diamond: "common/currency/icon_diamond",
  bag: "common/navigation/icon_bag",
  gear: "common/navigation/icon_gear",
  quest: "common/navigation/icon_quest",
  catalog: "common/navigation/icon_catalog",
  bagSpring: "common/navigation/tabbar_icons_seasons_sheet",
  bagSummer: "common/navigation/tabbar_icons_seasons_sheet",
  bagAutumn: "common/navigation/tabbar_icons_seasons_sheet",
  bagWinter: "common/navigation/tabbar_icons_seasons_sheet",
  gearSpring: "common/navigation/tabbar_icons_seasons_sheet",
  gearSummer: "common/navigation/tabbar_icons_seasons_sheet",
  gearAutumn: "common/navigation/tabbar_icons_seasons_sheet",
  gearWinter: "common/navigation/tabbar_icons_seasons_sheet",
  questSpring: "common/navigation/tabbar_icons_seasons_sheet",
  questSummer: "common/navigation/tabbar_icons_seasons_sheet",
  questAutumn: "common/navigation/tabbar_icons_seasons_sheet",
  questWinter: "common/navigation/tabbar_icons_seasons_sheet",
  catalogSpring: "common/navigation/tabbar_icons_seasons_sheet",
  catalogSummer: "common/navigation/tabbar_icons_seasons_sheet",
  catalogAutumn: "common/navigation/tabbar_icons_seasons_sheet",
  catalogWinter: "common/navigation/tabbar_icons_seasons_sheet",
  entryShop: "common/entries/icon_entry_shop",
  entryHarvest: "common/entries/icon_entry_harvest",
  entryShovel: "farm/home/icon_shovel",
  billboard: "farm/home/icon_billboard",
  pastureBillboard: "farm/pasture/icon_pasture_billboard",
  field: "farm/home/icon_field",
  fieldSpring: "farm/home/field_states_seasons_sheet",
  fieldSummer: "farm/home/field_states_seasons_sheet",
  fieldAutumn: "farm/home/field_states_seasons_sheet",
  fieldWinter: "farm/home/field_states_seasons_sheet",
  greenField: "farm/home/icon_green_field",
  lockedFieldSpring: "farm/home/field_states_seasons_sheet",
  lockedFieldSummer: "farm/home/field_states_seasons_sheet",
  lockedFieldAutumn: "farm/home/field_states_seasons_sheet",
  lockedFieldWinter: "farm/home/field_states_seasons_sheet",
  lockedPastureSpring: "farm/pasture/pasture_pad_states_seasons_sheet",
  lockedPastureSummer: "farm/pasture/pasture_pad_states_seasons_sheet",
  lockedPastureAutumn: "farm/pasture/pasture_pad_states_seasons_sheet",
  lockedPastureWinter: "farm/pasture/pasture_pad_states_seasons_sheet",
  boostStatusCloud: "common/status/bg_boost_cloud",
  seedSelectorBg: "farm/common/dialogs/bg_seed_selector",
  btnCropSpeedUp: "farm/common/dialogs/btn_crop_speedup",
  btnFlowerCancel: "farm/flowerhouse/btn_flower_cancel",
  btnFlowerDiamondSpeedUp: "farm/flowerhouse/btn_flower_diamond_speedup",
  sideEntryBg: "farm/common/interaction/bg_side_entry",
  sideEntryDisabledBg: "farm/common/interaction/bg_side_entry_disabled",
  interactionCardBg: "farm/common/interaction/bg_interaction_card",
  interactionCardSelectedBg: "farm/common/interaction/bg_interaction_card_selected",
  interactionCardLockedBg: "farm/common/interaction/bg_interaction_card_locked",
  feedCardBg: "farm/common/interaction/bg_feed_card",
  feedCardSelectedBg: "farm/common/interaction/bg_feed_card_selected",
  // Building interiors are independent 752 x 1359 PNGs.
  greenhouseDialogBg: "farm/common/interior_scenes/bg_greenhouse",
  greenhousePot: "farm/greenhouse/pot_greenhouse",
  greenhouseSlotUnlock: "farm/greenhouse/icon_greenhouse_slot_unlock",
  chickenCoopDialogBg: "farm/common/interior_scenes/bg_chicken",
  barnDialogBg: "farm/common/interior_scenes/bg_barn",
  barnSceneCowMoomoo: "farm/common/interior_scene_fillers/barn_cow_status",
  barnSceneCowDada: "farm/common/interior_scene_fillers/barn_cow_status",
  barnCowMoomooAvatar: "farm/livestock/barn/avatar_barn_moomoo",
  barnCowDadaAvatar: "farm/livestock/barn/avatar_barn_dada",
  barnCowStatusPanel: "farm/livestock/barn/panel_barn_cow_status",
  barnMilkCup: "farm/livestock/barn/icon_barn_milk_cup",
  barnMilkCubby: "farm/livestock/barn/slot_barn_milk_cubby",
  flowerHouseDialogBg: "farm/common/interior_scenes/bg_flowerhouse",
  beehiveDialogBg: "farm/common/interior_scenes/bg_beehive",
  chickenSceneNest0: "farm/common/interior_scene_fillers/chicken_eggs",
  chickenSceneNest1: "farm/common/interior_scene_fillers/chicken_eggs",
  chickenSceneNest2: "farm/common/interior_scene_fillers/chicken_eggs",
  chickenSceneNest3: "farm/common/interior_scene_fillers/chicken_eggs",
  chickenSceneNest4: "farm/common/interior_scene_fillers/chicken_eggs",
  chickenSceneNest5: "farm/common/interior_scene_fillers/chicken_eggs",
  sceneChickenEggs: "farm/common/interior_scene_fillers/chicken_eggs",
  sceneChickenChick: "farm/common/interior_scene_fillers/chicken_chick",
  sceneChickenExpand: "farm/common/interior_scene_fillers/chicken_expand",
  sceneChickenFeed: "farm/common/interior_scene_fillers/chicken_feed",
  sceneBarnMilk: "farm/common/interior_scene_fillers/barn_milk",
  sceneBarnHay: "farm/common/interior_scene_fillers/barn_hay",
  sceneBarnWheat: "farm/common/interior_scene_fillers/barn_wheat",
  sceneBarnCowStatus: "farm/common/interior_scene_fillers/barn_cow_status",
  sceneBeehiveHoney: "farm/common/interior_scene_fillers/beehive_honey",
  sceneBeehiveComb: "farm/common/interior_scene_fillers/beehive_comb",
  sceneBeehiveBeeStatus: "farm/common/interior_scene_fillers/beehive_bee_status",
  sceneBeehiveFlowers: "farm/common/interior_scene_fillers/beehive_flowers",
  sceneFlowerhousePot: "farm/common/interior_scene_fillers/flowerhouse_pot",
  sceneFlowerhouseSlotPlus: "farm/common/interior_scene_fillers/flowerhouse_slot_plus",
  sceneFlowerhouseFillOverlay: "farm/common/interior_scene_fillers/flowerhouse_fill_overlay",
  sceneGreenhousePot: "farm/common/interior_scene_fillers/greenhouse_pot",
  sceneGreenhouseSlotPlus: "farm/common/interior_scene_fillers/greenhouse_slot_plus",
  sceneGreenhouseFillOverlay: "farm/common/interior_scene_fillers/greenhouse_fill_overlay",
  beehiveSlotCardBg: "farm/beehive/bg_beehive_slot_card",
  beehiveBottomPanelBg: "farm/beehive/bg_beehive_bottom_panel",
  beehiveFeedSunflower: "farm/beehive/feed_icons/icon_beehive_feed_sunflower",
  beehiveFeedFlower: "farm/beehive/feed_icons/icon_beehive_feed_flower",
  beehiveFeedTulip: "farm/beehive/feed_icons/icon_beehive_feed_tulip",
  beehiveFeedRose: "farm/beehive/feed_icons/icon_beehive_feed_rose",
  beehiveHoneyEmpty: "farm/beehive/honey/icon_beehive_honey_empty",
  beehiveHoneySunflowerStage1: "farm/beehive/honey/icon_beehive_honey_sunflower_stage_1",
  beehiveHoneySunflowerStage2: "farm/beehive/honey/icon_beehive_honey_sunflower_stage_2",
  beehiveHoneySunflowerStage3: "farm/beehive/honey/icon_beehive_honey_sunflower_stage_3",
  beehiveHoneyFlowerStage1: "farm/beehive/honey/icon_beehive_honey_flower_stage_1",
  beehiveHoneyFlowerStage2: "farm/beehive/honey/icon_beehive_honey_flower_stage_2",
  beehiveHoneyFlowerStage3: "farm/beehive/honey/icon_beehive_honey_flower_stage_3",
  beehiveHoneyTulipStage1: "farm/beehive/honey/icon_beehive_honey_tulip_stage_1",
  beehiveHoneyTulipStage2: "farm/beehive/honey/icon_beehive_honey_tulip_stage_2",
  beehiveHoneyTulipStage3: "farm/beehive/honey/icon_beehive_honey_tulip_stage_3",
  beehiveHoneyRoseStage1: "farm/beehive/honey/icon_beehive_honey_rose_stage_1",
  beehiveHoneyRoseStage2: "farm/beehive/honey/icon_beehive_honey_rose_stage_2",
  beehiveHoneyRoseStage3: "farm/beehive/honey/icon_beehive_honey_rose_stage_3",
  flowerSlotCardBg: "farm/flowerhouse/bg_flower_slot_card",
  flowerSeedSunflower: "farm/flowerhouse/seeds/seed_flower_sunflower",
  flowerSeedFlower: "farm/flowerhouse/seeds/seed_flower_flower",
  flowerSeedTulip: "farm/flowerhouse/seeds/seed_flower_tulip",
  flowerSeedRose: "farm/flowerhouse/seeds/seed_flower_rose",
  flowerGrowthSunflowerStage1: "farm/flowerhouse/growth/flower_sunflower_stage_1",
  flowerGrowthSunflowerStage2: "farm/flowerhouse/growth/flower_sunflower_stage_2",
  flowerGrowthSunflowerStage3: "farm/flowerhouse/growth/flower_sunflower_stage_3",
  flowerGrowthFlowerStage1: "farm/flowerhouse/growth/flower_flower_stage_1",
  flowerGrowthFlowerStage2: "farm/flowerhouse/growth/flower_flower_stage_2",
  flowerGrowthFlowerStage3: "farm/flowerhouse/growth/flower_flower_stage_3",
  flowerGrowthTulipStage1: "farm/flowerhouse/growth/flower_tulip_stage_1",
  flowerGrowthTulipStage2: "farm/flowerhouse/growth/flower_tulip_stage_2",
  flowerGrowthTulipStage3: "farm/flowerhouse/growth/flower_tulip_stage_3",
  flowerGrowthRoseStage1: "farm/flowerhouse/growth/flower_rose_stage_1",
  flowerGrowthRoseStage2: "farm/flowerhouse/growth/flower_rose_stage_2",
  flowerGrowthRoseStage3: "farm/flowerhouse/growth/flower_rose_stage_3",
  livestockMilkFront: "farm/livestock/barn/product_milk_front",
  chickenNestSlot0: "farm/livestock/chicken/slot_chicken_nest_0",
  chickenNestSlot1: "farm/livestock/chicken/slot_chicken_nest_1",
  chickenNestSlot2: "farm/livestock/chicken/slot_chicken_nest_2",
  chickenNestSlot3: "farm/livestock/chicken/slot_chicken_nest_3",
  chickenNestSlot4: "farm/livestock/chicken/slot_chicken_nest_4",
  chickenNestSlot5: "farm/livestock/chicken/slot_chicken_nest_5",
  chickenLockedChick: "farm/livestock/chicken/icon_chicken_locked_chick",
  chickenSlotLock: "farm/livestock/chicken/icon_chicken_slot_lock",
  btnChickenFeedConfirm: "farm/livestock/chicken/btn_chicken_feed_confirm",
  btnGreenhouseUnlockLater: "farm/greenhouse/btn_greenhouse_unlock_later",
  btnGreenhouseUnlockConfirm: "farm/greenhouse/btn_greenhouse_unlock_confirm",
  btnPastureExpandLater: "farm/pasture/btn_pasture_expand_sheet",
  btnPastureExpandConfirm: "farm/pasture/btn_pasture_expand_sheet",
  avatarFarmgirl: "../avatar/avatar_farmgirl",
  avatarFarmgirlSpring: "../avatar/seasons/spring/avatar_farmgirl",
  avatarFarmgirlSummer: "../avatar/seasons/summer/avatar_farmgirl",
  avatarFarmgirlAutumn: "../avatar/seasons/autumn/avatar_farmgirl",
  avatarFarmgirlWinter: "../avatar/seasons/winter/avatar_farmgirl",
  bgFarmSkyHills: "farm/home/bg_farm_sky_hills",
  bgPastureFence: "farm/pasture/bg_pasture_fence",
  bgFarmSummer: "farm/home/bg_farm_summer",
  bgFarmAutumn: "farm/home/bg_farm_autumn",
  bgFarmWinter: "farm/home/bg_farm_winter",
  bgPastureSummer: "farm/pasture/bg_pasture_summer",
  bgPastureAutumn: "farm/pasture/bg_pasture_autumn",
  bgPastureWinter: "farm/pasture/bg_pasture_winter",
  buildingPad: "farm/home/icon_building_pad",
  buildingPadSpring: "farm/pasture/pasture_pad_states_seasons_sheet",
  buildingPadSummer: "farm/pasture/pasture_pad_states_seasons_sheet",
  buildingPadAutumn: "farm/pasture/pasture_pad_states_seasons_sheet",
  buildingPadWinter: "farm/pasture/pasture_pad_states_seasons_sheet",
  // Legacy aliases point at the current arrow billboards so old callers never request removed files.
  entryPasture: "farm/pasture/icon_entry_pasture_arrow",
  entryFarm: "farm/pasture/icon_entry_farm_arrow",
  entryPastureArrow: "farm/pasture/icon_entry_pasture_arrow",
  entryFarmArrow: "farm/pasture/icon_entry_farm_arrow",
  pastureCollect: "farm/pasture/icon_collect_pasture",
  catalogBg: "catalog/catalog_bg",
  panelBg: "common/panels/panel_bg",
  taskMain: "task/icons/icon_task_main",
  taskDaily: "task/icons/icon_task_daily",
  taskBranch: "task/icons/icon_task_branch",
  taskSpecial: "task/icons/icon_task_special",
  taskTabsMain: "task/tabs/task_tabs_main",
  taskTabsDaily: "task/tabs/task_tabs_daily",
  taskTabsBranch: "task/tabs/task_tabs_branch",
  taskTabsSpecial: "task/tabs/task_tabs_special",
  inventoryAll: "inventory/icons/icon_inventory_all",
  inventorySeeds: "inventory/icons/icon_inventory_seeds",
  inventoryMaterials: "inventory/icons/icon_inventory_materials",
  inventoryProducts: "inventory/icons/icon_inventory_products",
  inventorySellDialogBg: "inventory/dialogs/bg_sell_dialog",
  inventorySellResultBg: "inventory/dialogs/bg_sell_result",
  btnSellCancel: "inventory/buttons/btn_sell_cancel",
  btnSellConfirm: "inventory/buttons/btn_sell_confirm",
  btnSellMinus: "inventory/buttons/btn_sell_minus",
  btnSellPlus: "inventory/buttons/btn_sell_plus",
  btnSellMax: "inventory/buttons/btn_sell_max",
  shopTabsSeeds: "shop/tabs/shop_tabs_seeds",
  shopTabsTools: "shop/tabs/shop_tabs_tools",
  shopSeeds: "shop/icons/icon_shop_seeds",
  shopTools: "shop/icons/icon_shop_tools",
  marketplaceTabsSeeds: "shop/tabs/shop_tabs_categories_sheet",
  marketplaceTabsTools: "shop/tabs/shop_tabs_categories_sheet",
  marketplaceTabsBuildings: "shop/tabs/shop_tabs_categories_sheet",
  marketplaceSeeds: "shop/icons/icon_shop_categories_sheet",
  marketplaceTools: "shop/icons/icon_shop_categories_sheet",
  marketplaceBuildings: "shop/icons/icon_shop_categories_sheet",
  btnBuy: "shop/buttons/btn_buy",
  btnGo: "task/buttons/btn_go",
  btnDetail: "task/buttons/btn_detail",
  btnClaim: "task/buttons/btn_claim",
  btnClaimed: "task/buttons/btn_claimed",
  signInClaim: "signin/buttons/btn_signin_claim",
  signInClaimed: "signin/buttons/btn_signin_claimed",
  achievementClaim: "achievement/buttons/btn_achievement_claim",
  achievementClaimed: "achievement/buttons/btn_achievement_claimed",
  achievementLocked: "achievement/buttons/btn_achievement_locked",
  titleUnlocked: "title/buttons/btn_title_unlocked",
  titleLocked: "title/buttons/btn_title_locked",
  achievementFirstPlant: "achievement/icons/icon_achievement_first_plant",
  achievementPlant50: "achievement/icons/icon_achievement_plant_50",
  achievementGold100: "achievement/icons/icon_achievement_gold_100",
  achievementGold10000: "achievement/icons/icon_achievement_gold_10000",
  achievementDiamond50: "achievement/icons/icon_achievement_diamond_50",
  achievementLevel10: "achievement/icons/icon_achievement_level_10",
  achievementLevel20: "achievement/icons/icon_achievement_level_20",
  achievementFirstCraft: "achievement/icons/icon_achievement_first_craft",
  achievementCraft50: "achievement/icons/icon_achievement_craft_50",
  achievementRecipesAll: "achievement/icons/icon_achievement_recipes_all",
  achievementCatalog20: "achievement/icons/icon_achievement_catalog_20",
  achievementCatalogAll: "achievement/icons/icon_achievement_catalog_all",
  achievementCatalogAllLocked: "achievement/icons/icon_achievement_catalog_all_locked",
  achievementPastureFirst: "achievement/icons/icon_achievement_pasture_first",
  achievementPasture50: "achievement/icons/icon_achievement_pasture_50",
  achievementCategoryPlanting: "achievement/categories/icon_achievement_category_planting",
  achievementCategoryCrafting: "achievement/categories/icon_achievement_category_crafting",
  achievementCategoryGrowth: "achievement/categories/icon_achievement_category_growth",
  achievementCategoryCollection: "achievement/categories/icon_achievement_category_collection",
  achievementMedalWallEntry: "achievement/medal_wall/icon_medal_wall_entry",
  achievementMedalWallBg: "achievement/medal_wall/bg_medal_wall",
  achievementMedalSlot: "achievement/medal_wall/bg_medal_slot",
  achievementMedalWallOrnamentLeft:
    "achievement/medal_wall/ornament_medal_wall_left",
  achievementMedalWallOrnamentRight:
    "achievement/medal_wall/ornament_medal_wall_right",
  seasonSpring: "shop/seasons/icon_season_spring",
  seasonSummer: "shop/seasons/icon_season_summer",
  seasonAutumn: "shop/seasons/icon_season_autumn",
  seasonWinter: "shop/seasons/icon_season_winter",
  btnTitleEquip: "title/buttons/btn_title_equip",
  btnTitleUnequip: "title/buttons/btn_title_unequip",
  titleCategoryLevel: "title/categories/icon_title_category_level",
  titleCategoryAchievement: "title/categories/icon_title_category_achievement",
  titleTabsLevel: "title/categories/title_tabs_level",
  titleTabsAchievement: "title/categories/title_tabs_achievement",
  craftChefTools: "craft/icons/icon_chef_tools",
  craftArrow: "craft/icons/icon_craft_arrow",
  btnCraft: "craft/buttons/btn_craft",
  task1: "task/icons/icon_task_1",
  task2: "task/icons/icon_task_2",
  task3: "task/icons/icon_task_3",
  task4: "task/icons/icon_task_4",
  task5: "task/icons/icon_task_5",
  task6: "task/icons/icon_task_6",
  task7: "task/icons/icon_task_7",
  task8: "task/icons/icon_task_8",
  task9: "task/icons/icon_task_9",
  rewardGold: "task/rewards/icon_reward_gold",
  rewardSeed: "task/rewards/icon_reward_seed",
};

type LoadPriority = "interactive" | "background";

type DownloadTask = {
  run: () => Promise<SpriteFrame | null>;
  resolve: (value: SpriteFrame | null) => void;
};

type SheetFrameDefinition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Both pasture actions share one 512 x 256 texture. Equal 256 x 256 cells
// guarantee identical runtime scale, padding, and text baseline.
const UI_SHEET_FRAMES: Record<string, SheetFrameDefinition> = {
  bagSpring: { x: 0, y: 0, width: 256, height: 256 },
  gearSpring: { x: 256, y: 0, width: 256, height: 256 },
  questSpring: { x: 512, y: 0, width: 256, height: 256 },
  catalogSpring: { x: 768, y: 0, width: 256, height: 256 },
  bagSummer: { x: 0, y: 256, width: 256, height: 256 },
  gearSummer: { x: 256, y: 256, width: 256, height: 256 },
  questSummer: { x: 512, y: 256, width: 256, height: 256 },
  catalogSummer: { x: 768, y: 256, width: 256, height: 256 },
  bagAutumn: { x: 0, y: 512, width: 256, height: 256 },
  gearAutumn: { x: 256, y: 512, width: 256, height: 256 },
  questAutumn: { x: 512, y: 512, width: 256, height: 256 },
  catalogAutumn: { x: 768, y: 512, width: 256, height: 256 },
  bagWinter: { x: 0, y: 768, width: 256, height: 256 },
  gearWinter: { x: 256, y: 768, width: 256, height: 256 },
  questWinter: { x: 512, y: 768, width: 256, height: 256 },
  catalogWinter: { x: 768, y: 768, width: 256, height: 256 },
  btnPastureExpandLater: { x: 0, y: 0, width: 256, height: 256 },
  btnPastureExpandConfirm: { x: 256, y: 0, width: 256, height: 256 },
  marketplaceTabsSeeds: { x: 0, y: 0, width: 1086, height: 181 },
  marketplaceTabsTools: { x: 1086, y: 0, width: 1086, height: 181 },
  marketplaceTabsBuildings: { x: 2172, y: 0, width: 1086, height: 181 },
  marketplaceSeeds: { x: 0, y: 0, width: 256, height: 256 },
  marketplaceTools: { x: 256, y: 0, width: 256, height: 256 },
  marketplaceBuildings: { x: 512, y: 0, width: 256, height: 256 },
  fieldSpring: { x: 0, y: 0, width: 512, height: 512 },
  fieldSummer: { x: 512, y: 0, width: 512, height: 512 },
  fieldAutumn: { x: 1024, y: 0, width: 512, height: 512 },
  fieldWinter: { x: 1536, y: 0, width: 512, height: 512 },
  lockedFieldSpring: { x: 0, y: 512, width: 512, height: 512 },
  lockedFieldSummer: { x: 512, y: 512, width: 512, height: 512 },
  lockedFieldAutumn: { x: 1024, y: 512, width: 512, height: 512 },
  lockedFieldWinter: { x: 1536, y: 512, width: 512, height: 512 },
  buildingPadSpring: { x: 0, y: 0, width: 512, height: 512 },
  buildingPadSummer: { x: 512, y: 0, width: 512, height: 512 },
  buildingPadAutumn: { x: 1024, y: 0, width: 512, height: 512 },
  buildingPadWinter: { x: 1536, y: 0, width: 512, height: 512 },
  lockedPastureSpring: { x: 0, y: 512, width: 512, height: 512 },
  lockedPastureSummer: { x: 512, y: 512, width: 512, height: 512 },
  lockedPastureAutumn: { x: 1024, y: 512, width: 512, height: 512 },
  lockedPastureWinter: { x: 1536, y: 512, width: 512, height: 512 },
};

function extractSheetFrame(
  source: SpriteFrame,
  definition: SheetFrameDefinition | undefined,
): SpriteFrame {
  if (!definition) return source;
  const frame = new SpriteFrame();
  frame.texture = source.texture;
  frame.rect = new Rect(
    definition.x,
    definition.y,
    definition.width,
    definition.height,
  );
  frame.originalSize = new Size(definition.width, definition.height);
  return frame;
}

type CropStageSheetDefinition = SheetFrameDefinition & {
  cropId: string;
};

function resolveCropStageSheet(
  imageId: string,
): CropStageSheetDefinition | null {
  const match = /^(.+)_stage_([123])$/.exec(imageId);
  if (!match) return null;
  const stageIndex = Number(match[2]) - 1;
  return {
    cropId: match[1],
    x: stageIndex * 512,
    y: 0,
    width: 512,
    height: 512,
  };
}

const MAX_CONCURRENT_IMAGE_DOWNLOADS = 4;

export class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, SpriteFrame> = new Map();
  private pending: Map<string, Promise<SpriteFrame | null>> = new Map();
  private failed: Set<string> = new Set();
  private activeDownloads = 0;
  private interactiveQueue: DownloadTask[] = [];
  private backgroundQueue: DownloadTask[] = [];

  static getInstance(): ImageCache {
    if (!ImageCache.instance) ImageCache.instance = new ImageCache();
    return ImageCache.instance;
  }

  /** 鑾峰彇鐗╁搧鍥剧墖 URL */
  getItemUrl(itemId: string): string {
    const imageId = resolveItemImageId(itemId);
    const cat = CATEGORY_MAP[itemId] || CATEGORY_MAP[imageId] || "Vegetables";
    const stageSheet = resolveCropStageSheet(imageId);
    const assetId = stageSheet
      ? `${stageSheet.cropId}_stages`
      : imageId;
    const url = ServerConfig.getItemImageUrl(cat, assetId);
    return `${url}${url.includes("?") ? "&" : "?"}v=${ITEM_ASSET_REVISION}`;
  }

  /** 鑾峰彇 UI 鍥炬爣 URL */
  getUiIconUrl(iconName: string): string {
    const filename = UI_ICON_MAP[iconName] || iconName;
    const url = ServerConfig.getUiImageUrl(filename);
    return `${url}${url.includes("?") ? "&" : "?"}v=${UI_ASSET_REVISION}`;
  }

  /** 鍔犺浇 UI 鍥炬爣锛屽甫缂撳瓨鍜屽苟鍙戝幓閲?*/
  async loadUiIcon(
    iconName: string,
    timeout = 8000,
    priority: LoadPriority = "interactive",
  ): Promise<SpriteFrame | null> {
    const cacheKey = `_ui_${iconName}@${UI_ASSET_REVISION}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (this.failed.has(cacheKey)) return null;

    const pending = this.pending.get(cacheKey);
    if (pending) return pending;

    const filename = UI_ICON_MAP[iconName] || iconName;
    const sourceCacheKey = `_ui_source_${filename}@${UI_ASSET_REVISION}`;
    let sourcePromise: Promise<SpriteFrame | null>;
    const sourceCached = this.cache.get(sourceCacheKey);
    if (sourceCached) {
      sourcePromise = Promise.resolve(sourceCached);
    } else {
      const sourcePending = this.pending.get(sourceCacheKey);
      if (sourcePending) {
        sourcePromise = sourcePending;
      } else {
        sourcePromise = this.enqueueDownload(
          this.getUiIconUrl(iconName),
          timeout,
          priority,
        )
          .then((source) => {
            if (source) this.cache.set(sourceCacheKey, source);
            this.pending.delete(sourceCacheKey);
            return source;
          })
          .catch(() => {
            this.pending.delete(sourceCacheKey);
            return null;
          });
        this.pending.set(sourceCacheKey, sourcePromise);
      }
    }

    const promise = sourcePromise
      .then((source) => {
        const iconFrame = source
          ? extractSheetFrame(source, UI_SHEET_FRAMES[iconName])
          : null;
        if (iconFrame) this.cache.set(cacheKey, iconFrame);
        else this.failed.add(cacheKey);
        this.pending.delete(cacheKey);
        return iconFrame;
      })
      .catch(() => {
        this.failed.add(cacheKey);
        this.pending.delete(cacheKey);
        return null;
      });
    this.pending.set(cacheKey, promise);
    return promise;
  }

  /** 寮傛鍔犺浇鐗╁搧鍥剧墖锛屽甫缂撳瓨鍜屽苟鍙戝幓閲?*/
  async preloadUiIcons(
    iconNames: string[],
    priority: LoadPriority = "interactive",
  ): Promise<number> {
    const results = await Promise.all(
      iconNames.map((name) => this.loadUiIcon(name, 8000, priority)),
    );
    return results.filter(Boolean).length;
  }

  async load(
    itemId: string,
    timeout = 8000,
    priority: LoadPriority = "interactive",
  ): Promise<SpriteFrame | null> {
    const cacheKey = this.getItemCacheKey(itemId);
    // 鍐呭瓨缂撳瓨
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // 闃叉骞跺彂閲嶅璇锋眰
    const pending = this.pending.get(cacheKey);
    if (pending) return pending;

    const imageId = resolveItemImageId(itemId);
    const stageSheet = resolveCropStageSheet(imageId);
    const url = this.getItemUrl(itemId);
    if (stageSheet) {
      const category =
        CATEGORY_MAP[itemId] || CATEGORY_MAP[imageId] || "Vegetables";
      const sourceCacheKey =
        `_item_stage_sheet_${category}/${stageSheet.cropId}@${ITEM_ASSET_REVISION}`;
      let sourcePromise: Promise<SpriteFrame | null>;
      const sourceCached = this.cache.get(sourceCacheKey);
      if (sourceCached) {
        sourcePromise = Promise.resolve(sourceCached);
      } else {
        const sourcePending = this.pending.get(sourceCacheKey);
        if (sourcePending) {
          sourcePromise = sourcePending;
        } else {
          sourcePromise = this.enqueueDownload(url, timeout, priority)
            .then((source) => {
              if (source) this.cache.set(sourceCacheKey, source);
              this.pending.delete(sourceCacheKey);
              return source;
            })
            .catch((err) => {
              console.warn(`${TAG} ${stageSheet.cropId} 鍥鹃泦鍔犺浇澶辫触:`, err);
              this.pending.delete(sourceCacheKey);
              return null;
            });
          this.pending.set(sourceCacheKey, sourcePromise);
        }
      }

      const stagePromise = sourcePromise
        .then((source) => {
          const frame = source
            ? extractSheetFrame(source, stageSheet)
            : null;
          if (frame) this.cache.set(cacheKey, frame);
          this.pending.delete(cacheKey);
          return frame;
        })
        .catch((err) => {
          console.warn(`${TAG} ${itemId} 鍥鹃泦鍒囩墖澶辫触:`, err);
          this.pending.delete(cacheKey);
          return null;
        });
      this.pending.set(cacheKey, stagePromise);
      return stagePromise;
    }

    const promise = this.enqueueDownload(url, timeout, priority)
      .then((sf) => {
        if (sf) this.cache.set(cacheKey, sf);
        this.pending.delete(cacheKey);
        return sf;
      })
      .catch((err) => {
        console.warn(`${TAG} ${itemId} 鍔犺浇澶辫触:`, err);
        this.pending.delete(cacheKey);
        return null;
      });

    this.pending.set(cacheKey, promise);
    return promise;
  }

  /** 鎵归噺棰勫姞杞斤紝鍙姞杞藉凡鏄犲皠鍒伴潤鎬佽祫婧愮洰褰曠殑鐗╁搧 */
  async preload(
    itemIds: string[],
    priority: LoadPriority = "background",
  ): Promise<number> {
    // 鍙鍔犺浇 CATEGORY_MAP 涓瓨鍦ㄧ殑鐗╁搧銆?
    const realIds = itemIds.filter((id) => CATEGORY_MAP[id]);
    const results = await Promise.all(
      realIds.map((id) => this.load(id, 8000, priority)),
    );
    const loaded = results.filter(Boolean).length;
    return loaded;
  }

  /**
   * 鍚姩闃舵缁熶竴鍔犺浇鍏ㄩ儴闈欐€佸浘鐗囥€?
   *
   * 涓荤晫闈㈠垱寤哄悗鍙厑璁歌鍙栧唴瀛樼紦瀛橈紝涓嶅啀鍦ㄩ潰鏉挎墦寮€銆佽妭鐐瑰垱寤烘椂鍙戣捣鍥剧墖璇锋眰銆?
   * `completed` 琛ㄧず宸茬粡缁撴潫鐨勮姹傛暟锛堝寘鍚け璐ヨ姹傦級锛屽洜姝よ繘搴︿笉浼氳鍧忚祫婧愬崱姝汇€?
   */
  getPreloadAssetTotal(): number {
    return (
      new Set(Object.keys(CATEGORY_MAP)).size +
      new Set(Object.keys(UI_ICON_MAP)).size
    );
  }

  async preloadAllAssets(
    onProgress?: (completed: number, total: number) => void,
  ): Promise<{ items: number; ui: number; failed: number; total: number }> {
    const itemIds = Array.from(new Set(Object.keys(CATEGORY_MAP)));
    const uiNames = Array.from(new Set(Object.keys(UI_ICON_MAP)));
    const total = itemIds.length + uiNames.length;
    let completed = 0;
    let failed = 0;
    let loadedItems = 0;
    let loadedUi = 0;

    onProgress?.(0, total);
    const complete = (loaded: boolean) => {
      completed++;
      if (!loaded) failed++;
      onProgress?.(completed, total);
    };

    const itemJobs = itemIds.map(async (itemId) => {
      const spriteFrame = await this.load(itemId, 8000, "interactive");
      if (spriteFrame) loadedItems++;
      complete(!!spriteFrame);
    });
    const uiJobs = uiNames.map(async (name) => {
      const spriteFrame = await this.loadUiIcon(name, 8000, "interactive");
      if (spriteFrame) loadedUi++;
      complete(!!spriteFrame);
    });

    await Promise.all([...itemJobs, ...uiJobs]);
    return {
      items: loadedItems,
      ui: loadedUi,
      failed,
      total,
    };
  }

  getCachedItem(itemId: string): SpriteFrame | null {
    return this.cache.get(this.getItemCacheKey(itemId)) || null;
  }

  getCachedUiIcon(iconName: string): SpriteFrame | null {
    return this.cache.get(`_ui_${iconName}@${UI_ASSET_REVISION}`) || null;
  }

  /** 灏?SpriteFrame 搴旂敤鍒?Sprite 缁勪欢锛屽姞杞藉け璐ユ椂鍏佽澶栧眰鑷 fallback */
  static async applyToSprite(
    spriteComp: import("cc").Sprite,
    itemId: string,
    fallbackEmoji?: string,
  ): Promise<void> {
    const sf = ImageCache.getInstance().getCachedItem(itemId);
    if (sf) {
      spriteComp.spriteFrame = sf;
    } else if (fallbackEmoji) {
      // 鍔犺浇澶辫触鏃剁粰 Sprite 涓€涓伆鑹茬姸鎬侊紝澶栧眰鍙户缁樉绀烘枃鏈?emoji 鍏滃簳銆?
      spriteComp.color = new Color(200, 200, 200);
    }
  }

  /**
   * 涓嬭浇 PNG 骞跺垱寤?SpriteFrame
   *
   * 娴佺▼锛氫紭鍏?assetManager.loadRemote锛涘け璐ュ悗鐢?XHR -> Blob -> ImageBitmap -> Texture2D銆?
   */
  private async downloadSpriteFrame(
    url: string,
    timeout: number,
  ): Promise<SpriteFrame | null> {
    const remote = await this.loadRemoteSpriteFrame(url, timeout);
    if (remote) return remote;

    // 1. XHR 涓嬭浇 ArrayBuffer
    const buffer = await this.download(url, timeout);
    if (!buffer) return null;

    // 2. 鍒涘缓 ImageBitmap锛岄儴鍒嗗皬娓告垙鐜鍙兘涓嶆敮鎸併€?
    const blob = new Blob([buffer], { type: "image/png" });
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return null;
    }

    // 3. 鍒涘缓 Cocos 绾圭悊閾捐矾
    const imageAsset = new ImageAsset(bitmap as any);
    const texture = new Texture2D();
    texture.image = imageAsset;
    configureUiTexture(texture);

    const spriteFrame = new SpriteFrame();
    spriteFrame.texture = texture;

    return spriteFrame;
  }

  private enqueueDownload(
    url: string,
    timeout: number,
    priority: LoadPriority,
  ): Promise<SpriteFrame | null> {
    return new Promise((resolve) => {
      const task: DownloadTask = {
        run: () => this.downloadSpriteFrame(url, timeout),
        resolve,
      };
      if (priority === "interactive") this.interactiveQueue.push(task);
      else this.backgroundQueue.push(task);
      this.pumpDownloadQueue();
    });
  }

  private pumpDownloadQueue() {
    while (this.activeDownloads < MAX_CONCURRENT_IMAGE_DOWNLOADS) {
      const task = this.interactiveQueue.shift() || this.backgroundQueue.shift();
      if (!task) return;
      this.activeDownloads++;
      task.run()
        .then(task.resolve, () => task.resolve(null))
        .then(() => {
          this.activeDownloads--;
          this.pumpDownloadQueue();
        });
    }
  }

  private loadRemoteSpriteFrame(
    url: string,
    timeout: number,
  ): Promise<SpriteFrame | null> {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(null);
      }, timeout);

      assetManager.loadRemote<ImageAsset>(
        url,
        { ext: ".png" },
        (err, imageAsset) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (err || !imageAsset) {
            resolve(null);
            return;
          }

          const texture = new Texture2D();
          texture.image = imageAsset;
          configureUiTexture(texture);
          const spriteFrame = new SpriteFrame();
          spriteFrame.texture = texture;
          resolve(spriteFrame);
        },
      );
    });
  }

  /** XHR 涓嬭浇浜岃繘鍒舵暟鎹?*/
  private download(url: string, timeout: number): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.timeout = timeout;

      xhr.onload = () => {
        resolve(xhr.status === 200 ? (xhr.response as ArrayBuffer) : null);
      };
      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.send();
    });
  }

  /** 娓呯┖缂撳瓨 */
  clear() {
    this.cache.clear();
    this.pending.clear();
    this.failed.clear();
    this.interactiveQueue.length = 0;
    this.backgroundQueue.length = 0;
  }

  /** 宸茬紦瀛樻暟閲?*/
  get size(): number {
    return this.cache.size;
  }

  /** 妫€鏌ユ槸鍚﹀凡缂撳瓨 */
  has(itemId: string): boolean {
    return this.cache.has(this.getItemCacheKey(itemId));
  }

  private getItemCacheKey(itemId: string): string {
    return `${itemId}@${ITEM_ASSET_REVISION}`;
  }
}

function configureUiTexture(texture: Texture2D) {
  const runtimeTexture = texture as any;
  runtimeTexture.setFilters?.(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
  runtimeTexture.setMipFilter?.(0);
}
