import { Class } from '../../core/Class';
export declare class Icon extends Class {
  initialize(options?: any): void;
  createIcon(oldIcon?: HTMLElement): HTMLElement | null;
  createShadow(oldIcon?: HTMLElement): HTMLElement | null;
  _createIcon(name: string, oldIcon?: HTMLElement | null): HTMLElement | null;
  _setIconStyles(img: HTMLElement, name: string): void;
  _createImg(src: string, el?: HTMLImageElement | null): HTMLImageElement;
  _getIconUrl(name: string): string;
}
