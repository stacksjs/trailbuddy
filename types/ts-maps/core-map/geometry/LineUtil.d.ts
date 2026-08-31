import { LatLng } from '../geo/LatLng';
import { Point } from './Point';
import type { Bounds } from './Bounds';
export declare function simplify(points: Point[], tolerance: number): Point[];
export declare function pointToSegmentDistance(p: Point, p1: Point, p2: Point): number;
export declare function closestPointOnSegment(p: Point, p1: Point, p2: Point): Point;
// Cohen-Sutherland segment clipping.
export declare function clipSegment(a: Point, b: Point, bounds: Bounds, useLastCode?: boolean, round?: boolean): [Point, Point] | false;
export declare function _getEdgeIntersection(a: Point, b: Point, code: number, bounds: Bounds, round?: boolean): Point;
export declare function _getBitCode(p: Point, bounds: Bounds): number;
export declare function _sqClosestPointOnSegment(p: Point, p1: Point, p2: Point, sqDist?: boolean): Point | number;
export declare function isFlat(latlngs: any[]): boolean;
export declare function polylineCenter(latlngs: any[], crs: any): LatLng;
