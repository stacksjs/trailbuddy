// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// POST /api/challenges/{id}/resolve (auth) - settle an active challenge (#965).
// The winner is decided by who currently holds the staked territory: if the
// challenger has taken it, the challenger wins; otherwise the defender held it.
// Either party can trigger resolution (normally after the deadline). This is
// the basic progress/outcome tracking the issue calls for.

import { Auth } from '@stacksjs/auth'

export default new Action({
  name: 'Challenge Resolve',
  description: 'Resolve an active challenge by current territory ownership',
  method: 'POST',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    const challengeId = positiveInt(request.get('id') ?? request.get('challenge_id'))
    if (!challengeId)
      return response.json({ success: false, error: 'Validation failed', fields: { challenge_id: 'required: a positive integer challenge id' } }, 422)

    try {
      const challenge = await Challenge.find(challengeId)
      if (!challenge)
        return response.json({ success: false, error: 'Challenge not found' }, 404)
      if (challenge.challenger_id !== userId && challenge.challenged_id !== userId)
        return response.json({ success: false, error: 'Only a participant can resolve this challenge' }, 403)
      if (challenge.status !== 'active')
        return response.json({ success: false, error: `Only active challenges can be resolved (this one is ${challenge.status})` }, 409)
      // Can't settle before time's up - otherwise a party could resolve the
      // instant they're ahead and lock in the outcome (review #965).
      const deadlineMs = Date.parse(challenge.deadline)
      if (Number.isFinite(deadlineMs) && deadlineMs > Date.now())
        return response.json({ success: false, error: 'This challenge can\'t be resolved until its deadline' }, 409)

      const territory = await Territory.find(challenge.territory_id)
      // The challenger wins if they now hold the staked land in EITHER form:
      // a full takeover reassigns the original row's owner, but a split
      // conquest keeps the original row with the defender and gives the
      // challenger a NEW child territory (parent_territory_id = the original).
      // Checking only the original row would wrongly credit the defender after
      // a successful split (review #965).
      let challengerHolds = !!(territory && territory.user_id === challenge.challenger_id)
      if (!challengerHolds) {
        const children = (await Territory
          .where('parent_territory_id', '=', challenge.territory_id)
          .where('user_id', '=', challenge.challenger_id)
          .get()) ?? []
        challengerHolds = children.length > 0
      }
      const winnerId = challengerHolds ? challenge.challenger_id : challenge.challenged_id

      await Challenge.forceUpdate(challengeId, { status: 'completed', winner_id: winnerId })
      const updated = await Challenge.find(challengeId)

      const [challenger, challenged] = await Promise.all([
        User.find(challenge.challenger_id),
        User.find(challenge.challenged_id),
      ])

      return response.json({
        success: true,
        winnerId,
        challenge: shapeChallenge(updated, {
          challengerName: challenger?.name,
          challengedName: challenged?.name,
          territoryName: territory?.name,
        }),
      })
    }
    catch (error) {
      console.error('[challenges] resolve failed:', error)
      return response.json({ success: false, error: 'Failed to resolve challenge' }, 500)
    }
  },
})
