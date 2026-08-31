import { Renderer } from './Renderer';
export declare class SVG extends Renderer {
  _rootGroup?: SVGGElement;
  _svgSize?: any;
  _initContainer(): void;
  _destroyContainer(): void;
  _resizeContainer(): any;
  _update(): void;
  _initPath(layer: any): void;
  _addPath(layer: any): void;
  _removePath(layer: any): void;
  _updatePath(layer: any): void;
  _updateStyle(layer: any): void;
  _updatePoly(layer: any, closed?: boolean): void;
  _updateCircle(layer: any): void;
  _setPath(layer: any, path: string): void;
  _bringToFront(layer: any): void;
  _bringToBack(layer: any): void;
  static create(name: string): SVGElement;
  static pointsToPath(rings: any[], closed?: boolean): string;
}
