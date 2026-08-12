import UserBlock from '../../app/Models/UserBlock'

/**
 * Activity visibility rules (#957). An activity is visible to a viewer when:
 *  - it's public (or has no visibility set - legacy rows default to public), OR
 *  - the viewer is the owner, OR
 *  - it's 'followers' and the viewer follows the owner.
 * 'private' is owner-only. An anonymous viewer (null) sees only public.
 */

export function canViewActivity(
  activity: { user_id?: number | null, visibility?: string | null },
  viewerId: number | null,
  viewerFollowingIds: Set<number>,
  blockedUserIds: Set<number> = new Set(),
): boolean {
  if (activity.user_id != null && blockedUserIds.has(activity.user_id))
    return false
  const visibility = activity.visibility ?? 'public'
  if (visibility === 'public')
    return true
  if (viewerId !== null && activity.user_id === viewerId)
    return true
  if (visibility === 'followers' && viewerId !== null && activity.user_id != null)
    return viewerFollowingIds.has(activity.user_id)
  return false
}

/** User ids hidden by either side of a block relationship. */
export async function blockedUserIdsFor(viewerId: number | null): Promise<Set<number>> {
  if (!viewerId)
    return new Set()
  const outgoing = (await UserBlock.where('blocker_id', '=', viewerId).get()) ?? []
  const incoming = (await UserBlock.where('blocked_id', '=', viewerId).get()) ?? []
  return new Set([
    ...outgoing.map((row: any) => row.blocked_id),
    ...incoming.map((row: any) => row.blocker_id),
  ])
}

export function maskRouteEndpoints<T extends { lat: number, lng: number }>(route: T[], metres: number): T[] {
  if (metres <= 0 || route.length < 3)
    return route
  const distance = (a: T, b: T) => {
    const radius = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const x = Math.sin(dLat / 2) ** 2
      + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return 2 * radius * Math.asin(Math.sqrt(x))
  }
  let start = 0
  let travelled = 0
  while (start + 1 < route.length && travelled < metres) {
    travelled += distance(route[start], route[start + 1])
    start++
  }
  let end = route.length - 1
  travelled = 0
  while (end - 1 > start && travelled < metres) {
    travelled += distance(route[end], route[end - 1])
    end--
  }
  return route.slice(start, end + 1)
}
