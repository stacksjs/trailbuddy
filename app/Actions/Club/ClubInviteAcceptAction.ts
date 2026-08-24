// No imports needed - everything is auto-imported!
//
// POST /api/clubs/invites/accept (auth) - redeem an invite code.
//
// The code is the credential, so it is read from the body rather than the URL:
// a path segment ends up in server logs, browser history, and any Referer
// header the page leaks, and this one grants membership of a closed club.

export default new Action({
  name: 'Club Invite Accept',
  description: 'Redeem a club invite code',
  method: 'POST',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    const raw = request.get<string>('code')
    const code = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
    if (code.length < 8 || code.length > 64)
      return response.json({ success: false, error: 'Validation failed', fields: { code: 'required: the invite code you were sent' } }, 422)

    try {
      const invite = await ClubInvite.where('code', '=', code).first()
      // One message for "no such code" and "wrong code", so this endpoint
      // cannot be used to enumerate which codes exist.
      if (!invite)
        return response.json({ success: false, error: 'That invite code is not valid' }, 404)

      if (invite.status === 'accepted')
        return response.json({ success: false, error: 'That invite has already been used' }, 409)
      if (invite.status === 'revoked')
        return response.json({ success: false, error: 'That invite was withdrawn' }, 403)

      const expires = invite.expires_at ? Date.parse(invite.expires_at) : Number.NaN
      if (Number.isFinite(expires) && Date.now() > expires) {
        await ClubInvite.update(invite.id, { status: 'expired' }).catch(() => undefined)
        return response.json({ success: false, error: 'That invite has expired' }, 403)
      }

      // An invite addressed to a specific athlete is for that athlete. An
      // invite addressed to an email is for whoever holds it — that is the
      // link a member forwards to somebody who has not signed up yet, and
      // tying it to an account that did not exist when it was sent would
      // break the one case it is for.
      if (invite.invited_user_id !== null && invite.invited_user_id !== userId)
        return response.json({ success: false, error: 'That invite was sent to somebody else' }, 403)

      const club = await Club.find(invite.club_id)
      if (!club)
        return response.json({ success: false, error: 'That club no longer exists' }, 404)

      const existing = await ClubMember
        .where('club_id', '=', invite.club_id)
        .where('user_id', '=', userId)
        .first()

      if (!existing) {
        try {
          await ClubMember.forceCreate({ club_id: invite.club_id, user_id: userId, role: 'member' })
        }
        catch (error) {
          if (!String(error).includes('UNIQUE constraint failed'))
            throw error
        }
      }

      await ClubInvite.update(invite.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invited_user_id: userId,
      })

      const members = (await ClubMember.where('club_id', '=', invite.club_id).get()) ?? []
      return response.json({
        success: true,
        joined: true,
        club: {
          id: club.id,
          name: club.name,
          location: club.location,
          type: club.club_type,
          website: club.website,
          memberCount: members.length,
        },
      })
    }
    catch (error) {
      console.error('[clubs] invite accept failed:', error)
      return response.json({ success: false, error: 'Failed to redeem the invite' }, 500)
    }
  },
})
