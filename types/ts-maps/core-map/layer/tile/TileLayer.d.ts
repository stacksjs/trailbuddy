import { GridLayer } from './GridLayer';
import { TileCache } from '../../storage/index';
import type { Point } from '../../geometry/Point';
export declare class TileLayer extends GridLayer {
  _url: string;
  _offlineCache?: TileCache;
  _activeBlobUrls: Set<string>;
  initialize(url: string, options?: any): void;
  setUrl(url: string, noRedraw?: boolean): this;
  createTile(coords: Point & { z: number }, done: (err: any, tile: HTMLElement) => void): HTMLElement;
  _resolveThroughCache(tile: HTMLImageElement, url: string): void;
  getTileUrl(coords: Point & { z: number }): string;
  _tileOnLoad(done: (err: any, tile: HTMLElement) => void, tile: HTMLElement): void;
  _tileOnError(done: (err: any, tile: HTMLElement) => void, tile: HTMLImageElement, e: any): void;
  _onTileRemove(e: any): void;
  _getZoomForUrl(): number;
  _getSubdomain(tilePoint: Point): string;
  _abortLoading(): void;
  _removeTile(key: string): void;
  _tileReady(coords: any, err?: any, tile?: HTMLElement): void;
  _clampZoom(zoom: number): number;
}
