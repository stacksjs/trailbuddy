// CollisionIndex — sparse spatial hash for symbol placement.
//
// Boxes are bucketed into every cell they overlap; `tryInsert` rejects when a
// colliding neighbour has priority >= the new box's.
//
// The grid is sparse and unbounded rather than a fixed cols×rows array, which
// is what lets one index span the whole viewport instead of a single tile.
// A per-tile index cannot see across a tile seam, so two halves of the same
// street name, or two towns either side of an edge, would each place happily
// and then overlap on screen. Callers now insert in world-pixel coordinates
// and share one index across every tile at a zoom level.
//
// Because tiles are drawn, discarded on pan, and drawn again, every box may
// carry an `owner` — the tile that placed it. `removeOwner` drops that tile's
// boxes before it redraws, so a tile never collides with the ghosts of its own
// previous placement.
export declare interface CollisionBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  priority?: number
  owner?: string
}
export declare interface CollisionIndexOptions {
  cellSize?: number
  width?: number
  height?: number
}
export declare class CollisionIndex {
  constructor(opts?: CollisionIndexOptions);
  hits(box: CollisionBox): boolean;
  tryInsert(box: CollisionBox): boolean;
  insert(box: CollisionBox): void;
  removeOwner(owner: string): void;
  clear(): void;
  get size(): number;
}
