import { DivOverlay } from './DivOverlay';
import { Point } from '../geometry/Point';
export declare class Tooltip extends DivOverlay {
  onAdd(map: any): void;
  onRemove(map: any): void;
  getEvents(): Record<string, any>;
  _initLayout(): void;
  _updateLayout(): void;
  _adjustPan(): void;
  _setPosition(pos: Point): void;
  _updatePosition(): void;
  setOpacity(opacity: number): void;
  _animateZoom(e: any): void;
  _getAnchor(): Point;
}
