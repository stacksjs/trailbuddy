import { Handler } from '../../core/Handler';
export declare class KeyboardHandler extends Handler {
  static keyCodes: Record<string, string[]>;
  _panKeys: Record<string, [number, number]>;
  _zoomKeys: Record<string, number>;
  _focused: boolean;
  initialize(map: any): void;
  addHooks(): void;
  removeHooks(): void;
  _onPointerDown(): void;
  _onFocus(): void;
  _onBlur(): void;
  _setPanDelta(panDelta: number): void;
  _setZoomDelta(zoomDelta: number): void;
  _addHooks(): void;
  _removeHooks(): void;
  _onKeyDown(e: KeyboardEvent): void;
}
