import type { GeocoderOptions, GeocoderProvider, GeocodingResult, LatLngLike } from '../types';
export declare interface MaptilerOptions {
  apiKey: string
  baseUrl?: string
}
export declare class MaptilerGeocoder implements GeocoderProvider {
  name: string;
  constructor(opts: MaptilerOptions);
  search(query: string, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
  reverse(center: LatLngLike, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
}
