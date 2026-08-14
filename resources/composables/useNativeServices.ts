import { onDestroy, onMount } from 'stx'
import { deepLinks, device, isNativeMobile, onMobileReady, pushNotifications } from '@stacksjs/mobile'
import { readyToken } from '../assets/scripts/auth'

function openDeepLink(value: string): void {
  try {
    const url = new URL(value, 'https://wildloop.org')
    if (url.hostname !== 'wildloop.org' && url.protocol !== 'wildloop:') return
    const path = url.protocol === 'wildloop:' ? `/${url.host}${url.pathname}` : `${url.pathname}${url.search}${url.hash}`
    if (typeof location !== 'undefined') location.assign(path || '/')
  }
  catch {
    // Ignore malformed external payloads.
  }
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
