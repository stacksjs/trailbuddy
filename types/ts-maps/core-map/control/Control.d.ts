import { Class } from '../core/Class';
export declare class Control extends Class {
  _map: any;
  _container?: HTMLElement;
  onAdd(_map: any): HTMLElement;
  onRemove(_map: any): void;
  initialize(...args: any[]): void;
  getPosition(): string;
  setPosition(position: string): this;
  getContainer(): HTMLElement | undefined;
  addTo(map: any): this;
  remove(): this;
  _refocusOnMap(e: any): void;
}
