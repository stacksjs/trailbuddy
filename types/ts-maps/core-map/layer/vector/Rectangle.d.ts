import { Polygon } from './Polygon';
export declare class Rectangle extends Polygon {
  initialize(latLngBounds: any, options?: any): void;
  setBounds(latLngBounds: any): this;
  _boundsToLatLngs(latLngBounds: any): any[];
}
