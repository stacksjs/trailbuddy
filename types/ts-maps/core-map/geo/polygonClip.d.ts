/** Everything covered by either. */
export declare function union(subject: MultiPolygon, clip: MultiPolygon): MultiPolygon;
/** Only what both cover. */
export declare function intersection(subject: MultiPolygon, clip: MultiPolygon): MultiPolygon;
/** What `subject` covers and `clip` does not — the shape of a territory steal. */
export declare function difference(subject: MultiPolygon, clip: MultiPolygon): MultiPolygon;
/** Covered by one but not both. */
export declare function xor(subject: MultiPolygon, clip: MultiPolygon): MultiPolygon;
/** Do these overlap at all? Cheaper than measuring the intersection. */
export declare function intersects(subject: MultiPolygon, clip: MultiPolygon): boolean;
/** Is a `[lng, lat]` position inside this multipolygon? */
export declare function contains(multi: MultiPolygon, point: Position): boolean;
declare const INTERSECTION: 0;
declare const UNION: 1;
declare const DIFFERENCE: 2;
declare const XOR: 3;
// Boolean operations on polygons: union, intersection, difference, xor.
//
// A territory game runs on these. Finishing a lap unions the new loop into
// whatever the player already held; running through a rival's ground subtracts
// it from theirs. Both operations happen constantly and on shapes that share
// edges — two territories that grew against each other are exactly coincident
// along the border between them — so the naive clippers are not an option.
// Greiner–Hormann, for instance, is short and readable and falls apart on the
// shared-edge case, which here is not an edge case but the normal one.
//
// This is the Martínez–Rueda–Feito sweep-line algorithm, which handles
// coincident edges, self-touching contours and holes as part of its design
// rather than as patches. The sweep is faithful to the paper. Assembling the
// output contours afterwards is done differently: rather than tracking
// exterior/interior depth inside the sweep, result edges are walked into rings
// and nesting is worked out by containment at the end. That is a slower step
// and a far easier one to reason about — and being able to reason about it
// matters when it decides who owns what.
export type Position = number[];
export type Ring = Position[];
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];
declare type Operation = typeof INTERSECTION | typeof UNION | typeof DIFFERENCE | typeof XOR;
declare class SweepEvent {
  point: Position;
  left: boolean;
  otherEvent: SweepEvent;
  isSubject: boolean;
  type: number;
  inOut: boolean;
  otherInOut: boolean;
  inResult: boolean;
  contourId: number;
  constructor(point: Position, left: boolean, otherEvent: SweepEvent | null, isSubject: boolean, type?: unknown);
  isBelow(p: Position): boolean;
  isAbove(p: Position): boolean;
  isVertical(): boolean;
}
/** A binary heap, so the queue can take the events division produces. */
declare class EventQueue {
  get length(): number;
  push(event: SweepEvent): void;
  pop(): SweepEvent | undefined;
}
/**
 * The sweep line status: segments currently crossed, ordered bottom to top.
 *
 * A sorted array rather than a balanced tree. Insertion is linear, which makes
 * the sweep quadratic in the worst case — acceptable here, where the shapes are
 * territories with hundreds of vertices rather than coastlines with millions,
 * and worth it for a structure whose behaviour is obvious when a result looks
 * wrong.
 */
declare class SweepStatus {
  insert(event: SweepEvent): number;
  remove(event: SweepEvent): void;
  indexOf(event: SweepEvent): number;
  at(index: number): SweepEvent | null;
}
