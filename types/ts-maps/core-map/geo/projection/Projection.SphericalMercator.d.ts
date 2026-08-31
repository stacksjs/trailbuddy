// Spherical Mercator projection — the most common for online maps (EPSG:3857).
export declare const SphericalMercator: SphericalMercatorProjection;
declare interface SphericalMercatorProjection extends ProjectionLike {
  R: number
  MAX_LATITUDE: number
}
