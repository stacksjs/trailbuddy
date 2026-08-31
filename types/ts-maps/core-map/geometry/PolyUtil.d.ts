import { LatLng } from '../geo/LatLng';
import { Point } from './Point';
import type { Bounds } from './Bounds';
export declare function clipPolygon(points: Array<Point & { _code?: number }>, bounds: Bounds, round?: boolean): Point[];
export declare function polygonCenter(latlngs: any[], crs: any): LatLng;
export declare function centroid(coords: any[]): LatLng;
