import { Draggable } from '../../dom/Draggable';
import { Handler } from '../../core/Handler';
export declare class MarkerDrag extends Handler {
  _marker: any;
  _draggable?: Draggable;
  _oldLatLng?: any;
  _panRequest?: number;
  initialize(marker: any): void;
  addHooks(): void;
  removeHooks(): void;
  moved(): boolean | undefined;
  _adjustPan(e: any): void;
  _onDragStart(): void;
  _onPreDrag(e: any): void;
  _onDrag(e: any): void;
  _onDragEnd(e: any): void;
}
