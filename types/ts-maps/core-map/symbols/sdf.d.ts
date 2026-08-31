/**
 * Colour one distance field.
 *
 * `field` is RGBA, of which only alpha is read. The result is RGBA the same
 * size, ready to hand to `putImageData`.
 */
export declare function renderSdfPixels(field: Uint8ClampedArray, width: number, height: number, options: SdfRenderOptions): Uint8ClampedArray;
/** Hermite interpolation between two edges, as in the GLSL builtin. */
export declare function smoothstep(edge0: number, edge1: number, x: number): number;
/**
 * A CSS colour as RGB.
 *
 * Hex and `rgb()`/`rgba()` cover what styles actually write and are parsed
 * directly. Anything else — a named colour, `hsl()` — goes through a canvas,
 * which knows every notation CSS does and saves shipping a colour parser to
 * handle the long tail.
 */
export declare function parseColor(color: string): [number, number, number];
// Resolving a signed-distance icon to pixels.
//
// An SDF sprite stores distance from the shape's edge in its alpha channel
// rather than the icon's own colours, encoded so that 0.5 is the edge itself.
// Two things follow from that, and they are the reason the format is worth
// supporting: one grey shape can be drawn in any colour a style asks for, and
// the edge is recovered by thresholding rather than resampled from pixels, so
// it stays sharp however far the icon is scaled up.
//
// The work is kept here, apart from `IconAtlas`, because it is arithmetic over
// a buffer and nothing more. The atlas reads pixels out of a canvas and writes
// them back; that part needs a browser. This part can be tested against
// hand-built fields, which is where the behaviour worth checking actually
// lives.
export declare interface SdfRenderOptions {
  color: string
  haloColor?: string
  haloWidth?: number
}
