// No imports needed - everything is auto-imported!
//
// POST /api/territories/recompute-ranks (auth) — recomputes weekly + all-time
// leaderboard ranks and persists them to territory_stats (#944). The ranking
// math lives in resources/functions/ranks.ts; ClaimTerritoryAction and
// ProcessActivityConquestAction call `recomputeTerritoryRanks` after every
// holding change so persisted ranks never go stale between requests, and
// `buddy territory:ranks` covers cron/CLI.

export async function recomputeTerritoryRanks(): Promise<{ updated: number, total: number }> {
  const stats = (await TerritoryStats.all()) ?? []
  if (!stats.length)
    return { updated: 0, total: 0 }

  const gainEvents = (await TerritoryHistory.whereIn('event_type', ['claimed', 'conquered']).get()) ?? []
  const assignments = computeTerritoryRankAssignments(stats, gainEvents)

  let updated = 0
  for (const a of assignments) {
    const current = stats.find((s: any) => s.id === a.id)
    if (current && current.weekly_rank === a.weekly_rank && current.all_time_rank === a.all_time_rank)
      continue
    await TerritoryStats.forceUpdate(a.id, {
      weekly_rank: a.weekly_rank,
      all_time_rank: a.all_time_rank,
    })
    updated++
  }
  return { updated, total: assignments.length }
}

export default new Action({
  name: 'Compute Territory Ranks',
  description: 'Recompute and persist weekly + all-time territory leaderboard ranks',
  method: 'POST',

  async handle() {
    try {
      const { updated, total } = await recomputeTerritoryRanks()

      const stats = (await TerritoryStats.all()) ?? []
      const ranks = stats
        .map((s: any) => ({
          userId: s.user_id,
          weeklyRank: s.weekly_rank,
          allTimeRank: s.all_time_rank,
          totalAreaOwned: s.total_area_owned || 0,
        }))
        .sort((a: any, b: any) => a.allTimeRank - b.allTimeRank)

      return response.json({ success: true, updated, total, ranks })
    }
    catch (error) {
      console.error('Error computing territory ranks:', error)
      return response.json({ success: false, error: 'Failed to compute ranks' }, 500)
    }
  },
})
