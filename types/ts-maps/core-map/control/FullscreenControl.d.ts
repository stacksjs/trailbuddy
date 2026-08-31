import { Control } from './Control';
/**
 * Expand the map to fill the screen.
 *
 * Two mechanisms, because one of them is unavailable more often than it
 * looks: the Fullscreen API is blocked in cross-origin iframes without an
 * `allowfullscreen` attribute, and on iPhone Safari it does not exist at all —
 * both being exactly the places a map is most likely to be embedded. When it
 * is unavailable the control falls back to a fixed, full-viewport class, which
 * is not true fullscreen (browser chrome stays) but does the thing the user
 * pressed the button for.
 *
 * Either way the map is told to re-measure: the container changes size without
 * a window resize event in the API case.
 */
export declare interface FullscreenControlOptions {
  position?: string
  container?: HTMLElement
  title?: string
  titleCancel?: string
}
export declare class FullscreenControl extends Control {
  _button?: HTMLAnchorElement;
  _pseudo?: boolean;
  _onDocumentChange?: () => void;
  onAdd(_map: any): HTMLElement;
  onRemove(_map: any): void;
  isFullscreen(): boolean;
  toggle(): this;
  request(): this;
  exit(): this;
  _target(): HTMLElement;
  _documentElement(): Element | null;
  _enterPseudo(): void;
  _exitPseudo(): void;
  _syncFromDocument(): void;
  _onChanged(active: boolean): void;
  _updateButton(active: boolean): void;
}
