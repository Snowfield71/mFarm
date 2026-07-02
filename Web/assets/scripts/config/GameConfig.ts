/**
 * 游戏全局配置常量
 * 遵循萌田农场美术设计规范
 */

// ===== 色彩系统 (Art Spec §1.2) =====
export const Colors = {
  PRIMARY: "#90EE90", // 农场绿 - 主色
  SECONDARY: "#FFB6C1", // 淡粉 - UI装饰
  ACCENT: "#FFD700", // 金黄 - 强调/金币
  SKY_BLUE: "#87CEEB", // 天蓝 - 天空/水体
  WARNING: "#FF6B6B", // 红色 - 警告/错误

  BG_MAIN: "#F0F8E8", // 主界面背景 - 淡绿白
  BG_PANEL: "#FFFACD", // UI面板背景 - 浅黄
  BTN_DEFAULT: "#90EE90", // 按钮默认 - 浅绿
  BTN_PRESSED: "#7ECDC2", // 按钮按下 - 青绿
  BTN_DISABLED: "#CCCCCC", // 按钮禁用

  TEXT_DARK: "#333333", // 标题/主要文字
  TEXT_GRAY: "#666666", // 描述文字
  TEXT_LIGHT: "#999999", // 辅助文字
  TEXT_WHITE: "#FFFFFF", // 白色文字
  TEXT_PRICE: "#FFD700", // 价格文字 - 金色
  TEXT_DIAMOND: "#FF1493", // 钻石文字 - 粉色
};

// ===== 设计分辨率 (Art Spec §5.1) =====
export const Design = {
  WIDTH: 360,
  HEIGHT: 640,
  SAFE_MARGIN: 20,
  PANEL_RADIUS: 16,
  BUTTON_RADIUS: 10,
  ITEM_CELL: 60,
};

// ===== 字体 (Art Spec §2.2) =====
export const FontSpec = {
  TITLE: {
    fontSize: 28,
    fontFamily: "Arial",
    bold: true,
    color: Colors.TEXT_DARK,
  },
  BUTTON: { fontSize: 16, fontFamily: "Arial", color: Colors.TEXT_WHITE },
  ITEM_NAME: { fontSize: 14, fontFamily: "Arial", color: Colors.TEXT_DARK },
  PRICE: { fontSize: 12, fontFamily: "Arial", color: Colors.TEXT_PRICE },
  DESC: { fontSize: 12, fontFamily: "Arial", color: Colors.TEXT_GRAY },
};

// ===== 游戏数值配置 (GDD §1.3) =====
export const GameValues = {
  INITIAL_GOLD: 200,
  INITIAL_DIAMOND: 500,
  INITIAL_LAND: 9, // 3x3 初始
  MAX_LAND: 15, // 5x3 上限
  INVENTORY_SLOTS: 20,
  MAX_STACK: 99,
  EXP_PER_LEVEL: 100,
  EXP_GROWTH_RATE: 1.2,

  // 扩展地块门槛
  LAND_UNLOCK: {
    5: 1, // 等级5 +1块 → 共10块
    8: 1, // 等级8 +1块 → 共11块
    12: 1, // 等级12 +1块 → 共12块
    16: 1, // 等级16 +1块 → 共13块
    20: 1, // 等级20 +1块 → 共14块
    25: 1, // 等级25 +1块 → 共15块
  },

  // 合成台配置
  CRAFT_TABLE_COST: 100,
  MAX_CRAFT_TABLES: 3,

  // 加速消耗
  SPEEDUP_DIAMOND: 5, // 5钻石=30秒
  SPEEDUP_DURATION: 30,
  AD_SPEEDUP_DURATION: 30,

  // 扩展背包
  EXPAND_INVENTORY_COST: 10, // 10钻石+5格
  EXPAND_INVENTORY_SLOTS: 5,

  // 分享奖励
  SHARE_GOLD_REWARD: 50,
};

// ===== 广告配置 (GDD §4) =====
export const AdLimits = {
  MAX_DAILY_TOTAL: 20,
  CROP_SPEEDUP_LIMIT: 10,
  CRAFT_SPEEDUP_LIMIT: 10,
  DOUBLE_HARVEST_LIMIT: 5,
  GOLD_BOOST_LIMIT: 5,
  DIAMOND_REWARD_LIMIT: 5,
  MYSTERY_BOX_LIMIT: 3,
  FREE_SEED_LIMIT: 3,
  EARLY_UNLOCK_LIMIT: 3,
  COOLDOWN_MS: 30000,
};

// ===== 作物生长时间 (GDD §1.3.B) =====
export const CropGrowthTimes: Record<string, number> = {
  wheat: 30,
  corn: 60,
  tomato: 90,
  carrot: 120,
  pumpkin: 180,
  strawberry: 120,
  cherry: 150,
  banana: 100,
  apple: 140,
  lettuce: 75,
  egg: 110,
  milk: 100,
  mushroom: 20,
};
