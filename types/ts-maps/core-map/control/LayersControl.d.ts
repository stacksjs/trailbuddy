import { Control } from './Control';
declare interface LayerEntry {
  layer: any
  name: string
  overlay?: boolean
}
export declare class LayersControl extends Control {
  _layerControlInputs: any[];
  _layers: LayerEntry[];
  _lastZIndex: number;
  _handlingClick: boolean;
  _preventClick: boolean;
  _section: HTMLElement;
  _separator: HTMLElement;
  _baseLayersList: HTMLElement;
  _overlaysList: HTMLElement;
  _layersLink: HTMLAnchorElement;
  _collapseDelayTimeout?: ReturnType<typeof setTimeout>;
  initialize(baseLayers?: Record<string, any>, overlays?: Record<string, any>, options?: any): void;
  onAdd(map: any): HTMLElement;
  addTo(map: any): this;
  onRemove(): void;
  addBaseLayer(layer: any, name: string): this;
  addOverlay(layer: any, name: string): this;
  removeLayer(layer: any): this;
  expand(): this;
  collapse(ev?: any): this;
  _initLayout(): void;
  _getLayer(id: number): LayerEntry | undefined;
  _addLayer(layer: any, name: string, overlay?: boolean): void;
  _update(): this;
  _onLayerChange(e: any): void;
  _addItem(obj: LayerEntry): HTMLLabelElement;
  _onInputClick(e: any): void;
  _checkDisabledLayers(): void;
  _expandIfNotCollapsed(): this;
  _expandSafely(): void;
}
