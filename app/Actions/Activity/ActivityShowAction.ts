// No imports needed - everything is auto-imported!
//
// Returns a single activity with its parsed GPS route (for the activity detail
// page / map). The ORM is snake_case; the response is mapped to camelCase.
import UserPrivacySetting from '../../Models/UserPrivacySetting'

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

export default new Action({
  name: 'Activity Show',
  description: 'Get a single activity, including its GPS route',
  method: 'GET',

  async handle(request) {
    const id = request.get<number>('id')
    if (!id)
      return response.json({ success: false, error: 'Activity ID is required' }, 400)

    try {
      const a = await Activity.find(id)
      if (!a)
        return response.json({ success: false, error: 'Activity not found' }, 404)

      // Visibility is derived exclusively from the authenticated session.
      const viewerId = (await Auth.user().catch(() => null))?.id ?? null
      const viewerFollowing = viewerId !== null
        ? new Set(((await Follow.where('follower_id', '=', viewerId).get()) ?? []).map((f: any) => f.following_id))
        : new Set<number>()
      const blockedIds = await blockedUserIdsFor(viewerId)
      if (!canViewActivity(a, viewerId, viewerFollowing, blockedIds))
        return response.json({ success: false, error: 'This activity is private' }, 403)

      // gpx_data is a GeoJSON LineString / JSON coords string; parse to [{lat,lng}].
      const exactRoute = a.gpx_data ? parseGpsData(a.gpx_data) : []
      const privacy = viewerId !== a.user_id
        ? await UserPrivacySetting.where('user_id', '=', a.user_id).first().catch(() => null)
        : null
      const route = viewerId === a.user_id
        ? exactRoute
        : maskRouteEndpoints(exactRoute, privacy?.hide_start_end_meters ?? 400)

      // Comments + their author names.
      const commentRows = await ActivityComment
        .where('activity_id', '=', id)
        .orderBy('created_at', 'asc')
        .get()
      const commenterIds = [...new Set((commentRows ?? []).map((c: any) => c.user_id).filter(Boolean))]
      const commenters = commenterIds.length ? await User.whereIn('id', commenterIds).get() : []
      const commenterName = new Map(commenters.map((u: any) => [u.id, u.name]))
      const comments = (commentRows ?? []).map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        userName: commenterName.get(c.user_id) ?? 'Unknown',
        body: c.body,
        createdAt: c.created_at,
      }))

      return response.json({
        success: true,
        activity: {
          id: a.id,
          userId: a.user_id,
          trailId: a.trail_id,
          activityType: a.activity_type,
          distance: a.distance,
          duration: a.duration,
          movingTime: a.moving_time ?? a.duration,
          pace: a.pace,
          elevation: a.elevation,
          splits: parseSplits(a.splits),
          kudosCount: a.kudos_count ?? 0,
          notes: a.notes,
          hasGps: !!a.gpx_data,
          visibility: a.visibility ?? 'public',
          completedAt: a.completed_at,
          createdAt: a.created_at,
          route,
          comments,
        },
      })
    }
    catch (error) {
      console.error('[activities] show failed:', error)
      return response.json({ success: false, error: 'Failed to fetch activity' }, 500)
    }
  },
})
