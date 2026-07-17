export type PlayerTitleCategory = 'level' | 'achievement';

export type PlayerTitleDefinition = {
    id: string;
    fullName: string;
    shortName: string;
    category: PlayerTitleCategory;
    condition: string;
    requiredLevel?: number;
    achievementId?: string;
};

export const PLAYER_TITLES: PlayerTitleDefinition[] = [
    { id: 'level_1', fullName: '初来乍到', shortName: '新手', category: 'level', condition: '农场达到1级', requiredLevel: 1 },
    { id: 'level_5', fullName: '田园新秀', shortName: '新秀', category: 'level', condition: '农场达到5级', requiredLevel: 5 },
    { id: 'level_10', fullName: '农场达人', shortName: '达人', category: 'level', condition: '农场达到10级', requiredLevel: 10 },
    { id: 'level_20', fullName: '田园名家', shortName: '名家', category: 'level', condition: '农场达到20级', requiredLevel: 20 },
    { id: 'level_30', fullName: '丰收领主', shortName: '领主', category: 'level', condition: '农场达到30级', requiredLevel: 30 },
    { id: 'achievement_plant_50', fullName: '希望播种者', shortName: '播种者', category: 'achievement', condition: '完成成就「田园能手」', achievementId: 'plant_50' },
    { id: 'achievement_craft_50', fullName: '巧手匠人', shortName: '匠人', category: 'achievement', condition: '完成成就「合成大师」', achievementId: 'craft_50' },
    { id: 'achievement_gold_10000', fullName: '田园大亨', shortName: '大亨', category: 'achievement', condition: '完成成就「丰收存钱罐」', achievementId: 'gold_10000' },
    { id: 'achievement_recipes_all', fullName: '配方贤者', shortName: '贤者', category: 'achievement', condition: '完成成就「配方专家」', achievementId: 'recipes_all' },
    { id: 'achievement_catalog_all', fullName: '万物收藏家', shortName: '收藏家', category: 'achievement', condition: '完成成就「收藏家」', achievementId: 'catalog_all' },
    { id: 'achievement_pasture_50', fullName: '金牌牧场主', shortName: '牧场主', category: 'achievement', condition: '完成成就「牧场管家」', achievementId: 'pasture_50' },
];

export function getPlayerTitle(id: string): PlayerTitleDefinition | undefined {
    return PLAYER_TITLES.find(title => title.id === id);
}
