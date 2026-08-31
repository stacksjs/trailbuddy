import { Bounds } from '../../geometry/Bounds';
import { LatLng } from '../LatLng';
import { LatLngBounds } from '../LatLngBounds';
import type { Point } from '../../geometry/Point';
import type { Transformation } from '../../geometry/Transformation';
export declare class CRS {
  static projection: any;
  static transformation: Transformation | undefined;
  static code?: string;
  static wrapLng?: [number, number];
  static wrapLat?: [number, number];
  static infinite: boolean;
  static latLngToPoint(this: any, latlng: LatLng, zoom: number): Point;
  static pointToLatLng(this: any, point: Point, zoom: number): LatLng;
  static project(this: any, latlng: LatLng): Point;
  static unproject(this: any, point: Point): LatLng;
  static scale(zoom: number): number;
  static zoom(scale: number): number;
  static getProjectedBounds(this: any, zoom: number): Bounds | null;
  static distance(_a: LatLng, _b: LatLng): number;
  static wrapLatLng(this: any, latlng: LatLng): LatLng;
  static wrapLatLngBounds(this: any, bounds: LatLngBounds): LatLngBounds;
}
