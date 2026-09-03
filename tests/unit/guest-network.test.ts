import { afterEach, describe, expect, it, mock } from 'bun:test'
import { fetchChallenges, fetchSavedTrails } from '../../resources/assets/scripts/game-api'
import { loadActivityVisibilityDefault } from '../../resources/assets/scripts/privacy-defaults'

afterEach(() => {
  delete (globalThis as any).localStorage
  delete (globalThis as any).sessionStorage
})

describe('guest request boundaries', () => {
  it('does not call authenticated APIs while rendering guest pages', async () => {
    const calls: string[] = []
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response('{}')
    }) as typeof fetch

    expect(await loadActivityVisibilityDefault()).toBe('followers')
    expect(await fetchChallenges()).toBeNull()
    expect(await fetchSavedTrails(0)).toBeNull()
    expect(calls).toEqual([])
  })
})
