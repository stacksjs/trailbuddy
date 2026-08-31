// Provider-interface layer for geocoding, directions, isochrone, and matrix
// services. Consumers program against these interfaces; providers are
// implemented separately so upstream backends can be swapped without touching
// map code.
export declare interface LatLngLike {
  lat: number
  lng: number
}
export declare interface GeocodingResult {
  text: string
  center: LatLngLike
  bbox?: [number, number, number, number]
  placeType?: 'country' | 'region' | 'district' | 'postcode' | 'place' | 'address' | 'poi'
  properties?: Record<string, unknown>
  relevance?: number
}
export declare interface GeocoderOptions {
  limit?: number
  language?: string
  proximity?: LatLngLike
  bbox?: [number, number, number, number]
  countries?: string[]
  signal?: AbortSignal
}
export declare interface GeocoderProvider {
  name: string
  search: (query: string, opts?: GeocoderOptions) => Promise<GeocodingResult[]>
  reverse: (center: LatLngLike, opts?: GeocoderOptions) => Promise<GeocodingResult[]>
}
export declare interface RouteStep {
  distance: number
  duration: number
  instruction: string
  geometry: LatLngLike[]
  maneuver?: string
}
export declare interface Route {
  distance: number
  duration: number
  geometry: LatLngLike[]
  steps: RouteStep[]
  legs?: Route[]
}
export declare interface DirectionsOptions {
  profile?: TransportProfile
  alternatives?: boolean
  signal?: AbortSignal
  language?: string
}
export declare interface DirectionsProvider {
  name: string
  getDirections: (waypoints: LatLngLike[], opts?: DirectionsOptions) => Promise<Route[]>
}
export declare interface IsochroneOptions {
  profile?: TransportProfile
  contours: number[]
  contourMetric?: 'time' | 'distance'
  denoise?: number
  generalize?: number
  signal?: AbortSignal
}
export declare interface IsochronePolygon {
  geometry: LatLngLike[]
  holes?: LatLngLike[][]
  contour: number
}
export declare interface IsochroneProvider {
  name: string
  getIsochrones: (center: LatLngLike, opts: IsochroneOptions) => Promise<IsochronePolygon[]>
}
export declare interface MatrixOptions {
  profile?: TransportProfile
  metric?: 'time' | 'distance'
  signal?: AbortSignal
}
export declare interface MatrixResult {
  durations?: number[][]
  distances?: number[][]
}
export declare interface MatrixProvider {
  name: string
  getMatrix: (origins: LatLngLike[], destinations: LatLngLike[], opts?: MatrixOptions) => Promise<MatrixResult>
}
export type TransportProfile = 'driving' | 'walking' | 'cycling';
