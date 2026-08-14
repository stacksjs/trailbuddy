import { describe, expect, it } from 'bun:test'
import { mergeNativeLocationSamples } from '../../resources/assets/scripts/recording-checkpoint'

describe('durable recording samples', () => {
  it('merges background locations in timestamp order without duplicates', () => {
    const merged = mergeNativeLocationSamples([
      { lat: 37, lng: -122, t: 2_000, eleFt: 10, movingS: 2, accuracy: 4 },
    ], [
      { latitude: 36.9, longitude: -122.1, timestamp: 1_000, altitude: 2, accuracy: 5 },
      { latitude: 37, longitude: -122, timestamp: 2_000, altitude: 3, accuracy: 4 },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.map(sample => sample.t)).toEqual([1_000, 2_000])
    expect(merged[0].eleFt).toBeCloseTo(6.56168)
  })
})
