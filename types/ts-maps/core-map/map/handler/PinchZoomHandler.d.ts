import { Handler } from '../../core/Handler';
import type { LatLng } from '../../geo/LatLng';
import type { Point } from '../../geometry/Point';
export declare class PinchZoomHandler extends Handler {
  _zooming: boolean;
  _moved: boolean;
  _centerPoint?: Point;
  _startLatLng?: LatLng;
  _pinchStartLatLng?: LatLng;
  _startDist?: number;
  _startZoom?: number;
  _zoom?: number;
  _center?: LatLng;
  _animRequest?: number;
  addHooks(): void;
  removeHooks(): void;
  _onPointerStart(e: PointerEvent): void;
  _onPointerMove(e: PointerEvent): void;
  _onPointerEnd(): void;
}
