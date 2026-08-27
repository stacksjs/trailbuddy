/**
 * An athlete's record in the territory game, folded from the battle feed.
 *
 * `/conquests` reported the same three conquests, six defences and 1847 power
 * rating for everybody, because the store shipped these as a fixture and
 * nothing recomputed them once the real battles hydrated from
 * `/api/territories/battles`. Every field here is derivable from those rows,
 * so folding them is both simpler than a new endpoint and guaranteed to agree
 * with the list of battles printed underneath the counters.
 *
 * Pure, and unit-testable without a store or a browser.
 */

export interface ConquestEvent {
  attacker_id?: number | null
  defender_id?: number | null
  status?: 'active' | 'conquered' | 'defended' | string | null
  areaCaptured?: number | null
  created_at?: string | null
}

export interface ConquestRecord {
  user_id: number
  totalConquests: number
  territoriesLost: number
  successfulDefenses: number
  winRate: number
  powerRating: number
  longestConquestStreak: number
  totalAreaConquered: number
  uniqueRivalsBeaten: number
}

/** Same award table the server uses, so a rating cannot drift from XP. */
const CONQUEST_POINTS = 150
const DEFENCE_POINTS = 75

export function computeConquestRecord(userId: number, events: ConquestEvent[]): ConquestRecord {
  const mine = events.filter(e => Number(e.attacker_id) === userId || Number(e.defender_id) === userId)

  const conquests = mine.filter(e => e.status === 'conquered' && Number(e.attacker_id) === userId)
  const lost = mine.filter(e => e.status === 'conquered' && Number(e.defender_id) === userId)
  const defences = mine.filter(e => e.status === 'defended' && Number(e.defender_id) === userId)

  // Only settled battles count towards a win rate — one still in progress has
  // no outcome to be right or wrong about.
  const decided = conquests.length + lost.length + defences.length
  const won = conquests.length + defences.length

  // Attacks in date order, so a run of successes can be measured.
  const attacks = mine
    .filter(e => Number(e.attacker_id) === userId && e.status !== 'active')
    .sort((a, b) => Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? ''))

  let streak = 0
  let longest = 0
  for (const attack of attacks) {
    streak = attack.status === 'conquered' ? streak + 1 : 0
    if (streak > longest)
      longest = streak
  }

  const totalArea = conquests.reduce((sum, e) => sum + (e.areaCaptured ?? 0), 0)

  return {
    user_id: userId,
    totalConquests: conquests.length,
    territoriesLost: lost.length,
    successfulDefenses: defences.length,
    winRate: decided ? Math.round((won / decided) * 100) : 0,
    // The same points the server awards for the same events, so the rating on
    // this page moves with the XP on the leaderboard rather than beside it.
    powerRating: conquests.length * CONQUEST_POINTS
      + defences.length * DEFENCE_POINTS
      + Math.round(totalArea / 1000),
    longestConquestStreak: longest,
    totalAreaConquered: Math.round(totalArea),
    uniqueRivalsBeaten: new Set(conquests.map(e => e.defender_id).filter(Boolean)).size,
  }
}
