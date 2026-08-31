import type { TileCache } from './TileCache';
export declare function computeTileCoords(bounds: Bounds, zoomRange: readonly [number, number]): TileCoord[];
export declare function saveOfflineRegion(options: OfflineRegionOptions, emitter?: ProgressEmitter): Promise<OfflineRegionResult>;
export declare interface TileCoord {
  x: number
  y: number
  z: number
}
export declare interface ProgressEmitter {
  fire: (type: string, data?: Record<string, unknown>) => unknown
}
export declare interface OfflineRegionOptions {
  bounds: Bounds
  zoomRange: readonly [number, number]
  tileUrl: string
  cache?: TileCache
  concurrency?: number
  signal?: AbortSignal
}
export declare interface OfflineRegionResult {
  saved: number
  failed: number
  skipped: number
}
export type Bounds = | { west: number, south: number, east: number, north: number }
  | readonly [west: number, south: number, east: number, north: number];
