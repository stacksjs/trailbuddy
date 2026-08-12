import { FitDecoder, FitParser } from 'ts-health'

export const MAX_ACTIVITY_FILE_BYTES = 25 * 1024 * 1024
export const MAX_ACTIVITY_TRACK_POINTS = 100_000

export interface ImportedTrackSample {
  lat: number
  lng: number
  time: number | null
  altitude: number | null
  accuracy: number | null
}

export interface ImportedActivityFile {
  name: string
  samples: ImportedTrackSample[]
  completedAt: string
  durationSeconds: number
  distanceMiles: number
  elevationGainFeet: number
}

function numberBetween(value: unknown, min: number, max: number): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

function timeValue(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function distanceMetres(a: ImportedTrackSample, b: ImportedTrackSample): number {
  const radius = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(x))
}

function summarize(name: string, samples: ImportedTrackSample[]): ImportedActivityFile {
  if (samples.length < 2)
    throw new Error('The file does not contain enough track points')
  let metres = 0
  let elevationMetres = 0
  for (let index = 1; index < samples.length; index++) {
    metres += distanceMetres(samples[index - 1], samples[index])
    const previous = samples[index - 1].altitude
    const current = samples[index].altitude
    if (previous !== null && current !== null && current - previous >= 1)
      elevationMetres += current - previous
  }
  const times = samples.map(sample => sample.time).filter((time): time is number => time !== null)
  const first = times[0] ?? Date.now()
  const last = times[times.length - 1] ?? first
  return {
    name,
    samples,
    completedAt: new Date(last).toISOString(),
    durationSeconds: Math.max(1, Math.round((last - first) / 1000)),
    distanceMiles: metres / 1609.344,
    elevationGainFeet: Math.round(elevationMetres * 3.28084),
  }
}

function addSample(samples: ImportedTrackSample[], sample: ImportedTrackSample): void {
  if (samples.length >= MAX_ACTIVITY_TRACK_POINTS)
    throw new Error(`Activity files may contain at most ${MAX_ACTIVITY_TRACK_POINTS.toLocaleString()} track points`)
  samples.push(sample)
}

function tag(block: string, name: string): string | null {
  const match = block.match(new RegExp(`<(?:\\w+:)?${name}[^>]*>([^<]+)<\\/(?:\\w+:)?${name}>`, 'i'))
  return match?.[1]?.trim() ?? null
}

export function parseGpxActivity(text: string, fallbackName = 'GPX import'): ImportedActivityFile {
  const samples: ImportedTrackSample[] = []
  const pointPattern = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi
  for (const match of text.matchAll(pointPattern)) {
    const lat = numberBetween(match[1].match(/\blat=["']([^"']+)/i)?.[1], -90, 90)
    const lng = numberBetween(match[1].match(/\b(?:lon|lng)=["']([^"']+)/i)?.[1], -180, 180)
    if (lat === null || lng === null) continue
    addSample(samples, {
      lat,
      lng,
      time: timeValue(tag(match[2], 'time')),
      altitude: numberBetween(tag(match[2], 'ele'), -1000, 10000),
      accuracy: null,
    })
  }
  return summarize(tag(text, 'name') ?? fallbackName, samples)
}

export function parseTcxActivity(text: string, fallbackName = 'TCX import'): ImportedActivityFile {
  const samples: ImportedTrackSample[] = []
  const pointPattern = /<Trackpoint\b[^>]*>([\s\S]*?)<\/Trackpoint>/gi
  for (const match of text.matchAll(pointPattern)) {
    const lat = numberBetween(tag(match[1], 'LatitudeDegrees'), -90, 90)
    const lng = numberBetween(tag(match[1], 'LongitudeDegrees'), -180, 180)
    if (lat === null || lng === null) continue
    addSample(samples, {
      lat,
      lng,
      time: timeValue(tag(match[1], 'Time')),
      altitude: numberBetween(tag(match[1], 'AltitudeMeters'), -1000, 10000),
      accuracy: null,
    })
  }
  return summarize(tag(text, 'Name') ?? fallbackName, samples)
}

export function parseFitActivity(bytes: ArrayBuffer, fallbackName = 'FIT import'): ImportedActivityFile {
  const parser = new FitParser(bytes)
  const activity = new FitDecoder(parser.parse()).decodeActivity()
  if (!activity)
    throw new Error('The FIT file does not contain a supported activity session')

  const samples = activity.records
    .filter(record => record.position)
    .map(record => ({
      lat: record.position!.lat,
      lng: record.position!.lng,
      time: timeValue(record.timestamp),
      altitude: numberBetween(record.position!.altitude ?? record.altitude, -1000, 10000),
      accuracy: null,
    }))
  if (samples.length > MAX_ACTIVITY_TRACK_POINTS)
    throw new Error(`Activity files may contain at most ${MAX_ACTIVITY_TRACK_POINTS.toLocaleString()} track points`)
  return summarize(activity.name || fallbackName, samples)
}

export async function parseActivityFile(file: File): Promise<ImportedActivityFile> {
  if (file.size > MAX_ACTIVITY_FILE_BYTES)
    throw new Error('Activity files must be 25 MB or smaller')
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'fit') return parseFitActivity(await file.arrayBuffer(), file.name.replace(/\.fit$/i, ''))
  const text = await file.text()
  if (extension === 'gpx' || text.includes('<gpx')) return parseGpxActivity(text, file.name)
  if (extension === 'tcx' || text.includes('<TrainingCenterDatabase')) return parseTcxActivity(text, file.name)
  throw new Error('Choose a GPX, TCX, or FIT activity file')
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]!)
}

export function importedTrackGeoJson(samples: ImportedTrackSample[]): string {
  return JSON.stringify({
    type: 'LineString',
    coordinates: samples.map(sample => [sample.lng, sample.lat]),
    properties: { samples },
  })
}

export function trackToGpx(name: string, samples: ImportedTrackSample[]): string {
  const points = samples.map(sample => `      <trkpt lat="${sample.lat}" lon="${sample.lng}">${sample.altitude === null ? '' : `<ele>${sample.altitude}</ele>`}${sample.time === null ? '' : `<time>${new Date(sample.time).toISOString()}</time>`}</trkpt>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="WildLoop" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escapeXml(name)}</name><trkseg>\n${points}\n</trkseg></trk></gpx>`
}

export function downloadGpxFile(name: string, route: Array<{ lat: number, lng: number }>): void {
  if (typeof document === 'undefined') return
  const samples = route.map(point => ({ ...point, time: null, altitude: null, accuracy: null }))
  const blob = new Blob([trackToGpx(name, samples)], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wildloop-activity'}.gpx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
