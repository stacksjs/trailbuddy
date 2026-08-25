// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// POST /api/challenges/{id}/respond (auth) - the challenged athlete accepts or
// declines a pending challenge (#965). accept → 'active'; decline → 'declined'.
// Only the defender can respond, and only while it's still pending.

import { Auth } from '@stacksjs/auth'

export default new Action({
  name: 'Challenge Respond',
  description: 'Accept or decline a pending challenge (challenged athlete only)',
  method: 'POST',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    const challengeId = positiveInt(request.get('id') ?? request.get('challenge_id'))
    const action = request.get<string>('action')

    const fields: Record<string, string> = {}
    if (!challengeId)
      fields.challenge_id = 'required: a positive integer challenge id'
    if (action !== 'accept' && action !== 'decline')
      fields.action = 'must be "accept" or "decline"'
    if (Object.keys(fields).length)
      return response.json({ success: false, error: 'Validation failed', fields }, 422)

    try {
      const challenge = await Challenge.find(challengeId)
      if (!challenge)
        return response.json({ success: false, error: 'Challenge not found' }, 404)
      if (challenge.challenged_id !== userId)
        return response.json({ success: false, error: 'Only the challenged athlete can respond' }, 403)
      if (challenge.status !== 'pending')
        return response.json({ success: false, error: `Challenge is already ${challenge.status}` }, 409)

      const newStatus = action === 'accept' ? 'active' : 'declined'
      await Challenge.forceUpdate(challengeId, { status: newStatus })
      const updated = await Challenge.find(challengeId)

      const [challenger, challenged, territory] = await Promise.all([
        User.find(challenge.challenger_id),
        User.find(challenge.challenged_id),
        Territory.find(challenge.territory_id),
      ])

      // Notify the challenger of the response.
      try {
        await UserNotification.forceCreate({
          recipient_id: challenge.challenger_id,
          actor_id: userId,
          actor_name: challenged?.name ?? 'Someone',
          type: 'challenge',
          body: `${challenged?.name ?? 'Someone'} ${action === 'accept' ? 'accepted' : 'declined'} your challenge for ${territory?.name ?? 'a territory'}`,
          link: '/challenges',
          read: false,
        })
      }
      catch (err) {
        console.error('[challenges] notify failed:', err)
      }

      return response.json({
        success: true,
        challenge: shapeChallenge(updated, {
          challengerName: challenger?.name,
          challengedName: challenged?.name,
          territoryName: territory?.name,
        }),
      })
    }
    catch (error) {
      console.error('[challenges] respond failed:', error)
      return response.json({ success: false, error: 'Failed to respond to challenge' }, 500)
    }
  },
})
