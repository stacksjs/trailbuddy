/**
 * Great-circle distance in metres.
 *
 * Haversine rather than a planar approximation: a planar one is wrong by
 * kilometres at high latitude, which is exactly where "is this within 500m"
 * questions stop being decorative.
 */
export declare function haversine(a: Position, b: Position): number;
/**
 * Even-odd ray casting, with the boundary counted as inside.
 *
 * A point exactly on an edge is a real case — shared borders, snapped data —
 * and excluding it makes two adjacent polygons disagree about who owns it.
 */
export declare function pointInRing(point: Position, ring: Position[]): boolean;
/** Inside the outer ring and outside every hole. */
export declare function pointInPolygon(point: Position, polygon: Position[][]): boolean;
export declare function registerGeometryOps(): void;
declare type Position = [number, number];
