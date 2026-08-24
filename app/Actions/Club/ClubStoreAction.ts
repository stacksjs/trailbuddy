// No imports needed - everything is auto-imported!
//
// POST /api/clubs (auth) - create a club (#964). The creator is the session
// user (never the body) and is auto-enrolled as the 'owner' member, so a new
// club starts with one member.

const CLUB_TYPES = ['Running', 'Hiking', 'Mixed', 'Territory Game']
const JOIN_POLICIES = ['open', 'request', 'invite_only']

export default new Action({
  name: 'Club Store',
  description: 'Create a club; the creator becomes its owner member',
  method: 'POST',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    const rawName = request.get<string>('name')
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    const clubType = request.get<string>('club_type') ?? request.get<string>('type') ?? 'Running'
    const description = boundedString(request.get('description'), 500)
    const location = boundedString(request.get('location'), 120)
    const isPrivate = request.get('is_private') === true || request.get('is_private') === 'true'
    const joinPolicy = request.get<string>('join_policy') ?? request.get<string>('joinPolicy') ?? 'open'
    const website = readWebsite(request.get('website'))

    // Field validation (#977) - distinguish missing/short from too-long.
    const fields: Record<string, string> = {}
    if (name.length < 2)
      fields.name = 'required: at least 2 characters'
    else if (name.length > 100)
      fields.name = 'must be at most 100 characters'
    if (!CLUB_TYPES.includes(clubType))
      fields.club_type = `must be one of: ${CLUB_TYPES.join(', ')}`
    if (!JOIN_POLICIES.includes(joinPolicy))
      fields.join_policy = `must be one of: ${JOIN_POLICIES.join(', ')}`
    if (Object.keys(fields).length)
      return response.json({ success: false, error: 'Validation failed', fields }, 422)

    try {
      const club = await Club.forceCreate({
        creator_id: userId,
        name,
        description: description ?? null,
        location: location ?? null,
        club_type: clubType,
        is_private: isPrivate,
        join_policy: joinPolicy,
        website,
      })

      // The creator owns the club they just made.
      await ClubMember.forceCreate({
        club_id: club.id,
        user_id: userId,
        role: 'owner',
      })

      return response.json({
        success: true,
        club: {
          id: club.id,
          name: club.name,
          description: club.description,
          location: club.location,
          type: club.club_type,
          isPrivate: !!club.is_private,
          joinPolicy: club.join_policy ?? 'open',
          website: club.website ?? null,
          creatorId: club.creator_id,
          members: [userId],
          memberCount: 1,
          isMember: true,
          weeklyDistance: 0,
          activitiesThisWeek: 0,
          createdAt: club.created_at,
        },
      }, 201)
    }
    catch (error) {
      console.error('[clubs] store failed:', error)
      return response.json({ success: false, error: 'Failed to create club' }, 500)
    }
  },
})

/**
 * A club's own site, when it has one.
 *
 * http/https only: a `javascript:` or `data:` URL stored here would be
 * rendered as a link on the club page and run in the reader's session.
 */
function readWebsite(raw: unknown): string | null {
  if (typeof raw !== 'string')
    return null
  const value = raw.trim()
  if (!value || value.length > 200)
    return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  }
  catch {
    return null
  }
}
