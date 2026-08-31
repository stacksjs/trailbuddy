import { Evented } from '../core/Events';
import type { Point } from '../geometry/Point';
export declare class PosAnimation extends Evented {
  _el?: HTMLElement;
  _inProgress?: boolean;
  _duration?: number;
  _easeOutPower?: number;
  _startPos?: Point;
  _offset?: Point;
  _startTime?: number;
  _animId?: number;
  run(el: HTMLElement, newPos: Point, duration?: number, easeLinearity?: number): void;
  stop(): void;
  _animate(): void;
  _step(round?: boolean): void;
  _runFrame(progress: number, round?: boolean): void;
  _complete(): void;
  _easeOut(t: number): number;
}
