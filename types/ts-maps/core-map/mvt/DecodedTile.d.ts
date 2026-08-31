import type { GeoJSONFeature, VectorTileProperties } from './VectorTileFeature';
import type { Point } from '../geometry/Point';
export declare interface DecodedFeature {
  id?: number
  type: 1 | 2 | 3
  extent: number
  properties: VectorTileProperties
  loadGeometry: () => Point[][]
  bbox: () => [number, number, number, number]
  toGeoJSON: (x: number, y: number, z: number) => GeoJSONFeature
}
export declare interface DecodedLayer {
  name?: string
  extent: number
  length: number
  feature: (i: number) => DecodedFeature
}
export declare interface DecodedTile {
  layers: Record<string, DecodedLayer>
}
