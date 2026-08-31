import { decodeMapboxRGB, decodeTerrariumRGB } from '../../geo/elevation';
import { TileLayer } from './TileLayer';
import type { DEMEncoding } from '../../geo/elevation';
import type { Point } from '../../geometry/Point';
// Re-exports preserve the historical `RasterDEMLayer` surface. New code
// should import these directly from `core-map/geo/elevation`.
export type { DEMEncoding };
/**
 * Mapbox-style alias: the `hillshade` style-spec layer type resolves to
 * this class. Exposed so callers who speak the style spec can write
 * `new HillshadeLayer(url, { encoding, exaggeration, shadowColor, accentColor })`
 * without having to know it's the same runtime as `raster-dem`.
 */
export declare const HillshadeLayer: typeof RasterDEMLayer;
export declare interface RasterDEMLayerOptions {
  url: string
  subdomains?: string | string[]
  encoding?: DEMEncoding
  tileSize?: number
  minZoom?: number
  maxZoom?: number
  minNativeZoom?: number
  maxNativeZoom?: number
  className?: string
  zIndex?: number
  exaggeration?: number
  azimuth?: number
  altitude?: number
  accentColor?: string
  shadowColor?: string
  opacity?: number
  attribution?: string
  pane?: string
  crossOrigin?: boolean | string
}
export type HillshadeLayerOptions = RasterDEMLayerOptions;
// Fetches RGB-encoded terrain tiles and shades them with a simple
// Lambertian light model. Decoding and shading both run on the main
// thread for now; the worker path is a future optimisation.
//
// This class backs both the raster-dem source type and the `hillshade`
// style-spec layer type — `HillshadeLayer` below is an alias that
// matches Mapbox GL JS's naming.
export declare class RasterDEMLayer extends TileLayer {
  _encoding: DEMEncoding;
  initialize(url: string, options?: RasterDEMLayerOptions): void;
  createTile(coords: Point & { z: number }, done: (err: any, tile: HTMLElement) => void): HTMLElement;
  _shadeInto(img: HTMLImageElement, out: HTMLCanvasElement): void;
}
export { decodeMapboxRGB, decodeTerrariumRGB };
