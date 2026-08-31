import { Layer } from './Layer';
import type { CaptureResult, TerritoryStore } from '../game/TerritoryStore';
import type { MultiPolygon, Position } from '../geo/polygonClip';
export declare function territoryLayer(options?: TerritoryLayerOptions): TerritoryLayer;
export declare interface TerritoryStyle {
  color?: string
  fillOpacity?: number
  weight?: number
  glow?: boolean
  hatch?: boolean
  label?: boolean
}
export declare interface TerritoryLayerOptions {
  store?: TerritoryStore
  styles?: Record<string, TerritoryStyle>
  defaultStyle?: TerritoryStyle
  self?: string
  captureDuration?: number
  labelMinZoom?: number
  units?: 'metric' | 'imperial'
  pane?: string
  attribution?: string
}
declare interface CaptureAnimation {
  owner: string
  ring: Position[]
  start: number
  duration: number
}
export declare class TerritoryLayer extends Layer {
  _canvas?: HTMLCanvasElement;
  _ctx?: CanvasRenderingContext2D | null;
  _store?: TerritoryStore;
  _manual: Map<string, MultiPolygon>;
  _animations: CaptureAnimation[];
  _frame?: number;
  _assigned: Map<string, string>;
  _ratio: number;
  _onStoreChange?: () => void;
  _onStoreCapture?: (result: CaptureResult) => void;
  initialize(options?: TerritoryLayerOptions): void;
  setStore(store: TerritoryStore): this;
  setTerritory(owner: string, territory: MultiPolygon): this;
  setOwnerStyle(owner: string, style: TerritoryStyle): this;
  animateCapture(result: { owner: string, ring: Position[] }): this;
  colorFor(owner: string): string;
  redraw(): this;
  onAdd(_map: any): void;
  onRemove(_map: any): void;
  getEvents(): Record<string, any>;
  ownerAtContainerPoint(point: { x: number, y: number }): string | null;
  _detachStore(): void;
  _pixelRatio(): number;
  _resize(): void;
  _territories(): Array<[string, MultiPolygon]>;
  _draw(): void;
  _styleFor(owner: string): Required<TerritoryStyle>;
  _drawTerritory(ctx: CanvasRenderingContext2D, owner: string, territory: MultiPolygon, project: (p: Position) => { x: number, y: number }): void;
  _drawHatch(ctx: CanvasRenderingContext2D, color: string): void;
  _drawLabels(ctx: CanvasRenderingContext2D, territory: MultiPolygon, color: string, project: (p: Position) => { x: number, y: number }): void;
  _drawCaptures(ctx: CanvasRenderingContext2D, project: (p: Position) => { x: number, y: number }): void;
}
