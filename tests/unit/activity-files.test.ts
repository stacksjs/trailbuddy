import { describe, expect, it } from 'bun:test'
import { MAX_ACTIVITY_FILE_BYTES, escapeXml, parseActivityFile, parseFitActivity, parseGpxActivity, parseTcxActivity, trackToGpx } from '../../resources/functions/activity-files'

describe('portable activity files', () => {
  it('imports timestamped GPX points and derives metrics', () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><name>Morning loop</name><trkseg>
      <trkpt lat="37.7700" lon="-122.4200"><ele>10</ele><time>2026-08-12T12:00:00Z</time></trkpt>
      <trkpt lat="37.7710" lon="-122.4190"><ele>14</ele><time>2026-08-12T12:01:00Z</time></trkpt>
      <trkpt lat="37.7720" lon="-122.4180"><ele>12</ele><time>2026-08-12T12:02:00Z</time></trkpt>
    </trkseg></trk></gpx>`
    const result = parseGpxActivity(gpx)
    expect(result.name).toBe('Morning loop')
    expect(result.samples).toHaveLength(3)
    expect(result.durationSeconds).toBe(120)
    expect(result.distanceMiles).toBeGreaterThan(0.1)
    expect(result.elevationGainFeet).toBe(13)
  })

  it('imports namespaced TCX trackpoints', () => {
    const tcx = `<TrainingCenterDatabase><Activity><Name>Trail effort</Name><Lap><Track>
      <Trackpoint><Time>2026-08-12T12:00:00Z</Time><Position><LatitudeDegrees>37.77</LatitudeDegrees><LongitudeDegrees>-122.42</LongitudeDegrees></Position><AltitudeMeters>10</AltitudeMeters></Trackpoint>
      <Trackpoint><Time>2026-08-12T12:02:00Z</Time><Position><LatitudeDegrees>37.772</LatitudeDegrees><LongitudeDegrees>-122.418</LongitudeDegrees></Position><AltitudeMeters>20</AltitudeMeters></Trackpoint>
    </Track></Lap></Activity></TrainingCenterDatabase>`
    const result = parseTcxActivity(tcx)
    expect(result.name).toBe('Trail effort')
    expect(result.samples).toHaveLength(2)
    expect(result.durationSeconds).toBe(120)
  })

  it('exports a standards-shaped GPX track', () => {
    const output = trackToGpx('A <safe> route', [
      { lat: 37.77, lng: -122.42, time: Date.UTC(2026, 7, 12), altitude: 10, accuracy: null },
      { lat: 37.78, lng: -122.41, time: null, altitude: null, accuracy: null },
    ])
    expect(output).toContain('creator="WildLoop"')
    expect(output).toContain('<trkpt lat="37.77" lon="-122.42">')
    expect(output).toContain('<name>A &lt;safe&gt; route</name>')
  })

  it('escapes every XML metacharacter in exported names', () => {
    expect(escapeXml(`Rock & Roll's "route" <north>`)).toBe('Rock &amp; Roll&apos;s &quot;route&quot; &lt;north&gt;')
  })

  it('rejects oversized files before reading them into memory', async () => {
    const oversized = { name: 'huge.gpx', size: MAX_ACTIVITY_FILE_BYTES + 1 } as File
    await expect(parseActivityFile(oversized)).rejects.toThrow('25 MB')
  })

  it('rejects malformed FIT data cleanly', () => {
    expect(() => parseFitActivity(new ArrayBuffer(16))).toThrow()
  })
})
