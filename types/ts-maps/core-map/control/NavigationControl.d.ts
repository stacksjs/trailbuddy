import { Control } from './Control';
/**
 * Zoom buttons plus a compass, in one stack — Mapbox's `NavigationControl`.
 *
 * The compass is the part `ZoomControl` cannot grow into: once a map can be
 * rotated and pitched (it can — see `TwoFingerRotate` and `TwoFingerPitch`),
 * there has to be a way back to north that does not involve wrestling two
 * fingers into alignment. The needle doubles as the only always-visible
 * indication that the map is rotated at all.
 *
 * It composes rather than extends ZoomControl: the two are separate controls
 * with separate positions, and inheritance would tie their DOM together for
 * the sake of sharing one small button helper.
 */
export declare interface NavigationControlOptions {
  position?: string
  showZoom?: boolean
  showCompass?: boolean
  visualizePitch?: boolean
  resetDuration?: number
  zoomInTitle?: string
  zoomOutTitle?: string
  compassTitle?: string
}
export declare class NavigationControl extends Control {
  _zoomInButton?: HTMLAnchorElement;
  _zoomOutButton?: HTMLAnchorElement;
  _compassButton?: HTMLAnchorElement;
  _needle?: HTMLElement;
  onAdd(map: any): HTMLElement;
  onRemove(map: any): void;
  _zoomIn(event: any): void;
  _zoomOut(event: any): void;
  _resetNorth(): void;
  _reducedMotion(): boolean;
  _updateCompass(): void;
  _updateDisabled(): void;
  _createButton(className: string, title: string, html: string, container: HTMLElement, fn: (event: any) => void): HTMLAnchorElement;
}
