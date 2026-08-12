export type PlayerTitleCategory = 'level' | 'achievement';

export type PlayerTitleDefinition = {
    id: string;
    fullName: string;
    shortName: string;
    category: PlayerTitleCategory;
    condition: string;
    requiredLevel?: number;
    achievementId?: string;
    seasonCompliant?: boolean;
    bonusText: string;
    yieldBonus?: number;
    goldBonus?: number;
};

export const PLAYER_TITLES: PlayerTitleDefinition[] = [
    { id: 'level_1', fullName: '初来乍到', shortName: '新手', category: 'level', condition: '农场达到1级', requiredLevel: 1, bonusText: '产量提升 +2%', yieldBonus: .02 },
    { id: 'level_5', fullName: '田园新秀', shortName: '新秀', category: 'level', condition: '农场达到5级', requiredLevel: 5, bonusText: '产量提升 +4%', yieldBonus: .04 },
    { id: 'level_10', fullName: '农场达人', shortName: '达人', category: 'level', condition: '农场达到10级', requiredLevel: 10, bonusText: '产量提升 +6% · 金币 +2%', yieldBonus: .06, goldBonus: .02 },
    { id: 'level_20', fullName: '田园名家', shortName: '名家', category: 'level', condition: '农场达到20级', requiredLevel: 20, bonusText: '产量提升 +8% · 金币 +4%', yieldBonus: .08, goldBonus: .04 },
    { id: 'level_30', fullName: '丰收领主', shortName: '领主', category: 'level', condition: '农场达到30级', requiredLevel: 30, bonusText: '产量提升 +12% · 金币 +6%', yieldBonus: .12, goldBonus: .06 },
    { id: 'achievement_plant_50', fullName: '希望播种者', shortName: '播种者', category: 'achievement', condition: '完成成就「田园能手」', achievementId: 'plant_50', bonusText: '产量提升 +8%', yieldBonus: .08 },
    { id: 'achievement_craft_50', fullName: '巧手匠人', shortName: '匠人', category: 'achievement', condition: '完成成就「合成大师」', achievementId: 'craft_50', bonusText: '金币加成 +6%', goldBonus: .06 },
    { id: 'achievement_gold_10000', fullName: '田园大亨', shortName: '大亨', category: 'achievement', condition: '完成成就「丰收存钱罐」', achievementId: 'gold_10000', bonusText: '金币加成 +10%', goldBonus: .10 },
    { id: 'achievement_recipes_all', fullName: '配方贤者', shortName: '贤者', category: 'achievement', condition: '完成成就「配方专家」', achievementId: 'recipes_all', bonusText: '金币加成 +8%', goldBonus: .08 },
    { id: 'achievement_catalog_all', fullName: '万物收藏家', shortName: '收藏家', category: 'achievement', condition: '完成成就「收藏家」', achievementId: 'catalog_all', bonusText: '产量提升 +10% · 金币 +10%', yieldBonus: .10, goldBonus: .10 },
    { id: 'achievement_pasture_50', fullName: '金牌牧场主', shortName: '牧场主', category: 'achievement', condition: '完成成就「牧场管家」', achievementId: 'pasture_50', bonusText: '产量提升 +6%', yieldBonus: .06 },
    { id: 'season_compliant', fullName: '守时耕农', shortName: '守时耕农', category: 'achievement', condition: '完成一季全部时令种植且未进行跨季种植', seasonCompliant: true, bonusText: '产量提升 +12%', yieldBonus: .12 },
];

export function getPlayerTitle(id: string): PlayerTitleDefinition | undefined {
    return PLAYER_TITLES.find(title => title.id === id);
}
