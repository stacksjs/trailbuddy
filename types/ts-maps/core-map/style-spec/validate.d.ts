import type { LayerType, SourceSpecification } from './types';
export declare function validatePaintProperty(layerType: LayerType, name: string, value: unknown): ValidationError[];
export declare function validateLayoutProperty(layerType: LayerType, name: string, value: unknown): ValidationError[];
// ---------- source validation ----------
export declare function validateSource(source: unknown, id?: string): ValidationError[];
// ---------- layer validation ----------
export declare function validateLayer(layer: unknown, sources?: Record<string, SourceSpecification>): ValidationError[];
// ---------- root style validation ----------
export declare function validateStyle(style: unknown): ValidationError[];
export declare interface ValidationError {
  message: string
  line?: number
  path?: string[]
}
