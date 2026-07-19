export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
export const SEASON_LENGTH_DAYS = 7;
export const SEASON_CYCLE_START_UTC = Date.UTC(2026, 0, 5);

export const SEASON_LABELS: Record<Season, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

export type SeasonInfo = {
  season: Season;
  seasonIndex: number;
  dayInSeason: number;
  daysRemaining: number;
  cycle: number;
};

export function getSeasonInfo(now = Date.now()): SeasonInfo {
  const dayMs = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(
    0,
    Math.floor((now - SEASON_CYCLE_START_UTC) / dayMs),
  );
  const seasonIndex =
    Math.floor(elapsedDays / SEASON_LENGTH_DAYS) % SEASONS.length;
  const dayInSeason = (elapsedDays % SEASON_LENGTH_DAYS) + 1;
  return {
    season: SEASONS[seasonIndex],
    seasonIndex,
    dayInSeason,
    daysRemaining: SEASON_LENGTH_DAYS - dayInSeason,
    cycle: Math.floor(elapsedDays / (SEASON_LENGTH_DAYS * SEASONS.length)),
  };
}

export function isSeasonAllowed(seasons?: Season[], now = Date.now()): boolean {
  return !seasons?.length || seasons.indexOf(getSeasonInfo(now).season) >= 0;
}

/** 测试期临时关闭普通农田的当季种植限制；季节标签与跨季统计仍然保留。 */
export const ENFORCE_FARM_SEASON_RESTRICTION = false;

export function seasonText(seasons?: Season[]): string {
  if (!seasons?.length) return "全年";
  return seasons.map((season) => SEASON_LABELS[season]).join("/");
}
