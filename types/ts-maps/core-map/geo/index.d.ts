import * as Projection from './projection/index';
export type { LatLngLike, LatLngTuple } from './LatLng';
export type { LatLngBoundsLike } from './LatLngBounds';
export type { DEMEncoding } from './elevation';
export type { TerrainMesh, TerrainMeshOptions } from './terrainMesh';
export type { TerrainSourceOptions, TileCoord } from './TerrainSource';
export type { FormatAreaOptions } from './area';
// Renamed on the way out: `Polygon` and `Position` are already taken at the
// package root by the vector layer and the screen-space point, and a game's
// coordinate arrays are not either of those.
export type {
  MultiPolygon as MultiPolygonCoordinates,
  Polygon as PolygonCoordinates,
  Position as LngLat,
  Ring as LinearRing,
} from './area';
export { LatLng, toLatLng } from './LatLng';
export { LatLngBounds, toLatLngBounds } from './LatLngBounds';
export { decodeElevationGrid, decodeMapboxRGB, decodeTerrariumRGB, getElevationDecoder, sampleElevationBilinear } from './elevation';
export { buildTerrainMesh } from './terrainMesh';
export { TerrainSource } from './TerrainSource';
export { Projection };
export * from './crs/index';
export {
  EARTH_RADIUS,
  formatArea,
  formatDistance,
  haversine,
  multiPolygonArea,
  polygonArea,
  ringArea,
  ringPerimeter,
} from './area';
export { contains, difference, intersects, intersection, union, xor } from './polygonClip';
export {
  InvalidGeometryError,
  prepareClaim,
  resolveSelfIntersections,
  selfIntersects,
  splitSelfIntersecting,
  unwrapRing,
  validateRing,
} from './validate';
