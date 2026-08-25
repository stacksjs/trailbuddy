// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// POST /logout - revokes the current access token. Registered behind the `auth`
// middleware in routes/api.ts.

import { Auth } from '@stacksjs/auth'

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
