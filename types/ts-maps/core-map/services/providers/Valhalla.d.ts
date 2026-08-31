import type { DirectionsOptions, DirectionsProvider, IsochroneOptions, IsochronePolygon, IsochroneProvider, LatLngLike, MatrixOptions, MatrixProvider, MatrixResult, Route } from '../types';
export declare interface ValhallaOptions {
  baseUrl?: string
  apiKey?: string
}
export declare class ValhallaDirections implements DirectionsProvider {
  name: string;
  constructor(opts?: ValhallaOptions);
  getDirections(waypoints: LatLngLike[], opts?: DirectionsOptions): Promise<Route[]>;
}
export declare class ValhallaIsochrone implements IsochroneProvider {
  name: string;
  constructor(opts?: ValhallaOptions);
  getIsochrones(center: LatLngLike, opts: IsochroneOptions): Promise<IsochronePolygon[]>;
}
export declare class ValhallaMatrix implements MatrixProvider {
  name: string;
  constructor(opts?: ValhallaOptions);
  getMatrix(origins: LatLngLike[], destinations: LatLngLike[], opts?: MatrixOptions): Promise<MatrixResult>;
}
