import { Handler } from '../../core/Handler';
// Two-finger parallel-vertical drag tilts the map. Disambiguated from
// rotate + zoom via simple thresholds: large |Δangle| → rotate, large
// |Δdistance| → zoom, otherwise if both fingers move together vertically
// we treat it as pitch.
export declare class TwoFingerPitchHandler extends Handler {
  _pitching: boolean;
  _moved: boolean;
  _startY1: number;
  _startY2: number;
  _startX1: number;
  _startX2: number;
  _startPitch: number;
  _startDist: number;
  _animRequest?: number;
  addHooks(): void;
  removeHooks(): void;
  _onPointerStart(_e: PointerEvent): void;
  _onPointerMove(e: PointerEvent): void;
  _onPointerEnd(): void;
}
