import { Point } from '../geometry/Point';
import type { FlatLayer, FlatTile as FlatTileData } from '../workers/decodeMvtFlat';
import type { GeoJSONFeature, VectorTileProperties } from './VectorTileFeature';
export declare class FlatTileFeature {
  id?: number;
  type: 1 | 2 | 3;
  extent: number;
  constructor(layer: FlatLayer, index: number);
  get properties(): VectorTileProperties;
  loadGeometry(): Point[][];
  bbox(): [number, number, number, number];
  toGeoJSON(x: number, y: number, z: number): GeoJSONFeature;
}
export declare class FlatTileLayer {
  name: string;
  version: number;
  extent: number;
  length: number;
  constructor(data: FlatLayer);
  feature(i: number): FlatTileFeature;
}
export declare class FlatTile {
  layers: Record<string, FlatTileLayer>;
  constructor(data: FlatTileData);
}
