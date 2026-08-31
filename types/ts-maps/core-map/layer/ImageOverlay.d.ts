import { LatLngBounds } from '../geo/LatLngBounds';
import { Layer } from './Layer';
export declare class ImageOverlay extends Layer {
  _url: any;
  _bounds: LatLngBounds;
  _image?: HTMLImageElement | HTMLVideoElement | SVGElement | any;
  initialize(url: any, bounds: any, options?: any): void;
  onAdd(): void;
  onRemove(): void;
  setOpacity(opacity: number): this;
  setStyle(styleOpts: any): this;
  bringToFront(): this;
  bringToBack(): this;
  setUrl(url: string): this;
  setBounds(bounds: any): this;
  getEvents(): Record<string, any>;
  setZIndex(value: number): this;
  getBounds(): LatLngBounds;
  getElement(): any;
  _initImage(): void;
  _animateZoom(e: any): void;
  _reset(): void;
  _updateOpacity(): void;
  _updateZIndex(): void;
  _overlayOnError(): void;
  getCenter(): any;
}
