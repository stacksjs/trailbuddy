import { CRS } from './CRS';
import type { LatLng } from '../LatLng';
export declare class EarthCRS extends CRS {
  static wrapLng: [number, number];
  static R: number;
  static distance(latlng1: LatLng, latlng2: LatLng): number;
}
