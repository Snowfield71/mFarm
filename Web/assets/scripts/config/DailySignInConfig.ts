export type DailySignInReward = {
    day: number;
    type: 'gold' | 'diamond' | 'item' | 'randomTool';
    count: number;
    itemId?: string;
    label: string;
};

export const DAILY_SIGN_IN_REWARDS: DailySignInReward[] = [
    { day: 1, type: 'gold', count: 500, label: '金币' },
    { day: 2, type: 'item', itemId: 'seedWheat', count: 5, label: '小麦种子' },
    { day: 3, type: 'diamond', count: 10, label: '钻石' },
    { day: 4, type: 'item', itemId: 'seedCorn', count: 5, label: '玉米种子' },
    { day: 5, type: 'gold', count: 1200, label: '金币' },
    { day: 6, type: 'item', itemId: 'seedStrawberry', count: 5, label: '草莓种子' },
    { day: 7, type: 'randomTool', count: 1, itemId: 'mysteryBox', label: '随机礼物' },
];
