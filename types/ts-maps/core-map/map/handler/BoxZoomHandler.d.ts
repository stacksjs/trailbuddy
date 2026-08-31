import { Handler } from '../../core/Handler';
import type { Point } from '../../geometry/Point';
export declare class BoxZoomHandler extends Handler {
  _container: HTMLElement;
  _pane: HTMLElement;
  _resetStateTimeout: any;
  _moved: boolean;
  _box?: HTMLElement;
  _startPoint?: Point;
  _point?: Point;
  initialize(map: any): void;
  addHooks(): void;
  removeHooks(): void;
  moved(): boolean;
  _destroy(): void;
  _resetState(): void;
  _clearDeferredResetState(): void;
  _onPointerDown(e: PointerEvent): boolean | undefined;
  _onPointerMove(e: PointerEvent): void;
  _finish(): void;
  _onPointerUp(e: PointerEvent): void;
  _onKeyDown(e: KeyboardEvent): void;
}
