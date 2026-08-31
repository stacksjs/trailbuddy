/**
 * Where the text box's top-left corner goes, relative to the anchor point.
 *
 * `text-anchor` names the part of the label that touches the anchor, so
 * `'left'` puts the label's left edge on the point and the text runs to the
 * right — the opposite of what the name suggests at first glance.
 */
export declare function anchorOffset(anchor: TextAnchor, width: number, height: number): Vec;
/** Normalise `text-offset` (ems, [x, y]) into pixels at a given text size. */
export declare function offsetPixels(offset: unknown, textSize: number): Vec;
/**
 * The axis-aligned box covering a rectangle rotated about a point.
 *
 * Collision uses axis-aligned boxes, so a rotated label needs the bounds of
 * its rotated corners rather than its unrotated ones — otherwise a label at
 * 45° reserves a box far smaller than the ink it actually lays down.
 */
export declare function rotatedBounds(x: number, y: number, width: number, height: number, angle: number, originX?: number, originY?: number): { minX: number, minY: number, maxX: number, maxY: number };
/** Total length of a polyline. */
export declare function lineLength(line: Vec[]): number;
/** The point and tangent angle at a distance along a polyline, or null past its end. */
export declare function pointAtDistance(line: Vec[], distance: number): (Vec & { angle: number }) | null;
/**
 * Lay glyphs along a line, one per advance, each rotated to the local tangent.
 *
 * Returns null when the label does not fit, or bends past `maxAngle` — both
 * are "don't draw this here" answers, and the caller is expected to try the
 * next candidate position rather than force it.
 */
export declare function placeGlyphsAlongLine(line: Vec[], options: LinePlacementOptions): PlacedGlyph[] | null;
/**
 * Distances along a line at which to attempt a repeated label.
 *
 * A long road gets its name several times rather than once in the middle,
 * which is what makes a street findable when only part of it is on screen.
 */
export declare function repeatDistances(length: number, labelWidth: number, spacing: number): number[];
export declare interface Vec {
  x: number
  y: number
}
export declare interface PlacedGlyph {
  x: number
  y: number
  angle: number
  index: number
}
export declare interface LinePlacementOptions {
  advances: number[]
  start: number
  maxAngle?: number
  keepUpright?: boolean
}
// Symbol placement geometry.
//
// Pure functions, deliberately: placement is the part of label rendering most
// worth testing, and it is untestable if it only exists inside a canvas draw
// call. Everything here works in whatever pixel space the caller hands it.
export type TextAnchor = | 'center'
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';
