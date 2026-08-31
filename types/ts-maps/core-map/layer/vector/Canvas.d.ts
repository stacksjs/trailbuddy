import { Bounds } from '../../geometry/Bounds';
import { Renderer } from './Renderer';
declare interface Order {
  layer: any
  prev: Order | null
  next: Order | null
}
// Canvas renderer for vector layers.
export declare class Canvas extends Renderer {
  _ctx?: CanvasRenderingContext2D;
  _ctxScale?: number;
  _redrawRequest?: number | null;
  _redrawBounds?: Bounds | null;
  _drawFirst?: Order | null;
  _drawLast?: Order | null;
  _drawing?: boolean;
  _postponeUpdatePaths?: boolean;
  _hoveredLayer?: any;
  _pointerHoverThrottled?: boolean;
  _pointerHoverThrottleTimeout?: ReturnType<typeof setTimeout>;
  getEvents(): Record<string, any>;
  _onViewPreReset(): void;
  onAdd(map: any): void;
  onRemove(): void;
  _initContainer(): void;
  _destroyContainer(): void;
  _resizeContainer(): any;
  _updatePaths(): void;
  _update(): void;
  _reset(): void;
  _initPath(layer: any): void;
  _addPath(layer: any): void;
  _removePath(layer: any): void;
  _updatePath(layer: any): void;
  _updateStyle(layer: any): void;
  _updateDashArray(layer: any): void;
  _requestRedraw(layer: any): void;
  _extendRedrawBounds(layer: any): void;
  _redraw(): void;
  _clear(): void;
  _draw(): void;
  _updatePoly(layer: any, closed?: boolean): void;
  _updateCircle(layer: any): void;
  _fillStroke(ctx: CanvasRenderingContext2D, layer: any): void;
  _onClick(e: any): void;
  _onPointerMove(e: any): void;
  _handlePointerOut(e: any): void;
  _handlePointerHover(e: any, point: any): void;
  _fireEvent(layers: any[] | false, e: any, type?: string): void;
  _bringToFront(layer: any): void;
  _bringToBack(layer: any): void;
}
