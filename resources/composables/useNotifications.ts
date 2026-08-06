import { onMount } from 'stx'
import { fetchNotifications } from '../assets/scripts/game-api'

/**
 * Hydrate the current user's notifications from the API into the `wl` store so
 * the notifications page + nav unread badge reflect real kudos/comment/follow
 * events. Falls back to seed data when the API is empty/unreachable.
 */

interface NotificationStoreLike {
  notifications: () => unknown[]
  hydrateNotifications: (list: unknown[]) => void
}

let notificationsStarted = false

export function useNotifications(wl: NotificationStoreLike | null) {
  onMount(async () => {
    if (!wl || notificationsStarted)
      return
    notificationsStarted = true
    try {
      const data = await fetchNotifications()
      if (!data || !Array.isArray(data.notifications) || data.notifications.length === 0)
        return
      // Map the API shape to the store's Notification shape.
      const mapped = data.notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.actorName || 'WildLoop',
        message: n.body,
        link: n.link || '#',
        read: !!n.read,
        created_at: n.createdAt,
      }))
      wl.hydrateNotifications(mapped)
    }
    catch {
      // keep seed notifications
    }
  })
}
