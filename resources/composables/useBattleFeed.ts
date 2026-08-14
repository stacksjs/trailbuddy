import { onDestroy, onMount } from 'stx'
import { readyToken } from '../assets/scripts/auth'

interface BattleStoreLike {
  hydrateConquestsFromApi: (battles: unknown[]) => void
}

export function useBattleFeed(wl: BattleStoreLike | null) {
  let timer: ReturnType<typeof setInterval> | null = null
  const load = async () => {
    if (!wl) return
    const bearer = await readyToken()
    const response = await fetch('/api/territories/battles?limit=200', {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    }).catch(() => null)
    const payload = await response?.json().catch(() => null)
    if (response?.ok && Array.isArray(payload?.battles))
      wl.hydrateConquestsFromApi(payload.battles)
  }
  onMount(() => {
    void load()
    timer = setInterval(() => void load(), 15000)
  })
  onDestroy(() => {
    if (timer) clearInterval(timer)
  })
}
