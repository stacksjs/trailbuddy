/**
 * Activity visibility rules (#957). An activity is visible to a viewer when:
 *  - it's public (or has no visibility set — legacy rows default to public), OR
 *  - the viewer is the owner, OR
 *  - it's 'followers' and the viewer follows the owner.
 * 'private' is owner-only. An anonymous viewer (null) sees only public.
 */

export function canViewActivity(
  activity: { user_id?: number | null, visibility?: string | null },
  viewerId: number | null,
  viewerFollowingIds: Set<number>,
): boolean {
  const visibility = activity.visibility ?? 'public'
  if (visibility === 'public')
    return true
  if (viewerId !== null && activity.user_id === viewerId)
    return true
  if (visibility === 'followers' && viewerId !== null && activity.user_id != null)
    return viewerFollowingIds.has(activity.user_id)
  return false
}
