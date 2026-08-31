// Elliptical Mercator projection (EPSG:3395).
export declare const Mercator: MercatorProjection;
declare interface MercatorProjection extends ProjectionLike {
  R: number
  R_MINOR: number
}
