import { Evented } from '../core/Events';
import { TsMap } from '../map/Map';
export declare class Layer extends Evented {
  _map?: any;
  _mapToAdd?: any;
  _zoomAnimated?: boolean;
  getEvents(): Record<string, any>;
  onAdd(_map: any): void;
  onRemove(_map: any): void;
  beforeAdd(_map: any): void;
  addTo(map: any): this;
  remove(): this;
  removeFrom(obj: any): this;
  getPane(name?: string): HTMLElement;
  addInteractiveTarget(targetEl: any): this;
  removeInteractiveTarget(targetEl: any): this;
  getAttribution(): string | null | undefined;
  _layerAdd(e: any): void;
}
declare module '../map/Map' {
  interface TsMap {
  addLayer: (layer: Layer) => this
  removeLayer: (layer: Layer) => this
  hasLayer: (layer: Layer) => boolean
  eachLayer: (method: (layer: Layer) => void, context?: unknown) => this
}
}
