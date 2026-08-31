import { LatLngBounds } from '../geo/LatLngBounds';
import { LayerGroup } from './LayerGroup';
import type { Layer } from './Layer';
export declare class FeatureGroup extends LayerGroup {
  addLayer(layer: Layer): this;
  removeLayer(layer: Layer | number): this;
  setStyle(style: any): this;
  bringToFront(): this;
  bringToBack(): this;
  getBounds(): LatLngBounds;
}
