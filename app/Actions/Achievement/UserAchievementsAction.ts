// No imports needed - everything is auto-imported!
//
// GET /api/users/{id}/achievements - every achievement definition merged with
// the user's progress (#982). Public read, like the athlete profile; rows the
// user hasn't started yet come back with progress 0 so the UI can render the
// full badge wall.

export default new Action({
  name: 'User Achievements',
  description: 'List achievement definitions with a user\'s progress',
  method: 'GET',

  async handle(request) {
    const userId = request.get<number>('id') ?? request.get<number>('user_id')
    if (!userId)
      return response.json({ success: false, error: 'User ID is required' }, 400)

    try {
      const definitions = (await Achievement.all()) ?? []
      const rows = (await UserAchievement.where('user_id', '=', userId).get()) ?? []
      const progressByAchievement = new Map(rows.map((r: any) => [r.achievement_id, r]))

      const achievements = definitions.map((d: any) => {
        const p = progressByAchievement.get(d.id)
        return {
          id: d.id,
          name: d.name,
          description: d.description,
          icon: d.icon,
          category: d.category,
          metric: d.metric,
          target: d.target_value ?? 1,
          unit: d.target_unit,
          points: d.points ?? 0,
          badgeColor: d.badge_color,
          progress: p?.progress ?? 0,
          isComplete: !!p?.is_complete,
          unlockedAt: p?.completed_at ?? null,
        }
      })

      const totalPoints = achievements
        .filter(a => a.isComplete)
        .reduce((sum, a) => sum + a.points, 0)

      return response.json({
        success: true,
        achievements,
        meta: {
          total: achievements.length,
          unlocked: achievements.filter(a => a.isComplete).length,
          totalPoints,
        },
      })
    }
    catch (error) {
      console.error('[achievements] index failed:', error)
      return response.json({ success: false, error: 'Failed to fetch achievements' }, 500)
    }
  },
})
