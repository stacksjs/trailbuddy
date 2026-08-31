import { CRS } from './CRS';
import { Transformation } from '../../geometry/Transformation';
import type { LatLng } from '../LatLng';
export declare class SimpleCRS extends CRS {
  static projection: any;
  static transformation: Transformation;
  static infinite: boolean;
  static scale(zoom: number): number;
  static zoom(scale: number): number;
  static distance(latlng1: LatLng, latlng2: LatLng): number;
}
