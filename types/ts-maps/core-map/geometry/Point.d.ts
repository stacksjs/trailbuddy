// Helper that normalizes any accepted input to a Point. Useful for public API methods
// that accept coordinate pairs in multiple forms.
export declare function toPoint(x: PointLike | number[] | null | undefined, y?: number, round?: boolean): Point;
export type PointTuple = [number, number];
export type PointLike = Point | PointTuple | { x: number, y: number } | number;
// Represents a point with `x` and `y` coordinates in pixels.
export declare class Point {
  x: number;
  y: number;
  constructor(x: PointLike | number[], y?: number, round?: boolean);
  static validate(x: any, y?: any): boolean;
  clone(): Point;
  add(point: PointLike | number[]): Point;
  _add(point: Point): this;
  subtract(point: PointLike | number[]): Point;
  _subtract(point: Point): this;
  divideBy(num: number): Point;
  _divideBy(num: number): this;
  multiplyBy(num: number): Point;
  _multiplyBy(num: number): this;
  scaleBy(point: Point): Point;
  unscaleBy(point: Point): Point;
  round(): Point;
  _round(): this;
  floor(): Point;
  _floor(): this;
  ceil(): Point;
  _ceil(): this;
  trunc(): Point;
  _trunc(): this;
  distanceTo(point: PointLike | number[]): number;
  equals(point: PointLike | number[]): boolean;
  contains(point: PointLike | number[]): boolean;
  toString(): string;
}
