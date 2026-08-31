import { BlanketOverlay } from '../BlanketOverlay';
export declare class Renderer extends BlanketOverlay {
  _layers: Record<number, any>;
  initialize(options?: any): void;
  onAdd(map?: any): void;
  onRemove(map?: any): void;
  _onZoomEnd(): void;
  _updatePaths(): void;
  _onViewReset(): void;
  _onSettled(_ev?: any): void;
  _update(): void;
}
