import type { GeocoderOptions, GeocoderProvider, GeocodingResult, LatLngLike } from '../types';
export declare interface NominatimOptions {
  baseUrl?: string
  userAgent?: string
}
export declare class NominatimGeocoder implements GeocoderProvider {
  name: string;
  constructor(opts?: NominatimOptions);
  search(query: string, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
  reverse(center: LatLngLike, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
}
