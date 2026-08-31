import type { Glyph, GlyphRange } from './loadGlyphs';
/**
 * Look glyphs up for a run of text.
 *
 * Returns `null` if any character's range has not been loaded, because a label
 * drawn with holes in it is worse than a label that appears a moment later.
 * The caller's job on `null` is to request the ranges and redraw.
 */
export declare function glyphsFor(range: (codePoint: number) => Glyph | undefined, text: string): Glyph[] | null;
/** Measure a run laid out from server glyphs. */
export declare function measureGlyphs(glyphs: Glyph[], size: number): GlyphTextMetrics;
/**
 * Draw a run of server glyphs with `x` at its left edge and `y` on its
 * baseline — the same contract as the canvas text path, so a caller does not
 * have to know which one it got.
 */
export declare function drawGlyphs(ctx: CanvasRenderingContext2D, glyphs: Glyph[], x: number, y: number, options: GlyphDrawOptions, cache?: GlyphBitmapCache): void;
/** Colour one glyph's field into a bitmap ready to blit. */
export declare function renderGlyphBitmap(glyph: Glyph, options: GlyphDrawOptions): HTMLCanvasElement | null;
/** A `GlyphRange` as the lookup `glyphsFor` wants. */
export declare function rangeLookup(ranges: GlyphRange[]): (codePoint: number) => Glyph | undefined;
/** The em size Mapbox's glyph generator rasterises at. */
export declare const GLYPH_EM: 24;
export declare interface GlyphDrawOptions {
  size: number
  color: string
  haloColor?: string
  haloWidth?: number
}
export declare interface GlyphTextMetrics {
  width: number
  height: number
  ascent: number
  descent: number
}
/**
 * Coloured glyph bitmaps, keyed by glyph and appearance.
 *
 * A label is redrawn on every pan and zoom, and the same few hundred glyphs
 * recur across every tile on screen; colouring each field per frame would be
 * the most expensive thing the renderer does.
 */
export declare class GlyphBitmapCache {
  constructor(limit?: number);
  get(glyph: Glyph, options: GlyphDrawOptions): HTMLCanvasElement | null;
  clear(): void;
  get size(): number;
}
