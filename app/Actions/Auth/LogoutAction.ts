// No imports needed - everything is auto-imported!
//
// POST /logout - revokes the current access token. Registered behind the `auth`
// middleware in routes/api.ts.

export default new Action({
  name: 'Logout',
  description: 'Revoke the current access token / end the session',
  method: 'POST',

  async handle() {
    try {
      await Auth.logout()
      return response.json({ success: true })
    }
    catch (error) {
      console.error('Error during logout:', error)
      return response.json({ success: false, error: 'Failed to log out' }, 500)
    }
  },
})
