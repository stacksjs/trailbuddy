import type { CompiledExpression, ExpressionType } from './types';
export declare function boot(): void;
// The recursive compiler.
export declare function compile(expr: unknown, expectedType?: ExpressionType, path?: (string | number)[]): CompiledExpression;
