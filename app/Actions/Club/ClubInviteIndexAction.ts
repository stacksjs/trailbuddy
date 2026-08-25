// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// GET /api/clubs/{id}/invites (auth, owner/admin) - who has been invited, and
// where each invite got to. Codes are included, because the roster is also how
// an owner re-sends a link somebody lost.

import { Auth } from '@stacksjs/auth'

export default new Action({
  name: 'Club Invite Index',
  description: 'List a club\'s invites (owners and admins only)',
  method: 'GET',

  async handle(request) {
    const clubId = positiveInt(request.get('id') ?? request.get('club_id'))
    const userId = (await Auth.user().catch(() => null))?.id

    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)
    if (!clubId)
      return response.json({ success: false, error: 'Validation failed', fields: { id: 'required: a positive integer club id' } }, 422)

    try {
      const membership = await ClubMember
        .where('club_id', '=', clubId)
        .where('user_id', '=', userId)
        .first()
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin'))
        return response.json({ success: false, error: 'Only owners and admins can see invites' }, 403)

      const invites = (await ClubInvite.where('club_id', '=', clubId).get()) ?? []

      const userIds = [...new Set(invites.flatMap((invite: any) =>
        [invite.invited_user_id, invite.invited_by_id].filter(Boolean)))] as number[]
      const users = userIds.length ? await User.whereIn('id', userIds).get() : []
      const nameOf = new Map((users ?? []).map((user: any) => [user.id, user.name]))

      const now = Date.now()
      const rows = invites
        .map((invite: any) => {
          const expires = invite.expires_at ? Date.parse(invite.expires_at) : Number.NaN
          const expired = invite.status === 'pending' && Number.isFinite(expires) && now > expires
          return {
            id: invite.id,
            code: invite.code,
            // Report an elapsed invite as expired even before a redemption
            // attempt writes that status, so the roster never shows a link as
            // usable when it is not.
            status: expired ? 'expired' : invite.status,
            invitedUserId: invite.invited_user_id,
            invitedName: invite.invited_user_id ? nameOf.get(invite.invited_user_id) ?? null : null,
            invitedEmail: invite.invited_email,
            invitedById: invite.invited_by_id,
            invitedByName: nameOf.get(invite.invited_by_id) ?? 'Unknown',
            note: invite.note,
            expiresAt: invite.expires_at,
            acceptedAt: invite.accepted_at,
            createdAt: invite.created_at,
          }
        })
        .sort((a: any, b: any) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))

      const paged = paginate(rows, readPageParams(request, { defaultLimit: 100, maxLimit: 200 }))
      return response.json({ success: true, invites: paged.items, meta: paged.meta })
    }
    catch (error) {
      console.error('[clubs] invite index failed:', error)
      return response.json({ success: false, error: 'Failed to fetch invites' }, 500)
    }
  },
})
