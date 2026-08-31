import { Layer } from './Layer';
export declare class LayerGroup extends Layer {
  _layers: Record<number | string, Layer>;
  initialize(layers?: Layer[], options?: any): void;
  addLayer(layer: Layer): this;
  removeLayer(layer: Layer | number): this;
  hasLayer(layer: Layer | number): boolean;
  clearLayers(): this;
  onAdd(map: any): void;
  onRemove(map: any): void;
  eachLayer(method: (layer: Layer) => void, context?: any): this;
  getLayer(id: number): Layer | undefined;
  getLayers(): Layer[];
  setZIndex(zIndex: number): this;
  getLayerId(layer: Layer): number;
}
