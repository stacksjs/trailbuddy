import { Evented } from '../core/Events';
import type { CaptureResult, TerritoryStore, TerritoryStoreOptions } from './TerritoryStore';
import type { MultiPolygon, Ring } from '../geo/polygonClip';
/**
 * The agreed order: server sequence, then timestamp, then id.
 *
 * Every participant computes this the same way from the event alone, which is
 * what makes the fold converge. The id tiebreak is not a formality — phone
 * clocks disagree, so identical timestamps are common enough that without it
 * two clients would order the same pair differently and diverge.
 */
export declare function compareEvents(a: CaptureEvent, b: CaptureEvent): number;
export declare interface CaptureEvent {
  id: string
  owner: string
  ring: Ring
  at: number
  seq?: number
}
export declare interface AppliedCapture {
  event: CaptureEvent
  result?: CaptureResult
  duplicate: boolean
  replayed: boolean
}
export declare interface TerritoryLogOptions {
  maxEvents?: number
  store?: TerritoryStoreOptions
}
/**
 * An ordered log of captures, and the territory they add up to.
 *
 * ```ts
 * const log = new TerritoryLog()
 *
 * // Local: apply at once, send to the server.
 * const applied = log.apply({ id: uuid(), owner: 'me', ring, at: Date.now() })
 * socket.send(applied.event)
 *
 * // Remote: apply whatever arrives, in whatever order.
 * socket.on('capture', event => log.apply(event))
 * ```
 */
export declare class TerritoryLog extends Evented {
  _log: CaptureEvent[];
  _seen: Set<string>;
  _store: TerritoryStore;
  _baseline: Map<string, MultiPolygon>;
  _options: Required<Omit<TerritoryLogOptions, 'store'>> & { store?: TerritoryStoreOptions };
  initialize(options?: TerritoryLogOptions): void;
  get store(): TerritoryStore;
  get events(): readonly CaptureEvent[];
  apply(event: CaptureEvent): AppliedCapture;
  applyAll(events: CaptureEvent[]): AppliedCapture[];
  has(id: string): boolean;
  confirm(id: string, seq: number): boolean;
  compact(keep?: number): number;
  snapshot(): {
    baseline: Array<{ owner: string, territory: MultiPolygon }>
    events: CaptureEvent[]
  };
  restore(snapshot: { baseline?: Array<{ owner: string, territory: MultiPolygon }>, events?: CaptureEvent[] }): this;
  clear(): this;
  _newStore(): TerritoryStore;
  _rebuild(): void;
}
