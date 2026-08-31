/** Every ArrayBuffer in a decoded tile, for a `postMessage` transfer list. */
export declare function flatTileBuffers(tile: FlatTile): ArrayBuffer[];
/**
 * Decode a `.pbf` tile into flat arrays.
 *
 * Self-contained by construction — see the note at the top of the file.
 */
export declare function decodeMvtFlat(bytes: Uint8Array): FlatTile;
// decodeMvtFlat — an MVT decoder that answers in typed arrays.
//
// This is deliberately a second decoder rather than a reuse of `Pbf` +
// `VectorTile`, for two reasons.
//
// **It has to survive being turned into a string.** WorkerPool ships its
// handlers by stringifying them into an inline worker, so anything a handler
// reaches for through an import is simply not there when it runs. This
// function closes over nothing at all — no imports, no module constants, no
// sibling helpers — which is a property the file is written to preserve, not
// an accident. Adding an import here breaks decoding in the worker while
// leaving every main-thread test passing, so don't.
//
// **It decodes to a different shape.** The output is flat typed arrays whose
// buffers are transferred to the main thread rather than copied. That is the
// entire point of the exercise: a tile decoded into `{x, y}` objects is
// hundreds of thousands of allocations that structured-clone must then walk
// and rebuild, which costs more than the decode it was meant to save. Moving
// work to a worker only helps when what crosses the boundary is cheap.
//
// Geometry stays lazy on the far side. The layout below is the tile's own —
// shared key and value tables, features as indices into them — so the main
// thread materialises a feature's points and properties when something asks
// for them, exactly as the Pbf path does.
//
// `test/mvt-flat.test.ts` decodes the same fixtures both ways and asserts the
// results match, which is what keeps the duplication honest.
export declare interface FlatLayer {
  name: string
  version: number
  extent: number
  keys: string[]
  values: Array<string | number | boolean | null>
  ids: Float64Array
  types: Uint8Array
  tagStart: Uint32Array
  tags: Uint32Array
  ringStart: Uint32Array
  ringOffset: Uint32Array
  coords: Int32Array
}
export declare interface FlatTile {
  layers: FlatLayer[]
}
