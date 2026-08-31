import { Animation } from '../dom/Animation';
import { Bounds } from '../geometry/Bounds';
import { Evented } from '../core/Events';
import { LatLng } from '../geo/LatLng';
import { LatLngBounds } from '../geo/LatLngBounds';
import { Point } from '../geometry/Point';
import { PosAnimation } from '../dom/PosAnimation';
import { Style } from './Style';
import { TerrainSource } from '../geo/TerrainSource';
import { WebGLTileRenderer } from '../renderer/webgl/WebGLTileRenderer';
import type { EasingFunction } from '../dom/Animation';
import type { LayerSpecification, SourceSpecification, Style as StyleSpec } from '../style-spec/types';
import type { OfflineRegionOptions, OfflineRegionResult } from '../storage/index';
export declare function createMap(id: string | HTMLElement, options?: MapOptions): TsMap;
export declare const Map: typeof TsMap;
export declare interface MapOptions {
  crs?: any
  center?: any
  zoom?: number
  minZoom?: number
  maxZoom?: number
  layers?: any[]
  maxBounds?: any
  renderer?: any
  zoomAnimation?: boolean
  zoomAnimationThreshold?: number
  fadeAnimation?: boolean
  markerZoomAnimation?: boolean
  transform3DLimit?: number
  bearing?: number
  pitch?: number
  maxPitch?: number
  minPitch?: number
  zoomSnap?: number
  theme?: 'light' | 'dark' | 'auto'
  style?: any
  zoomDelta?: number
  trackResize?: boolean
  [key: string]: any
}
// Atmospheric fog settings. Applied by the WebGL renderer when present;
// ignored by the Canvas2D path. Mirrors the property naming used by Mapbox
// GL JS (`map.setFog(...)`) so existing muscle-memory transfers.
export declare interface FogOptions {
  color?: string
  'horizon-blend'?: number
  range?: [number, number]
  'high-color'?: string
  'star-intensity'?: number
}
// Sky-layer settings. Same WebGL-only caveat as FogOptions.
export declare interface SkyOptions {
  'sky-color'?: string
  'horizon-color'?: string
  'fog-ground-blend'?: number
  'sun-position'?: [number, number]
  'sun-intensity'?: number
}
// Pluggable 3D layer contract. A `CustomLayerInterface` object can be handed
// to `map.addCustomLayer(...)`; the renderer will call `render()` each frame
// alongside the tile-layer draw calls with the current GL context and
// projection matrix. `onAdd` / `onRemove` bracket the layer's lifetime and
// are invoked only when a GL context is available.
export declare interface CustomLayerInterface {
  id: string
  type: 'custom'
  renderingMode?: '2d' | '3d'
  onAdd?: (map: TsMap, gl: WebGL2RenderingContext) => void
  onRemove?: (map: TsMap, gl: WebGL2RenderingContext) => void
  render: (gl: WebGL2RenderingContext, projectionMatrix: Float32Array) => void
}
// Terrain (3D DEM mesh warping) settings. The map keeps an in-memory
// `TerrainSource` populated from a raster-dem source; the WebGL renderer
// consumes it to build per-tile warped ground meshes. The API shape mirrors
// Mapbox GL JS's `setTerrain()` — `source` names a raster-dem source (added
// via `addSource()`), `exaggeration` scales vertical relief.
export declare interface TerrainOptions {
  source: string
  exaggeration?: number
}
// The central class of the API — used to create a map on a page and manipulate it.
export declare class TsMap extends Evented {
  static _pointerEvents: string[];
  options: MapOptions;
  _handlers: any[];
  _layers: Record<number, any>;
  _zoomBoundLayers: Record<number, any>;
  _sizeChanged: boolean;
  _bearing: number;
  _pitch: number;
  _container: HTMLElement & { _tsmap_id?: number };
  _containerId?: number;
  _geoJSONSources?: Record<string, {
    index: any
    layer: any
    clustered: boolean
    /** A `heatmap` style layer over this source, fed the same data. */
    heatmap?: any
    /** The property a simple `["get", k]` weight reads, if that is what it is. */
    heatmapWeightKey?: string
  }>;
  _styleLoadToken?: number;
  _spriteToken?: number;
  _glyphSource?: any;
  _theme?: 'light' | 'dark' | 'auto';
  _themeQuery?: MediaQueryList;
  _themeQueryListener?: (event: MediaQueryListEvent) => void;
  _loaded?: boolean;
  _zoom: number;
  _lastCenter?: LatLng | null;
  _pixelOrigin?: Point;
  _mapPane: HTMLElement;
  _panes: Record<string, HTMLElement>;
  _paneRenderers: Record<string, any>;
  _targets: Record<number, any>;
  _fadeAnimated?: boolean;
  _zoomAnimated?: boolean;
  _animatingZoom?: boolean;
  _animateToCenter?: LatLng;
  _animateToZoom?: number;
  _tempFireZoomEvent?: boolean;
  _panAnim?: PosAnimation;
  _camAnim?: Animation;
  _flyToFrame?: number;
  _resizeRequest?: number | null;
  _sizeTimer?: ReturnType<typeof setTimeout>;
  _transitionEndTimer?: ReturnType<typeof setTimeout>;
  _resizeObserver?: ResizeObserver;
  _proxy?: HTMLElement;
  _size?: Point;
  _locateOptions?: any;
  _locationWatchId?: number;
  _layersMinZoom?: number;
  _layersMaxZoom?: number;
  _enforcingBounds?: boolean;
  _initControlPos?: () => void;
  _clearControlPos?: () => void;
  _addLayers?: (layers?: any | any[]) => void;
  _renderer?: any;
  dragging?: any;
  boxZoom?: any;
  touchZoom?: any;
  pinchZoom?: any;
  doubleClickZoom?: any;
  scrollWheelZoom?: any;
  keyboard?: any;
  tapHold?: any;
  touchRotate?: any;
  touchPitch?: any;
  _popup?: any;
  _style?: Style;
  _featureState?: globalThis.Map<string, Record<string, unknown>>;
  _layerHandlers?: globalThis.Map<string, Array<{
    layerId: string
    listener: (e: any) => void
    wrapped: (e: any) => void
    context?: any
  }>>;
  _fog?: FogOptions | null;
  _sky?: SkyOptions | null;
  _customLayers?: globalThis.Map<string, CustomLayerInterface>;
  _terrain?: TerrainOptions | null;
  _terrainSource?: TerrainSource;
  _atmosphereOverlay?: HTMLElement;
  _terrainFetchInFlight?: Map<string, Promise<void>>;
  _terrainOverlayCanvas?: HTMLCanvasElement;
  _terrainOverlayRenderer?: WebGLTileRenderer;
  _offlineApi?: {
    save: (opts: OfflineRegionOptions) => Promise<OfflineRegionResult>
    size: () => Promise<{ bytes: number, entries: number }>
    clear: () => Promise<void>
  };
  initialize(id: string | HTMLElement, options?: MapOptions): void;
  setView(center: any, zoom?: number, options?: any): this;
  setZoom(zoom: number, options?: any): this;
  zoomIn(delta?: number, options?: any): this;
  zoomOut(delta?: number, options?: any): this;
  setZoomAround(latlng: any, zoom: number, options?: any): this;
  _getBoundsCenterZoom(bounds: any, options?: any): { center: LatLng, zoom: number };
  fitBounds(bounds: any, options?: any): this;
  fitWorld(options?: any): this;
  panTo(center: any, options?: any): this;
  panBy(offset: any, options?: any): this;
  flyTo(targetCenter: any, targetZoom?: number, options?: any): this;
  flyToBounds(bounds: any, options?: any): this;
  setMaxBounds(bounds: any): this;
  setMinZoom(zoom: number): this;
  setMaxZoom(zoom: number): this;
  panInsideBounds(bounds: any, options?: any): this;
  panInside(latlng: any, options?: any): this;
  invalidateSize(options?: any): this;
  stop(): this;
  locate(options?: any): this;
  stopLocate(): this;
  _handleGeolocationError(error: any): void;
  _handleGeolocationResponse(pos: GeolocationPosition): void;
  addHandler(name: string, HandlerClass: any): this;
  remove(): this;
  createPane(name?: string, container?: HTMLElement | null): HTMLElement;
  getCenter(): LatLng;
  getZoom(): number;
  getBearing(): number;
  setBearing(bearing: number): this;
  rotateTo(bearing: number, options?: { animate?: boolean, duration?: number, easing?: EasingFunction }): this;
  getPitch(): number;
  setPitch(pitch: number): this;
  pitchTo(pitch: number, options?: { animate?: boolean, duration?: number, easing?: EasingFunction }): this;
  _clampPitch(pitch: number): number;
  easeTo(options?: {
    center?: any
    zoom?: number
    bearing?: number
    pitch?: number
    duration?: number
    easing?: EasingFunction
    padding?: any
    noMoveStart?: boolean
  }): this;
  isEasing(): boolean;
  getCamera(): { center: LatLng, zoom: number, bearing: number, pitch: number };
  jumpTo(options?: {
    center?: any
    zoom?: number
    bearing?: number
    pitch?: number
  }): this;
  _getCamAnim(): Animation;
  static _lerpBearing(from: number, to: number, t: number): number;
  getBounds(): LatLngBounds;
  getMinZoom(): number;
  getMaxZoom(): number;
  getBoundsZoom(bounds: any, inside?: boolean, padding?: any): number;
  getSize(): Point;
  getPixelBounds(center?: any, zoom?: number): Bounds;
  getPixelOrigin(): Point;
  getPixelWorldBounds(zoom?: number): Bounds;
  getPane(pane: string | HTMLElement): HTMLElement;
  getPanes(): Record<string, HTMLElement>;
  getContainer(): HTMLElement;
  getZoomScale(toZoom: number, fromZoom?: number): number;
  getScaleZoom(scale: number, fromZoom?: number): number;
  project(latlng: any, zoom?: number): Point;
  unproject(point: any, zoom?: number): LatLng;
  layerPointToLatLng(point: any): LatLng;
  latLngToLayerPoint(latlng: any): Point;
  wrapLatLng(latlng: any): LatLng;
  wrapLatLngBounds(bounds: any): LatLngBounds;
  distance(latlng1: any, latlng2: any): number;
  containerPointToLayerPoint(point: any): Point;
  layerPointToContainerPoint(point: any): Point;
  containerPointToLatLng(point: any): LatLng;
  latLngToContainerPoint(latlng: any): Point;
  pointerEventToContainerPoint(e: any): Point;
  pointerEventToLayerPoint(e: any): Point;
  pointerEventToLatLng(e: any): LatLng;
  _initContainer(id: string | HTMLElement): void;
  _initLayout(): void;
  _initPanes(): void;
  _resetView(center: LatLng, zoom: number, noMoveStart?: boolean): void;
  _moveStart(zoomChanged: boolean, noMoveStart?: boolean): this;
  _move(center: LatLng, zoom?: number, data?: any, suppressEvent?: boolean): this;
  _moveEnd(zoomChanged: boolean): this;
  _stop(): this;
  _rawPanBy(offset: Point): void;
  _getZoomSpan(): number;
  _panInsideMaxBounds(): void;
  _checkIfLoaded(): void;
  _initEvents(remove?: boolean): void;
  _onResize(): void;
  _onScroll(): void;
  _onMoveEnd(): void;
  _findEventTargets(e: any, type: string): any[];
  _isClickDisabled(el: any): boolean | undefined;
  _handleDOMEvent(e: any): void;
  _fireDOMEvent(e: any, type: string, canvasTargets?: any[]): void;
  _draggableMoved(obj: any): boolean;
  _clearHandlers(): void;
  whenReady(callback: (e?: any) => void, context?: any): this;
  _getMapPanePos(): Point;
  _rotatePoint(p: Point, angle: number, origin: Point): Point;
  _applyCameraTransform(): void;
  _pitchPoint(p: Point): Point;
  _unpitchPoint(p: Point): Point;
  _moved(): boolean;
  _getTopLeftPoint(center?: any, zoom?: number): Point;
  _getNewPixelOrigin(center: any, zoom?: number): Point;
  _latLngToNewLayerPoint(latlng: any, zoom: number, center: any): Point;
  _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: any): Bounds;
  _getCenterLayerPoint(): Point;
  _getCenterOffset(latlng: any): Point;
  _limitCenter(center: LatLng, zoom: number, bounds?: LatLngBounds | null): LatLng;
  _limitOffset(offset: Point, bounds?: LatLngBounds | null): Point;
  _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom?: number): Point;
  _rebound(left: number, right: number): number;
  _limitZoom(zoom: number): number;
  _onPanTransitionStep(): void;
  _onPanTransitionEnd(): void;
  _tryAnimatedPan(center: any, options?: any): boolean;
  _createAnimProxy(): void;
  _animateProxyZoom(e: any): void;
  _animMoveEnd(): void;
  _destroyAnimProxy(): void;
  _catchTransitionEnd(e: any): void;
  _nothingToAnimate(): boolean;
  _tryAnimatedZoom(center: any, zoom: number, options?: any): boolean;
  _animateZoom(center: LatLng, zoom: number, startAnim?: boolean, noUpdate?: boolean): void;
  _onZoomTransitionEnd(): void;
  setStyle(style: StyleSpec | string, opts?: { diff?: boolean, validate?: boolean }): this;
  _syncStyleBackground(): void;
  _styleBackgroundColor(): string | undefined;
  _initGlyphSource(): void;
  getGlyphSource(): any;
  isFontAvailable(textFont: string | string[] | undefined): boolean;
  _loadSprite(): void;
  getStyle(): StyleSpec | undefined;
  isStyleLoaded(): boolean;
  addSource(sourceId: string, source: SourceSpecification): this;
  getSource(sourceId: string): SourceSpecification | undefined;
  removeSource(sourceId: string): this;
  _makeSourceLayer(sourceId: string, source: SourceSpecification): unknown;
  setSourceData(sourceId: string, data: unknown): this;
  addStyleLayer(layer: LayerSpecification, before?: string): this;
  removeStyleLayer(id: string): this;
  getStyleLayer(id: string): LayerSpecification | undefined;
  setPaintProperty(layerId: string, name: string, value: unknown): this;
  setLayoutProperty(layerId: string, name: string, value: unknown): this;
  setFilter(layerId: string, filter: unknown): this;
  _syncStyleLayer(layerId: string): void;
  on(type: any, a?: any, b?: any, c?: any): this;
  off(type?: any, a?: any, b?: any, c?: any): this;
  once(type: any, a?: any, b?: any, c?: any): this;
  queryRenderedFeatures(pointOrOpts?: any, maybeOpts?: any): any[];
  querySourceFeatures(sourceId: string, opts?: { sourceLayer?: string, filter?: unknown }): any[];
  _featureStateKey(lookup: { source: string, sourceLayer?: string, id: number | string }): string;
  _ensureFeatureStateMap(): globalThis.Map<string, Record<string, unknown>>;
  _repaintSource(sourceId: string): void;
  setFeatureState(lookup: { source: string, sourceLayer?: string, id: number | string }, state: Record<string, unknown>): this;
  getFeatureState(lookup: { source: string, sourceLayer?: string, id: number | string }): Record<string, unknown>;
  removeFeatureState(lookup: { source: string, sourceLayer?: string, id: number | string }, key?: string): this;
  _installFeatureStateLookup(sourceId: string, host: any): void;
  _applyStyleCommand(cmd: any): void;
  setFog(fog: FogOptions | null): this;
  getFog(): FogOptions | null;
  setSky(sky: SkyOptions | null): this;
  getSky(): SkyOptions | null;
  setTerrain(terrain: TerrainOptions | null): this;
  _ensureTerrainOverlay(): void;
  _destroyTerrainOverlay(): void;
  _renderTerrainOverlay(): void;
  getTerrain(): TerrainOptions | null;
  getTerrainSource(): TerrainSource | undefined;
  setRenderer(name: 'canvas2d' | 'webgl' | 'svg'): this;
  setTheme(theme: 'light' | 'dark' | 'auto'): this;
  getTheme(): 'light' | 'dark' | 'auto';
  _applyTheme(dark: boolean): void;
  _detachThemeQuery(): void;
  setProjection(projection: 'mercator' | 'globe'): this;
  getProjection(): 'mercator' | 'globe';
  getPreferredRenderer(): 'canvas2d' | 'webgl' | 'svg';
  queryTerrainElevation(lngLat: LatLng | { lng: number, lat: number }): number | null;
  toCanvas(): HTMLCanvasElement;
  toDataURL(type?: string, quality?: number): string;
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
  _requestExportFrame(): void;
  _isGlobeProjection(): boolean;
  _globeAtmosphereMix(): number;
  _updateAtmosphereOverlay(): void;
  _getCustomLayerGL(): WebGL2RenderingContext | null;
  addCustomLayer(layer: CustomLayerInterface): this;
  addTerrainTile(coord: { z: number, x: number, y: number }, pixels: Uint8Array | Uint8ClampedArray): void;
  _drawTerrainForTile(glRenderer: WebGLTileRenderer, coord: { z: number, x: number, y: number }, tileSize: number, projectionMatrix: Float32Array): void;
  _maybeFetchTerrainTile(coord: { z: number, x: number, y: number }): void;
  _wireTerrainCameraHooks(): void;
  _invokeCustomLayerRender(gl: WebGL2RenderingContext, projectionMatrix: Float32Array): void;
  removeCustomLayer(id: string): this;
  getCustomLayer(id: string): CustomLayerInterface | undefined;
  getCustomLayers(): CustomLayerInterface[];
  get offline(): {
    save: (opts: OfflineRegionOptions) => Promise<OfflineRegionResult>
    size: () => Promise<{ bytes: number, entries: number }>
    clear: () => Promise<void>
  };
}
