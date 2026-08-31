import { Layer } from '../Layer';
export declare class Path extends Layer {
  _renderer?: any;
  _path?: any;
  _pxBounds?: any;
  _parts?: any[];
  beforeAdd(map: any): void;
  onAdd(): void;
  onRemove(): void;
  redraw(): this;
  setStyle(style: any): this;
  bringToFront(): this;
  bringToBack(): this;
  getElement(): any;
  _reset(): void;
  _clickTolerance(): number;
  _project(): void;
  _update(): void;
  _updateBounds(): void;
}
