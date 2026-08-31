import { Bounds } from '../../geometry/Bounds';
import { Draggable } from '../../dom/Draggable';
import { Handler } from '../../core/Handler';
import type { Point } from '../../geometry/Point';
export declare class DragHandler extends Handler {
  _draggable?: Draggable & { _absPos?: Point };
  _positions: Point[];
  _times: number[];
  _lastTime?: number;
  _lastPos?: Point;
  _offsetLimit: Bounds | null;
  _viscosity: number;
  _initialWorldOffset: number;
  _worldWidth: number;
  addHooks(): void;
  removeHooks(): void;
  moved(): boolean | undefined;
  moving(): boolean | undefined;
  _onDragStart(): void;
  _onDrag(e: any): void;
  _prunePositions(time: number): void;
  _onZoomEnd(): void;
  _viscousLimit(value: number, threshold: number): number;
  _onPreDragLimit(): void;
  _onPreDragWrap(): void;
  _onDragEnd(e: any): void;
}
