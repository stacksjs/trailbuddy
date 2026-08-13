import { describe, expect, it } from 'bun:test'
import { evaluateTrackIntegrity } from '../../resources/functions/activity-integrity'

function track(options: { points?: number, secondsApart?: number, accuracy?: number | null } = {}): string {
  const points = options.points ?? 24
  const secondsApart = options.secondsApart ?? 10
  const accuracy = options.accuracy === undefined ? 8 : options.accuracy
  const startedAt = Date.UTC(2026, 7, 12, 12, 0, 0)
  const coordinates: number[][] = []
  const samples: Array<{ time: number, accuracy: number | null }> = []
  for (let index = 0; index < points; index++) {
    coordinates.push([-122.42 + index * 0.0001, 37.77])
    samples.push({ time: startedAt + index * secondsApart * 1000, accuracy })
  }
  return JSON.stringify({ type: 'LineString', coordinates, properties: { samples } })
}

describe('activity integrity', () => {
  it('derives metrics and verifies a recent device-quality GPS track', () => {
    const completedAt = new Date(Date.UTC(2026, 7, 12, 12, 4, 0)).toISOString()
    const result = evaluateTrackIntegrity({
      gpxData: track(),
      source: 'web_gps',
      activityType: 'Trail Run',
      completedAt,
      nowMs: Date.parse(completedAt),
    })

    expect(result.valid).toBe(true)
    expect(result.captureEligible).toBe(true)
    expect(result.status).toBe('verified')
    expect(result.distanceMiles).toBeGreaterThan(0.1)
    expect(result.durationSeconds).toBe(230)
  })

  it('applies the same integrity rules to native Craft GPS tracks', () => {
    const completedAt = new Date(Date.UTC(2026, 7, 12, 12, 4, 0)).toISOString()
    const result = evaluateTrackIntegrity({
      gpxData: track(),
      source: 'native_gps',
      activityType: 'Trail Run',
      completedAt,
      nowMs: Date.parse(completedAt),
    })

    expect(result.valid).toBe(true)
    expect(result.captureEligible).toBe(true)
    expect(result.status).toBe('verified')
  })

  it('saves a simulation as non-scoring even with complete telemetry', () => {
    const result = evaluateTrackIntegrity({
      gpxData: track(),
      source: 'simulation',
      activityType: 'Trail Run',
    })
    expect(result.valid).toBe(true)
    expect(result.captureEligible).toBe(false)
    expect(result.status).toBe('unverified')
  })

  it('refuses a timestamped teleport', () => {
    const raw = JSON.parse(track())
    raw.coordinates[10] = [-100, 40]
    const result = evaluateTrackIntegrity({
      gpxData: JSON.stringify(raw),
      source: 'web_gps',
      activityType: 'Trail Run',
    })
    expect(result.valid).toBe(false)
    expect(result.status).toBe('rejected')
  })

  it('keeps low-quality GPS in the log but out of territory play', () => {
    const result = evaluateTrackIntegrity({
      gpxData: track({ accuracy: null }),
      source: 'web_gps',
      activityType: 'Walk',
      completedAt: new Date().toISOString(),
    })
    expect(result.valid).toBe(true)
    expect(result.captureEligible).toBe(false)
    expect(result.reason).toContain('accuracy')
  })

  it('never makes manual activities capture eligible', () => {
    const result = evaluateTrackIntegrity({ source: 'manual', activityType: 'Hike' })
    expect(result.valid).toBe(true)
    expect(result.captureEligible).toBe(false)
  })
})
