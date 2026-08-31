import type { TileCache } from './TileCache';
export declare function cachedFetch(url: string, options: CachedFetchOptions): Promise<CachedFetchResult>;
export declare interface CachedFetchOptions {
  cache: TileCache
  signal?: AbortSignal
  noStore?: boolean
  forceNetwork?: boolean
}
export declare interface CachedFetchResult {
  data: Uint8Array
  mime: string
  fromCache: boolean
}
