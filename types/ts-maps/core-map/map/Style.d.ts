import type { LayerSpecification, Style as StyleSpec } from '../style-spec/types';
export declare interface StyleOptions {
  validate?: boolean
}
// In-memory representation of a live style document. Pure data + mutation
// helpers; hosting and rendering are the map's job to avoid a circular
// dependency between Map.ts and the concrete layer classes.
export declare class Style {
  spec: StyleSpec;
  sourceLayers: Map<string, unknown>;
  layerSpecs: Map<string, LayerSpecification>;
  constructor(spec: StyleSpec, opts?: StyleOptions);
  setPaintProperty(layerId: string, name: string, value: unknown): void;
  setLayoutProperty(layerId: string, name: string, value: unknown): void;
  setFilter(layerId: string, filter: unknown): void;
  setLayerZoomRange(layerId: string, minzoom?: number, maxzoom?: number): void;
  serialize(): StyleSpec;
  toVectorStyleLayer(layer: LayerSpecification): {
    id: string
    type: 'fill' | 'line' | 'circle' | 'symbol'
    sourceLayer: string
    minzoom?: number
    maxzoom?: number
    filter?: unknown
    paint: Record<string, unknown>
    layout: Record<string, unknown>
  };
  _cloneSpec(spec: StyleSpec): StyleSpec;
}
