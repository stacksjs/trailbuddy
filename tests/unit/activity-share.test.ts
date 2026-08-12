import { describe, expect, test } from 'bun:test'
import { ACTIVITY_SHARE_CARD_PRESETS } from 'ts-images/activity-card'
import { activityShareOptions, activitySharePreview, activityShareSvg } from '../../resources/functions/activity-share'

const activity = {
  activityType: 'Trail Run',
  created_at: '2026-08-12T12:30:00.000Z',
  distance: 8.421,
  duration: '1:09:00',
  elevation_gain: 1284,
  moving_time: '1:07:32',
  pace: '8:01 /mi',
  title: 'Headlands sunrise',
  userName: 'Chris',
}

const route = [
  { lat: 37.81, lng: -122.51 },
  { lat: 37.83, lng: -122.49 },
  { lat: 37.82, lng: -122.46 },
]

describe('activity sharing', () => {
  test('maps measured activity data into share-card labels', () => {
    const options = activityShareOptions(activity, route, 'story')
    expect(options.distance).toBe('8.42 mi')
    expect(options.duration).toBe('1:07:32')
    expect(options.elevation).toBe('1,284 ft')
    expect(options.preset).toBe('story')
    expect(options.route).toEqual(route)
  })

  test('renders every metric and the recorded route into the image', () => {
    const svg = activityShareSvg(activity, route, 'square')
    expect(svg).toContain('id="activity-route"')
    expect(svg).toContain('Headlands sunrise')
    expect(svg).toContain('8.42 mi')
    expect(svg).toContain('1:07:32')
    expect(svg).toContain('8:01 /mi')
    expect(svg).toContain('1,284 ft')
  })

  test('builds an embeddable preview at the selected dimensions', () => {
    const preview = activitySharePreview(activity, route, 'landscape')
    expect(preview).toStartWith('data:image/svg+xml;charset=utf-8,')
    expect(decodeURIComponent(preview)).toContain(`width="${ACTIVITY_SHARE_CARD_PRESETS.landscape.width}"`)
  })
})
