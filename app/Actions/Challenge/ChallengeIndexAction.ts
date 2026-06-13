// No imports needed - everything is auto-imported!
//
// GET /api/challenges (auth) — the session user's challenges, both sent and
// received (#965), with challenger/challenged/territory names joined so the
// challenges page can render its active/sent/received/completed tabs.

export default new Action({
  name: 'Challenge Index',
  description: 'List the acting user\'s challenges (sent + received)',
  method: 'GET',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id ?? positiveInt(request.get('user_id'))
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    try {
      const all = (await Challenge.all()) ?? []
      const mine = all.filter((c: any) => c.challenger_id === userId || c.challenged_id === userId)

      const userIds = [...new Set(mine.flatMap((c: any) => [c.challenger_id, c.challenged_id]).filter(Boolean))]
      const territoryIds = [...new Set(mine.map((c: any) => c.territory_id).filter(Boolean))]
      const users = userIds.length ? await User.whereIn('id', userIds).get() : []
      const territories = territoryIds.length ? await Territory.whereIn('id', territoryIds).get() : []
      const userName = new Map(users.map((u: any) => [u.id, u.name]))
      const territoryName = new Map(territories.map((t: any) => [t.id, t.name]))

      const challenges = mine
        .map((c: any) => shapeChallenge(c, {
          challengerName: userName.get(c.challenger_id),
          challengedName: userName.get(c.challenged_id),
          territoryName: territoryName.get(c.territory_id),
        }))
        .sort((a: any, b: any) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))

      return response.json({ success: true, challenges, meta: { total: challenges.length } })
    }
    catch (error) {
      console.error('[challenges] index failed:', error)
      return response.json({ success: false, error: 'Failed to fetch challenges' }, 500)
    }
  },
})
