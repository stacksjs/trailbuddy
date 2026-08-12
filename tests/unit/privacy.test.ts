import { describe, expect, it } from 'bun:test'
import { canViewActivity, maskRouteEndpoints } from '../../resources/functions/visibility'

describe('privacy controls', () => {
  it('blocks activity visibility in either direction', () => {
    expect(canViewActivity({ user_id: 2, visibility: 'public' }, 1, new Set(), new Set([2]))).toBe(false)
  })

  it('keeps owner and follower visibility rules', () => {
    expect(canViewActivity({ user_id: 2, visibility: 'private' }, 2, new Set())).toBe(true)
    expect(canViewActivity({ user_id: 2, visibility: 'followers' }, 1, new Set([2]))).toBe(true)
    expect(canViewActivity({ user_id: 2, visibility: 'followers' }, null, new Set())).toBe(false)
  })

  it('removes the requested distance from both route endpoints', () => {
    const route = Array.from({ length: 20 }, (_, index) => ({ lat: 37.77, lng: -122.42 + index * 0.001 }))
    const masked = maskRouteEndpoints(route, 200)
    expect(masked.length).toBeLessThan(route.length)
    expect(masked[0]).not.toEqual(route[0])
    expect(masked[masked.length - 1]).not.toEqual(route[route.length - 1])
  })
})

