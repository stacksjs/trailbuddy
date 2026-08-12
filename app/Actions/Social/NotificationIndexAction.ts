// No imports needed - everything is auto-imported!
//
// GET /api/notifications (auth) - the session user's notifications (newest
// first) + unread count. Recipient is the authenticated user (#939).

export default new Action({
  name: 'Notification Index',
  description: "List the current user's notifications",
  method: 'GET',

  async handle(request) {
    const userId = (await Auth.user().catch(() => null))?.id
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    try {
      const rows = (await UserNotification
        .where('recipient_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()) ?? []

      const notifications = rows.map((n: any) => ({
        id: n.id,
        actorId: n.actor_id,
        actorName: n.actor_name,
        type: n.type,
        body: n.body,
        link: n.link,
        read: !!n.read,
        createdAt: n.created_at,
      }))

      return response.json({
        success: true,
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      })
    }
    catch (error) {
      console.error('Error fetching notifications:', error)
      return response.json({ success: false, error: 'Failed to fetch notifications' }, 500)
    }
  },
})
