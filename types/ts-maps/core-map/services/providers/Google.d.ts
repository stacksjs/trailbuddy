import type { DirectionsOptions, DirectionsProvider, GeocoderOptions, GeocoderProvider, GeocodingResult, LatLngLike, Route } from '../types';
export declare interface GoogleOptions {
  apiKey: string
  baseUrl?: string
}
export declare class GoogleGeocoder implements GeocoderProvider {
  name: string;
  constructor(opts: GoogleOptions);
  search(query: string, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
  reverse(center: LatLngLike, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
}
export declare class GoogleDirections implements DirectionsProvider {
  name: string;
  constructor(opts: GoogleOptions);
  getDirections(waypoints: LatLngLike[], opts?: DirectionsOptions): Promise<Route[]>;
}
