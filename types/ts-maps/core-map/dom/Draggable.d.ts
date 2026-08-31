import { Evented } from '../core/Events';
import { Point } from '../geometry/Point';
import * as DomUtil from './DomUtil';
export declare class Draggable extends Evented {
  static _dragging: Draggable | false;
  _element: HTMLElement;
  _dragStartTarget: HTMLElement;
  _preventOutline?: boolean;
  _enabled?: boolean;
  _moved?: boolean;
  _moving?: boolean;
  _startPoint?: Point;
  _startPos?: Point;
  _newPos?: Point;
  _lastEvent?: PointerEvent;
  _lastTarget?: HTMLElement | null;
  _parentScale?: DomUtil.ScaleInfo;
  initialize(element: HTMLElement, dragStartTarget?: HTMLElement, preventOutline?: boolean, options?: any): void;
  enable(): this;
  disable(): this;
  _onDown(e: PointerEvent): void;
  _onMove(e: PointerEvent): void;
  _updatePosition(): void;
  _onUp(): void;
  finishDrag(noInertia?: boolean): void;
}
