/**
 * 物品配置 - 萌田农场
 * 基于 Moefarm_items_and_recipes.md 详细设计
 */

export enum ItemCategory {
    CROP = 1,         // 基础农产品
    PROCESSED = 2,    // 加工品
    FOOD = 3,         // 食物料理
    BUILDING = 4,     // 建筑
    DECORATION = 5,   // 装饰品
    SPECIAL = 6,      // 特殊物品
    TOOL = 7,         // 工具道具
    AD_REWARD = 8,    // 广告专属奖励
}

export interface ItemDef {
    id: string;
    name: string;
    category: ItemCategory;
    description: string;
    sellPrice: number;
    unlockLevel: number;
    rarity: number; // 1-5星
    iconColor: string;
    isCrop?: boolean;
    cropId?: string;
    growthTime?: number; // 秒
    harvestCount?: number;
}

/** 所有物品配置 */
export const ITEM_DB: Record<string, ItemDef> = {
    // ===== 第1类：基础农产品 (A01-A12) =====
    wheat: { id: 'wheat', name: '小麦', category: ItemCategory.CROP, description: '基础农作物，用于制作面粉', sellPrice: 10, unlockLevel: 1, rarity: 1, iconColor: '#FFD700', harvestCount: 1 },
    corn: { id: 'corn', name: '玉米', category: ItemCategory.CROP, description: '甜玉米，合成料理的常用材料', sellPrice: 20, unlockLevel: 1, rarity: 1, iconColor: '#FFD700', harvestCount: 1 },
    tomato: { id: 'tomato', name: '番茄', category: ItemCategory.CROP, description: '红色蔬菜，营养丰富', sellPrice: 15, unlockLevel: 1, rarity: 1, iconColor: '#FF4500', harvestCount: 2 },
    carrot: { id: 'carrot', name: '胡萝卜', category: ItemCategory.CROP, description: '橙色蔬菜，清脆爽口', sellPrice: 25, unlockLevel: 3, rarity: 2, iconColor: '#FFA500', harvestCount: 1 },
    pumpkin: { id: 'pumpkin', name: '南瓜', category: ItemCategory.CROP, description: '大南瓜，用于万圣节主题', sellPrice: 40, unlockLevel: 8, rarity: 2, iconColor: '#FF8C00', harvestCount: 1 },
    strawberry: { id: 'strawberry', name: '草莓', category: ItemCategory.CROP, description: '红色果实，制作果酱', sellPrice: 30, unlockLevel: 12, rarity: 3, iconColor: '#FF1493', harvestCount: 2 },
    cherry: { id: 'cherry', name: '樱桃', category: ItemCategory.CROP, description: '珍贵果实，特殊配方用', sellPrice: 35, unlockLevel: 16, rarity: 3, iconColor: '#DC143C', harvestCount: 3 },
    banana: { id: 'banana', name: '香蕉', category: ItemCategory.CROP, description: '黄色水果，营养丰富', sellPrice: 22, unlockLevel: 10, rarity: 2, iconColor: '#FFD700', harvestCount: 1 },
    apple: { id: 'apple', name: '苹果', category: ItemCategory.CROP, description: '红色水果，多用途', sellPrice: 28, unlockLevel: 14, rarity: 3, iconColor: '#FF4500', harvestCount: 1 },
    lettuce: { id: 'lettuce', name: '生菜', category: ItemCategory.CROP, description: '绿色蔬菜，新鲜脆爽', sellPrice: 18, unlockLevel: 5, rarity: 2, iconColor: '#90EE90', harvestCount: 2 },

    // 种植只消耗种子袋，收获后得到上方对应的成熟农作物。
    seedWheat: { id: 'seedWheat', name: '小麦种子', category: ItemCategory.CROP, description: '可种植小麦', sellPrice: 4, unlockLevel: 1, rarity: 1, iconColor: '#FFD700', isCrop: true, cropId: 'wheat', growthTime: 30 },
    seedCorn: { id: 'seedCorn', name: '玉米种子', category: ItemCategory.CROP, description: '可种植玉米', sellPrice: 7, unlockLevel: 1, rarity: 1, iconColor: '#FFD700', isCrop: true, cropId: 'corn', growthTime: 60 },
    seedTomato: { id: 'seedTomato', name: '番茄种子', category: ItemCategory.CROP, description: '可种植番茄', sellPrice: 5, unlockLevel: 1, rarity: 1, iconColor: '#FF4500', isCrop: true, cropId: 'tomato', growthTime: 90 },
    seedCarrot: { id: 'seedCarrot', name: '胡萝卜种子', category: ItemCategory.CROP, description: '可种植胡萝卜', sellPrice: 8, unlockLevel: 3, rarity: 2, iconColor: '#FFA500', isCrop: true, cropId: 'carrot', growthTime: 120 },
    seedLettuce: { id: 'seedLettuce', name: '生菜种子', category: ItemCategory.CROP, description: '可种植生菜', sellPrice: 6, unlockLevel: 5, rarity: 2, iconColor: '#90EE90', isCrop: true, cropId: 'lettuce', growthTime: 75 },
    seedPumpkin: { id: 'seedPumpkin', name: '南瓜种子', category: ItemCategory.CROP, description: '可种植南瓜', sellPrice: 12, unlockLevel: 8, rarity: 2, iconColor: '#FF8C00', isCrop: true, cropId: 'pumpkin', growthTime: 180 },
    seedBanana: { id: 'seedBanana', name: '香蕉种子', category: ItemCategory.CROP, description: '可种植香蕉', sellPrice: 7, unlockLevel: 10, rarity: 2, iconColor: '#FFD700', isCrop: true, cropId: 'banana', growthTime: 100 },
    seedStrawberry: { id: 'seedStrawberry', name: '草莓种子', category: ItemCategory.CROP, description: '可种植草莓', sellPrice: 9, unlockLevel: 12, rarity: 3, iconColor: '#FF1493', isCrop: true, cropId: 'strawberry', growthTime: 120 },
    seedApple: { id: 'seedApple', name: '苹果种子', category: ItemCategory.CROP, description: '可种植苹果', sellPrice: 9, unlockLevel: 14, rarity: 3, iconColor: '#FF4500', isCrop: true, cropId: 'apple', growthTime: 140 },
    seedCherry: { id: 'seedCherry', name: '樱桃种子', category: ItemCategory.CROP, description: '可种植樱桃', sellPrice: 11, unlockLevel: 16, rarity: 3, iconColor: '#DC143C', isCrop: true, cropId: 'cherry', growthTime: 150 },

    egg: { id: 'egg', name: '鸡蛋', category: ItemCategory.PROCESSED, description: '养鸡场产出，烘焙必需', sellPrice: 25, unlockLevel: 6, rarity: 2, iconColor: '#FFD700' },
    milk: { id: 'milk', name: '牛奶', category: ItemCategory.PROCESSED, description: '牧场产出，烹饪常用', sellPrice: 24, unlockLevel: 7, rarity: 2, iconColor: '#FFFFFF' },

    // ===== 第2类：加工品 (B01-B10) =====
    flour: { id: 'flour', name: '面粉', category: ItemCategory.PROCESSED, description: '小麦研磨而成，烘焙基础', sellPrice: 25, unlockLevel: 1, rarity: 1, iconColor: '#F5F5DC' },
    butter: { id: 'butter', name: '黄油', category: ItemCategory.PROCESSED, description: '牛奶加工而成，增加香味', sellPrice: 30, unlockLevel: 7, rarity: 1, iconColor: '#FFD700' },
    honey: { id: 'honey', name: '蜂蜜', category: ItemCategory.PROCESSED, description: '蜜蜂采集，甜味调料', sellPrice: 35, unlockLevel: 10, rarity: 2, iconColor: '#DAA520' },
    sugar: { id: 'sugar', name: '糖', category: ItemCategory.PROCESSED, description: '甘蔗加工，甜味基础', sellPrice: 28, unlockLevel: 5, rarity: 1, iconColor: '#FFFFFF' },
    oatmeal: { id: 'oatmeal', name: '燕麦', category: ItemCategory.PROCESSED, description: '燕麦谷物，健康食材', sellPrice: 22, unlockLevel: 8, rarity: 1, iconColor: '#D2B48C' },
    bananaSauce: { id: 'bananaSauce', name: '香蕉酱', category: ItemCategory.PROCESSED, description: '香蕉加工，涂抹食材', sellPrice: 38, unlockLevel: 12, rarity: 2, iconColor: '#FFD700' },
    jam: { id: 'jam', name: '果酱', category: ItemCategory.PROCESSED, description: '草莓/樱桃加工，涂抹食材', sellPrice: 42, unlockLevel: 14, rarity: 3, iconColor: '#DC143C' },
    carrotPuree: { id: 'carrotPuree', name: '胡萝卜泥', category: ItemCategory.PROCESSED, description: '胡萝卜研磨，辅助食材', sellPrice: 32, unlockLevel: 4, rarity: 2, iconColor: '#FFA500' },
    cheese: { id: 'cheese', name: '奶酪', category: ItemCategory.PROCESSED, description: '牛奶发酵，风味食材', sellPrice: 40, unlockLevel: 11, rarity: 3, iconColor: '#FFFACD' },
    ketchup: { id: 'ketchup', name: '番茄酱', category: ItemCategory.PROCESSED, description: '番茄加工，调味料', sellPrice: 35, unlockLevel: 3, rarity: 2, iconColor: '#DC143C' },
    water: { id: 'water', name: '清水', category: ItemCategory.PROCESSED, description: '水井产出的清水，可用于高级加工', sellPrice: 18, unlockLevel: 13, rarity: 2, iconColor: '#87CEEB' },

    // ===== 第3类：食物料理 (C01-C15) =====
    bread: { id: 'bread', name: '面包', category: ItemCategory.FOOD, description: '面粉烤制，基础食物', sellPrice: 60, unlockLevel: 5, rarity: 2, iconColor: '#8B4513' },
    croissant: { id: 'croissant', name: '牛角面包', category: ItemCategory.FOOD, description: '黄油烤制，精致早餐', sellPrice: 75, unlockLevel: 9, rarity: 3, iconColor: '#D2691E' },
    cake: { id: 'cake', name: '蛋糕', category: ItemCategory.FOOD, description: '鸡蛋烤制，甜蜜点心', sellPrice: 85, unlockLevel: 12, rarity: 3, iconColor: '#FFB6C1' },
    cupcake: { id: 'cupcake', name: '纸杯蛋糕', category: ItemCategory.FOOD, description: '个性小蛋糕，可爱造型', sellPrice: 70, unlockLevel: 12, rarity: 3, iconColor: '#FFB6C1' },
    cookie: { id: 'cookie', name: '饼干', category: ItemCategory.FOOD, description: '黄油烤制，香脆点心', sellPrice: 65, unlockLevel: 9, rarity: 2, iconColor: '#8B4513' },
    pie: { id: 'pie', name: '派', category: ItemCategory.FOOD, description: '水果派，经典甜点', sellPrice: 80, unlockLevel: 14, rarity: 4, iconColor: '#DAA520' },
    strawberryCake: { id: 'strawberryCake', name: '草莓蛋糕', category: ItemCategory.FOOD, description: '草莓装饰，豪华甜点', sellPrice: 95, unlockLevel: 18, rarity: 4, iconColor: '#FF1493' },
    baguette: { id: 'baguette', name: '法棍面包', category: ItemCategory.FOOD, description: '脆皮法包，经典款', sellPrice: 70, unlockLevel: 15, rarity: 3, iconColor: '#8B4513' },
    donut: { id: 'donut', name: '甜甜圈', category: ItemCategory.FOOD, description: '油炸甜点，童年味道', sellPrice: 65, unlockLevel: 11, rarity: 3, iconColor: '#FFB6C1' },
    chocolateCake: { id: 'chocolateCake', name: '巧克力蛋糕', category: ItemCategory.FOOD, description: '巧克力烤制，顶级甜点', sellPrice: 100, unlockLevel: 22, rarity: 5, iconColor: '#3E2723' },
    cornFlakes: { id: 'cornFlakes', name: '玉米片', category: ItemCategory.FOOD, description: '玉米加工成的香脆食品', sellPrice: 48, unlockLevel: 3, rarity: 2, iconColor: '#E6B84B' },
    cereal: { id: 'cereal', name: '麦片', category: ItemCategory.FOOD, description: '燕麦早餐，健康食品', sellPrice: 55, unlockLevel: 8, rarity: 2, iconColor: '#D2B48C' },
    pasta: { id: 'pasta', name: '意面', category: ItemCategory.FOOD, description: '小麦制品，经典意菜', sellPrice: 70, unlockLevel: 8, rarity: 3, iconColor: '#DAA520' },
    butterToast: { id: 'butterToast', name: '黄油吐司', category: ItemCategory.FOOD, description: '吐司涂黄油，快手早餐', sellPrice: 60, unlockLevel: 10, rarity: 2, iconColor: '#8B4513' },
    honeyToast: { id: 'honeyToast', name: '蜂蜜吐司', category: ItemCategory.FOOD, description: '吐司淋蜂蜜，香甜早餐', sellPrice: 65, unlockLevel: 13, rarity: 2, iconColor: '#DAA520' },
    jamToast: { id: 'jamToast', name: '果酱吐司', category: ItemCategory.FOOD, description: '吐司涂果酱，鲜美早餐', sellPrice: 62, unlockLevel: 16, rarity: 2, iconColor: '#DC143C' },

    // ===== 第4类：建筑 (D01-D08) =====
    chickenCoop: { id: 'chickenCoop', name: '鸡舍', category: ItemCategory.BUILDING, description: '定时生产鸡蛋，自动化生产', sellPrice: 100, unlockLevel: 6, rarity: 4, iconColor: '#8B7355' },
    barn: { id: 'barn', name: '牛棚', category: ItemCategory.BUILDING, description: '定时生产牛奶，自动化生产', sellPrice: 150, unlockLevel: 7, rarity: 4, iconColor: '#A9A9A9' },
    warehouse: { id: 'warehouse', name: '仓库', category: ItemCategory.BUILDING, description: '牧场生产耗时缩短10%，最多叠加30%', sellPrice: 80, unlockLevel: 9, rarity: 4, iconColor: '#8B4513' },
    house: { id: 'house', name: '房屋', category: ItemCategory.BUILDING, description: '每次收获农作物额外获得1经验', sellPrice: 90, unlockLevel: 11, rarity: 3, iconColor: '#FF6347' },
    well: { id: 'well', name: '井', category: ItemCategory.BUILDING, description: '定时生产水，高级配方需要', sellPrice: 120, unlockLevel: 13, rarity: 4, iconColor: '#87CEEB' },
    garden: { id: 'garden', name: '花园', category: ItemCategory.BUILDING, description: '定时产出鲜花，可用于合成', sellPrice: 80, unlockLevel: 15, rarity: 3, iconColor: '#FFB6C1' },
    beehive: { id: 'beehive', name: '蜂窝', category: ItemCategory.BUILDING, description: '定时生产蜂蜜，高价值产品', sellPrice: 180, unlockLevel: 17, rarity: 5, iconColor: '#FFD700' },

    // ===== 第5类：装饰品 (E01-E10) =====
    sunflower: { id: 'sunflower', name: '向日葵', category: ItemCategory.PROCESSED, description: '由鲜花培育的合成材料', sellPrice: 25, unlockLevel: 15, rarity: 1, iconColor: '#FFD700' },
    tulip: { id: 'tulip', name: '郁金香', category: ItemCategory.PROCESSED, description: '由鲜花培育的合成材料', sellPrice: 25, unlockLevel: 15, rarity: 1, iconColor: '#FF1493' },
    rose: { id: 'rose', name: '玫瑰', category: ItemCategory.PROCESSED, description: '由鲜花培育的合成材料', sellPrice: 30, unlockLevel: 15, rarity: 2, iconColor: '#DC143C' },
    tree: { id: 'tree', name: '树木', category: ItemCategory.DECORATION, description: '放置后使农作物生长时间缩短1%', sellPrice: 40, unlockLevel: 6, rarity: 2, iconColor: '#228B22' },
    palmTree: { id: 'palmTree', name: '棕榈树', category: ItemCategory.DECORATION, description: '放置后使农作物生长时间缩短1%', sellPrice: 50, unlockLevel: 10, rarity: 3, iconColor: '#228B22' },
    stone: { id: 'stone', name: '石头', category: ItemCategory.DECORATION, description: '放置后使农作物生长时间缩短1%', sellPrice: 20, unlockLevel: 1, rarity: 1, iconColor: '#808080' },
    log: { id: 'log', name: '木桩', category: ItemCategory.DECORATION, description: '放置后使农作物生长时间缩短1%', sellPrice: 22, unlockLevel: 1, rarity: 1, iconColor: '#8B4513' },
    fence: { id: 'fence', name: '木栅栏', category: ItemCategory.DECORATION, description: '放置后使农作物生长时间缩短1%', sellPrice: 28, unlockLevel: 4, rarity: 2, iconColor: '#8B4513' },
    tent: { id: 'tent', name: '帐篷', category: ItemCategory.DECORATION, description: '定时产出加速券', sellPrice: 60, unlockLevel: 14, rarity: 3, iconColor: '#FFB6C1' },
    pumpkinLantern: { id: 'pumpkinLantern', name: '南瓜灯', category: ItemCategory.DECORATION, description: '放置后使农作物生长时间缩短1%', sellPrice: 40, unlockLevel: 8, rarity: 2, iconColor: '#FF8C00' },
    flower: { id: 'flower', name: '鲜花', category: ItemCategory.PROCESSED, description: '花园产出的基础合成材料', sellPrice: 18, unlockLevel: 15, rarity: 2, iconColor: '#FFF4C2' },

    // ===== 第6类：特殊 (F01-F05) =====
    mysteryBox: { id: 'mysteryBox', name: '神秘礼盒', category: ItemCategory.SPECIAL, description: '打开可获得随机物品', sellPrice: 150, unlockLevel: 10, rarity: 5, iconColor: '#9370DB' },
    luckyStar: { id: 'luckyStar', name: '幸运星', category: ItemCategory.SPECIAL, description: '稀有收藏品，显示成就', sellPrice: 200, unlockLevel: 15, rarity: 5, iconColor: '#FFD700' },
    jade: { id: 'jade', name: '翡翠', category: ItemCategory.SPECIAL, description: '极稀有矿物，展示收藏', sellPrice: 250, unlockLevel: 20, rarity: 5, iconColor: '#00CED1' },

    // ===== 第7类：工具 (G01-G06) =====
    speedTicket: { id: 'speedTicket', name: '加速券', category: ItemCategory.TOOL, description: '加速合成30秒', sellPrice: 0, unlockLevel: 4, rarity: 3, iconColor: '#87CEEB' },
    doubleHarvestCard: { id: 'doubleHarvestCard', name: '双倍收获卡', category: ItemCategory.TOOL, description: '下次收获数量×2', sellPrice: 0, unlockLevel: 8, rarity: 4, iconColor: '#FFD700' },
    goldBoostCard: { id: 'goldBoostCard', name: '金币加倍券', category: ItemCategory.TOOL, description: '下次出售金币×2', sellPrice: 0, unlockLevel: 12, rarity: 4, iconColor: '#FFD700' },
    universalSeed: { id: 'universalSeed', name: '万能种子', category: ItemCategory.TOOL, description: '开出随机种子', sellPrice: 0, unlockLevel: 16, rarity: 4, iconColor: '#FFB6C1' },
    makeUpSignInCard: { id: 'makeUpSignInCard', name: '补签卡', category: ItemCategory.TOOL, description: '补回一次中断的每日签到', sellPrice: 0, unlockLevel: 1, rarity: 3, iconColor: '#FF9F91' },
};

/** Object.values polyfill (兼容 ES2015 编译目标) */
function objValues<T>(obj: Record<string, T>): T[] {
    const result: T[] = [];
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) result.push(obj[key]);
    }
    return result;
}

/** 按分类获取物品 */
export function getItemsByCategory(category: ItemCategory): ItemDef[] {
    return objValues(ITEM_DB).filter(i => i.category === category);
}

/** 获取可种植作物 */
export function getPlantableCrops(): ItemDef[] {
    return objValues(ITEM_DB).filter(i => i.isCrop);
}

/** 获取物品 */
export function getItem(id: string): ItemDef | undefined {
    return ITEM_DB[id];
}
