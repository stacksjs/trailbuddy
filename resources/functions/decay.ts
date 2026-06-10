/**
 * Territory decay classification (#950).
 *
 * Pure functions — no DB/model access — shared by DecayTerritoriesAction
 * (HTTP/on-demand + opportunistic sweep on conquest processing) and the
 * `buddy territory:decay` command (cron).
 *
 * Rules:
 *  - An ACTIVE territory whose owner hasn't touched it (claim, conquest,
 *    defense, or patrol — tracked in `last_activity_at`) for `staleDays`
 *    becomes CONTESTED: visibly decaying, defendable by the owner exactly
 *    like an attack-contested territory.
 *  - A CONTESTED territory whose owner stays inactive past `expireDays`
 *    (total, since their last activity) EXPIRES: it leaves the map and the
 *    land becomes claimable again. Defending any contested territory resets
 *    the clock.
 */

export const DECAY_STALE_DAYS = 14
export const DECAY_EXPIRE_DAYS = 28

export interface DecayTerritoryRow {
  id: number
  user_id: number
  name?: string | null
  status?: string | null
  area_size?: number | null
  claimed_at?: string | null
  last_activity_at?: string | null
}

export interface DecayPlan {
  /** Active territories that crossed staleDays — flip to 'contested'. */
  toContest: DecayTerritoryRow[]
  /** Contested territories that crossed expireDays — expire off the map. */
  toExpire: DecayTerritoryRow[]
}

/** Parse a DB timestamp; SQLite's CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS') is UTC. */
function timestampMs(value: string | null | undefined): number {
  if (!value)
    return Number.NaN
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  return new Date(iso).getTime()
}

/** The owner's last touch: last_activity_at, falling back to claimed_at. */
export function territoryFreshnessMs(t: DecayTerritoryRow): number {
  const last = timestampMs(t.last_activity_at)
  if (!Number.isNaN(last))
    return last
  return timestampMs(t.claimed_at)
}

export function computeTerritoryDecay(
  territories: DecayTerritoryRow[],
  opts: { staleDays?: number, expireDays?: number, now?: number } = {},
): DecayPlan {
  const staleDays = opts.staleDays ?? DECAY_STALE_DAYS
  const expireDays = opts.expireDays ?? DECAY_EXPIRE_DAYS
  const now = opts.now ?? Date.now()

  const staleBefore = now - staleDays * 86400000
  const expireBefore = now - expireDays * 86400000

  const toContest: DecayTerritoryRow[] = []
  const toExpire: DecayTerritoryRow[] = []

  for (const t of territories) {
    const freshness = territoryFreshnessMs(t)
    // No usable timestamp at all — leave it alone rather than guess.
    if (Number.isNaN(freshness))
      continue

    if (t.status === 'active' && freshness < staleBefore)
      toContest.push(t)
    else if (t.status === 'contested' && freshness < expireBefore)
      toExpire.push(t)
  }

  return { toContest, toExpire }
}
