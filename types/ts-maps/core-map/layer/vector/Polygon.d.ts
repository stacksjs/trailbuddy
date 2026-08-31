import { LatLng } from '../../geo/LatLng';
import { Point } from '../../geometry/Point';
import { Polyline } from './Polyline';
export declare class Polygon extends Polyline {
  isEmpty(): boolean;
  getCenter(): LatLng;
  _convertLatLngs(latlngs: any[]): any[];
  _setLatLngs(latlngs: any[]): void;
  _defaultShape(): any[];
  _clipPoints(): void;
  _updatePath(): void;
  _containsPoint(p: Point): boolean;
}
