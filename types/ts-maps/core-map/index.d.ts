import { AttributionControl, Control, FullscreenControl, GeocoderControl, LayersControl, LocateControl, NavigationControl, ScaleControl, ZoomControl } from './control/index';
import { Circle, CircleMarker, DivIcon, FeatureGroup, GeoJSON, GridLayer, HeatmapLayer, RasterDEMLayer, Icon, ImageOverlay, LayerGroup, Marker, Polygon, Polyline, Popup, Rectangle, SVGOverlay, TileLayer, Tooltip, VectorTileMapLayer, VideoOverlay, WMSTileLayer } from './layer/index';
import { TsMap } from './map/index';
import * as services from './services/index';
import * as styles from './styles/index';
export type { CircleOptions as WebGLCircleOptions, GLContextOptions, LineOptions as WebGLLineOptions, Mat4 } from './renderer/webgl/index';
/**
* ts - maps — a modern TypeScript interactive map library.
*
* Portions of this codebase were derived from the open - source Leaflet
* project (BSD - 2-Clause, © Vladimir Agafonkin and contributors). The
* module layout and public API shape follow its design. See CREDITS.md
* for details; all identifiers and classnames here are part of ts - maps.
*/
export declare const version: string;
export declare const map: Factory < ConstructorParameters < typeof TsMap>, TsMap>;
export declare const marker: Factory < ConstructorParameters < typeof Marker>, Marker>;
export declare const icon: Factory < ConstructorParameters < typeof Icon>, Icon>;
export declare const divIcon: Factory < ConstructorParameters < typeof DivIcon>, DivIcon>;
export declare const layerGroup: Factory < ConstructorParameters < typeof LayerGroup>, LayerGroup>;
export declare const featureGroup: Factory < ConstructorParameters < typeof FeatureGroup>, FeatureGroup>;
export declare const geoJSON: Factory < ConstructorParameters < typeof GeoJSON>, GeoJSON>;
export declare const geoJson: typeof geoJSON;
export declare const gridLayer: Factory < ConstructorParameters < typeof GridLayer>, GridLayer>;
export declare const tileLayer: Factory < ConstructorParameters < typeof TileLayer>, TileLayer> & { wms: Factory < ConstructorParameters < typeof WMSTileLayer>, WMSTileLayer> };
export declare const vectorTileLayer: Factory < ConstructorParameters < typeof VectorTileMapLayer>, VectorTileMapLayer>;
export declare const heatmapLayer: Factory < ConstructorParameters < typeof HeatmapLayer>, HeatmapLayer>;
export declare const rasterDEMLayer: Factory < ConstructorParameters < typeof RasterDEMLayer>, RasterDEMLayer>;
export declare const imageOverlay: Factory < ConstructorParameters < typeof ImageOverlay>, ImageOverlay>;
export declare const videoOverlay: Factory < ConstructorParameters < typeof VideoOverlay>, VideoOverlay>;
export declare const svgOverlay: Factory < ConstructorParameters < typeof SVGOverlay>, SVGOverlay>;
export declare const popup: Factory < ConstructorParameters < typeof Popup>, Popup>;
export declare const tooltip: Factory < ConstructorParameters < typeof Tooltip>, Tooltip>;
export declare const polyline: Factory < ConstructorParameters < typeof Polyline>, Polyline>;
export declare const polygon: Factory < ConstructorParameters < typeof Polygon>, Polygon>;
export declare const rectangle: Factory < ConstructorParameters < typeof Rectangle>, Rectangle>;
export declare const circle: Factory < ConstructorParameters < typeof Circle>, Circle>;
export declare const circleMarker: Factory < ConstructorParameters < typeof CircleMarker>, CircleMarker>;
export declare const control: Factory < ConstructorParameters < typeof Control>, Control> & {
  zoom: Factory < ConstructorParameters < typeof ZoomControl>, ZoomControl>
  layers: Factory < ConstructorParameters < typeof LayersControl>, LayersControl>
  attribution: Factory < ConstructorParameters < typeof AttributionControl>, AttributionControl>
  scale: Factory < ConstructorParameters < typeof ScaleControl>, ScaleControl>
  locate: Factory < ConstructorParameters < typeof LocateControl>, LocateControl>
  geocoder: Factory < ConstructorParameters < typeof GeocoderControl>, GeocoderControl>
  navigation: Factory < ConstructorParameters < typeof NavigationControl>, NavigationControl>
  fullscreen: Factory < ConstructorParameters < typeof FullscreenControl>, FullscreenControl>
};
// Default namespace object grouping all public exports.
declare const tsMap: Record<string, unknown>;
// Factory helper: turns a constructor into a callable function.
declare type Factory<A extends any[], T> = (..._args: A) => T;
export * from './control/index';
export * from './core/index';
export * from './dom/index';
export * from './geometry/index';
export * from './game/index';
export * from './geo/index';
export * from './layer/index';
export * from './map/index';
export * from './storage/index';
export { earcut, flatten, deviation } from './geometry/earcut';
export { WebGLTileRenderer, WebGLUnsupportedError } from './renderer/webgl/index';
export { services, styles };
export default tsMap;
