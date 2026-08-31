import type { LayerType } from './types';
/**
 * ---------- paint ----------
 * @defaultValue
 * ```ts
 * {
 *   'background-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'background-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'background-pattern': { type: 'resolvedImage', transition: true, sdk: 'gl' }
 * }
 * ```
 */
declare const backgroundPaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'fill-antialias': { type: 'boolean', default: true, sdk: 'gl' },
 *   'fill-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'fill-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'fill-outline-color': { type: 'color', transition: true, sdk: 'gl' },
 *   'fill-pattern': { type: 'resolvedImage', transition: true, sdk: 'gl' },
 *   'fill-translate': { type: 'array', length: 2, default: [0, 0], transition: true, sdk: 'gl' },
 *   'fill-translate-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' }
 * }
 * ```
 */
declare const fillPaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'fill-extrusion-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'fill-extrusion-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'fill-extrusion-translate': { type: 'array', length: 2, default: [0, 0], transition: true, sdk: 'gl' },
 *   'fill-extrusion-translate-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' },
 *   'fill-extrusion-pattern': { type: 'resolvedImage', transition: true, sdk: 'gl' },
 *   'fill-extrusion-height': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'fill-extrusion-base': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'fill-extrusion-vertical-gradient': { type: 'boolean', default: true, sdk: 'gl' }
 * }
 * ```
 */
declare const fillExtrusionPaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'line-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'line-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'line-translate': { type: 'array', length: 2, default: [0, 0], transition: true, sdk: 'gl' },
 *   'line-translate-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' },
 *   'line-width': { type: 'number', default: 1, minimum: 0, transition: true, sdk: 'gl' },
 *   'line-gap-width': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'line-offset': { type: 'number', default: 0, transition: true, sdk: 'gl' },
 *   'line-blur': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'line-dasharray': { type: 'array', transition: true, sdk: 'gl' },
 *   'line-pattern': { type: 'resolvedImage', transition: true, sdk: 'gl' },
 *   'line-gradient': { type: 'color', sdk: 'gl' }
 * }
 * ```
 */
declare const linePaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'circle-radius': { type: 'number', default: 5, minimum: 0, transition: true, sdk: 'gl' },
 *   'circle-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'circle-blur': { type: 'number', default: 0, transition: true, sdk: 'gl' },
 *   'circle-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'circle-translate': { type: 'array', length: 2, default: [0, 0], transition: true, sdk: 'gl' },
 *   'circle-translate-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' },
 *   'circle-pitch-scale': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' },
 *   'circle-pitch-alignment': { type: 'enum', values: ['map', 'viewport'], default: 'viewport', sdk: 'gl' },
 *   'circle-stroke-width': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'circle-stroke-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'circle-stroke-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   }
 * }
 * ```
 */
declare const circlePaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'icon-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'icon-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'icon-halo-color': { type: 'color', default: 'rgba(0, 0, 0, 0)', transition: true, sdk: 'gl' },
 *   'icon-halo-width': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'icon-halo-blur': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'icon-translate': { type: 'array', length: 2, default: [0, 0], transition: true, sdk: 'gl' },
 *   'icon-translate-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' },
 *   'text-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'text-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'text-halo-color': { type: 'color', default: 'rgba(0, 0, 0, 0)', transition: true, sdk: 'gl' },
 *   'text-halo-width': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'text-halo-blur': { type: 'number', default: 0, minimum: 0, transition: true, sdk: 'gl' },
 *   'text-translate': { type: 'array', length: 2, default: [0, 0], transition: true, sdk: 'gl' },
 *   'text-translate-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'map', sdk: 'gl' }
 * }
 * ```
 */
declare const symbolPaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'raster-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'raster-hue-rotate': { type: 'number', default: 0, transition: true, sdk: 'gl' },
 *   'raster-brightness-min': {
 *     type: 'number',
 *     default: 0,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'raster-brightness-max': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'raster-saturation': {
 *     type: 'number',
 *     default: 0,
 *     minimum: -1,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'raster-contrast': {
 *     type: 'number',
 *     default: 0,
 *     minimum: -1,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'raster-resampling': { type: 'enum', values: ['linear', 'nearest'], default: 'linear', sdk: 'gl' },
 *   'raster-fade-duration': { type: 'number', default: 300, minimum: 0, sdk: 'gl' }
 * }
 * ```
 */
declare const rasterPaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'hillshade-illumination-direction': { type: 'number', default: 335, minimum: 0, maximum: 359, sdk: 'gl' },
 *   'hillshade-illumination-anchor': { type: 'enum', values: ['map', 'viewport'], default: 'viewport', sdk: 'gl' },
 *   'hillshade-exaggeration': {
 *     type: 'number',
 *     default: 0.5,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   },
 *   'hillshade-shadow-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' },
 *   'hillshade-highlight-color': { type: 'color', default: '#FFFFFF', transition: true, sdk: 'gl' },
 *   'hillshade-accent-color': { type: 'color', default: '#000000', transition: true, sdk: 'gl' }
 * }
 * ```
 */
declare const hillshadePaint: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'heatmap-radius': { type: 'number', default: 30, minimum: 1, transition: true, sdk: 'gl' },
 *   'heatmap-weight': { type: 'number', default: 1, minimum: 0, sdk: 'gl' },
 *   'heatmap-intensity': { type: 'number', default: 1, minimum: 0, transition: true, sdk: 'gl' },
 *   'heatmap-color': { type: 'color', sdk: 'gl' },
 *   'heatmap-opacity': {
 *     type: 'number',
 *     default: 1,
 *     minimum: 0,
 *     maximum: 1,
 *     transition: true,
 *     sdk: 'gl'
 *   }
 * }
 * ```
 */
declare const heatmapPaint: Record<string, PropertySchema>;
export declare const paintPropertySchemas: Record<LayerType, Record<string, PropertySchema>>;
// ---------- layout ----------
declare const visibility: PropertySchema;
declare const backgroundLayout: Record<string, PropertySchema>;
/** @defaultValue `{ 'fill-sort-key': { type: 'number', sdk: 'gl' } }` */
declare const fillLayout: Record<string, PropertySchema>;
declare const fillExtrusionLayout: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'line-cap': {
 *     type: 'enum',
 *     values: ['butt', 'round', 'square'],
 *     default: 'butt',
 *     sdk: 'gl'
 *   },
 *   'line-join': {
 *     type: 'enum',
 *     values: ['bevel', 'round', 'miter'],
 *     default: 'miter',
 *     sdk: 'gl'
 *   },
 *   'line-miter-limit': { type: 'number', default: 2, sdk: 'gl' },
 *   'line-round-limit': { type: 'number', default: 1.05, sdk: 'gl' },
 *   'line-sort-key': { type: 'number', sdk: 'gl' }
 * }
 * ```
 */
declare const lineLayout: Record<string, PropertySchema>;
/** @defaultValue `{ 'circle-sort-key': { type: 'number', sdk: 'gl' } }` */
declare const circleLayout: Record<string, PropertySchema>;
/**
 * @defaultValue
 * ```ts
 * {
 *   'symbol-placement': {
 *     type: 'enum',
 *     values: ['point', 'line', 'line-center'],
 *     default: 'point',
 *     sdk: 'gl'
 *   },
 *   'symbol-spacing': { type: 'number', default: 250, minimum: 1, sdk: 'gl' },
 *   'symbol-avoid-edges': { type: 'boolean', default: false, sdk: 'gl' },
 *   'symbol-sort-key': { type: 'number', sdk: 'gl' },
 *   'symbol-z-order': {
 *     type: 'enum',
 *     values: ['auto', 'viewport-y', 'source'],
 *     default: 'auto',
 *     sdk: 'gl'
 *   },
 *   'icon-allow-overlap': { type: 'boolean', default: false, sdk: 'gl' },
 *   'icon-ignore-placement': { type: 'boolean', default: false, sdk: 'gl' },
 *   'icon-optional': { type: 'boolean', default: false, sdk: 'gl' },
 *   'icon-rotation-alignment': {
 *     type: 'enum',
 *     values: ['map', 'viewport', 'auto'],
 *     default: 'auto',
 *     sdk: 'gl'
 *   },
 *   'icon-size': { type: 'number', default: 1, minimum: 0, sdk: 'gl' },
 *   'icon-text-fit': {
 *     type: 'enum',
 *     values: ['none', 'width', 'height', 'both'],
 *     default: 'none',
 *     sdk: 'gl'
 *   },
 *   'icon-text-fit-padding': { type: 'array', length: 4, default: [0, 0, 0, 0], sdk: 'gl' },
 *   'icon-image': { type: 'resolvedImage', sdk: 'gl' },
 *   'icon-rotate': { type: 'number', default: 0, sdk: 'gl' },
 *   'icon-padding': { type: 'padding', default: 2, sdk: 'gl' },
 *   'icon-keep-upright': { type: 'boolean', default: false, sdk: 'gl' },
 *   'icon-offset': { type: 'array', length: 2, default: [0, 0], sdk: 'gl' },
 *   'icon-anchor': {
 *     type: 'enum',
 *     values: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
 *     default: 'center',
 *     sdk: 'gl'
 *   },
 *   'icon-pitch-alignment': {
 *     type: 'enum',
 *     values: ['map', 'viewport', 'auto'],
 *     default: 'auto',
 *     sdk: 'gl'
 *   },
 *   'text-pitch-alignment': {
 *     type: 'enum',
 *     values: ['map', 'viewport', 'auto'],
 *     default: 'auto',
 *     sdk: 'gl'
 *   },
 *   'text-rotation-alignment': {
 *     type: 'enum',
 *     values: ['map', 'viewport', 'auto'],
 *     default: 'auto',
 *     sdk: 'gl'
 *   },
 *   'text-field': { type: 'formatted', default: '', sdk: 'gl' },
 *   'text-font': {
 *     type: 'array',
 *     default: ['Open Sans Regular', 'Arial Unicode MS Regular'],
 *     sdk: 'gl'
 *   },
 *   'text-size': { type: 'number', default: 16, minimum: 0, sdk: 'gl' },
 *   'text-max-width': { type: 'number', default: 10, minimum: 0, sdk: 'gl' },
 *   'text-line-height': { type: 'number', default: 1.2, sdk: 'gl' },
 *   'text-letter-spacing': { type: 'number', default: 0, sdk: 'gl' },
 *   'text-justify': {
 *     type: 'enum',
 *     values: ['auto', 'left', 'center', 'right'],
 *     default: 'center',
 *     sdk: 'gl'
 *   },
 *   'text-radial-offset': { type: 'number', default: 0, sdk: 'gl' },
 *   'text-variable-anchor': { type: 'array', sdk: 'gl' },
 *   'text-anchor': {
 *     type: 'enum',
 *     values: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
 *     default: 'center',
 *     sdk: 'gl'
 *   },
 *   'text-max-angle': { type: 'number', default: 45, sdk: 'gl' },
 *   'text-writing-mode': { type: 'array', sdk: 'gl' },
 *   'text-rotate': { type: 'number', default: 0, sdk: 'gl' },
 *   'text-padding': { type: 'number', default: 2, minimum: 0, sdk: 'gl' },
 *   'text-keep-upright': { type: 'boolean', default: true, sdk: 'gl' },
 *   'text-transform': {
 *     type: 'enum',
 *     values: ['none', 'uppercase', 'lowercase'],
 *     default: 'none',
 *     sdk: 'gl'
 *   },
 *   'text-offset': { type: 'array', length: 2, default: [0, 0], sdk: 'gl' },
 *   'text-allow-overlap': { type: 'boolean', default: false, sdk: 'gl' },
 *   'text-ignore-placement': { type: 'boolean', default: false, sdk: 'gl' },
 *   'text-optional': { type: 'boolean', default: false, sdk: 'gl' }
 * }
 * ```
 */
declare const symbolLayout: Record<string, PropertySchema>;
declare const rasterLayout: Record<string, PropertySchema>;
declare const hillshadeLayout: Record<string, PropertySchema>;
declare const heatmapLayout: Record<string, PropertySchema>;
export declare const layoutPropertySchemas: Record<LayerType, Record<string, PropertySchema>>;
// The set of known layer types — exported separately so the validator can
// decide whether an unknown layer `type` is user error vs. an SDK mismatch.
export declare const layerTypes: readonly LayerType[];
// Source types we currently recognise in the validator.
export declare const sourceTypes: readonly string[];
export declare interface PropertySchema {
  type: PropertySchemaType
  default?: unknown
  values?: readonly string[]
  minimum?: number
  maximum?: number
  length?: number
  transition?: boolean
  required?: boolean
  sdk?: 'gl' | 'maplibre' | 'ts-maps'
}
export type PropertySchemaType = | 'color'
  | 'number'
  | 'string'
  | 'boolean'
  | 'array'
  | 'enum'
  | 'padding'
  | 'formatted'
  | 'resolvedImage';
