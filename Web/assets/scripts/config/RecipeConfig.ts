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
    craftTime: number;  // 秒
    cost: number;       // 金币成本
    exp: number;        // 经验
    requiredLevel: number;
    tier: number;       // 配方等级 1-4
}

/** 所有合成配方 */
export const RECIPE_DB: Record<string, RecipeDef> = {
    // === 一级配方 (Lv.1-2): 基础加工品 ===
    R001: { id: 'R001', name: '面粉制作', materials: [{ itemId: 'wheat', count: 3 }], product: { itemId: 'flour', count: 1 }, craftTime: 10, cost: 20, exp: 10, requiredLevel: 1, tier: 1 },
    R002: { id: 'R002', name: '黄油制作', materials: [{ itemId: 'milk', count: 2 }], product: { itemId: 'butter', count: 1 }, craftTime: 15, cost: 25, exp: 12, requiredLevel: 1, tier: 1 },
    R003: { id: 'R003', name: '番茄酱制作', materials: [{ itemId: 'tomato', count: 3 }], product: { itemId: 'ketchup', count: 1 }, craftTime: 12, cost: 22, exp: 11, requiredLevel: 1, tier: 1 },
    R004: { id: 'R004', name: '胡萝卜泥制作', materials: [{ itemId: 'carrot', count: 2 }], product: { itemId: 'carrotPuree', count: 1 }, craftTime: 8, cost: 18, exp: 9, requiredLevel: 2, tier: 1 },
    R005: { id: 'R005', name: '蜂蜜采集', materials: [{ itemId: 'flower', count: 2 }], product: { itemId: 'honey', count: 1 }, craftTime: 20, cost: 30, exp: 15, requiredLevel: 2, tier: 1 },

    // === 二级配方 (Lv.3-4): 面包和简单料理 ===
    R010: { id: 'R010', name: '面包烘焙', materials: [{ itemId: 'flour', count: 2 }, { itemId: 'butter', count: 1 }], product: { itemId: 'bread', count: 1 }, craftTime: 30, cost: 50, exp: 25, requiredLevel: 2, tier: 2 },
    R011: { id: 'R011', name: '牛角面包', materials: [{ itemId: 'flour', count: 3 }, { itemId: 'butter', count: 2 }], product: { itemId: 'croissant', count: 1 }, craftTime: 35, cost: 60, exp: 30, requiredLevel: 3, tier: 2 },
    R012: { id: 'R012', name: '饼干制作', materials: [{ itemId: 'flour', count: 2 }, { itemId: 'butter', count: 1 }, { itemId: 'sugar', count: 1 }], product: { itemId: 'cookie', count: 2 }, craftTime: 25, cost: 55, exp: 27, requiredLevel: 3, tier: 2 },
    R013: { id: 'R013', name: '黄油吐司', materials: [{ itemId: 'bread', count: 1 }, { itemId: 'butter', count: 1 }], product: { itemId: 'butterToast', count: 1 }, craftTime: 20, cost: 45, exp: 22, requiredLevel: 3, tier: 2 },
    R014: { id: 'R014', name: '蜂蜜吐司', materials: [{ itemId: 'bread', count: 1 }, { itemId: 'honey', count: 1 }], product: { itemId: 'honeyToast', count: 1 }, craftTime: 22, cost: 48, exp: 24, requiredLevel: 3, tier: 2 },
    R015: { id: 'R015', name: '番茄吐司', materials: [{ itemId: 'bread', count: 1 }, { itemId: 'ketchup', count: 1 }], product: { itemId: 'food', count: 1 }, craftTime: 20, cost: 45, exp: 22, requiredLevel: 3, tier: 2 },
    R016: { id: 'R016', name: '麦片早餐', materials: [{ itemId: 'oatmeal', count: 2 }, { itemId: 'milk', count: 1 }], product: { itemId: 'cereal', count: 1 }, craftTime: 15, cost: 40, exp: 20, requiredLevel: 3, tier: 2 },
    R017: { id: 'R017', name: '意面烹饪', materials: [{ itemId: 'flour', count: 3 }, { itemId: 'ketchup', count: 1 }], product: { itemId: 'pasta', count: 1 }, craftTime: 30, cost: 55, exp: 28, requiredLevel: 4, tier: 2 },

    // === 三级配方 (Lv.4-5): 蛋糕和高级料理 ===
    R020: { id: 'R020', name: '蛋糕烘焙', materials: [{ itemId: 'flour', count: 3 }, { itemId: 'egg', count: 2 }, { itemId: 'butter', count: 1 }], product: { itemId: 'cake', count: 1 }, craftTime: 45, cost: 75, exp: 40, requiredLevel: 4, tier: 3 },
    R021: { id: 'R021', name: '纸杯蛋糕', materials: [{ itemId: 'flour', count: 2 }, { itemId: 'egg', count: 1 }, { itemId: 'sugar', count: 1 }], product: { itemId: 'cupcake', count: 2 }, craftTime: 35, cost: 65, exp: 35, requiredLevel: 4, tier: 3 },
    R022: { id: 'R022', name: '甜甜圈', materials: [{ itemId: 'flour', count: 2 }, { itemId: 'sugar', count: 2 }], product: { itemId: 'donut', count: 2 }, craftTime: 30, cost: 60, exp: 32, requiredLevel: 4, tier: 3 },
    R024: { id: 'R024', name: '草莓派', materials: [{ itemId: 'strawberry', count: 3 }, { itemId: 'sugar', count: 1 }, { itemId: 'butter', count: 1 }], product: { itemId: 'pie', count: 1 }, craftTime: 50, cost: 85, exp: 45, requiredLevel: 5, tier: 3 },
    R026: { id: 'R026', name: '草莓蛋糕', materials: [{ itemId: 'cake', count: 1 }, { itemId: 'strawberry', count: 2 }, { itemId: 'honey', count: 1 }], product: { itemId: 'strawberryCake', count: 1 }, craftTime: 55, cost: 95, exp: 50, requiredLevel: 5, tier: 3 },
    R027: { id: 'R027', name: '果酱制作', materials: [{ itemId: 'strawberry', count: 5 }, { itemId: 'sugar', count: 2 }], product: { itemId: 'jam', count: 1 }, craftTime: 60, cost: 90, exp: 48, requiredLevel: 5, tier: 3 },
    R029: { id: 'R029', name: '果酱吐司', materials: [{ itemId: 'bread', count: 1 }, { itemId: 'jam', count: 1 }], product: { itemId: 'jamToast', count: 1 }, craftTime: 25, cost: 50, exp: 25, requiredLevel: 4, tier: 3 },

    // === 四级配方 (Lv.6+): 顶级料理 ===
    R030: { id: 'R030', name: '巧克力蛋糕', materials: [{ itemId: 'flour', count: 4 }, { itemId: 'egg', count: 3 }, { itemId: 'butter', count: 2 }], product: { itemId: 'chocolateCake', count: 1 }, craftTime: 60, cost: 120, exp: 60, requiredLevel: 6, tier: 4 },
    R031: { id: 'R031', name: '奶酪制作', materials: [{ itemId: 'milk', count: 3 }, { itemId: 'butter', count: 1 }], product: { itemId: 'cheese', count: 1 }, craftTime: 40, cost: 75, exp: 40, requiredLevel: 5, tier: 4 },
    R033: { id: 'R033', name: '法棍面包', materials: [{ itemId: 'flour', count: 4 }, { itemId: 'butter', count: 1 }], product: { itemId: 'baguette', count: 1 }, craftTime: 50, cost: 95, exp: 48, requiredLevel: 5, tier: 4 },
};

/** 获取所有配方（按等级排序） */
export function getAllRecipes(): RecipeDef[] {
    return Object.values(RECIPE_DB).sort((a, b) => a.requiredLevel - b.requiredLevel);
}

/** 按等级获取可用配方 */
export function getRecipesByLevel(level: number): RecipeDef[] {
    return Object.values(RECIPE_DB).filter(r => r.requiredLevel <= level);
}

/** 获取配方 */
export function getRecipe(id: string): RecipeDef | undefined {
    return RECIPE_DB[id];
}
