import { Bounds } from '../../geometry/Bounds';
import { LatLng } from '../LatLng';
import { Point } from '../../geometry/Point';
// Equirectangular (Plate Carree) projection.
export declare const LonLat: ProjectionLike;
export declare interface ProjectionLike {
  bounds: Bounds
  project: (latlng: any) => Point
  unproject: (point: any) => LatLng
  [k: string]: any
}
