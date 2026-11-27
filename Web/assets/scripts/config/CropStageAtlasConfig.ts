export type CropStageAtlasSeason = "spring" | "summer" | "autumn" | "winter";

export type CropStageAtlasSource = {
  category: "CropAtlases";
  assetId: string;
  row: number;
};

const CROP_STAGE_ATLAS_LAYOUT: Record<string, { page: number; row: number }> = {
  "wheat": { page: 0, row: 0 },
  "corn": { page: 0, row: 1 },
  "tomato": { page: 0, row: 2 },
  "carrot": { page: 0, row: 3 },
  "lettuce": { page: 1, row: 0 },
  "pumpkin": { page: 1, row: 1 },
  "banana": { page: 1, row: 2 },
  "strawberry": { page: 1, row: 3 },
  "apple": { page: 2, row: 0 },
  "cherry": { page: 2, row: 1 },
  "potato": { page: 2, row: 2 },
  "cucumber": { page: 2, row: 3 },
  "sweetPotato": { page: 3, row: 0 },
  "spinach": { page: 3, row: 1 },
  "pea": { page: 3, row: 2 },
  "asparagus": { page: 3, row: 3 },
  "rhubarb": { page: 4, row: 0 },
  "fennel": { page: 4, row: 1 },
  "artichoke": { page: 4, row: 2 },
  "eggplant": { page: 4, row: 3 },
  "sweetPepper": { page: 5, row: 0 },
  "watermelon": { page: 5, row: 1 },
  "okra": { page: 5, row: 2 },
  "peanut": { page: 5, row: 3 },
  "broccoli": { page: 6, row: 0 },
  "beetroot": { page: 6, row: 1 },
  "turnip": { page: 6, row: 2 },
  "celery": { page: 6, row: 3 },
  "ginger": { page: 7, row: 0 },
  "kale": { page: 7, row: 1 },
  "chineseCabbage": { page: 7, row: 2 },
  "garlic": { page: 7, row: 3 },
  "leek": { page: 8, row: 0 },
  "brusselsSprouts": { page: 8, row: 1 },
};

export function resolveCropStageAtlasSource(
  cropId: string,
  season?: CropStageAtlasSeason,
): CropStageAtlasSource | null {
  const placement = CROP_STAGE_ATLAS_LAYOUT[cropId];
  if (!placement) return null;
  const variant = season || "base";
  return {
    category: "CropAtlases",
    assetId: `crop_stages_${variant}_p${placement.page}`,
    row: placement.row,
  };
}
