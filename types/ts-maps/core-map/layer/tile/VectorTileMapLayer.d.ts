import { CollisionIndex } from '../../symbols/CollisionIndex';
import { GlyphAtlas } from '../../symbols/GlyphAtlas';
import { GridLayer } from './GridLayer';
import { IconAtlas } from '../../symbols/IconAtlas';
import { RTree } from '../../geometry/RTree';
import { SymbolOverlay } from '../../symbols/SymbolOverlay';
import { TileCache } from '../../storage/index';
import { WebGLTileRenderer } from '../../renderer/webgl/WebGLTileRenderer';
import { WorkerPool } from '../../workers/WorkerPool';
import type { BBox } from '../../geometry/RTree';
import type { CompiledExpression } from '../../style-spec/expressions/index';
import type { DecodedFeature, DecodedTile } from '../../mvt/DecodedTile';
import type { GlyphProvider } from '../../symbols/GlyphProvider';
import type { Point } from '../../geometry/Point';
/** Drop the shared pool. Tests, and teardown in long-lived hosts. */
export declare function shutdownDecodePool(): Promise<void>;
// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export declare interface VectorTileMapLayerOptions {
  url?: string
  localSource?: { getTile: (z: number, x: number, y: number) => any | null }
  zoomOffset?: number
  subdomains?: string | string[]
  minZoom?: number
  maxZoom?: number
  maxNativeZoom?: number
  minNativeZoom?: number
  sourceMaxZoom?: number
  workers?: boolean | number
  tileSize?: number
  attribution?: string
  pane?: string
  className?: string
  crossOrigin?: boolean | string
  layers?: VectorTileStyleLayer[]
  sources?: Record<string, unknown>
  glyphAtlas?: GlyphAtlas
  iconAtlas?: IconAtlas
  offlineCache?: TileCache | boolean
  renderer?: 'canvas2d' | 'webgl'
}
export declare interface VectorTileStyleLayer {
  id: string
  type: 'fill' | 'fill-extrusion' | 'line' | 'circle' | 'symbol'
  sourceLayer: string
  minzoom?: number
  maxzoom?: number
  filter?: unknown
  paint?: VectorTilePaintProperties
  layout?: VectorTileLayoutProperties
  _compiledFilter?: CompiledExpression | false | null
}
export declare interface VectorTilePaintProperties {
  'fill-color'?: string
  'fill-opacity'?: number
  'fill-outline-color'?: string
  'line-color'?: string
  'line-width'?: number
  'line-opacity'?: number
  'line-dasharray'?: number[] | unknown
  'line-cap'?: 'butt' | 'round' | 'square'
  'line-join'?: 'miter' | 'round' | 'bevel'
  'line-gradient'?: unknown
  'circle-color'?: string
  'circle-radius'?: number
  'circle-opacity'?: number
  'circle-stroke-color'?: string
  'circle-stroke-width'?: number
  'fill-extrusion-color'?: string
  'fill-extrusion-opacity'?: number
  'fill-extrusion-height'?: number | unknown
  'fill-extrusion-base'?: number | unknown
  'text-color'?: string
  'text-halo-color'?: string
  'text-halo-width'?: number
  'icon-opacity'?: number
  'icon-color'?: string
  'icon-halo-color'?: string
  'icon-halo-width'?: number
}
export declare interface VectorTileLayoutProperties {
  visibility?: 'visible' | 'none'
  'text-field'?: string | unknown
  'text-size'?: number
  'text-font'?: string | string[]
  'text-italic'?: boolean
  'text-bold'?: boolean
  'icon-image'?: string | unknown
  'icon-size'?: number
  'icon-rotate'?: number
  'symbol-placement'?: 'point' | 'line' | 'line-center'
  'symbol-spacing'?: number
  'symbol-sort-key'?: unknown
  'symbol-priority'?: number
  'text-allow-overlap'?: unknown
  'icon-allow-overlap'?: unknown
  'text-ignore-placement'?: unknown
  'icon-ignore-placement'?: unknown
  'text-anchor'?: unknown
  'text-offset'?: unknown
  'text-rotate'?: unknown
  'text-max-angle'?: unknown
}
export declare interface QueryRenderedFeature {
  feature: DecodedFeature
  layer: VectorTileStyleLayer
  tile: { x: number, y: number, z: number }
}
export declare interface QueryRenderedFeaturesOptions {
  point?: [number, number] | Point
  bbox?: [[number, number], [number, number]]
  layers?: string[]
}
export declare interface QuerySourceFeature {
  feature: DecodedFeature
  sourceLayer: string
  tile: { x: number, y: number, z: number }
}
// Each R-tree entry holds enough info to recover the originating feature
// cheaply during the precise-geometry pass.
declare interface RTreeItem {
  featureIndex: number
  sourceLayerName: string
  bbox: BBox
}
// Internal bookkeeping: alongside each Canvas we track the decoded tile so
// `queryRenderedFeatures` can re-project hit-tests to tile-local coords.
declare interface DecodedTileEntry {
  sourceKey?: string
  sourcePending?: boolean
  canvas: HTMLCanvasElement
  tile: DecodedTile | null
  coords: { x: number, y: number, z: number }
  abort: AbortController
  index: RTree<RTreeItem> | null
  gl: WebGLTileRenderer | null
}
/** Extent coordinates to where they currently are on screen. */
declare type ProjectPoint = (x: number, y: number) => { x: number, y: number } | null;
export declare class VectorTileMapLayer extends GridLayer {
  _styleLayers: VectorTileStyleLayer[];
  _decodedTiles: Map<HTMLCanvasElement, DecodedTileEntry>;
  _workersUsable: boolean;
  _glyphs?: { source: unknown, provider: GlyphProvider };
  _sourceCache: Map<string, { tile: DecodedTile, index: RTree<RTreeItem>, refs: number }>;
  _sourcePending: Map<string, { promise: Promise<{ tile: DecodedTile, index: RTree<RTreeItem> }>, refs: number, abort: AbortController }>;
  _symbolOverlay?: SymbolOverlay;
  _symbolHandlers?: Record<string, () => void>;
  _featureStateLookup?: (src: string, srcLayer: string, id: number | string) => Record<string, unknown>;
  _sourceId?: string;
  _glyphAtlas?: GlyphAtlas;
  _iconAtlas?: IconAtlas;
  _offlineCache?: TileCache;
  _webglFallbackWarned?: boolean;
  initialize(options?: VectorTileMapLayerOptions): void;
  getGlyphAtlas(): GlyphAtlas;
  getIconAtlas(): IconAtlas;
  setFeatureStateLookup(fn: (src: string, srcLayer: string, id: number | string) => Record<string, unknown>): this;
  setSourceId(id: string): this;
  _repaintDecodedTiles(): void;
  setStyleLayers(layers: VectorTileStyleLayer[]): this;
  updateStyleLayers(layers: VectorTileStyleLayer[]): this;
  getStyleLayer(id: string): VectorTileStyleLayer | undefined;
  queryRenderedFeatures(opts?: QueryRenderedFeaturesOptions): QueryRenderedFeature[];
  queryRenderedFeatures(point: Point, opts?: QueryRenderedFeaturesOptions): QueryRenderedFeature[];
  queryRenderedFeatures(pointOrOpts?: Point | QueryRenderedFeaturesOptions, maybeOpts?: QueryRenderedFeaturesOptions): QueryRenderedFeature[];
  querySourceFeatures(opts?: { sourceLayer?: string, filter?: unknown }): QuerySourceFeature[];
  _pixelRatio(): number;
  createTile(coords: Point & { z: number }, done: (err: any, tile: HTMLElement) => void): HTMLElement;
  onAdd(map: any): void;
  onRemove(map: any): void;
  _removeTile(key: string): void;
  getTileUrl(coords: Point & { z: number }): string;
  _subTile(coords: { x: number, y: number, z: number }): { x: number, y: number, z: number, f: number, sx: number, sy: number };
  _getZoomForUrl(z: number): number;
  _initSymbolOverlay(): void;
  _destroySymbolOverlay(): void;
  _refreshSymbols(): void;
  _projectTilePoint(coords: { x: number, y: number, z: number }, localX: number, localY: number): { x: number, y: number } | null;
  _drawSymbols(ctx: CanvasRenderingContext2D, collision: CollisionIndex): void;
  _drawLocalTile(source: { getTile: (z: number, x: number, y: number) => any | null }, canvas: HTMLCanvasElement, entry: DecodedTileEntry, coords: Point & { z: number }, done: (err: any, tile: HTMLElement) => void): void;
  _glyphProvider(): GlyphProvider | undefined;
  _abortLoading(): void;
  _sourceKey(coords: { x: number, y: number, z: number }): string;
  _acquireSource(key: string, url: string, entry: DecodedTileEntry): Promise<{ tile: DecodedTile, index: RTree<RTreeItem> }>;
  _decode(bytes: Uint8Array): Promise<DecodedTile>;
  _workerPool(): WorkerPool | null;
  _releaseSource(entry: DecodedTileEntry): void;
  _fetchAndDraw(url: string, canvas: HTMLCanvasElement, entry: DecodedTileEntry, coords: Point & { z: number }, done: (err: any, tile: HTMLElement) => void): Promise<void>;
  _fetchTileBytes(url: string, entry: DecodedTileEntry): Promise<Uint8Array>;
  _drawTile(canvas: HTMLCanvasElement, tile: DecodedTile, coords: Point & { z: number }): void;
}
