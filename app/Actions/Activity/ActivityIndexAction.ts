// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// Lists activities for the feed / profile. Optional ?user_id filter. Joins the
// owner's name and the trail name so the feed can render without extra lookups.
// The ORM is snake_case; the response is camelCase for the frontend.

import { Auth } from '@stacksjs/auth'

function parseSplits(raw: string | null): Array<{ mile: number, pace: string, elev: number }> {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

function titleFor(activityType: string, trailName: string | null, completedAt: string | null): string {
  if (trailName)
    return `${activityType} at ${trailName}`
  const when = completedAt ? new Date(completedAt).toLocaleDateString() : ''
  return when ? `${activityType}, ${when}` : `${activityType}`
}

export default new Action({
  name: 'Activity Index',
  description: 'List activities (optionally filtered by user) for the feed',
  method: 'GET',

  async handle(request) {
    const userId = request.get<number>('user_id')
    const page = readPageParams(request, { defaultLimit: 100, maxLimit: 500 })

    try {
      // The session drives visibility; `user_id` above filters the profile and
      // never grants viewer permissions.
      const viewerId = (await Auth.user().catch(() => null))?.id ?? null
      const viewerFollowing = viewerId !== null
        ? new Set(((await Follow.where('follower_id', '=', viewerId).get()) ?? []).map((f: any) => f.following_id))
        : new Set<number>()
      const blockedIds = await blockedUserIdsFor(viewerId)

      const query = userId
        ? Activity.where('user_id', '=', userId)
        : Activity.query()
      const allRows = (await query.orderBy('completed_at', 'desc').get()) ?? []
      const rows = allRows.filter((a: any) => canViewActivity(a, viewerId, viewerFollowing, blockedIds))

      // Batch-load owners + trails so the feed gets names without N+1 lookups.
      const userIds = [...new Set(rows.map((a: any) => a.user_id).filter(Boolean))]
      const trailIds = [...new Set(rows.map((a: any) => a.trail_id).filter(Boolean))]
      const users = userIds.length ? await User.whereIn('id', userIds).get() : []
      const trails = trailIds.length ? await Trail.whereIn('id', trailIds).get() : []
      const userName = new Map(users.map((u: any) => [u.id, u.name]))
      const trailName = new Map(trails.map((t: any) => [t.id, t.name]))

      // Historical/dev databases can contain activities whose athlete was
      // removed before foreign keys were enabled. Do not emit /athlete/null
      // links or an actionable "Unknown" account into the social feed.
      const ownedRows = rows.filter((activity: any) => userName.has(activity.user_id))

      const activities = ownedRows.map((a: any) => {
        const tName = a.trail_id ? (trailName.get(a.trail_id) ?? null) : null
        return {
          id: a.id,
          userId: a.user_id,
          userName: userName.get(a.user_id),
          trailId: a.trail_id,
          trailName: tName,
          title: titleFor(a.activity_type, tName, a.completed_at),
          activityType: a.activity_type,
          distance: a.distance,
          duration: a.duration,
          movingTime: a.moving_time ?? a.duration,
          pace: a.pace,
          elevationGain: a.elevation ?? 0,
          splits: parseSplits(a.splits),
          calories: Math.round((a.distance ?? 0) * 95),
          kudosCount: a.kudos_count ?? 0,
          notes: a.notes,
          hasGps: !!a.gpx_data,
          visibility: a.visibility ?? 'public',
          completedAt: a.completed_at,
          createdAt: a.created_at,
        }
      })

      const { items, meta } = paginate(activities, page)
      return response.json({ activities: items, meta })
    }
    catch (error) {
      console.error('[activities] index failed:', error)
      return response.json({ activities: [], error: 'Failed to fetch activities' }, 500)
    }
  },
})
