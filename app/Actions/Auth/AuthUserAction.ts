// No imports needed - everything is auto-imported!
//
// GET /me - returns the authenticated user. Registered behind the `auth`
// middleware in routes/api.ts, so reaching handle() implies a valid token; we
// still guard defensively. The frontend calls this on mount (auth.user()).

export default new Action({
  name: 'Auth User',
  description: 'Return the currently authenticated user',
  method: 'GET',

  async handle() {
    const user = await Auth.user()
    if (!user)
      return response.json({ error: 'Unauthenticated' }, 401)

    return response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  },
})
