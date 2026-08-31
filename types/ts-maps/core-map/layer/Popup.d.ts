import { DivOverlay } from './DivOverlay';
import { Layer } from './Layer';
import { Point } from '../geometry/Point';
import { TsMap } from '../map/Map';
export declare class Popup extends DivOverlay {
  _wrapper?: HTMLElement;
  _tipContainer?: HTMLElement;
  _tip?: HTMLElement;
  _closeButton?: HTMLAnchorElement;
  _resizeObserver?: ResizeObserver;
  openOn(map?: any): this;
  onAdd(map: any): void;
  onRemove(map: any): void;
  getEvents(): Record<string, any>;
  _initLayout(): void;
  _updateLayout(): void;
  _animateZoom(e: any): void;
  _adjustPan(): void;
  _getAnchor(): Point;
}
declare module '../map/Map' {
  interface TsMap {
  openPopup: (popup: Popup | string | HTMLElement, latlng?: unknown, options?: Record<string, unknown>) => this
  closePopup: (popup?: Popup) => this
}
}
declare module './Layer' {
  interface Layer {
  bindPopup: (content: Popup | string | HTMLElement, options?: Record<string, unknown>) => this
  unbindPopup: () => this
  openPopup: (latlng?: unknown) => this
  closePopup: () => this
  togglePopup: () => this
  isPopupOpen: () => boolean
  setPopupContent: (content: string | HTMLElement) => this
  getPopup: () => Popup | undefined
}
}
