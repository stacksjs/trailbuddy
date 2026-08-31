import { Point } from '../geometry/Point';
import type { Pbf } from '../proto/Pbf';
/**
 * Project tile-local rings to WGS84 and wrap them as a GeoJSON feature.
 *
 * Shared rather than duplicated: tiles decoded in a worker arrive as flat
 * typed arrays and are wrapped by `FlatTile`, which has the same job to do
 * here and must produce byte-identical output.
 */
export declare function geometryToGeoJSON(type: number, rings: Point[][], extent: number, x: number, y: number, z: number, properties: VectorTileProperties, id?: number): GeoJSONFeature;
// MVT GeomType enum values (tile.proto).
export declare const MVT_GEOM_UNKNOWN: number;
export declare const MVT_GEOM_POINT: number;
export declare const MVT_GEOM_LINESTRING: number;
export declare const MVT_GEOM_POLYGON: number;
// Human-readable name table indexed by MVT GeomType enum value.
export declare const GEOM_TYPE_NAMES: GeomType[];
// GeoJSON output types (structural; we don't depend on @types/geojson to stay dep-free).
export declare interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}
export declare interface GeoJSONMultiPoint {
  type: 'MultiPoint'
  coordinates: [number, number][]
}
export declare interface GeoJSONLineString {
  type: 'LineString'
  coordinates: [number, number][]
}
export declare interface GeoJSONMultiLineString {
  type: 'MultiLineString'
  coordinates: [number, number][][]
}
export declare interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]
}
export declare interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: [number, number][][][]
}
export declare interface GeoJSONFeature {
  type: 'Feature'
  id?: number
  geometry: GeoJSONGeometry
  properties: VectorTileProperties
}
export type GeomType = 'Unknown' | 'Point' | 'LineString' | 'Polygon';
export type VectorTileValue = string | number | boolean | null;
export type VectorTileProperties = Record<string, VectorTileValue>;
export type GeoJSONGeometry = | GeoJSONPoint
  | GeoJSONMultiPoint
  | GeoJSONLineString
  | GeoJSONMultiLineString
  | GeoJSONPolygon
  | GeoJSONMultiPolygon;
export declare class VectorTileFeature {
  id?: number;
  type: 1 | 2 | 3;
  extent: number;
  properties: VectorTileProperties;
  constructor(pbf: Pbf, end: number, extent: number, keys: string[], values: VectorTileValue[]);
  loadGeometry(): Point[][];
  bbox(): [number, number, number, number];
  toGeoJSON(x: number, y: number, z: number): GeoJSONFeature;
}
