import type { LatLng } from './useTrailMap'

export function routePreviewPoints(coords: LatLng[]): string {
  if (coords.length < 2)
    return ''
  const lats = coords.map(c => c[0])
  const lngs = coords.map(c => c[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const pad = 10
  const w = 100 - pad * 2
  const h = 100 - pad * 2
  const latSpan = maxLat - minLat || 0.01
  const lngSpan = maxLng - minLng || 0.01
  return coords.map(([lat, lng]) => {
    const x = pad + ((lng - minLng) / lngSpan) * w
    const y = pad + (1 - (lat - minLat) / latSpan) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export function routePreviewDataUri(coords: LatLng[], color = '#059669'): string | null {
  const points = routePreviewPoints(coords)
  if (!points)
    return null
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ecfdf5"/><polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
