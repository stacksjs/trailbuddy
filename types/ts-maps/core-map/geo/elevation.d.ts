export declare function decodeMapboxRGB(r: number, g: number, b: number): number;
export declare function decodeTerrariumRGB(r: number, g: number, b: number): number;
export declare function getElevationDecoder(encoding: DEMEncoding): (r: number, g: number, b: number) => number;
/**
 * Decode an entire RGBA pixel buffer into a flat `Float32Array` of elevation
 * samples in metres. The caller controls the encoding.
 */
export declare function decodeElevationGrid(pixels: Uint8Array | Uint8ClampedArray, encoding?: DEMEncoding): Float32Array;
/**
 * Bilinearly sample a square elevation grid at the fractional pixel
 * coordinate `(u, v)`, where `(0, 0)` is the top-left pixel centre and
 * `(size - 1, size - 1)` is the bottom-right. Out-of-range inputs clamp
 * to the border (no extrapolation).
 */
export declare function sampleElevationBilinear(elev: Float32Array, size: number, u: number, v: number): number;
// Helpers for reading elevation out of RGB-encoded DEM tiles. Shared
// between the hillshade-producing `RasterDEMLayer` and the 3D terrain
// pipeline, which samples per-vertex heights to warp a ground mesh.
//
// Two encodings are supported out of the box:
//   - 'mapbox'    — Mapbox Terrain-RGB / Maxar (elevation = -10000 + (r*65536 + g*256 + b) * 0.1)
//   - 'terrarium' — Mapzen / AWS Terrarium (elevation = (r*256 + g + b/256) - 32768)
export type DEMEncoding = 'mapbox' | 'terrarium';
