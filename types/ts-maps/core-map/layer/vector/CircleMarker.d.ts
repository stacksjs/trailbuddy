import { LatLng } from '../../geo/LatLng';
import { Path } from './Path';
import type { Point } from '../../geometry/Point';
export declare class CircleMarker extends Path {
  _latlng: LatLng;
  _radius: number;
  _point?: Point;
  _pxRadius?: number;
  _pxRadiusY?: number;
  initialize(latlng: any, options?: any): void;
  setLatLng(latlng: any): this;
  getLatLng(): LatLng;
  setRadius(radius: number): this;
  getRadius(): number;
  setStyle(options?: any): this;
  _project(): void;
  _updateBounds(): void;
  _update(): void;
  _updatePath(): void;
  _empty(): boolean;
  _containsPoint(p: Point): boolean;
}
