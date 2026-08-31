import { Point } from './Point';
export declare function toTransformation(a: number | number[], b?: number, c?: number, d?: number): Transformation;
export declare class Transformation {
  _a: number;
  _b: number;
  _c: number;
  _d: number;
  constructor(a: number | number[], b?: number, c?: number, d?: number);
  transform(point: Point, scale?: number): Point;
  _transform(point: Point, scale?: number): Point;
  untransform(point: Point, scale?: number): Point;
}
