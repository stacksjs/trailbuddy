import { onMount } from 'stx'
import { fetchNotifications } from '../assets/scripts/game-api'

/**
 * Hydrate the current user's notifications from the API into the `tb` store so
 * the notifications page + nav unread badge reflect real kudos/comment/follow
 * events. Falls back to seed data when the API is empty/unreachable.
 */

interface NotificationStoreLike {
  notifications: () => unknown[]
  hydrateNotifications: (list: unknown[]) => void
}

let started = false

export function useNotifications(tb: NotificationStoreLike | null) {
  onMount(async () => {
    if (!tb || started)
      return
    started = true
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
      tb.hydrateNotifications(mapped)
    }
    catch {
      // keep seed notifications
    }
  })
}
