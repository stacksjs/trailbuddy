import { Layer } from './Layer';
import type { Position } from '../geo/polygonClip';
export declare function runTrailLayer(options?: RunTrailLayerOptions): RunTrailLayer;
export declare interface RunTrailLayerOptions {
  color?: string
  weight?: number
  opacity?: number
  showPotential?: boolean
  potentialOpacity?: number
  showHead?: boolean
  pulse?: boolean
  pane?: string
  attribution?: string
}
export declare class RunTrailLayer extends Layer {
  _canvas?: HTMLCanvasElement;
  _ctx?: CanvasRenderingContext2D | null;
  _track: Position[];
  _frame?: number;
  _ratio: number;
  initialize(options?: RunTrailLayerOptions): void;
  setTrack(track: Position[]): this;
  addPoint(position: Position): this;
  clear(): this;
  get track(): Position[];
  redraw(): this;
  onAdd(_map: any): void;
  onRemove(_map: any): void;
  getEvents(): Record<string, any>;
  _pixelRatio(): number;
  _resize(): void;
  _draw(): void;
  _drawPotential(ctx: CanvasRenderingContext2D, points: Array<{ x: number, y: number }>, color: string, alpha: number): void;
  _drawHead(ctx: CanvasRenderingContext2D, point: { x: number, y: number }, color: string, pulse: boolean): void;
}
