import type { IconAtlas } from './IconAtlas';
/** `base` → `base@2x.png`, keeping any query string where it belongs. */
export declare function spriteUrl(base: string, extension: 'json' | 'png', pixelRatio: number): string;
/**
 * Fetch the index and sheet for a sprite base URL.
 *
 * Falls back from `@2x` to 1x when the high-density sheet is missing, so a
 * style that only publishes one density still works on a retina screen.
 */
export declare function loadSprite(base: string, options?: LoadSpriteOptions): Promise<LoadedSprite>;
/**
 * Push a loaded sprite's icons into an atlas.
 *
 * Entries carry their own `pixelRatio` in Mapbox's format; where one is
 * missing the sheet's density stands in, so a `@2x` sheet does not render at
 * double size.
 *
 * `prefix` namespaces the ids, for the multi-sheet form of `sprite`.
 */
export declare function addSpriteToAtlas(atlas: IconAtlas, sprite: LoadedSprite, prefix?: string): number;
/**
 * Load a style's sprite sheet.
 *
 * A style document points at a sprite with a base URL and no extension —
 * `"sprite": "https://example.com/sprites/basic"` — from which two files are
 * derived: a JSON index of named icons and a PNG holding their pixels. Until
 * now `IconAtlas` required the caller to supply both by hand, which meant
 * `icon-image` did nothing for any real-world style.
 *
 * Retina sheets follow the `@2x` convention. The higher-density sheet is
 * preferred where the display can use it and quietly skipped where it cannot
 * be fetched, because a style is not obliged to publish one.
 */
/** The shape of an entry in a sprite JSON index. */
export declare interface SpriteIndexEntry {
  x: number
  y: number
  width: number
  height: number
  pixelRatio?: number
  sdf?: boolean
  content?: [number, number, number, number]
  stretchX?: Array<[number, number]>
  stretchY?: Array<[number, number]>
}
export declare interface LoadSpriteOptions {
  pixelRatio?: number
  signal?: AbortSignal
  fetch?: typeof globalThis.fetch
  loadImage?: (url: string) => Promise<CanvasImageSource & { width: number, height: number }>
}
export declare interface LoadedSprite {
  index: SpriteIndex
  image: CanvasImageSource & { width: number, height: number }
  pixelRatio: number
}
export type SpriteIndex = Record<string, SpriteIndexEntry>;
