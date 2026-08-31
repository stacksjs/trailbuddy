import { CircleMarker } from './CircleMarker';
import { LatLngBounds } from '../../geo/LatLngBounds';
export declare class Circle extends CircleMarker {
  initialize(latlng: any, options?: any): void;
  getBounds(): LatLngBounds;
  _project(): void;
}
