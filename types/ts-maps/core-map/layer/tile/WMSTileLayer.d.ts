import { TileLayer } from './TileLayer';
import type { Point } from '../../geometry/Point';
export declare class WMSTileLayer extends TileLayer {
  wmsParams: Record<string, any>;
  _crs?: any;
  _wmsVersion?: number;
  defaultWmsParams: Record<string, any>;
  initialize(url: string, options?: any): void;
  onAdd(map: any): void;
  getTileUrl(coords: Point & { z: number }): string;
  setParams(params: Record<string, any>, noRedraw?: boolean): this;
}
