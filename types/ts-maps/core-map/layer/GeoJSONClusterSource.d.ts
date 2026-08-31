// GeoJSON clustering source — an in-house, zero-dependency TypeScript port of
// the classic supercluster algorithm (https://github.com/mapbox/supercluster,
// BSD-3-Clause). The implementation is independent; credit to the upstream
// project for the original approach.
//
// The algorithm pre-projects each input point to a unit-square web-mercator
// coordinate, indexes it in a static KD-tree, and iteratively collapses
// neighbouring points into clusters at each integer zoom. Query time is
// O(log N) per bbox via the KD-tree.
// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export declare interface ClusterOptions {
  radius?: number
  maxZoom?: number
  minZoom?: number
  minPoints?: number
  extent?: number
  nodeSize?: number
  log?: boolean
  reduce?: (acc: Record<string, unknown>, props: Record<string, unknown>) => void
  map?: (props: Record<string, unknown>) => Record<string, unknown>
}
export declare interface ClusterPoint {
  type: 'Feature'
  geometry: { type: 'Point', coordinates: [number, number] }
  properties: Record<string, unknown>
  id?: number
}
// ---------------------------------------------------------------------------
// KDBush — a static 2-D spatial index tuned for sort-once / query-many.
// ---------------------------------------------------------------------------
export declare class KDBush {
  readonly nodeSize: number;
  readonly points: Float64Array;
  readonly ids: Uint32Array;
  constructor(numItems: number, nodeSize?: number);
  add(x: number, y: number): number;
  finish(): this;
  range(minX: number, minY: number, maxX: number, maxY: number): number[];
  within(qx: number, qy: number, r: number): number[];
}
// ---------------------------------------------------------------------------
// GeoJSONClusterSource
// ---------------------------------------------------------------------------
export declare class GeoJSONClusterSource {
  constructor(opts?: ClusterOptions);
  load(features: ClusterPoint[]): this;
  getClusters(bbox: [number, number, number, number], zoom: number): ClusterPoint[];
  getChildren(clusterId: number): ClusterPoint[];
  getLeaves(clusterId: number, limit?: number, offset?: number): ClusterPoint[];
  getClusterExpansionZoom(clusterId: number): number;
  getTile(z: number, x: number, y: number): { features: ClusterPoint[] } | null;
}
