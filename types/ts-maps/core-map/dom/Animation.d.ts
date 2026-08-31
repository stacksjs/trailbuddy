import { Evented } from '../core/Events';
import type { EasingFunction } from './easing';
export type { EasingFunction } from './easing';
export declare interface AnimationFrame {
  progress: number
  t: number
  dt: number
}
export declare interface AnimationOptions {
  duration: number
  easing?: EasingFunction
  onStart?: () => void
  onFrame: (frame: AnimationFrame) => void
  onEnd?: (completed: boolean) => void
}
/**
 * Unified animation engine for the camera (center / zoom / bearing / pitch /
 * padding). Single-timeline, easing-driven. The caller is responsible for
 * interpolating the actual properties inside `onFrame` — `Animation` only
 * provides the `t` value. That keeps it composable: multi-axis gestures can
 * drive bearing/pitch/zoom in concert by constructing the right `onFrame`
 * closure without the engine needing to know about maps.
 *
 * Only one `run()` can be active at a time. Calling `run()` on a running
 * animation cancels the previous one (fires its `onEnd(false)`) before
 * starting fresh.
 *
 * Events fired (in addition to the callback hooks):
 *   `start`   — before the first `onFrame`
 *   `frame`   — every tick, with `{ progress, t, dt }`
 *   `end`     — on completion or cancellation, with `{ completed }`
 */
export declare class Animation extends Evented {
  _opts?: AnimationOptions;
  _easing: EasingFunction;
  _startTime: number;
  _lastTime: number;
  _duration: number;
  _animId?: number;
  _running: boolean;
  _pendingStart: boolean;
  constructor();
  run(opts: AnimationOptions): void;
  cancel(): void;
  stop(): void;
  isRunning(): boolean;
  _tick(timestamp: number): void;
  _emitFrame(progress: number, t: number, dt: number): void;
  _finish(completed: boolean): void;
}
