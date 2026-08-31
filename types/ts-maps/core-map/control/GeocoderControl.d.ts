import { Control } from './Control';
import { Marker } from '../layer/marker/Marker';
import type { GeocoderProvider, GeocodingResult } from '../services/types';
/**
 * A place search box, sitting on top of the geocoder providers in
 * `services/`.
 *
 * The adapters have always been there; what was missing was the control that
 * makes them usable without hand-rolling an input, a debounce, a result list
 * and keyboard handling on every map. The default provider is Nominatim, which
 * needs no key — so `control.geocoder().addTo(map)` searches out of the box.
 *
 * Requests are debounced and the in-flight one is aborted on every keystroke.
 * That is politeness towards a public endpoint as much as it is correctness:
 * without the abort, a slow early response can land after a fast later one and
 * repopulate the list with results for a query the user has already moved past.
 */
export declare interface GeocoderControlOptions {
  position?: string
  provider?: GeocoderProvider
  placeholder?: string
  title?: string
  limit?: number
  debounce?: number
  minLength?: number
  collapsed?: boolean
  flyTo?: boolean
  zoom?: number
  marker?: boolean
  proximity?: boolean
  language?: string
  countries?: string[]
  bbox?: [number, number, number, number]
  errorText?: string
  noResultsText?: string
}
export declare class GeocoderControl extends Control {
  _input?: HTMLInputElement;
  _list?: HTMLUListElement;
  _toggle?: HTMLAnchorElement;
  _results: GeocodingResult[];
  _selected: number;
  _timer?: ReturnType<typeof setTimeout>;
  _abort?: AbortController;
  _marker?: Marker;
  _expanded?: boolean;
  onAdd(_map: any): HTMLElement;
  onRemove(_map: any): void;
  setQuery(query: string): this;
  clear(): this;
  _onToggle(): void;
  _setExpanded(expanded: boolean): void;
  _onInput(): void;
  _search(query: string): void;
  _request(query: string): void;
  _renderList(): void;
  _onKeyDown(event: KeyboardEvent): void;
  _move(delta: number): void;
  select(index: number): this;
  _cancelPending(): void;
}
