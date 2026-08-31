import { Point } from './Point';
import type { PointLike } from './Point';
export declare function toBounds(a?: BoundsLike | PointLike, b?: PointLike): Bounds;
export type BoundsLike = Bounds | [PointLike, PointLike] | Point[] | PointLike[];
// Represents a rectangular area in pixel coordinates.
export declare class Bounds {
  min: Point;
  max: Point;
  constructor(a?: BoundsLike | PointLike, b?: PointLike);
  extend(obj: any): this;
  getCenter(round?: boolean): Point;
  getBottomLeft(): Point;
  getTopRight(): Point;
  getTopLeft(): Point;
  getBottomRight(): Point;
  getSize(): Point;
  contains(obj: any): boolean;
  intersects(bounds: BoundsLike | PointLike): boolean;
  overlaps(bounds: BoundsLike | PointLike): boolean;
  isValid(): boolean;
  pad(bufferRatio: number): Bounds;
  equals(bounds: BoundsLike | PointLike | null | undefined): boolean;
}
