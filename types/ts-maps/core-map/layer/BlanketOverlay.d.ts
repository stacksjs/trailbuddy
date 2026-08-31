import { Bounds } from '../geometry/Bounds';
import { Layer } from './Layer';
import type { Point } from '../geometry/Point';
export declare class BlanketOverlay extends Layer {
  _container?: HTMLElement;
  _bounds?: Bounds;
  _center?: any;
  _zoom?: number;
  initialize(options?: any): void;
  onAdd(_map?: any): void;
  onRemove(_map?: any): void;
  getEvents(): Record<string, any>;
  _onAnimZoom(ev: any): void;
  _onZoom(): void;
  _updateTransform(center: any, zoom: number): void;
  _onMoveEnd(ev?: any): void;
  _reset(): void;
  _initContainer(): void;
  _destroyContainer(): void;
  _resizeContainer(): Point;
  _onZoomEnd(): void;
  _onViewReset(): void;
  _onSettled(_ev?: any): void;
}
