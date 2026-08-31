import type { LayerSpecification, LightSpecification, SourceSpecification, Style, TransitionSpecification } from './types';
export declare function diffStyles(prev: Style, next: Style): StyleDiff;
export declare interface StyleDiff {
  commands: StyleDiffCommand[]
}
export type StyleDiffCommand = | { command: 'setStyle', args: [Style] }
  | { command: 'addLayer', args: [LayerSpecification, string | undefined] }
  | { command: 'removeLayer', args: [string] }
  | { command: 'setLayoutProperty', args: [string, string, unknown] }
  | { command: 'setPaintProperty', args: [string, string, unknown] }
  | { command: 'setLayerZoomRange', args: [string, number | undefined, number | undefined] }
  | { command: 'setFilter', args: [string, unknown] }
  | { command: 'addSource', args: [string, SourceSpecification] }
  | { command: 'removeSource', args: [string] }
  | { command: 'setSourceData', args: [string, unknown] }
  | { command: 'setTransition', args: [TransitionSpecification] }
  | { command: 'setLight', args: [LightSpecification] }
