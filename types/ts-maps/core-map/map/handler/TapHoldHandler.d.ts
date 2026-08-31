import { Handler } from '../../core/Handler';
import { Point } from '../../geometry/Point';
export declare class TapHoldHandler extends Handler {
  _holdTimeout?: ReturnType<typeof setTimeout>;
  _startPos?: Point;
  _newPos?: Point;
  addHooks(): void;
  removeHooks(): void;
  _onDown(e: PointerEvent): void;
  _cancelClickPrevent(): void;
  _cancel(): void;
  _onMove(e: PointerEvent): void;
  _isTapValid(): boolean;
  _simulateEvent(type: string, e: PointerEvent): void;
}
