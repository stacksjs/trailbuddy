import { FeatureGroup } from './FeatureGroup';
import { LatLng } from '../geo/LatLng';
export declare class GeoJSON extends FeatureGroup {
  initialize(geojson?: any, options?: any): void;
  addData(geojson: any): this;
  resetStyle(layer?: any): this;
  setStyle(style: any): this;
  _setLayerStyle(layer: any, style: any): void;
  static geometryToLayer(geojson: any, options?: any): any;
  static _pointToLayer(pointToLayerFn: any, geojson: any, latlng: LatLng, options?: any): any;
  static coordsToLatLng(coords: number[]): LatLng;
  static coordsToLatLngs(coords: any[], levelsDeep?: number, _coordsToLatLng?: (c: number[]) => LatLng): any[];
  static latLngToCoords(latlng: any, precision?: number | false): number[];
  static latLngsToCoords(latlngs: any[], levelsDeep?: number, close?: boolean, precision?: number | false): any[];
  static getFeature(layer: any, newGeometry: any): any;
  static asFeature(geojson: any): any;
}
