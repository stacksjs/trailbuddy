// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export declare function earcut(vertices: ArrayLike<number>, holes?: number[], dim?: number): number[];
// Compute the deviation between the polygon area and the total area of the
// produced triangulation. `0` means a perfect triangulation; small positive
// numbers indicate rounding error or degenerate geometry.
export declare function deviation(data: ArrayLike<number>, holes: number[] | undefined, dim: number, triangles: number[]): number;
// Flatten a GeoJSON-style polygon (array of rings, each an array of points
// with `x`/`y`) into the flat buffers earcut consumes. Accepts the legacy
// `[x, y][][]` encoding as well. Hole indices are start-of-ring offsets
// expressed in vertex counts (not coordinate counts).
export declare function flatten(data: number[][][] | Array<Array<{ x: number, y: number }>>): {
  vertices: number[]
  holes: number[]
  dimensions: number
};
