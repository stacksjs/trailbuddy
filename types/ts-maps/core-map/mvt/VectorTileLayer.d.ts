import { Pbf } from '../proto/Pbf';
import { VectorTileFeature } from './VectorTileFeature';
// Lazy-decoded MVT Layer message. Construction only scans the outer frame
// and records byte offsets for each Feature (tag 2) — individual features
// are materialized on demand by `.feature(i)`.
export declare class VectorTileLayer {
  version: number;
  name: string;
  extent: number;
  length: number;
  constructor(pbf: Pbf, end?: number);
  feature(i: number): VectorTileFeature;
}
