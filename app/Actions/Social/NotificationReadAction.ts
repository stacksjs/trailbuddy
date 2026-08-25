// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// POST /api/notifications/read (auth) - mark the session user's notifications
// read. Optional `id` marks a single one; otherwise marks all.

import { Auth } from '@stacksjs/auth'

export default new Action({
  name: 'Notification Read',
  description: 'Mark notifications as read',
  method: 'POST',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    try {
      const id = request.get<number>('id')
      const query = id
        ? UserNotification.where('id', '=', id).where('recipient_id', '=', userId)
        : UserNotification.where('recipient_id', '=', userId).where('read', '=', false)
      const rows = (await query.get()) ?? []
      for (const n of rows)
        await UserNotification.forceUpdate(n.id, { read: true })

      return response.json({ success: true, marked: rows.length })
    }
    catch (error) {
      console.error('Error marking notifications read:', error)
      return response.json({ success: false, error: 'Failed to mark read' }, 500)
    }
  },
})
