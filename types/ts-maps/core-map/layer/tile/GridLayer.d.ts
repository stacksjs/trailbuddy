import { Bounds } from '../../geometry/Bounds';
import { LatLngBounds } from '../../geo/LatLngBounds';
import { Layer } from '../Layer';
import { Point } from '../../geometry/Point';
declare interface TileEntry {
  el: HTMLElement
  coords: Point & { z: number }
  current: boolean
  loaded?: number
  active?: boolean
  retain?: boolean
}
declare interface Level {
  el: HTMLElement
  origin: Point
  zoom: number
}
// Generic class for handling a tiled grid of HTML elements.
export declare class GridLayer extends Layer {
  _container?: HTMLElement;
  _levels: Record<string | number, Level>;
  _tiles: Record<string, TileEntry>;
  _level?: Level;
  _tileZoom?: number;
  _fadeFrame?: number;
  _pruneTimeout?: ReturnType<typeof setTimeout>;
  _noPrune?: boolean;
  _loading?: boolean;
  _globalTileRange?: Bounds;
  _wrapX?: [number, number] | false;
  _wrapY?: [number, number] | false;
  _tileSize?: Point;
  _onMove?: (...args: any[]) => void;
  _abortLoading?(): void;
  initialize(options?: any): void;
  onAdd(_map?: any): void;
  beforeAdd(map: any): void;
  onRemove(map: any): void;
  bringToFront(): this;
  bringToBack(): this;
  getContainer(): HTMLElement | undefined;
  setOpacity(opacity: number): this;
  setZIndex(zIndex: number): this;
  isLoading(): boolean | undefined;
  redraw(): this;
  getEvents(): Record<string, any>;
  createTile(_coords?: any, _done?: any): HTMLElement;
  getTileSize(): Point;
  _updateZIndex(): void;
  _setAutoZIndex(compare: (a: number, b: number) => number): void;
  _updateOpacity(): void;
  _onOpaqueTile(_tile?: TileEntry): void;
  _initContainer(): void;
  _updateLevels(): Level | undefined;
  _onUpdateLevel(_z: number): void;
  _onRemoveLevel(_z: number): void;
  _onCreateLevel(_level: Level): void;
  _pruneTiles(): void;
  _removeTilesAtZoom(zoom: number): void;
  _removeAllTiles(): void;
  _invalidateAll(): void;
  _retainParent(x: number, y: number, z: number, minZoom: number): boolean;
  _retainChildren(x: number, y: number, z: number, maxZoom: number): void;
  _resetView(e?: any): void;
  _animateZoom(e: any): void;
  _clampZoom(zoom: number): number;
  _setView(center: any, zoom: number, noPrune?: boolean, noUpdate?: boolean): void;
  _setZoomTransforms(center: any, zoom: number): void;
  _setZoomTransform(level: Level, center: any, zoom: number): void;
  _resetGrid(): void;
  _onMoveEnd(): void;
  _getTiledPixelBounds(center: any): Bounds;
  _update(center?: any): void;
  _isValidTile(coords: Point & { z: number }): boolean;
  _keyToBounds(key: string): LatLngBounds;
  _tileCoordsToNwSe(coords: Point & { z: number }): [any, any];
  _tileCoordsToBounds(coords: Point & { z: number }): LatLngBounds;
  _tileCoordsToKey(coords: Point & { z: number }): string;
  _keyToTileCoords(key: string): Point & { z: number };
  _removeTile(key: string): void;
  _initTile(tile: HTMLElement): void;
  _addTile(coords: Point & { z: number }, container: DocumentFragment): void;
  _tileReady(coords: Point & { z: number }, err?: any, tile?: HTMLElement): void;
  _getTilePos(coords: Point & { z: number }): Point;
  _wrapCoords(coords: Point & { z: number }): Point & { z: number };
  _pxBoundsToTileRange(bounds: Bounds): Bounds;
  _noTilesToLoad(): boolean;
}
