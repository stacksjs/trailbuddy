/**
 * Async key-value store for tile bytes, with TTL + LRU pruning. The default
 * backend is in-memory; callers may inject their own (e.g. an IndexedDB-backed
 * one in browsers) via the `backend` option.
 */
export declare interface Tile {
  key: string
  data: Uint8Array
  mime: string
  bytes: number
  addedAt: number
}
export declare interface TileCacheBackend {
  get: (key: string) => Promise<Tile | undefined>
  put: (tile: Tile) => Promise<void>
  delete: (key: string) => Promise<void>
  clear: () => Promise<void>
  all: () => Promise<Tile[]>
  close?: () => void | Promise<void>
}
export declare interface TileCacheOptions {
  ttlMs?: number
  maxEntries?: number
  maxBytes?: number
  backend?: TileCacheBackend
}
export declare interface TileCacheSize {
  entries: number
  bytes: number
}
export declare class TileCache {
  constructor(options?: TileCacheOptions);
  get(key: string): Promise<Tile | undefined>;
  put(key: string, data: Uint8Array, mime: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<TileCacheSize>;
  prune(): Promise<void>;
  close(): Promise<void>;
}
