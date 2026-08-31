import type { Palette } from './palette';
import type { Style as StyleSpec } from '../style-spec/types';
/** The dark basemap. Pair it with `theme: 'dark'` so the chrome matches. */
export declare function dark(options: BasemapStyleOptions): StyleSpec;
/** The light basemap. The default `theme: 'light'` chrome already matches. */
export declare function light(options: BasemapStyleOptions): StyleSpec;
/**
 * Built-in basemap styles.
 *
 * These are functions rather than constants because ts-maps ships no tile
 * service: a style is only meaningful once it is pointed at a source. Call
 * `styles.dark({ tiles })` with a vector tile URL and you get a complete
 * StyleSpec; the palette, layer order and zoom ramps are the parts worth not
 * hand-writing.
 *
 * Layer names default to the OpenMapTiles schema, which is what the keyless
 * public services publish (OpenFreeMap, MapTiler, a self-hosted Tileserver
 * GL). A source using different names — Mapbox Streets, say — is accommodated
 * by `sourceLayers` rather than by forking the style.
 */
export declare interface BasemapStyleOptions {
  tiles: string | string[]
  mode?: 'vector' | 'raster'
  attribution?: string
  minzoom?: number
  maxzoom?: number
  tileSize?: number
  sourceLayers?: Partial<Record<SourceLayerKey, string>>
  palette?: Partial<Palette>
  name?: string
  glyphs?: string
  sprite?: string
}
export type SourceLayerKey = | 'water'
    | 'landcover'
    | 'landuse'
    | 'building'
    | 'transportation'
    | 'transportationName'
    | 'boundary'
    | 'place';
