import { Control } from './Control';
export declare class ScaleControl extends Control {
  _mScale?: HTMLElement;
  _iScale?: HTMLElement;
  onAdd(map: any): HTMLElement;
  onRemove(map: any): void;
  _addScales(options: any, className: string, container: HTMLElement): void;
  _update(): void;
  _updateScales(maxMeters: number): void;
  _updateMetric(maxMeters: number): void;
  _updateImperial(maxMeters: number): void;
  _updateScale(scale: HTMLElement, text: string, ratio: number): void;
  _getRoundNum(num: number): number;
}
