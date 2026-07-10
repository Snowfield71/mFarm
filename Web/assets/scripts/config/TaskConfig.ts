export type TaskCategory = "main" | "daily" | "branch" | "special";
export type TaskAction = "farm" | "shop" | "craft" | "inventory";
export type TaskEvent =
  | "cropPlanted"
  | "cropHarvested"
  | "craftCompleted"
  | "itemSold"
  | "landExpanded"
  | "levelUp";

export interface TaskRewardDef {
  type: "gold" | "diamond" | "item";
  count: number;
  itemId?: string;
  icon: string;
  iconType?: "ui" | "item";
  label: string;
}

export interface TaskDefinition {
  id: string;
  no: number;
  category: TaskCategory;
  title: string;
  description: string;
  target: number;
  action: TaskAction;
  trigger: {
    event: TaskEvent;
    itemId?: string;
    useEventCount?: boolean;
  };
  rewards: TaskRewardDef[];
}

const gold = (count: number): TaskRewardDef => ({
  type: "gold",
  count,
  icon: "rewardGold",
  label: "\u91d1\u5e01",
});

const item = (
  itemId: string,
  count: number,
  label: string,
  icon = itemId,
  iconType: "ui" | "item" = "item",
): TaskRewardDef => ({ type: "item", itemId, count, icon, iconType, label });

export const TASK_DEFINITIONS: TaskDefinition[] = [
  {
    id: "main_plant_wheat",
    no: 1,
    category: "main",
    title: "\u79cd\u690d\u5c0f\u9ea6",
    description: "\u5728\u4f60\u7684\u519c\u573a\u79cd\u690d10\u682a\u5c0f\u9ea6",
    target: 10,
    action: "shop",
    trigger: { event: "cropPlanted", itemId: "wheat" },
    rewards: [
      gold(100),
      item("universalSeed", 5, "\u8349\u8393\u79cd\u5b50", "rewardSeed", "ui"),
      item("wheat", 20, "\u5c0f\u9ea6"),
      item("corn", 15, "\u7389\u7c73"),
      item("strawberry", 10, "\u8349\u8393"),
      item("carrot", 10, "\u80e1\u841d\u535c"),
      item("pumpkin", 6, "\u5357\u74dc"),
      item("egg", 8, "\u9e21\u86cb"),
      item("milk", 5, "\u725b\u5976"),
      item("jam", 3, "\u679c\u9171"),
      item("honey", 4, "\u8702\u871c"),
      item("cookie", 3, "\u66f2\u5947\u997c\u5e72"),
    ],
  },
  {
    id: "main_harvest_corn",
    no: 2,
    category: "main",
    title: "\u6536\u83b7\u7389\u7c73",
    description: "\u5728\u519c\u573a\u6536\u83b715\u682a\u7389\u7c73",
    target: 15,
    action: "farm",
    trigger: { event: "cropHarvested", itemId: "corn" },
    rewards: [gold(120), item("corn", 8, "\u7389\u7c73")],
  },
  {
    id: "main_expand_farm",
    no: 3,
    category: "main",
    title: "\u6269\u5efa\u519c\u573a",
    description: "\u6269\u5efa1\u6b21\u519c\u573a\u571f\u5730",
    target: 1,
    action: "farm",
    trigger: { event: "landExpanded" },
    rewards: [gold(180), item("speedTicket", 1, "\u52a0\u901f\u5238")],
  },
  {
    id: "plant_5",
    no: 1,
    category: "daily",
    title: "\u65e5\u5e38\u64ad\u79cd",
    description: "\u4eca\u5929\u79cd\u690d5\u6b21\u4efb\u610f\u4f5c\u7269",
    target: 5,
    action: "shop",
    trigger: { event: "cropPlanted" },
    rewards: [gold(50), item("wheat", 3, "\u5c0f\u9ea6")],
  },
  {
    id: "harvest_3",
    no: 2,
    category: "daily",
    title: "\u65e5\u5e38\u6536\u83b7",
    description: "\u4eca\u5929\u6536\u83b73\u6b21\u4efb\u610f\u4f5c\u7269",
    target: 3,
    action: "farm",
    trigger: { event: "cropHarvested" },
    rewards: [gold(80), item("corn", 3, "\u7389\u7c73")],
  },
  {
    id: "craft_2",
    no: 3,
    category: "daily",
    title: "\u65e5\u5e38\u5236\u4f5c",
    description: "\u4eca\u5929\u5b8c\u62102\u6b21\u7269\u54c1\u5236\u4f5c",
    target: 2,
    action: "craft",
    trigger: { event: "craftCompleted" },
    rewards: [gold(100), item("flour", 2, "\u9762\u7c89")],
  },
  {
    id: "branch_make_jam",
    no: 1,
    category: "branch",
    title: "\u5236\u4f5c\u679c\u9171",
    description: "\u5728\u5236\u4f5c\u53f0\u5236\u4f5c2\u74f6\u8349\u8393\u679c\u9171",
    target: 2,
    action: "craft",
    trigger: { event: "craftCompleted", itemId: "jam" },
    rewards: [gold(80), item("jam", 2, "\u679c\u9171")],
  },
  {
    id: "branch_bake_bread",
    no: 2,
    category: "branch",
    title: "\u70d8\u7119\u9762\u5305",
    description: "\u5728\u70d8\u7119\u574a\u5236\u4f5c3\u4e2a\u9762\u5305",
    target: 3,
    action: "craft",
    trigger: { event: "craftCompleted", itemId: "bread" },
    rewards: [gold(120), item("bread", 2, "\u9762\u5305")],
  },
  {
    id: "branch_collect_honey",
    no: 3,
    category: "branch",
    title: "\u91c7\u96c6\u8702\u871c",
    description: "\u901a\u8fc7\u5236\u4f5c\u83b7\u5f975\u4efd\u8702\u871c",
    target: 5,
    action: "craft",
    trigger: { event: "craftCompleted", itemId: "honey" },
    rewards: [gold(150), item("honey", 3, "\u8702\u871c")],
  },
  {
    id: "special_lucky_harvest",
    no: 1,
    category: "special",
    title: "\u5e78\u8fd0\u6536\u83b7",
    description: "\u5728\u6d3b\u52a8\u671f\u95f4\u6536\u83b730\u4efd\u4f5c\u7269",
    target: 30,
    action: "farm",
    trigger: { event: "cropHarvested" },
    rewards: [gold(200), item("luckyStar", 1, "\u5e78\u8fd0\u661f")],
  },
  {
    id: "special_golden_sales",
    no: 2,
    category: "special",
    title: "\u9ec4\u91d1\u4ea4\u6613",
    description: "\u5728\u6d3b\u52a8\u671f\u95f4\u51fa\u552e20\u4ef6\u7269\u54c1",
    target: 20,
    action: "inventory",
    trigger: { event: "itemSold", useEventCount: true },
    rewards: [gold(250), item("goldBoostCard", 1, "\u91d1\u5e01\u5361")],
  },
  {
    id: "special_level_up",
    no: 3,
    category: "special",
    title: "\u519c\u573a\u8fdb\u9636",
    description: "\u5728\u6d3b\u52a8\u671f\u95f4\u63d0\u53471\u6b21\u519c\u573a\u7b49\u7ea7",
    target: 1,
    action: "farm",
    trigger: { event: "levelUp" },
    rewards: [gold(300), item("mysteryBox", 1, "\u795e\u79d8\u793c\u76d2")],
  },
];

export function getTaskDefinition(id: string) {
  return TASK_DEFINITIONS.find((task) => task.id === id);
}

export function getTaskCategoryLabel(category: TaskCategory) {
  switch (category) {
    case "main":
      return "\u4e3b\u7ebf";
    case "daily":
      return "\u6bcf\u65e5";
    case "branch":
      return "\u652f\u7ebf";
    case "special":
      return "\u7279\u6b8a";
  }
}
