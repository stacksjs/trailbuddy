import type { ExpressionType } from './types';
/**
 * Quick predicate: does this value look like an expression? Used by the
 * style-spec validator to decide whether to hand off to us or to match
 * literal-shape rules.
 */
export declare function isExpression(value: unknown): boolean;
/**
 * Validate an expression statically. Returns an array of error messages;
 * empty array means valid. Non-array inputs are accepted unconditionally
 * here — literal shape checking belongs to the caller's schema pass.
 */
export declare function validateExpression(value: unknown, expectedType: ExpressionType): string[];
