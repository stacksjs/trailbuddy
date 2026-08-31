import { Point } from '../geometry/Point';
export declare function get(id: string | HTMLElement): HTMLElement | null;
export declare function create< K extends keyof HTMLElementTagNameMap >(tagName: K, className?: string, container?: HTMLElement | null): HTMLElementTagNameMap[K];
export declare function create(tagName: string, className?: string, container?: HTMLElement | null): HTMLElement;
export declare function toFront(el: Element): void;
export declare function toBack(el: Element): void;
export declare function setTransform(el: HTMLElement, offset?: Point | null, scale?: number, rotation?: number, pitch?: number): void;
export declare function setPosition(el: HTMLElement, point: Point, rotation?: number, pitch?: number): void;
export declare function getPosition(el: HTMLElement): Point;
export declare function disableTextSelection(): void;
export declare function enableTextSelection(): void;
export declare function disableImageDrag(): void;
export declare function enableImageDrag(): void;
export declare function preventOutline(element: HTMLElement): void;
export declare function restoreOutline(): void;
export declare function getSizedParentNode(element: HTMLElement): HTMLElement;
export declare function getScale(element: HTMLElement): ScaleInfo;
export declare interface ScaleInfo {
  x: number
  y: number
  boundingClientRect: DOMRect
}
