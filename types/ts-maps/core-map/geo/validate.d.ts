import type { MultiPolygon, Ring } from './polygonClip';
/**
 * Check a ring is something that can be claimed.
 *
 * Throws rather than returning a flag, because every caller's correct response
 * to unusable geometry is to stop, and a boolean invites carrying on.
 */
export declare function validateRing(ring: Ring): void;
/**
 * Make a ring's longitudes continuous.
 *
 * A run crossing the antimeridian is recorded as longitudes that jump from
 * 179.99 to -179.99, and every consumer of that ring — area, the clipper,
 * anything measuring an edge — reads the jump as a segment spanning the globe.
 * Carrying the winding forward instead produces longitudes outside the usual
 * range but geometry that means what the runner did.
 *
 * A ring not near the antimeridian is returned untouched, so this costs a scan
 * and nothing else in the overwhelmingly common case.
 */
export declare function unwrapRing(ring: Ring): Ring;
/**
 * Split a self-crossing ring into the simple loops it is made of.
 *
 * Walking the ring and cutting it at each crossing is what separates a figure
 * of eight into its two lobes. The crossing point is computed once and used as
 * a vertex of both loops, which is the reason to do it this way rather than by
 * unioning the shape with itself: the sweep would compute that point twice,
 * from two different pairs of segments, and at GPS precision the two answers
 * differ in the last bits — enough for a lobe to be dropped.
 */
export declare function splitSelfIntersecting(ring: Ring): Ring[];
/**
 * Resolve a ring that crosses itself into polygons that do not.
 *
 * A figure of eight has a signed area of nearly zero — its lobes have opposite
 * winding and cancel — so measuring it directly says the runner enclosed
 * nothing. Both lobes were run around, so both should count.
 */
export declare function resolveSelfIntersections(ring: Ring): MultiPolygon;
/** Does any pair of non-adjacent segments in this ring cross? */
export declare function selfIntersects(ring: Ring): boolean;
/**
 * Everything above, in the order a claim needs it.
 *
 * Validate, then unwrap, then resolve — each step assumes the previous one has
 * run, and repairing geometry that has not been checked is how a NaN ends up
 * inside a polygon instead of inside an error message.
 */
export declare function prepareClaim(ring: Ring): MultiPolygon;
/** Thrown for geometry that cannot be repaired into a claim. */
export declare class InvalidGeometryError extends Error {
  constructor(message: string);
}
