const BATTLE_EVENTS = ['conquered', 'split', 'contested', 'defended']

export default new Action({
  name: 'Territory Battle Index',
  description: 'Recent persisted territory battle events and currently contested land',
  method: 'GET',
  async handle(request) {
    const limit = Math.min(200, Math.max(1, Number(request.get('limit') || 100)))
    const viewerId = (await Auth.user().catch(() => null))?.id ?? null
    const blockedIds = await blockedUserIdsFor(viewerId)
    const rows = ((await TerritoryHistory.whereIn('event_type', BATTLE_EVENTS).orderBy('created_at', 'desc').limit(limit).get()) ?? [])
      .filter((row: any) => !blockedIds.has(row.user_id) && !blockedIds.has(row.previous_owner_id))
    const territoryIds = [...new Set(rows.map((row: any) => row.territory_id).filter(Boolean))]
    const userIds = [...new Set(rows.flatMap((row: any) => [row.user_id, row.previous_owner_id]).filter(Boolean))]
    const activityIds = [...new Set(rows.map((row: any) => row.activity_id).filter(Boolean))]
    const [territories, users, activities] = await Promise.all([
      territoryIds.length ? Territory.whereIn('id', territoryIds).get() : [],
      userIds.length ? User.whereIn('id', userIds).get() : [],
      activityIds.length ? Activity.whereIn('id', activityIds).get() : [],
    ])
    const territoryMap = new Map(territories.map((row: any) => [row.id, row]))
    const userMap = new Map(users.map((row: any) => [row.id, row]))
    const activityMap = new Map(activities.map((row: any) => [row.id, row]))
    const battles = rows.map((row: any) => {
      const territory = territoryMap.get(row.territory_id)
      const activity = activityMap.get(row.activity_id)
      const status = row.event_type === 'contested' && territory?.status === 'contested'
        ? 'active'
        : row.event_type === 'defended' ? 'defended' : 'conquered'
      return {
        id: row.id,
        territory_id: row.territory_id,
        territoryName: territory?.name ?? `Territory #${row.territory_id}`,
        attacker_id: row.user_id,
        attackerName: userMap.get(row.user_id)?.name ?? 'Athlete',
        defender_id: row.previous_owner_id ?? territory?.user_id ?? 0,
        defenderName: userMap.get(row.previous_owner_id)?.name ?? (row.event_type === 'defended' ? 'Defense held' : 'Former owner'),
        status,
        areaCaptured: row.area_at_event ?? 0,
        runDistance: activity?.distance ?? 0,
        description: row.notes ?? '',
        created_at: row.created_at,
      }
    })
    return response.json({ success: true, battles, updatedAt: new Date().toISOString(), pollAfterSeconds: 15 })
  },
})

