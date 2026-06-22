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
    growthTime?: number; // 秒
    harvestCount?: number;
}

/** 所有物品配置 */
export const ITEM_DB: Record<string, ItemDef> = {
    // ===== 第1类：基础农产品 (A01-A12) =====
    wheat: { id: 'wheat', name: '小麦', category: ItemCategory.CROP, description: '基础农作物，用于制作面粉', sellPrice: 10, unlockLevel: 1, rarity: 1, iconColor: '#FFD700', isCrop: true, growthTime: 30, harvestCount: 1 },
    corn: { id: 'corn', name: '玉米', category: ItemCategory.CROP, description: '甜玉米，合成料理的常用材料', sellPrice: 20, unlockLevel: 1, rarity: 1, iconColor: '#FFD700', isCrop: true, growthTime: 60, harvestCount: 1 },
    tomato: { id: 'tomato', name: '番茄', category: ItemCategory.CROP, description: '红色蔬菜，营养丰富', sellPrice: 15, unlockLevel: 1, rarity: 1, iconColor: '#FF4500', isCrop: true, growthTime: 90, harvestCount: 2 },
    carrot: { id: 'carrot', name: '胡萝卜', category: ItemCategory.CROP, description: '橙色蔬菜，清脆爽口', sellPrice: 25, unlockLevel: 2, rarity: 2, iconColor: '#FFA500', isCrop: true, growthTime: 120, harvestCount: 1 },
    pumpkin: { id: 'pumpkin', name: '南瓜', category: ItemCategory.CROP, description: '大南瓜，用于万圣节主题', sellPrice: 40, unlockLevel: 3, rarity: 2, iconColor: '#FF8C00', isCrop: true, growthTime: 180, harvestCount: 1 },
    strawberry: { id: 'strawberry', name: '草莓', category: ItemCategory.CROP, description: '红色果实，制作果酱', sellPrice: 30, unlockLevel: 4, rarity: 3, iconColor: '#FF1493', isCrop: true, growthTime: 120, harvestCount: 2 },
    cherry: { id: 'cherry', name: '樱桃', category: ItemCategory.CROP, description: '珍贵果实，特殊配方用', sellPrice: 35, unlockLevel: 5, rarity: 3, iconColor: '#DC143C', isCrop: true, growthTime: 150, harvestCount: 3 },
    banana: { id: 'banana', name: '香蕉', category: ItemCategory.CROP, description: '黄色水果，营养丰富', sellPrice: 22, unlockLevel: 4, rarity: 2, iconColor: '#FFD700', isCrop: true, growthTime: 100, harvestCount: 1 },
    apple: { id: 'apple', name: '苹果', category: ItemCategory.CROP, description: '红色水果，多用途', sellPrice: 28, unlockLevel: 5, rarity: 3, iconColor: '#FF4500', isCrop: true, growthTime: 140, harvestCount: 1 },
    lettuce: { id: 'lettuce', name: '生菜', category: ItemCategory.CROP, description: '绿色蔬菜，新鲜脆爽', sellPrice: 18, unlockLevel: 2, rarity: 1, iconColor: '#90EE90', isCrop: true, growthTime: 75, harvestCount: 2 },
    egg: { id: 'egg', name: '鸡蛋', category: ItemCategory.CROP, description: '养鸡场产出，烘焙必需', sellPrice: 25, unlockLevel: 3, rarity: 2, iconColor: '#FFD700', isCrop: true, growthTime: 110, harvestCount: 1 },
    milk: { id: 'milk', name: '牛奶', category: ItemCategory.CROP, description: '牧场产出，烹饪常用', sellPrice: 24, unlockLevel: 3, rarity: 2, iconColor: '#FFFFFF', isCrop: true, growthTime: 100, harvestCount: 1 },

    // ===== 第2类：加工品 (B01-B10) =====
    flour: { id: 'flour', name: '面粉', category: ItemCategory.PROCESSED, description: '小麦研磨而成，烘焙基础', sellPrice: 25, unlockLevel: 1, rarity: 1, iconColor: '#F5F5DC' },
    butter: { id: 'butter', name: '黄油', category: ItemCategory.PROCESSED, description: '牛奶加工而成，增加香味', sellPrice: 30, unlockLevel: 1, rarity: 1, iconColor: '#FFD700' },
    honey: { id: 'honey', name: '蜂蜜', category: ItemCategory.PROCESSED, description: '蜜蜂采集，甜味调料', sellPrice: 35, unlockLevel: 2, rarity: 2, iconColor: '#DAA520' },
    sugar: { id: 'sugar', name: '糖', category: ItemCategory.PROCESSED, description: '甘蔗加工，甜味基础', sellPrice: 28, unlockLevel: 2, rarity: 1, iconColor: '#FFFFFF' },
    oatmeal: { id: 'oatmeal', name: '燕麦', category: ItemCategory.PROCESSED, description: '燕麦谷物，健康食材', sellPrice: 22, unlockLevel: 3, rarity: 1, iconColor: '#D2B48C' },
    bananaSauce: { id: 'bananaSauce', name: '香蕉酱', category: ItemCategory.PROCESSED, description: '香蕉加工，涂抹食材', sellPrice: 38, unlockLevel: 4, rarity: 2, iconColor: '#FFD700' },
    jam: { id: 'jam', name: '果酱', category: ItemCategory.PROCESSED, description: '草莓/樱桃加工，涂抹食材', sellPrice: 42, unlockLevel: 5, rarity: 3, iconColor: '#DC143C' },
    carrotPuree: { id: 'carrotPuree', name: '胡萝卜泥', category: ItemCategory.PROCESSED, description: '胡萝卜研磨，辅助食材', sellPrice: 32, unlockLevel: 3, rarity: 2, iconColor: '#FFA500' },
    cheese: { id: 'cheese', name: '奶酪', category: ItemCategory.PROCESSED, description: '牛奶发酵，风味食材', sellPrice: 40, unlockLevel: 4, rarity: 3, iconColor: '#FFFACD' },
    ketchup: { id: 'ketchup', name: '番茄酱', category: ItemCategory.PROCESSED, description: '番茄加工，调味料', sellPrice: 35, unlockLevel: 3, rarity: 2, iconColor: '#DC143C' },

    // ===== 第3类：食物料理 (C01-C15) =====
    bread: { id: 'bread', name: '面包', category: ItemCategory.FOOD, description: '面粉烤制，基础食物', sellPrice: 60, unlockLevel: 2, rarity: 2, iconColor: '#8B4513' },
    croissant: { id: 'croissant', name: '牛角面包', category: ItemCategory.FOOD, description: '黄油烤制，精致早餐', sellPrice: 75, unlockLevel: 3, rarity: 3, iconColor: '#D2691E' },
    cake: { id: 'cake', name: '蛋糕', category: ItemCategory.FOOD, description: '鸡蛋烤制，甜蜜点心', sellPrice: 85, unlockLevel: 4, rarity: 3, iconColor: '#FFB6C1' },
    cupcake: { id: 'cupcake', name: '纸杯蛋糕', category: ItemCategory.FOOD, description: '个性小蛋糕，可爱造型', sellPrice: 70, unlockLevel: 4, rarity: 3, iconColor: '#FFB6C1' },
    cookie: { id: 'cookie', name: '饼干', category: ItemCategory.FOOD, description: '黄油烤制，香脆点心', sellPrice: 65, unlockLevel: 3, rarity: 2, iconColor: '#8B4513' },
    pie: { id: 'pie', name: '派', category: ItemCategory.FOOD, description: '水果派，经典甜点', sellPrice: 80, unlockLevel: 5, rarity: 4, iconColor: '#DAA520' },
    strawberryCake: { id: 'strawberryCake', name: '草莓蛋糕', category: ItemCategory.FOOD, description: '草莓装饰，豪华甜点', sellPrice: 95, unlockLevel: 5, rarity: 4, iconColor: '#FF1493' },
    baguette: { id: 'baguette', name: '法棍面包', category: ItemCategory.FOOD, description: '脆皮法包，经典款', sellPrice: 70, unlockLevel: 4, rarity: 3, iconColor: '#8B4513' },
    donut: { id: 'donut', name: '甜甜圈', category: ItemCategory.FOOD, description: '油炸甜点，童年味道', sellPrice: 65, unlockLevel: 4, rarity: 3, iconColor: '#FFB6C1' },
    chocolateCake: { id: 'chocolateCake', name: '巧克力蛋糕', category: ItemCategory.FOOD, description: '巧克力烤制，顶级甜点', sellPrice: 100, unlockLevel: 6, rarity: 5, iconColor: '#3E2723' },
    cereal: { id: 'cereal', name: '麦片', category: ItemCategory.FOOD, description: '燕麦早餐，健康食品', sellPrice: 55, unlockLevel: 3, rarity: 2, iconColor: '#D2B48C' },
    pasta: { id: 'pasta', name: '意面', category: ItemCategory.FOOD, description: '小麦制品，经典意菜', sellPrice: 70, unlockLevel: 4, rarity: 3, iconColor: '#DAA520' },
    butterToast: { id: 'butterToast', name: '黄油吐司', category: ItemCategory.FOOD, description: '吐司涂黄油，快手早餐', sellPrice: 60, unlockLevel: 3, rarity: 2, iconColor: '#8B4513' },
    honeyToast: { id: 'honeyToast', name: '蜂蜜吐司', category: ItemCategory.FOOD, description: '吐司淋蜂蜜，香甜早餐', sellPrice: 65, unlockLevel: 4, rarity: 2, iconColor: '#DAA520' },
    jamToast: { id: 'jamToast', name: '果酱吐司', category: ItemCategory.FOOD, description: '吐司涂果酱，鲜美早餐', sellPrice: 62, unlockLevel: 4, rarity: 2, iconColor: '#DC143C' },

    // ===== 第4类：建筑 (D01-D08) =====
    craftTable: { id: 'craftTable', name: '合成台', category: ItemCategory.BUILDING, description: '合成农产品，必需建筑', sellPrice: 50, unlockLevel: 1, rarity: 3, iconColor: '#808080' },
    chickenCoop: { id: 'chickenCoop', name: '鸡舍', category: ItemCategory.BUILDING, description: '定时生产鸡蛋，自动化生产', sellPrice: 100, unlockLevel: 3, rarity: 4, iconColor: '#8B7355' },
    barn: { id: 'barn', name: '牛棚', category: ItemCategory.BUILDING, description: '定时生产牛奶，自动化生产', sellPrice: 150, unlockLevel: 3, rarity: 4, iconColor: '#A9A9A9' },
    warehouse: { id: 'warehouse', name: '仓库', category: ItemCategory.BUILDING, description: '增加10格物品栏', sellPrice: 80, unlockLevel: 4, rarity: 4, iconColor: '#8B4513' },
    house: { id: 'house', name: '房屋', category: ItemCategory.BUILDING, description: '装饰建筑，无功能属性', sellPrice: 90, unlockLevel: 4, rarity: 3, iconColor: '#FF6347' },
    well: { id: 'well', name: '井', category: ItemCategory.BUILDING, description: '定时生产水，高级配方需要', sellPrice: 120, unlockLevel: 5, rarity: 4, iconColor: '#87CEEB' },
    garden: { id: 'garden', name: '花园', category: ItemCategory.BUILDING, description: '装饰建筑，花朵盛开', sellPrice: 80, unlockLevel: 4, rarity: 3, iconColor: '#FFB6C1' },
    beehive: { id: 'beehive', name: '蜂窝', category: ItemCategory.BUILDING, description: '定时生产蜂蜜，高价值产品', sellPrice: 180, unlockLevel: 5, rarity: 5, iconColor: '#FFD700' },

    // ===== 第5类：装饰品 (E01-E10) =====
    sunflower: { id: 'sunflower', name: '向日葵', category: ItemCategory.DECORATION, description: '黄色花朵，鲜亮可爱', sellPrice: 25, unlockLevel: 1, rarity: 1, iconColor: '#FFD700' },
    tulip: { id: 'tulip', name: '郁金香', category: ItemCategory.DECORATION, description: '红色花朵，优雅高贵', sellPrice: 25, unlockLevel: 1, rarity: 1, iconColor: '#FF1493' },
    rose: { id: 'rose', name: '玫瑰', category: ItemCategory.DECORATION, description: '深红花朵，浪漫温馨', sellPrice: 30, unlockLevel: 2, rarity: 2, iconColor: '#DC143C' },
    tree: { id: 'tree', name: '树木', category: ItemCategory.DECORATION, description: '大树，提供荫凉', sellPrice: 40, unlockLevel: 2, rarity: 2, iconColor: '#228B22' },
    palmTree: { id: 'palmTree', name: '棕榈树', category: ItemCategory.DECORATION, description: '热带树木，度假风格', sellPrice: 50, unlockLevel: 3, rarity: 3, iconColor: '#228B22' },
    stone: { id: 'stone', name: '石头', category: ItemCategory.DECORATION, description: '装饰石头，简约风格', sellPrice: 20, unlockLevel: 1, rarity: 1, iconColor: '#808080' },
    log: { id: 'log', name: '木桩', category: ItemCategory.DECORATION, description: '木制装饰，乡村风格', sellPrice: 22, unlockLevel: 1, rarity: 1, iconColor: '#8B4513' },
    fence: { id: 'fence', name: '木栅栏', category: ItemCategory.DECORATION, description: '栅栏装饰，划分区域', sellPrice: 28, unlockLevel: 2, rarity: 2, iconColor: '#8B4513' },
    tent: { id: 'tent', name: '帐篷', category: ItemCategory.DECORATION, description: '露营帐篷，冒险风格', sellPrice: 60, unlockLevel: 4, rarity: 3, iconColor: '#FFB6C1' },
    pumpkinLantern: { id: 'pumpkinLantern', name: '南瓜灯', category: ItemCategory.DECORATION, description: '万圣节装饰，节庆风格', sellPrice: 40, unlockLevel: 3, rarity: 2, iconColor: '#FF8C00' },

    // ===== 第6类：特殊 (F01-F05) =====
    mysteryBox: { id: 'mysteryBox', name: '神秘礼盒', category: ItemCategory.SPECIAL, description: '打开可获得随机物品', sellPrice: 150, unlockLevel: 1, rarity: 5, iconColor: '#9370DB' },
    luckyStar: { id: 'luckyStar', name: '幸运星', category: ItemCategory.SPECIAL, description: '稀有收藏品，显示成就', sellPrice: 200, unlockLevel: 1, rarity: 5, iconColor: '#FFD700' },
    jade: { id: 'jade', name: '翡翠', category: ItemCategory.SPECIAL, description: '极稀有矿物，展示收藏', sellPrice: 250, unlockLevel: 1, rarity: 5, iconColor: '#00CED1' },

    // ===== 第7类：工具 (G01-G06) =====
    speedTicket: { id: 'speedTicket', name: '加速券', category: ItemCategory.TOOL, description: '加速合成30秒', sellPrice: 0, unlockLevel: 1, rarity: 3, iconColor: '#87CEEB' },
    doubleHarvestCard: { id: 'doubleHarvestCard', name: '双倍收获卡', category: ItemCategory.TOOL, description: '下次收获数量×2', sellPrice: 0, unlockLevel: 1, rarity: 4, iconColor: '#FFD700' },
    goldBoostCard: { id: 'goldBoostCard', name: '金币加倍券', category: ItemCategory.TOOL, description: '下次出售金币×2', sellPrice: 0, unlockLevel: 1, rarity: 4, iconColor: '#FFD700' },
    universalSeed: { id: 'universalSeed', name: '万能种子', category: ItemCategory.TOOL, description: '开出随机种子', sellPrice: 0, unlockLevel: 1, rarity: 4, iconColor: '#FFB6C1' },
};

/** 按分类获取物品 */
export function getItemsByCategory(category: ItemCategory): ItemDef[] {
    return Object.values(ITEM_DB).filter(i => i.category === category);
}

/** 获取可种植作物 */
export function getPlantableCrops(): ItemDef[] {
    return Object.values(ITEM_DB).filter(i => i.isCrop);
}

/** 获取物品 */
export function getItem(id: string): ItemDef | undefined {
    return ITEM_DB[id];
}
