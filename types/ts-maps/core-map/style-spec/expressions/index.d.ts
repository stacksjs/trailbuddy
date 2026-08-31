import { compile } from './compile';
import { ExpressionError } from './errors';
import { isExpression } from './validate';
import type { CompiledExpression, EvaluationContext, ExpressionType } from './types';
export type { CompiledExpression, EvaluationContext, ExpressionType, RGBA } from './types';
/**
 * Compile-and-run convenience for one-shot evaluation. Prefer `compile` +
 * a long-lived `evaluate` closure on the render path — `evaluate` here
 * recompiles every call and only makes sense for tests and diagnostics.
 */
export declare function evaluate(expr: unknown, ctx: EvaluationContext, expectedType?: ExpressionType): unknown;
export { formatColor, lerpColor, parseColor } from './Color';
export { compile } from './compile';
export { ExpressionError } from './errors';
export { convertLegacyFilter } from './legacyFilter';
export { isExpression, validateExpression } from './validate';
