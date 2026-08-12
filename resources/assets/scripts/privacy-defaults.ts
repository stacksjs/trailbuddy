import { token } from './auth'

export type ActivityVisibility = 'public' | 'followers' | 'private'

let pending: Promise<ActivityVisibility> | null = null

/** Resolve the athlete's server-side default, with the safe default offline. */
export function loadActivityVisibilityDefault(): Promise<ActivityVisibility> {
  if (pending)
    return pending
  pending = fetch('/api/privacy-settings', {
    headers: token() ? { Authorization: `Bearer ${token()}` } : undefined,
  })
    .then(async (result) => {
      if (!result.ok) return 'followers' as const
      const payload = await result.json().catch(() => null)
      const value = payload?.settings?.defaultActivityVisibility
      return ['public', 'followers', 'private'].includes(value) ? value : 'followers'
    })
    .catch(() => 'followers')
  return pending
}
