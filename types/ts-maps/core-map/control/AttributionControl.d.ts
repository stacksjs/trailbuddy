import { Control } from './Control';
export declare class AttributionControl extends Control {
  _attributions: Record<string, number>;
  initialize(options?: any): void;
  onAdd(map: any): HTMLElement;
  onRemove(map: any): void;
  _addAttribution(ev: any): void;
  setPrefix(prefix: string | false): this;
  addAttribution(text: string): this;
  removeAttribution(text: string): this;
  _update(): void;
}
