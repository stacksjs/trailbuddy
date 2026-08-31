/** Fill `{fontstack}` and `{range}` in a glyphs template. */
export declare function glyphUrl(template: string, fontstack: string, rangeStart: number): string;
/** The 256-codepoint block a character falls in. */
export declare function rangeStartFor(codePoint: number): number;
/** Decode one `glyphs.proto` message. */
export declare function decodeGlyphPbf(bytes: Uint8Array): GlyphRange;
/** The border Mapbox bakes around each glyph's distance field. */
export declare const GLYPH_BORDER: 3;
/**
 * Load a style's glyph ranges.
 *
 * A style points at glyphs with a template — `"glyphs":
 * "https://example.com/fonts/{fontstack}/{range}.pbf"` — serving signed
 * distance fields in 256-codepoint blocks. ts-maps rasterises text from system
 * fonts, which is sharper on a 2D canvas and needs no network at all, so this
 * is not how labels are drawn. What it is for is the case that cannot be
 * served locally: a style whose typeface the viewer does not have installed.
 *
 * Ranges are fetched on demand and cached, because a stack is 65,536 code
 * points and a map shows a handful of blocks.
 *
 * Wire format (Mapbox `glyphs.proto`):
 *   1 fontstack { 1 name, 2 range, 3 glyph { 1 id, 2 bitmap, 3 width,
 *                 4 height, 5 left, 6 top, 7 advance } }
 */
export declare interface Glyph {
  id: number
  bitmap?: Uint8Array
  width: number
  height: number
  left: number
  top: number
  advance: number
}
export declare interface LoadGlyphsOptions {
  signal?: AbortSignal
  fetch?: typeof globalThis.fetch
}
export type GlyphRange = Map<number, Glyph>;
/**
 * Fetches glyph ranges and remembers them.
 *
 * One instance per map. A range in flight is shared rather than fetched twice,
 * which matters when several tiles decode at once and all want the same block.
 */
export declare class GlyphSource {
  constructor(template: string, options?: LoadGlyphsOptions);
  get(fontstack: string, codePoint: number): Glyph | undefined;
  has(fontstack: string, codePoint: number): boolean;
  load(fontstack: string, codePoint: number, signal?: AbortSignal): Promise<GlyphRange>;
  loadForText(fontstack: string, text: string, signal?: AbortSignal): Promise<void>;
  get size(): number;
}
