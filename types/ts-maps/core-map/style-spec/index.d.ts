export type { StyleDiff, StyleDiffCommand } from './diff';
export type {
  CompiledExpression,
  EvaluationContext,
  ExpressionType,
  RGBA,
} from './expressions/index';
export type { PropertySchema, PropertySchemaType } from './schema';
export type {
  BackgroundLayerSpecification,
  BackgroundLayoutSpecification,
  BackgroundPaintSpecification,
  CircleLayerSpecification,
  CircleLayoutSpecification,
  CirclePaintSpecification,
  ColorSpecification,
  ExpressionSpecification,
  FillLayerSpecification,
  FillLayoutSpecification,
  FillPaintSpecification,
  FilterSpecification,
  FormattedSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  LayerType,
  LightSpecification,
  LineLayerSpecification,
  LineLayoutSpecification,
  LinePaintSpecification,
  PaddingSpecification,
  PromoteIdSpecification,
  PropertyValueSpecification,
  RasterDEMSourceSpecification,
  RasterLayerSpecification,
  RasterLayoutSpecification,
  RasterPaintSpecification,
  RasterSourceSpecification,
  ResolvedImageSpecification,
  SourceSpecification,
  SpriteSource,
  Style,
  SymbolLayerSpecification,
  SymbolLayoutSpecification,
  SymbolPaintSpecification,
  TransitionSpecification,
  VectorSourceSpecification,
} from './types';
export type { ValidationError } from './validate';
export { diffStyles } from './diff';
export {
  compile as compileExpression,
  convertLegacyFilter,
  evaluate as evaluateExpression,
  ExpressionError,
  formatColor,
  isExpression,
  lerpColor,
  parseColor,
  validateExpression,
} from './expressions/index';
export { layerTypes, layoutPropertySchemas, paintPropertySchemas, sourceTypes } from './schema';
export {
  validateLayer,
  validateLayoutProperty,
  validatePaintProperty,
  validateSource,
  validateStyle,
} from './validate';
