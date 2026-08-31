import { type DEMEncoding } from './elevation';
export declare interface TerrainSourceOptions {
  demSize?: number
  encoding?: DEMEncoding
  meshResolution?: number
  exaggeration?: number
}
export declare interface TileCoord {
  z: number
  x: number
  y: number
}
/**
 * Stores decoded DEM tiles keyed on `"z/x/y"` and serves elevation
 * queries. Thread-safe with respect to async add/remove — the underlying
 * Map is the only mutable state.
 */
export declare class TerrainSource {
  _tiles: Map<string, Float32Array>;
  _opts: Required<TerrainSourceOptions>;
  constructor(opts?: TerrainSourceOptions);
  get demSize(): number;
  get encoding(): DEMEncoding;
  get meshResolution(): number;
  get exaggeration(): number;
  setExaggeration(v: number): void;
  addTilePixels(coord: TileCoord, pixels: Uint8Array | Uint8ClampedArray): void;
  addTileElevation(coord: TileCoord, elevation: Float32Array): void;
  hasTile(coord: TileCoord): boolean;
  getTile(coord: TileCoord): Float32Array | undefined;
  deleteTile(coord: TileCoord): void;
  clear(): void;
  size(): number;
  queryElevation(lng: number, lat: number, preferredZoom: number): number | null;
}
