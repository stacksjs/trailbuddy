/**
 * Adapts a `GeoJSONClusterSource` to the same tile shape.
 *
 * The cluster source already answers per tile, but in GeoJSON coordinates — it
 * was built to feed markers, not a renderer. This projects its points into
 * tile-local extent space so clustered data can be painted by ordinary style
 * layers, with `point_count` available to expressions exactly as in Mapbox.
 */
export declare function clusterTileSource(cluster: { getTile: (z: number, x: number, y: number) => { features: Array<{ geometry: { coordinates: [number, number] }, properties: Record<string, unknown>, id?: number }> } | null }, layerName?: string): { getTile: (z: number, x: number, y: number) => { layers: Record<string, LocalLayer> } | null };
export declare interface GeoJSONTileSourceOptions {
  layerName?: string
  buffer?: number
  maxZoom?: number
}
declare interface IndexedFeature {
  type: 1 | 2 | 3
  id?: number | string
  properties: Record<string, unknown>
  rings: Ring[]
  bbox: [number, number, number, number]
}
declare type Ring = Array<{ x: number, y: number }>;
/** A decoded-tile-shaped feature, duck-typed to `VectorTileFeature`. */
declare class LocalFeature {
  type: 1 | 2 | 3;
  id?: number | string;
  properties: Record<string, unknown>;
  extent: number;
  _rings: Ring[];
  constructor(source: IndexedFeature, rings: Ring[]);
  loadGeometry(): Ring[];
  bbox(): [number, number, number, number];
}
declare class LocalLayer {
  name: string;
  extent: number;
  length: number;
  _features: LocalFeature[];
  constructor(name: string, features: LocalFeature[]);
  feature(index: number): LocalFeature;
}
export declare class GeoJSONTileSource {
  _features: IndexedFeature[];
  _layerName: string;
  _buffer: number;
  constructor(data?: unknown, options?: GeoJSONTileSourceOptions);
  setData(data: unknown): this;
  get length(): number;
  getTile(z: number, x: number, y: number): { layers: Record<string, LocalLayer> } | null;
}
