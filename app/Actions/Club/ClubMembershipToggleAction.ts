// No imports needed - everything is auto-imported!
//
// POST /api/clubs/{id}/join (auth) - join or leave a club (#964). Idempotent:
// the (club_id, user_id) unique index (#972) makes a concurrent double-join
// resolve to "already a member". An owner can't leave their own club (they
// must delete it), so a club always keeps at least its owner.

export default new Action({
  name: 'Club Membership Toggle',
  description: 'Join or leave a club',
  method: 'POST',

  async handle(request) {
    const clubId = positiveInt(request.get('id') ?? request.get('club_id'))
    const userId = (await Auth.user().catch(() => null))?.id ?? positiveInt(request.get('user_id'))

    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)
    if (!clubId)
      return response.json({ success: false, error: 'Validation failed', fields: { club_id: 'required: a positive integer club id' } }, 422)

    try {
      const club = await Club.find(clubId)
      if (!club)
        return response.json({ success: false, error: 'Club not found' }, 404)

      const existing = await ClubMember
        .where('club_id', '=', clubId)
        .where('user_id', '=', userId)
        .first()

      let joined: boolean
      if (existing) {
        if (existing.role === 'owner')
          return response.json({ success: false, error: 'Owners can\'t leave their own club. Delete it instead' }, 400)
        await ClubMember.delete(existing.id)
        joined = false
      }
      else {
        joined = true
        try {
          await ClubMember.forceCreate({ club_id: clubId, user_id: userId, role: 'member' })
        }
        catch (err) {
          // Concurrent double-join raced the existence check; the unique index
          // kept one row - the user is a member either way.
          if (!String(err).includes('UNIQUE constraint failed'))
            throw err
        }
      }

      const members = (await ClubMember.where('club_id', '=', clubId).get()) ?? []
      return response.json({ success: true, joined, memberCount: members.length })
    }
    catch (error) {
      console.error('[clubs] membership toggle failed:', error)
      return response.json({ success: false, error: 'Failed to update membership' }, 500)
    }
  },
})
