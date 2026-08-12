// No imports needed - everything is auto-imported!
//
// DELETE /api/clubs/{id} (auth) - the creator/owner deletes their club (#964),
// which is what "owners can't leave, delete instead" points at. Memberships go
// with it.

export default new Action({
  name: 'Club Destroy',
  description: 'Delete a club (owner only); removes its memberships',
  method: 'DELETE',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    const clubId = positiveInt(request.get('id') ?? request.get('club_id'))

    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)
    if (!clubId)
      return response.json({ success: false, error: 'Validation failed', fields: { id: 'required: a positive integer club id' } }, 422)

    try {
      const club = await Club.find(clubId)
      if (!club)
        return response.json({ success: false, error: 'Club not found' }, 404)
      if (club.creator_id !== userId)
        return response.json({ success: false, error: 'Only the club owner can delete it' }, 403)

      const memberships = (await ClubMember.where('club_id', '=', clubId).get()) ?? []
      for (const m of memberships)
        await ClubMember.delete(m.id)
      await Club.delete(clubId)

      return response.json({ success: true, deleted: { id: clubId, members: memberships.length } })
    }
    catch (error) {
      console.error('[clubs] destroy failed:', error)
      return response.json({ success: false, error: 'Failed to delete club' }, 500)
    }
  },
})
