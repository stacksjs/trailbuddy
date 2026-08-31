export type { CachedFetchOptions, CachedFetchResult } from './cachedFetch';
// `Bounds` and `TileCoord` are re-used names in geo/geometry barrels — keep
// them out of the storage re-export to avoid collisions in `core-map/index`.
export type {
  OfflineRegionOptions,
  OfflineRegionResult,
  ProgressEmitter,
} from './offlineRegion';
export type { Tile, TileCacheBackend, TileCacheOptions, TileCacheSize } from './TileCache';
export { cachedFetch } from './cachedFetch';
export { getDefaultCache, resetDefaultCache } from './defaultCache';
export { computeTileCoords, saveOfflineRegion } from './offlineRegion';
export { TileCache } from './TileCache';
