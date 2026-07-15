export type AchievementReward = { type: 'gold' | 'diamond'; count: number };
export type AchievementTier = 'normal' | 'rare' | 'hidden';

export type AchievementDefinition = {
    id: string;
    title: string;
    description: string;
    icon: string;
    tier: AchievementTier;
    lockedIcon?: string;
    reward: AchievementReward;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
    { id: 'first_plant', title: '播下希望', description: '完成第一次种植', icon: 'achievementFirstPlant', tier: 'normal', reward: { type: 'gold', count: 200 } },
    { id: 'plant_50', title: '田园能手', description: '累计种植50次', icon: 'achievementPlant50', tier: 'rare', reward: { type: 'diamond', count: 10 } },
    { id: 'gold_100', title: '第一桶金', description: '持有100金币', icon: 'achievementGold100', tier: 'normal', reward: { type: 'gold', count: 300 } },
    { id: 'level_10', title: '渐入佳境', description: '农场达到10级', icon: 'achievementLevel10', tier: 'rare', reward: { type: 'diamond', count: 15 } },
    { id: 'first_craft', title: '初次加工', description: '完成第一次合成', icon: 'achievementFirstCraft', tier: 'normal', reward: { type: 'gold', count: 400 } },
    { id: 'craft_50', title: '合成大师', description: '累计完成50次合成', icon: 'achievementCraft50', tier: 'rare', reward: { type: 'diamond', count: 20 } },
    { id: 'recipes_all', title: '配方专家', description: '解锁全部配方', icon: 'achievementRecipesAll', tier: 'rare', reward: { type: 'gold', count: 1500 } },
    { id: 'catalog_all', title: '收藏家', description: '完成全部图鉴收集', icon: 'achievementCatalogAll', tier: 'hidden', lockedIcon: 'achievementCatalogAllLocked', reward: { type: 'diamond', count: 50 } },
];
