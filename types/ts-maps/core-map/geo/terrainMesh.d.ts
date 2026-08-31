/**
 * Builds a terrain mesh for a single DEM tile. Pure function — no DOM /
 * WebGL calls. Returns typed arrays ready to feed to
 * `WebGLTileRenderer.drawTerrain`.
 */
export declare function buildTerrainMesh(opts: TerrainMeshOptions): TerrainMesh;
export declare interface TerrainMeshOptions {
  elevation: Float32Array
  demSize: number
  tileSize?: number
  resolution?: number
  exaggeration?: number
  unitsPerMeter?: number
}
export declare interface TerrainMesh {
  positions: Float32Array
  indices: Uint32Array
  vertexCount: number
  indexCount: number
  resolution: number
}
