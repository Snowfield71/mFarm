/**
 * 合成配方配置 - 萌田农场
 * 基于 Moefarm_items_and_recipes.md 第三部分
 */

export interface RecipeIngredient {
  itemId: string;
  count: number;
}

export interface RecipeDef {
  id: string;
  name: string;
  materials: RecipeIngredient[];
  product: { itemId: string; count: number };
  craftTime: number; // 秒
  cost: number; // 金币成本
  exp: number; // 经验
  requiredLevel: number;
  tier: number; // 配方等级 1-4
}

/** 所有合成配方 */
export const RECIPE_DB: Record<string, RecipeDef> = {
  // === 一级配方 (Lv.1-2): 基础加工品 ===
  R001: {
    id: "R001",
    name: "面粉制作",
    materials: [{ itemId: "wheat", count: 3 }],
    product: { itemId: "flour", count: 1 },
    craftTime: 10,
    cost: 20,
    exp: 10,
    requiredLevel: 1,
    tier: 1,
  },
  R002: {
    id: "R002",
    name: "黄油制作",
    materials: [{ itemId: "milk", count: 2 }],
    product: { itemId: "butter", count: 1 },
    craftTime: 15,
    cost: 25,
    exp: 12,
    requiredLevel: 7,
    tier: 1,
  },
  R003: {
    id: "R003",
    name: "番茄酱制作",
    materials: [{ itemId: "tomato", count: 3 }],
    product: { itemId: "ketchup", count: 1 },
    craftTime: 12,
    cost: 22,
    exp: 11,
    requiredLevel: 3,
    tier: 1,
  },
  R006: {
    id: "R006",
    name: "玉米片制作",
    materials: [{ itemId: "corn", count: 3 }],
    product: { itemId: "cornFlakes", count: 1 },
    craftTime: 12,
    cost: 22,
    exp: 11,
    requiredLevel: 3,
    tier: 1,
  },
  R004: {
    id: "R004",
    name: "胡萝卜泥制作",
    materials: [{ itemId: "carrot", count: 2 }],
    product: { itemId: "carrotPuree", count: 1 },
    craftTime: 8,
    cost: 18,
    exp: 9,
    requiredLevel: 4,
    tier: 1,
  },
  R005: {
    id: "R005",
    name: "蜂蜜采集",
    materials: [{ itemId: "flower", count: 2 }],
    product: { itemId: "honey", count: 1 },
    craftTime: 20,
    cost: 30,
    exp: 15,
    requiredLevel: 15,
    tier: 1,
  },
  // === 二级配方 (Lv.3-4): 面包和简单料理 ===
  R010: {
    id: "R010",
    name: "面包烘焙",
    materials: [
      { itemId: "flour", count: 2 },
      { itemId: "butter", count: 1 },
    ],
    product: { itemId: "bread", count: 1 },
    craftTime: 30,
    cost: 50,
    exp: 25,
    requiredLevel: 7,
    tier: 2,
  },
  R011: {
    id: "R011",
    name: "牛角面包",
    materials: [
      { itemId: "flour", count: 3 },
      { itemId: "butter", count: 2 },
    ],
    product: { itemId: "croissant", count: 1 },
    craftTime: 35,
    cost: 60,
    exp: 30,
    requiredLevel: 9,
    tier: 2,
  },
  R012: {
    id: "R012",
    name: "饼干制作",
    materials: [
      { itemId: "flour", count: 2 },
      { itemId: "butter", count: 1 },
      { itemId: "sugar", count: 1 },
    ],
    product: { itemId: "cookie", count: 2 },
    craftTime: 25,
    cost: 55,
    exp: 27,
    requiredLevel: 9,
    tier: 2,
  },
  R013: {
    id: "R013",
    name: "黄油吐司",
    materials: [
      { itemId: "bread", count: 1 },
      { itemId: "butter", count: 1 },
    ],
    product: { itemId: "butterToast", count: 1 },
    craftTime: 20,
    cost: 45,
    exp: 22,
    requiredLevel: 10,
    tier: 2,
  },
  R014: {
    id: "R014",
    name: "蜂蜜吐司",
    materials: [
      { itemId: "bread", count: 1 },
      { itemId: "honey", count: 1 },
    ],
    product: { itemId: "honeyToast", count: 1 },
    craftTime: 22,
    cost: 48,
    exp: 24,
    requiredLevel: 13,
    tier: 2,
  },
  R016: {
    id: "R016",
    name: "麦片早餐",
    materials: [
      { itemId: "oatmeal", count: 2 },
      { itemId: "milk", count: 1 },
    ],
    product: { itemId: "cereal", count: 1 },
    craftTime: 15,
    cost: 40,
    exp: 20,
    requiredLevel: 8,
    tier: 2,
  },
  R017: {
    id: "R017",
    name: "意面烹饪",
    materials: [
      { itemId: "flour", count: 3 },
      { itemId: "ketchup", count: 1 },
    ],
    product: { itemId: "pasta", count: 1 },
    craftTime: 30,
    cost: 55,
    exp: 28,
    requiredLevel: 8,
    tier: 2,
  },

  // === 三级配方 (Lv.4-5): 蛋糕和高级料理 ===
  R020: {
    id: "R020",
    name: "蛋糕烘焙",
    materials: [
      { itemId: "flour", count: 3 },
      { itemId: "egg", count: 2 },
      { itemId: "butter", count: 1 },
    ],
    product: { itemId: "cake", count: 1 },
    craftTime: 45,
    cost: 75,
    exp: 40,
    requiredLevel: 12,
    tier: 3,
  },
  R021: {
    id: "R021",
    name: "纸杯蛋糕",
    materials: [
      { itemId: "flour", count: 2 },
      { itemId: "egg", count: 1 },
      { itemId: "sugar", count: 1 },
    ],
    product: { itemId: "cupcake", count: 2 },
    craftTime: 35,
    cost: 65,
    exp: 35,
    requiredLevel: 12,
    tier: 3,
  },
  R022: {
    id: "R022",
    name: "甜甜圈",
    materials: [
      { itemId: "flour", count: 2 },
      { itemId: "sugar", count: 2 },
    ],
    product: { itemId: "donut", count: 2 },
    craftTime: 30,
    cost: 60,
    exp: 32,
    requiredLevel: 11,
    tier: 3,
  },
  R024: {
    id: "R024",
    name: "草莓派",
    materials: [
      { itemId: "strawberry", count: 3 },
      { itemId: "sugar", count: 1 },
      { itemId: "butter", count: 1 },
    ],
    product: { itemId: "pie", count: 1 },
    craftTime: 50,
    cost: 85,
    exp: 45,
    requiredLevel: 14,
    tier: 3,
  },
  R026: {
    id: "R026",
    name: "草莓蛋糕",
    materials: [
      { itemId: "cake", count: 1 },
      { itemId: "strawberry", count: 2 },
      { itemId: "honey", count: 1 },
    ],
    product: { itemId: "strawberryCake", count: 1 },
    craftTime: 55,
    cost: 95,
    exp: 50,
    requiredLevel: 18,
    tier: 3,
  },
  R027: {
    id: "R027",
    name: "果酱制作",
    materials: [
      { itemId: "strawberry", count: 5 },
      { itemId: "sugar", count: 2 },
    ],
    product: { itemId: "jam", count: 1 },
    craftTime: 60,
    cost: 90,
    exp: 48,
    requiredLevel: 14,
    tier: 3,
  },
  R029: {
    id: "R029",
    name: "果酱吐司",
    materials: [
      { itemId: "bread", count: 1 },
      { itemId: "jam", count: 1 },
    ],
    product: { itemId: "jamToast", count: 1 },
    craftTime: 25,
    cost: 50,
    exp: 25,
    requiredLevel: 16,
    tier: 3,
  },

  // === 四级配方 (Lv.6+): 顶级料理 ===
  R030: {
    id: "R030",
    name: "巧克力蛋糕",
    materials: [
      { itemId: "flour", count: 4 },
      { itemId: "egg", count: 3 },
      { itemId: "butter", count: 2 },
    ],
    product: { itemId: "chocolateCake", count: 1 },
    craftTime: 60,
    cost: 120,
    exp: 60,
    requiredLevel: 22,
    tier: 4,
  },
  R031: {
    id: "R031",
    name: "奶酪制作",
    materials: [
      { itemId: "milk", count: 3 },
      { itemId: "butter", count: 1 },
    ],
    product: { itemId: "cheese", count: 1 },
    craftTime: 40,
    cost: 75,
    exp: 40,
    requiredLevel: 11,
    tier: 4,
  },
  R033: {
    id: "R033",
    name: "法棍面包",
    materials: [
      { itemId: "flour", count: 4 },
      { itemId: "butter", count: 1 },
    ],
    product: { itemId: "baguette", count: 1 },
    craftTime: 50,
    cost: 95,
    exp: 48,
    requiredLevel: 15,
    tier: 4,
  },

  // === 秋冬农作物料理 (Lv.15-24) ===
  R040: {
    id: "R040",
    name: "奶酪西兰花汤",
    materials: [
      { itemId: "broccoli", count: 4 },
      { itemId: "milk", count: 2 },
      { itemId: "cheese", count: 2 },
    ],
    product: { itemId: "broccoliCheeseSoup", count: 1 },
    craftTime: 52,
    cost: 85,
    exp: 46,
    requiredLevel: 15,
    tier: 3,
  },
  R041: {
    id: "R041",
    name: "甜菜根沙拉",
    materials: [
      { itemId: "beetroot", count: 4 },
      { itemId: "carrot", count: 2 },
    ],
    product: { itemId: "beetrootSalad", count: 1 },
    craftTime: 38,
    cost: 62,
    exp: 34,
    requiredLevel: 16,
    tier: 3,
  },
  R042: {
    id: "R042",
    name: "香浓芜菁汤",
    materials: [
      { itemId: "turnip", count: 4 },
      { itemId: "milk", count: 2 },
    ],
    product: { itemId: "turnipSoup", count: 1 },
    craftTime: 44,
    cost: 68,
    exp: 38,
    requiredLevel: 17,
    tier: 3,
  },
  R043: {
    id: "R043",
    name: "鲜榨芹菜汁",
    materials: [
      { itemId: "celery", count: 5 },
      { itemId: "water", count: 2 },
    ],
    product: { itemId: "celeryJuice", count: 1 },
    craftTime: 32,
    cost: 55,
    exp: 31,
    requiredLevel: 18,
    tier: 3,
  },
  R044: {
    id: "R044",
    name: "暖香蜂蜜姜茶",
    materials: [
      { itemId: "ginger", count: 4 },
      { itemId: "honey", count: 2 },
      { itemId: "water", count: 2 },
    ],
    product: { itemId: "gingerTea", count: 1 },
    craftTime: 40,
    cost: 70,
    exp: 39,
    requiredLevel: 19,
    tier: 3,
  },
  R045: {
    id: "R045",
    name: "羽衣甘蓝沙拉",
    materials: [
      { itemId: "kale", count: 4 },
      { itemId: "tomato", count: 2 },
      { itemId: "cheese", count: 2 },
    ],
    product: { itemId: "kaleSalad", count: 1 },
    craftTime: 46,
    cost: 78,
    exp: 43,
    requiredLevel: 20,
    tier: 4,
  },
  R046: {
    id: "R046",
    name: "田园白菜卷",
    materials: [
      { itemId: "chineseCabbage", count: 4 },
      { itemId: "carrot", count: 2 },
      { itemId: "flour", count: 2 },
    ],
    product: { itemId: "cabbageRoll", count: 1 },
    craftTime: 54,
    cost: 88,
    exp: 49,
    requiredLevel: 21,
    tier: 4,
  },
  R047: {
    id: "R047",
    name: "黄油蒜香面包",
    materials: [
      { itemId: "garlic", count: 4 },
      { itemId: "bread", count: 2 },
      { itemId: "butter", count: 2 },
    ],
    product: { itemId: "garlicBread", count: 1 },
    craftTime: 48,
    cost: 82,
    exp: 45,
    requiredLevel: 22,
    tier: 4,
  },
  R048: {
    id: "R048",
    name: "韭葱土豆浓汤",
    materials: [
      { itemId: "leek", count: 4 },
      { itemId: "potato", count: 2 },
      { itemId: "milk", count: 2 },
    ],
    product: { itemId: "leekSoup", count: 1 },
    craftTime: 58,
    cost: 94,
    exp: 53,
    requiredLevel: 23,
    tier: 4,
  },
  R049: {
    id: "R049",
    name: "黄油小卷心",
    materials: [
      { itemId: "brusselsSprouts", count: 5 },
      { itemId: "butter", count: 2 },
    ],
    product: { itemId: "roastedBrusselsSprouts", count: 1 },
    craftTime: 62,
    cost: 100,
    exp: 58,
    requiredLevel: 24,
    tier: 4,
  },

  // === 秋冬高阶组合料理 ===
  R050: {
    id: "R050",
    name: "秋收蔬菜汤",
    materials: [
      { itemId: "broccoli", count: 3 },
      { itemId: "beetroot", count: 3 },
      { itemId: "turnip", count: 3 },
    ],
    product: { itemId: "autumnVegSoup", count: 1 },
    craftTime: 72,
    cost: 120,
    exp: 68,
    requiredLevel: 20,
    tier: 4,
  },
  R051: {
    id: "R051",
    name: "姜香蔬菜煲",
    materials: [
      { itemId: "ginger", count: 4 },
      { itemId: "chineseCabbage", count: 4 },
      { itemId: "garlic", count: 3 },
    ],
    product: { itemId: "gingerVegStew", count: 1 },
    craftTime: 78,
    cost: 130,
    exp: 74,
    requiredLevel: 21,
    tier: 4,
  },
  R052: {
    id: "R052",
    name: "双绿能量碗",
    materials: [
      { itemId: "kale", count: 4 },
      { itemId: "broccoli", count: 4 },
      { itemId: "celery", count: 3 },
    ],
    product: { itemId: "greenEnergyBowl", count: 1 },
    craftTime: 82,
    cost: 140,
    exp: 80,
    requiredLevel: 22,
    tier: 4,
  },
  R053: {
    id: "R053",
    name: "蒜香冬菜卷",
    materials: [
      { itemId: "chineseCabbage", count: 4 },
      { itemId: "leek", count: 4 },
      { itemId: "garlic", count: 3 },
    ],
    product: { itemId: "garlicWinterRoll", count: 1 },
    craftTime: 88,
    cost: 150,
    exp: 86,
    requiredLevel: 23,
    tier: 4,
  },
  R054: {
    id: "R054",
    name: "冬日烤蔬盘",
    materials: [
      { itemId: "brusselsSprouts", count: 4 },
      { itemId: "turnip", count: 4 },
      { itemId: "beetroot", count: 4 },
    ],
    product: { itemId: "winterRoastPlatter", count: 1 },
    craftTime: 96,
    cost: 160,
    exp: 94,
    requiredLevel: 24,
    tier: 4,
  },

  // === 水果专属合成品 ===
  R055: {
    id: "R055",
    name: "香甜香蕉酱",
    materials: [
      { itemId: "banana", count: 5 },
      { itemId: "sugar", count: 2 },
    ],
    product: { itemId: "bananaSauce", count: 1 },
    craftTime: 50,
    cost: 90,
    exp: 48,
    requiredLevel: 12,
    tier: 3,
  },
  R056: {
    id: "R056",
    name: "香甜苹果派",
    materials: [
      { itemId: "apple", count: 5 },
      { itemId: "flour", count: 2 },
      { itemId: "butter", count: 2 },
    ],
    product: { itemId: "applePie", count: 1 },
    craftTime: 70,
    cost: 120,
    exp: 68,
    requiredLevel: 14,
    tier: 4,
  },
  R057: {
    id: "R057",
    name: "樱桃果酱瓶",
    materials: [
      { itemId: "cherry", count: 5 },
      { itemId: "sugar", count: 2 },
    ],
    product: { itemId: "cherryJam", count: 1 },
    craftTime: 60,
    cost: 105,
    exp: 58,
    requiredLevel: 16,
    tier: 4,
  },
  R058: {
    id: "R058",
    name: "冰爽西瓜汁",
    materials: [
      { itemId: "watermelon", count: 5 },
      { itemId: "water", count: 2 },
      { itemId: "sugar", count: 2 },
    ],
    product: { itemId: "watermelonJuice", count: 1 },
    craftTime: 65,
    cost: 115,
    exp: 62,
    requiredLevel: 12,
    tier: 4,
  },
};

function recipeValues(): RecipeDef[] {
  const result: RecipeDef[] = [];
  for (const id in RECIPE_DB) {
    if (Object.prototype.hasOwnProperty.call(RECIPE_DB, id))
      result.push(RECIPE_DB[id]);
  }
  return result;
}

/** 获取所有配方（按等级排序） */
export function getAllRecipes(): RecipeDef[] {
  return recipeValues().sort((a, b) => a.requiredLevel - b.requiredLevel);
}

/** 按等级获取可用配方 */
export function getRecipesByLevel(level: number): RecipeDef[] {
  return recipeValues()
    .filter((r) => r.requiredLevel <= level)
    .sort((a, b) =>
      a.requiredLevel === b.requiredLevel
        ? a.tier - b.tier
        : a.requiredLevel - b.requiredLevel,
    );
}

/** 获取配方 */
export function getRecipe(id: string): RecipeDef | undefined {
  return RECIPE_DB[id];
}
