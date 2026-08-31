import { Circle } from '../layer/vector/Circle';
import { Control } from './Control';
import { Marker } from '../layer/marker/Marker';
/**
 * "Where am I" — the crosshair button every map is expected to have.
 *
 * Centres the map on the device's own position and, unless told otherwise,
 * keeps following it as the position updates. The button carries its own state
 * so the user is never left wondering whether anything happened:
 *
 *   idle      the outline crosshair
 *   locating  pulsing, while the first fix is being acquired
 *   active    filled, while the map is following the device
 *   denied    struck through, when permission was refused or the fix failed
 *
 * Geolocation is requested on CLICK and never on load. A permission prompt
 * that appears unasked is the fastest way to be denied for the rest of the
 * session, and a denied permission cannot be re-requested without the user
 * going into browser settings.
 *
 * Following stops the moment the user pans, drags, or zooms by hand: a map
 * that yanks itself back under a finger is worse than one that does nothing.
 */
export declare interface LocateControlOptions {
  position?: string
  zoom?: number | null
  follow?: boolean
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  title?: string
  titleLocating?: string
  titleActive?: string
  titleDenied?: string
  showMarker?: boolean
}
export declare class LocateControl extends Control {
  _button?: HTMLAnchorElement;
  _watchId?: number;
  _following?: boolean;
  _selfMoving?: boolean;
  _marker?: Marker;
  _accuracyCircle?: Circle;
  onAdd(map: any): HTMLElement;
  onRemove(map: any): void;
  start(): this;
  stop(): this;
  _onClick(): void;
  _locate(): void;
  _onPosition(position: GeolocationPosition, recenter: boolean): void;
  _updateMarker(latlng: [number, number], accuracy: number): void;
  _clearMarker(): void;
  _stopFollowing(): void;
  _clearWatch(): void;
  _setState(state: 'idle' | 'locating' | 'active' | 'denied'): void;
}
