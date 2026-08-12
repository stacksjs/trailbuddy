import { useStore } from 'stx'
import { useActivityCatalog } from './useActivityCatalog'
import { useBattleFeed } from './useBattleFeed'
import { useFollows } from './useFollows'
import { useNotifications } from './useNotifications'
import { useRunUploadQueue } from './useRunUploadQueue'
import { useTerritoryCatalog } from './useTerritoryCatalog'
import { useTrailCatalog } from './useTrailCatalog'

interface BootstrapUser {
  id: number
  email: string
  name?: string
  avatar?: string | null
  roles?: string[]
}

type WildLoopAppStore =
  & NonNullable<Parameters<typeof useTrailCatalog>[0]>
  & NonNullable<Parameters<typeof useTerritoryCatalog>[0]>
  & NonNullable<Parameters<typeof useActivityCatalog>[0]>
  & NonNullable<Parameters<typeof useFollows>[0]>
  & NonNullable<Parameters<typeof useNotifications>[0]>
  & NonNullable<Parameters<typeof useRunUploadQueue>[0]>
  & NonNullable<Parameters<typeof useBattleFeed>[0]>
  & {
    hydrateAuthenticatedUser: (user: BootstrapUser) => void
    clearAuthenticatedUser: () => void
  }

function cachedUser(): BootstrapUser | null {
  if (typeof localStorage === 'undefined')
    return null
  const raw = localStorage.getItem('auth_user')
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as BootstrapUser
  }
  catch {
    localStorage.removeItem('auth_user')
    return null
  }
}

async function serverUser(): Promise<BootstrapUser | null> {
  if (typeof localStorage === 'undefined')
    return null
  const bearer = localStorage.getItem('auth_token')
  if (!bearer)
    return null
  try {
    const response = await fetch('/api/me', { headers: { Authorization: `Bearer ${bearer}` } })
    if (response.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      return null
    }
    if (!response.ok)
      return cachedUser()
    const payload = await response.json().catch(() => null)
    const user = payload?.user as BootstrapUser | undefined
    if (!user?.id)
      return cachedUser()
    localStorage.setItem('auth_user', JSON.stringify(user))
    return user
  }
  catch {
    return cachedUser()
  }
}

/** Initialize the shared WildLoop store and its browser-side data sources. */
export function useWildLoopApp(): void {
  const wl = useStore('wl') as WildLoopAppStore
  const localUser = cachedUser()
  if (localUser)
    wl.hydrateAuthenticatedUser(localUser)

  useTrailCatalog(wl)
  useTerritoryCatalog(wl)
  useActivityCatalog(wl)
  useFollows(wl)
  useNotifications(wl)
  useRunUploadQueue(wl)
  useBattleFeed(wl)

  // The server remains authoritative. Local identity only prevents a flash
  // of signed-out UI while the current bearer token is checked.
  serverUser().then((user) => {
    if (user)
      wl.hydrateAuthenticatedUser(user)
    else
      wl.clearAuthenticatedUser()
  })
}
