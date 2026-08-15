import { onDestroy, onMount } from 'stx'
import { deepLinks, device, isNativeMobile, onMobileReady, pushNotifications } from '~/storage/framework/core/mobile/dist/index.js'
import { readyToken } from '../assets/scripts/auth'

export function deepLinkPath(value: string): string | null {
  try {
    if (!value.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(value)) return null
    const url = new URL(value, 'https://wildloop.org')
    if (url.hostname !== 'wildloop.org' && url.protocol !== 'wildloop:') return null
    if (url.protocol !== 'wildloop:') return `${url.pathname}${url.search}${url.hash}` || '/'

    const route = `${url.host}/${url.pathname}`.replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '')
    return `/${route}${url.search}${url.hash}`
  }
  catch {
    return null
  }
}

function openDeepLink(value: string): void {
  const path = deepLinkPath(value)
  if (!path || typeof location === 'undefined') return
  const current = `${location.pathname}${location.search}${location.hash}`
  if (current.replace(/\/$/, '') === path.replace(/\/$/, '')) return
  location.assign(path)
}

export function useNativeServices(): void {
  let removeReady: (() => void) | null = null
  let removeLink: (() => void) | null = null
  let removeNotification: (() => void) | null = null

  onMount(() => {
    removeReady = onMobileReady(async () => {
      if (!isNativeMobile()) return
      const initial = await deepLinks.getInitialURL().catch(() => null)
      if (initial) openDeepLink(initial)
      removeLink = deepLinks.onLink(openDeepLink)
      removeNotification = pushNotifications.onNotification((payload) => {
        const link = typeof payload.link === 'string' ? payload.link : null
        if (link) openDeepLink(link)
      })

      const bearer = await readyToken()
      if (!bearer) return
      const [pushToken, info] = await Promise.all([
        pushNotifications.register().catch(() => null),
        device.getInfo().catch(() => null),
      ])
      if (!pushToken || !info) return
      await fetch('/api/notifications/push-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: pushToken,
          platform: info.platform,
          device_id: info.deviceId,
          environment: location.hostname === 'wildloop.org' ? 'production' : 'development',
        }),
      }).catch(() => null)
    })
  })

  onDestroy(() => {
    removeReady?.()
    removeLink?.()
    removeNotification?.()
  })
}
