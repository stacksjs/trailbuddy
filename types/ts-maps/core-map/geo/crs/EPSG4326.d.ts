import { EarthCRS } from './EarthCRS';
import { Transformation } from '../../geometry/Transformation';
export declare class EPSG4326 extends EarthCRS {
  static code: string;
  static projection: any;
  static transformation: Transformation;
}
