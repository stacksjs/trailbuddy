import { Control } from './Control';
export declare class ZoomControl extends Control {
  _zoomInButton?: HTMLAnchorElement;
  _zoomOutButton?: HTMLAnchorElement;
  _disabled?: boolean;
  onAdd(map: any): HTMLElement;
  onRemove(map: any): void;
  disable(): this;
  enable(): this;
  _zoomIn(e: any): void;
  _zoomOut(e: any): void;
  _createButton(html: string, title: string, className: string, container: HTMLElement, fn: (e: any) => void): HTMLAnchorElement;
  _updateDisabled(): void;
}
