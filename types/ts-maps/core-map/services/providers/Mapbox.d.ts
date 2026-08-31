import type { DirectionsOptions, DirectionsProvider, GeocoderOptions, GeocoderProvider, GeocodingResult, IsochroneOptions, IsochronePolygon, IsochroneProvider, LatLngLike, MatrixOptions, MatrixProvider, MatrixResult, Route } from '../types';
export declare interface MapboxOptions {
  accessToken: string
  baseUrl?: string
}
export declare class MapboxGeocoder implements GeocoderProvider {
  name: string;
  constructor(opts: MapboxOptions);
  search(query: string, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
  reverse(center: LatLngLike, opts?: GeocoderOptions): Promise<GeocodingResult[]>;
}
export declare class MapboxDirections implements DirectionsProvider {
  name: string;
  constructor(opts: MapboxOptions);
  getDirections(waypoints: LatLngLike[], opts?: DirectionsOptions): Promise<Route[]>;
}
export declare class MapboxIsochrone implements IsochroneProvider {
  name: string;
  constructor(opts: MapboxOptions);
  getIsochrones(center: LatLngLike, opts: IsochroneOptions): Promise<IsochronePolygon[]>;
}
export declare class MapboxMatrix implements MatrixProvider {
  name: string;
  constructor(opts: MapboxOptions);
  getMatrix(origins: LatLngLike[], destinations: LatLngLike[], opts?: MatrixOptions): Promise<MatrixResult>;
}
