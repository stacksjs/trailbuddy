import type { DirectionsOptions, DirectionsProvider, LatLngLike, MatrixOptions, MatrixProvider, MatrixResult, Route } from '../types';
export declare interface OSRMOptions {
  baseUrl?: string
}
export declare class OSRMDirections implements DirectionsProvider {
  name: string;
  constructor(opts?: OSRMOptions);
  getDirections(waypoints: LatLngLike[], opts?: DirectionsOptions): Promise<Route[]>;
}
/**
 * OSRM `/table` matrix — keyless default travel-time / distance matrix.
 *
 * Shares a baseUrl with `OSRMDirections`; point it at a self-hosted OSRM
 * instance for production traffic.
 */
export declare class OSRMMatrix implements MatrixProvider {
  name: string;
  constructor(opts?: OSRMOptions);
  getMatrix(origins: LatLngLike[], destinations: LatLngLike[], opts?: MatrixOptions): Promise<MatrixResult>;
}
