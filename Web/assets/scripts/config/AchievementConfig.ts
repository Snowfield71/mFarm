export type AchievementReward = { type: 'gold' | 'diamond'; count: number };
export type AchievementTier = 'normal' | 'rare' | 'hidden';
export type AchievementCategory = 'planting' | 'crafting' | 'growth' | 'collection';
export type AchievementProgressKind = 'plants' | 'crafts' | 'gold' | 'diamonds' | 'level' | 'recipes' | 'catalog' | 'pastureCollections';

export type AchievementDefinition = {
    id: string;
    title: string;
    description: string;
    icon: string;
    tier: AchievementTier;
    category: AchievementCategory;
    progressKind: AchievementProgressKind;
    target?: number;
    lockedIcon?: string;
    reward: AchievementReward;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
    { id: 'first_plant', title: '播下希望', description: '完成第一次种植', icon: 'achievementFirstPlant', tier: 'normal', category: 'planting', progressKind: 'plants', target: 1, reward: { type: 'gold', count: 200 } },
    { id: 'plant_50', title: '田园能手', description: '累计种植50次', icon: 'achievementPlant50', tier: 'rare', category: 'planting', progressKind: 'plants', target: 50, reward: { type: 'diamond', count: 10 } },
    { id: 'first_craft', title: '初次加工', description: '完成第一次合成', icon: 'achievementFirstCraft', tier: 'normal', category: 'crafting', progressKind: 'crafts', target: 1, reward: { type: 'gold', count: 400 } },
    { id: 'craft_50', title: '合成大师', description: '累计完成50次合成', icon: 'achievementCraft50', tier: 'rare', category: 'crafting', progressKind: 'crafts', target: 50, reward: { type: 'diamond', count: 20 } },
    { id: 'recipes_all', title: '配方专家', description: '解锁全部配方', icon: 'achievementRecipesAll', tier: 'rare', category: 'crafting', progressKind: 'recipes', reward: { type: 'gold', count: 1500 } },
    { id: 'gold_100', title: '第一桶金', description: '持有100金币', icon: 'achievementGold100', tier: 'normal', category: 'growth', progressKind: 'gold', target: 100, reward: { type: 'gold', count: 300 } },
    { id: 'gold_10000', title: '丰收存钱罐', description: '持有10000金币', icon: 'achievementGold10000', tier: 'rare', category: 'growth', progressKind: 'gold', target: 10000, reward: { type: 'diamond', count: 30 } },
    { id: 'diamond_50', title: '璀璨收藏', description: '持有50钻石', icon: 'achievementDiamond50', tier: 'rare', category: 'growth', progressKind: 'diamonds', target: 50, reward: { type: 'gold', count: 1000 } },
    { id: 'level_10', title: '渐入佳境', description: '农场达到10级', icon: 'achievementLevel10', tier: 'rare', category: 'growth', progressKind: 'level', target: 10, reward: { type: 'diamond', count: 15 } },
    { id: 'level_20', title: '田园之星', description: '农场达到20级', icon: 'achievementLevel20', tier: 'rare', category: 'growth', progressKind: 'level', target: 20, reward: { type: 'diamond', count: 25 } },
    { id: 'catalog_20', title: '田园见闻', description: '发现20项图鉴', icon: 'achievementCatalog20', tier: 'normal', category: 'collection', progressKind: 'catalog', target: 20, reward: { type: 'gold', count: 800 } },
    { id: 'catalog_all', title: '收藏家', description: '完成全部图鉴收集', icon: 'achievementCatalogAll', tier: 'hidden', category: 'collection', progressKind: 'catalog', lockedIcon: 'achievementCatalogAllLocked', reward: { type: 'diamond', count: 50 } },
    { id: 'pasture_first', title: '牧场初收', description: '首次收取牧场产物', icon: 'achievementPastureFirst', tier: 'normal', category: 'collection', progressKind: 'pastureCollections', target: 1, reward: { type: 'gold', count: 300 } },
    { id: 'pasture_50', title: '牧场管家', description: '累计收取牧场产物50次', icon: 'achievementPasture50', tier: 'rare', category: 'collection', progressKind: 'pastureCollections', target: 50, reward: { type: 'diamond', count: 25 } },
];
