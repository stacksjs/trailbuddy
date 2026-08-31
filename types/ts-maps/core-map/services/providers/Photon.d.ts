import type { GeocoderOptions, GeocoderProvider, GeocodingResult, LatLngLike } from '../types';
export declare interface PhotonOptions {
  baseUrl?: string
}
export declare class PhotonGeocoder implements GeocoderProvider {
  name: string;
  constructor(opts?: PhotonOptions);
  search(query: string, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
  reverse(center: LatLngLike, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
}
