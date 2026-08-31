import { Handler } from '../../core/Handler';
import type { Point } from '../../geometry/Point';
export declare class ScrollWheelZoomHandler extends Handler {
  _delta: number;
  _startTime: number | null;
  _timer?: ReturnType<typeof setTimeout>;
  _lastMousePos?: Point;
  addHooks(): void;
  removeHooks(): void;
  _onWheelScroll(e: any): void;
  _performZoom(): void;
}
