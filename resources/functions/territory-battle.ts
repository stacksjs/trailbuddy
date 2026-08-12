export type BattleOutcome = 'takeover' | 'split' | 'contested'

/** Pure battle-state classifier shared by the action and unit tests. */
export function classifyBattleOutcome(
  territoryArea: number,
  pieceAreas: number[],
  minimumTerritoryArea = 1000,
): BattleOutcome {
  if (pieceAreas.length < 2)
    return 'contested'
  if (territoryArea < minimumTerritoryArea * 2)
    return 'takeover'
  const sorted = [...pieceAreas].sort((a, b) => b - a)
  return sorted[1] >= minimumTerritoryArea ? 'split' : 'contested'
}
