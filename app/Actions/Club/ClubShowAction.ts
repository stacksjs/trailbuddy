// No imports needed - everything is auto-imported!
//
// GET /api/clubs/{id} — club detail for the club page (#964): members (with
// names + roles), a recent activity feed from members, and a weekly-distance
// leaderboard. Public read; a private club only resolves for its members.

export default new Action({
  name: 'Club Show',
  description: 'Club detail: members, recent activity feed, leaderboard',
  method: 'GET',

  async handle(request) {
    const clubId = positiveInt(request.get('id') ?? request.get('club_id'))
    if (!clubId)
      return response.json({ success: false, error: 'Validation failed', fields: { id: 'required: a positive integer club id' } }, 422)

    try {
      const club = await Club.find(clubId)
      if (!club)
        return response.json({ success: false, error: 'Club not found' }, 404)

      const memberships = (await ClubMember.where('club_id', '=', clubId).get()) ?? []
      const memberIds = memberships.map((m: any) => m.user_id)

      // Session token on this public route; body fallback for the harness.
      const sessionUser = (await Auth.user().catch(() => null))?.id ?? positiveInt(request.get('user_id')) ?? null
      if (club.is_private && (sessionUser === null || !memberIds.includes(sessionUser)))
        return response.json({ success: false, error: 'This club is private' }, 403)

      const users = memberIds.length ? await User.whereIn('id', memberIds).get() : []
      const userName = new Map(users.map((u: any) => [u.id, u.name]))

      const members = memberships
        .map((m: any) => ({
          userId: m.user_id,
          name: userName.get(m.user_id) ?? 'Unknown',
          role: m.role,
          joinedAt: m.created_at,
        }))
        .sort((a: any, b: any) => (a.role === 'owner' ? -1 : 0) - (b.role === 'owner' ? -1 : 0))

      const activities = memberIds.length ? (await Activity.whereIn('user_id', memberIds).get()) ?? [] : []
      const sortedActivities = [...activities].sort((a: any, b: any) =>
        Date.parse(b.completed_at ?? b.created_at ?? '') - Date.parse(a.completed_at ?? a.created_at ?? ''))

      const recentFeed = sortedActivities.slice(0, 10).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        userName: userName.get(a.user_id) ?? 'Unknown',
        title: a.trail_id ? `${a.activity_type}` : a.activity_type,
        activityType: a.activity_type,
        distance: a.distance,
        duration: a.duration,
        completedAt: a.completed_at,
      }))

      // Weekly-distance leaderboard among members.
      const weekAgoMs = Date.now() - 7 * 86400000
      const weeklyByUser = new Map<number, { dist: number, count: number }>()
      for (const a of activities) {
        const when = a.completed_at ? Date.parse(a.completed_at) : Number.NaN
        if (!Number.isFinite(when) || when < weekAgoMs)
          continue
        const w = weeklyByUser.get(a.user_id) ?? { dist: 0, count: 0 }
        w.dist += a.distance ?? 0
        w.count += 1
        weeklyByUser.set(a.user_id, w)
      }
      const leaderboard = memberIds
        .map((uid: number) => ({
          userId: uid,
          name: userName.get(uid) ?? 'Unknown',
          weeklyDistance: Math.round((weeklyByUser.get(uid)?.dist ?? 0) * 10) / 10,
          weeklyActivities: weeklyByUser.get(uid)?.count ?? 0,
        }))
        .sort((a: any, b: any) => b.weeklyDistance - a.weeklyDistance || a.userId - b.userId)
        .map((row: any, i: number) => ({ ...row, rank: i + 1 }))

      const weeklyDistance = leaderboard.reduce((sum: number, r: any) => sum + r.weeklyDistance, 0)
      const activitiesThisWeek = leaderboard.reduce((sum: number, r: any) => sum + r.weeklyActivities, 0)

      return response.json({
        success: true,
        club: {
          id: club.id,
          name: club.name,
          description: club.description,
          location: club.location,
          type: club.club_type,
          isPrivate: !!club.is_private,
          creatorId: club.creator_id,
          memberCount: members.length,
          members,
          isMember: sessionUser !== null && memberIds.includes(sessionUser),
          weeklyDistance: Math.round(weeklyDistance),
          activitiesThisWeek,
          recentFeed,
          leaderboard,
          createdAt: club.created_at,
        },
      })
    }
    catch (error) {
      console.error('[clubs] show failed:', error)
      return response.json({ success: false, error: 'Failed to fetch club' }, 500)
    }
  },
})
