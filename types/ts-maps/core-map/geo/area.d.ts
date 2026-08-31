/**
 * Signed area of one ring in square metres, positive when it winds
 * counter-clockwise.
 *
 * Signed rather than absolute because the sign is what distinguishes a hole
 * from an outer ring, and a territory with a lake in it is a shape this has to
 * measure correctly.
 *
 * Coordinates are `[longitude, latitude]`, the order GeoJSON uses.
 */
export declare function ringArea(ring: Ring): number;
/**
 * Area of a polygon in square metres: its outer ring less its holes.
 *
 * Ring winding is not trusted — a track recorded by a runner going clockwise
 * is as valid as one going the other way, and GeoJSON from the wild is
 * inconsistent about it. The first ring is taken as the outer one and the rest
 * as holes, which is what the GeoJSON specification says they are.
 */
export declare function polygonArea(polygon: Polygon): number;
/** Area of a multipolygon in square metres. */
export declare function multiPolygonArea(multi: MultiPolygon): number;
/**
 * Perimeter of a ring in metres.
 *
 * Useful next to the area: two territories of the same size but very different
 * perimeters were earned by quite different runs.
 */
export declare function ringPerimeter(ring: Ring, closed?: boolean): number;
/** Great-circle distance between two `[lng, lat]` positions, in metres. */
export declare function haversine(a: Position, b: Position): number;
/**
 * Square metres as something to put on a screen.
 *
 * The unit is chosen for the magnitude, because a territory game spans four
 * orders of it: a small block is a few thousand square metres, a good long run
 * encloses a couple of square kilometres, and "0.004 km²" tells a player
 * nothing they can feel.
 */
export declare function formatArea(squareMetres: number, options?: FormatAreaOptions): string;
/** Metres as something to put on a screen. */
export declare function formatDistance(metres: number, options?: FormatAreaOptions): string;
/** Mean Earth radius in metres, as WGS 84 defines it. */
export declare const EARTH_RADIUS: 6371008.8;
export declare interface FormatAreaOptions {
  units?: 'metric' | 'imperial'
  locale?: string
}
export type Position = [number, number] | number[];
export type Ring = Position[];
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];
