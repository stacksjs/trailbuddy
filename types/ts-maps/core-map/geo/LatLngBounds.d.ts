import { LatLng } from './LatLng';
import type { LatLngLike } from './LatLng';
export declare function toLatLngBounds(a?: any, b?: LatLngLike): LatLngBounds;
export type LatLngBoundsLike = LatLngBounds | [LatLngLike, LatLngLike] | LatLngLike[];
// Represents a rectangular geographical area on a map.
export declare class LatLngBounds {
  _southWest?: LatLng;
  _northEast?: LatLng;
  constructor(corner1?: any, corner2?: LatLngLike);
  extend(obj: any): this;
  pad(bufferRatio: number): LatLngBounds;
  getCenter(): LatLng;
  getSouthWest(): LatLng;
  getNorthEast(): LatLng;
  getNorthWest(): LatLng;
  getSouthEast(): LatLng;
  getWest(): number;
  getSouth(): number;
  getEast(): number;
  getNorth(): number;
  contains(obj: any): boolean;
  intersects(bounds: LatLngBoundsLike): boolean;
  overlaps(bounds: LatLngBoundsLike): boolean;
  toBBoxString(): string;
  equals(bounds: LatLngBoundsLike | null | undefined, maxMargin?: number): boolean;
  isValid(): boolean;
}
