import type { Position } from '../geo/area';
/**
 * Find the first loop a track closes, or null.
 *
 * The loop returned is the earliest one that closes, not the largest — a
 * runner who laps a park and keeps going has earned the park at the moment
 * they closed it, and waiting to see whether a bigger shape appears later
 * would mean the game reacting to a run several minutes after it happened.
 */
export declare function detectLoop(track: Position[], options?: LoopOptions): DetectedLoop | null;
/**
 * Reduce a track to its shape, dropping points that say nothing new.
 *
 * A GPS logging at 1 Hz produces a great many points that lie on the line
 * between their neighbours. Keeping them costs area calculations, boolean
 * operations and every redraw, and they change none of the answers.
 *
 * `tolerance` is in metres: the furthest a dropped point may lie from the line
 * that replaces it.
 */
export declare function simplifyTrack(track: Position[], tolerance?: number): Position[];
export declare interface LoopOptions {
  snapDistance?: number
  minArea?: number
  minLoopLength?: number
  minPoints?: number
}
export declare interface DetectedLoop {
  ring: Position[]
  area: number
  perimeter: number
  startIndex: number
  endIndex: number
  closure: 'crossing' | 'proximity'
}
export declare interface LoopDetectorOptions extends LoopOptions {
  carryOver?: number
}
/**
 * Feed it GPS points; it tells you when a loop closes.
 *
 * A live run calls this on every position update, so it does the work
 * incrementally rather than re-scanning the whole track each time: only the
 * newest segment is tested, against the ones already recorded.
 *
 * ```ts
 * const detector = new LoopDetector({ snapDistance: 25 })
 * watchPosition((position) => {
 *   const loop = detector.push([position.coords.longitude, position.coords.latitude])
 *   if (loop)
 *     territories.capture('me', loop.ring)
 * })
 * ```
 */
export declare class LoopDetector {
  constructor(options?: LoopDetectorOptions);
  get track(): Position[];
  get length(): number;
  push(point: Position): DetectedLoop | null;
  reset(): void;
}
