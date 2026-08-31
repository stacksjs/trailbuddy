import { Layer } from './Layer';
export declare interface HeatmapPoint {
  lat: number
  lng: number
  weight?: number
}
export declare interface HeatmapLayerOptions {
  data?: HeatmapPoint[]
  radius?: number
  blur?: number
  max?: number
  gradient?: Record<number, string>
  minOpacity?: number
  pane?: string
  attribution?: string
}
// Density-field heatmap rendered on a full-viewport canvas inside the
// overlay pane. Each point draws a Gaussian intensity splat; the
// accumulated alpha channel is then mapped through a colour ramp.
export declare class HeatmapLayer extends Layer {
  _canvas?: HTMLCanvasElement;
  _ctx?: CanvasRenderingContext2D;
  _data: HeatmapPoint[];
  _frame?: number;
  _gradientTexture?: Uint8ClampedArray;
  _redrawScheduled: boolean;
  initialize(options?: HeatmapLayerOptions): void;
  setData(points: HeatmapPoint[]): this;
  addPoint(p: HeatmapPoint): this;
  clearData(): this;
  setOptions(opts: Partial<HeatmapLayerOptions>): this;
  redraw(): this;
  onAdd(_map: any): void;
  onRemove(_map: any): void;
  getEvents(): Record<string, any>;
  _resize(): void;
  _draw(): void;
  _intensityBlob(radius: number, innerRadius: number, blur: number): HTMLCanvasElement;
  _colourRamp(): Uint8ClampedArray;
}
