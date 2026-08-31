import { Class } from './Class';
export declare interface EventListener {
  fn: (event?: any) => void
  ctx?: any
  once?: boolean
}
export type EventHandler = (_event?: any) => void;
// A set of methods shared between event-powered classes (like Map and Marker).
export declare class Evented extends Class {
  static __REMOVED_EVENTS: string[];
  _events?: Record<string, EventListener[]>;
  _eventParents?: Record<number, Evented>;
  _firingCount?: number;
  on(types: string | Record<string, EventHandler>, fn?: EventHandler | any, context?: any): this;
  off(types?: string | Record<string, EventHandler>, fn?: EventHandler | any, context?: any): this;
  _on(type: string, fn: EventHandler, context?: any, _once?: boolean): void;
  _off(type: string, fn?: EventHandler, context?: any): void;
  fire(type: string, data?: Record<string, any>, propagate?: boolean): this;
  listens(type: string, fn?: EventHandler | boolean, context?: any, propagate?: boolean): boolean;
  _listens(type: string, fn?: EventHandler, context?: any): number | false;
  once(types: string | Record<string, EventHandler>, fn?: EventHandler | any, context?: any): this;
  addEventParent(obj: Evented): this;
  removeEventParent(obj: Evented): this;
  _propagateEvent(e: any): void;
  addEventListener: Evented['on'];
  removeEventListener: Evented['off'];
  clearAllEventListeners: Evented['off'];
  addOneTimeEventListener: Evented['once'];
  fireEvent: Evented['fire'];
  hasEventListeners: Evented['listens'];
}
