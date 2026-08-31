import { Evented } from '../core/Events';
import type { MultiPolygon, Position, Ring } from '../geo/polygonClip';
export declare interface TerritoryStoreOptions {
  steal?: boolean
  minFragmentArea?: number
}
export declare interface StolenFrom {
  owner: string
  area: number
}
export declare interface CaptureResult {
  owner: string
  ring: Ring
  areaClaimed: number
  areaGained: number
  stolen: StolenFrom[]
  territory: MultiPolygon
  totalArea: number
}
export declare interface LeaderboardEntry {
  owner: string
  area: number
  pieces: number
}
/**
 * Territories by owner.
 *
 * ```ts
 * const territories = new TerritoryStore()
 * territories.on('capture', ({ owner, areaGained, stolen }) => {
 *   toast(`${owner} claimed ${formatArea(areaGained)}`)
 * })
 * territories.capture('sam', loop.ring)
 * ```
 */
export declare class TerritoryStore extends Evented {
  _byOwner: Map<string, MultiPolygon>;
  _options: Required<TerritoryStoreOptions>;
  initialize(options?: TerritoryStoreOptions): void;
  capture(owner: string, ring: Ring): CaptureResult;
  get(owner: string): MultiPolygon;
  set(owner: string, territory: MultiPolygon): this;
  areaOf(owner: string): number;
  owners(): string[];
  leaderboard(): LeaderboardEntry[];
  ownerAt(position: Position): string | null;
  preview(owner: string, ring: Ring): { areaGained: number, stolen: StolenFrom[] };
  toGeoJSON(): {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      properties: { owner: string, area: number }
      geometry: { type: 'MultiPolygon', coordinates: MultiPolygon }
    }>
  };
  loadGeoJSON(collection: { features?: Array<any> }): this;
  clear(): this;
  _prune(territory: MultiPolygon): MultiPolygon;
}
