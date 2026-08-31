import { Pbf } from '../proto/Pbf';
import { VectorTileLayer } from './VectorTileLayer';
// Top-level MVT Tile message. Each tile contains one or more named Layers.
// The constructor walks the outer envelope; layer bodies are parsed eagerly
// into `VectorTileLayer` instances, but features inside a layer are lazy.
export declare class VectorTile {
  layers: Record<string, VectorTileLayer>;
  constructor(pbf: Pbf, end?: number);
}
