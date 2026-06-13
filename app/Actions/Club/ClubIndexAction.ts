// No imports needed - everything is auto-imported!
//
// GET /api/clubs — list clubs with derived member counts and this-week stats
// (#964). Public read; private clubs are only listed to members. memberCount
// comes from club_members; weeklyDistance/activitiesThisWeek are aggregated
// from members' activities in the last 7 days (real data, not stored fiction).

export default new Action({
  name: 'Club Index',
  description: 'List clubs with member counts and weekly activity stats',
  method: 'GET',

  async handle(request) {
    try {
      // Session user drives private-club visibility + isMember. On this PUBLIC
      // route it MUST come from the auth token only — the harness fallback is
      // null over real HTTP, so a spoofed ?user_id can't unmask private clubs.
      const sessionUser = (await Auth.user().catch(() => null))?.id ?? harnessFallbackUserId(request)

      const clubs = (await Club.all()) ?? []
      const memberships = (await ClubMember.all()) ?? []
      const activities = (await Activity.all()) ?? []

      const membersByClub = new Map<number, number[]>()
      for (const m of memberships) {
        const list = membersByClub.get(m.club_id) ?? []
        list.push(m.user_id)
        membersByClub.set(m.club_id, list)
      }

      // Per-user activity totals over the trailing 7 days.
      const weekAgoMs = Date.now() - 7 * 86400000
      const userWeekly = new Map<number, { dist: number, count: number }>()
      for (const a of activities) {
        const when = a.completed_at ? Date.parse(a.completed_at) : Number.NaN
        if (!Number.isFinite(when) || when < weekAgoMs)
          continue
        const w = userWeekly.get(a.user_id) ?? { dist: 0, count: 0 }
        w.dist += a.distance ?? 0
        w.count += 1
        userWeekly.set(a.user_id, w)
      }

      const result = clubs
        .filter((c: any) => !c.is_private || (sessionUser !== null && (membersByClub.get(c.id) ?? []).includes(sessionUser)))
        .map((c: any) => {
          const members = membersByClub.get(c.id) ?? []
          let dist = 0
          let count = 0
          for (const uid of members) {
            const w = userWeekly.get(uid)
            if (w) {
              dist += w.dist
              count += w.count
            }
          }
          return {
            id: c.id,
            name: c.name,
            description: c.description,
            location: c.location,
            type: c.club_type,
            isPrivate: !!c.is_private,
            creatorId: c.creator_id,
            // Note: the raw member-id roster is intentionally NOT exposed on the
            // public listing; memberCount + isMember drive the UI.
            memberCount: members.length,
            isMember: sessionUser !== null && members.includes(sessionUser),
            weeklyDistance: Math.round(dist),
            activitiesThisWeek: count,
            createdAt: c.created_at,
          }
        })
        .sort((a: any, b: any) => b.memberCount - a.memberCount || a.id - b.id)

      // Generous default — the clubs page has no load-more and expects the
      // full set; ?limit/?offset still paginate on demand (#978 review).
      const paged = paginate(result, readPageParams(request, { defaultLimit: 200, maxLimit: 200 }))
      return response.json({ success: true, clubs: paged.items, meta: paged.meta })
    }
    catch (error) {
      console.error('[clubs] index failed:', error)
      return response.json({ success: false, error: 'Failed to fetch clubs' }, 500)
    }
  },
})
