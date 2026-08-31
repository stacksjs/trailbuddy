import { GlyphBitmapCache } from './GlyphRenderer';
import type { Glyph, GlyphSource } from './loadGlyphs';
/**
 * A font stack as the server names it.
 *
 * Glyph URLs take a comma-separated stack — `"Noto Sans Regular,Arial Unicode
 * MS Regular"` — which is also a serviceable cache key.
 */
export declare function stackKey(fontStack: string | string[] | undefined): string;
export declare interface GlyphProviderOptions {
  source: GlyphSource
  isFontAvailable: (fontStack: string | string[] | undefined) => boolean
  onLoad: () => void
}
export declare class GlyphProvider {
  cache: GlyphBitmapCache;
  constructor(options: GlyphProviderOptions);
  needsServer(fontStack: string | string[] | undefined): boolean;
  glyphs(fontStack: string | string[] | undefined, text: string): Glyph[] | null;
  invalidate(): void;
}
