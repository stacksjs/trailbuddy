import { EarthCRS } from './EarthCRS';
import { Transformation } from '../../geometry/Transformation';
export declare class EPSG3857 extends EarthCRS {
  static code: string;
  static projection: any;
  static transformation: Transformation;
}
export declare class EPSG900913 extends EPSG3857 {
  static code: string;
}
