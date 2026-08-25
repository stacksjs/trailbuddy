// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// POST /api/challenges (auth) - throw down a challenge over a rival's
// territory (#965). The challenger is the session user; the challenged athlete
// and the area at stake are DERIVED from the chosen territory (you challenge
// whoever currently holds it). Starts 'pending' until the defender responds.

import { Auth } from '@stacksjs/auth'

const DEFAULT_DEADLINE_DAYS = 7

export default new Action({
  name: 'Challenge Store',
  description: 'Create a challenge over a rival\'s territory',
  method: 'POST',

  async handle(request) {
    const challengerId = (await Auth.user().catch(() => null))?.id
    if (!challengerId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    const territoryId = positiveInt(request.get('territory_id'))
    if (!territoryId)
      return response.json({ success: false, error: 'Validation failed', fields: { territory_id: 'required: a positive integer territory id' } }, 422)

    const rawDeadline = request.get<string>('deadline')
    const deadline = rawDeadline && !Number.isNaN(Date.parse(rawDeadline))
      ? rawDeadline
      : new Date(Date.now() + DEFAULT_DEADLINE_DAYS * 86400000).toISOString()

    try {
      const territory = await Territory.find(territoryId)
      if (!territory)
        return response.json({ success: false, error: 'Territory not found' }, 404)

      const challengedId = territory.user_id
      if (!challengedId || challengedId === challengerId)
        return response.json({ success: false, error: 'You can\'t challenge for your own territory' }, 400)

      // One open challenge per (challenger, territory) at a time.
      const open = (await Challenge
        .where('challenger_id', '=', challengerId)
        .where('territory_id', '=', territoryId)
        .get()) ?? []
      if (open.some((c: any) => c.status === 'pending' || c.status === 'active'))
        return response.json({ success: false, error: 'You already have an open challenge for this territory' }, 409)

      const challenge = await Challenge.forceCreate({
        challenger_id: challengerId,
        challenged_id: challengedId,
        territory_id: territoryId,
        area_at_stake: territory.area_size ?? 0,
        status: 'pending',
        winner_id: null,
        deadline,
      })

      const [challenger, challenged] = await Promise.all([User.find(challengerId), User.find(challengedId)])

      // Notify the defender.
      try {
        await UserNotification.forceCreate({
          recipient_id: challengedId,
          actor_id: challengerId,
          actor_name: challenger?.name ?? 'Someone',
          type: 'challenge',
          body: `${challenger?.name ?? 'Someone'} challenged you for ${territory.name}`,
          link: '/challenges',
          read: false,
        })
      }
      catch (err) {
        console.error('[challenges] notify failed:', err)
      }

      return response.json({
        success: true,
        challenge: shapeChallenge(challenge, {
          challengerName: challenger?.name,
          challengedName: challenged?.name,
          territoryName: territory?.name,
        }),
      }, 201)
    }
    catch (error) {
      console.error('[challenges] store failed:', error)
      return response.json({ success: false, error: 'Failed to create challenge' }, 500)
    }
  },
})
