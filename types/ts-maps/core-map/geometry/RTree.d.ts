export declare interface RTreeNode<T> {
  bbox: BBox
  children?: Array<RTreeNode<T>>
  leaf?: boolean
  data?: T
}
export declare interface RTreeEntry<T> {
  bbox: BBox
  data: T
}
// Zero-dep R-tree with incremental insertion, bulk-loading (STR), removal, and
// bbox/point search. Inspired by the public-domain algorithms popularized by
// rbush (MIT) — this implementation is written fresh in TypeScript and does
// not reuse any of its code.
//
// The tree stores axis-aligned bounding boxes associated with arbitrary data.
// Non-leaf nodes keep a union bbox over their children; leaf nodes hold the
// user-provided `data`. Keeping the separation explicit (via `leaf: true`)
// lets us walk the tree without instanceof checks and keeps the structure
// compatible with `isolatedDeclarations`.
export type BBox = [minX: number, minY: number, maxX: number, maxY: number];
// ---------------------------------------------------------------------------
// R-tree
// ---------------------------------------------------------------------------
export declare class RTree<T> {
  constructor(opts?: { maxEntries?: number, minEntries?: number });
  size(): number;
  clear(): this;
  insert(bbox: BBox, data: T): this;
  remove(bbox: BBox, data: T, equalsFn?: (a: T, b: T) => boolean): this;
  search(bbox: BBox): Array<RTreeEntry<T>>;
  searchPoint(x: number, y: number): Array<RTreeEntry<T>>;
  all(): Array<RTreeEntry<T>>;
  load(items: Array<RTreeEntry<T>>): this;
}
