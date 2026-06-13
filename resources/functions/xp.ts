/**
 * Server-side XP rewards (#947). XP was previously a browser-only session
 * counter (useRecorder: 120 + area/500) that reset on refresh. These pure
 * award functions are applied on claim/conquest/defend and accumulated into
 * territory_stats.xp so XP persists and can rank a leaderboard.
 *
 * Areas are in square meters.
 */
export const XP_REWARDS = {
  /** Claiming new ground. */
  claim: (area: number): number => 100 + Math.round((area || 0) / 1000),
  /** Taking ground from a rival (scaled by the area gained). */
  conquest: (areaGained: number): number => 150 + Math.round((areaGained || 0) / 1000),
  /** Successfully defending your turf. */
  defend: (): number => 75,
}
