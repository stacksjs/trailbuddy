import { Handler } from '../../core/Handler';
// Rotates the map's bearing by the angular delta of a two-finger twist gesture.
// Shares the pointerdown channel with PinchZoomHandler; both apply their
// respective deltas in the same frame.
export declare class TwoFingerRotateHandler extends Handler {
  _rotating: boolean;
  _moved: boolean;
  _startAngle: number;
  _startBearing: number;
  _pivot: { x: number, y: number };
  _animRequest?: number;
  addHooks(): void;
  removeHooks(): void;
  _onPointerStart(_e: PointerEvent): void;
  _onPointerMove(e: PointerEvent): void;
  _onPointerEnd(): void;
}
