import { LatLng } from '../LatLng';
import type { ProjectionLike } from './Projection.LonLat';
export declare const Globe: GlobeProjection;
/**
 * Globe projection — renders tiles on a sphere at low zoom, transitioning
 * to flat Mercator around zoom 5.5 to match the common convention.
 *
 * The 2D `project`/`unproject` pair returns the Mercator projection for
 * compatibility with the rest of the pipeline (tile loading, pixel math).
 * The sphere warp is a vertex-shader effect and lives in the renderer —
 * this module exposes the helpers that shader needs: projection to 3D
 * world coords on the unit sphere, and a `globeToMercatorMix(zoom)`
 * easing that selects how much to warp.
 *
 * Keep everything zero-dep and pure-math so it composes with the WebGL
 * renderer without having to import DOM types.
 */
export declare interface GlobeVec3 {
  x: number
  y: number
  z: number
}
export declare interface GlobeProjection extends ProjectionLike {
  R: number
  GLOBE_START_ZOOM: number
  GLOBE_END_ZOOM: number
  toSphere: (latlng: any) => GlobeVec3
  fromSphere: (v: GlobeVec3) => LatLng
  globeToMercatorMix: (zoom: number) => number
}
