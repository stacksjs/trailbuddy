import { LatLngBounds } from './LatLngBounds';
export declare function toLatLng(a: LatLngLike | null | undefined, b?: number, c?: number): LatLng;
export type LatLngTuple = [number, number] | [number, number, number];
export type LatLngLike = LatLng | LatLngTuple | { lat: number, lng?: number, lon?: number, alt?: number } | number;
// Represents a geographical point (latitude, longitude, optional altitude).
export declare class LatLng {
  lat: number;
  lng: number;
  alt?: number;
  constructor(lat: LatLngLike | number, lng?: number, alt?: number);
  static validate(lat: any, lng?: any, _alt?: any): boolean;
  equals(obj: LatLngLike, maxMargin?: number): boolean;
  toString(precision?: number): string;
  distanceTo(other: LatLngLike): number;
  wrap(): LatLng;
  toBounds(sizeInMeters: number): LatLngBounds;
  clone(): LatLng;
}
