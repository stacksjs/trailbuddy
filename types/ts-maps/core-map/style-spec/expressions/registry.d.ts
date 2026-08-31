import type { CompiledExpression, ExpressionType } from './types';
// `ExpressionType` is used in the `OperatorCompiler` signature below — export
// so consumers can satisfy the shape without reaching into `./types` directly.
export type { ExpressionType };
export declare function registerOperator(name: string, fn: OperatorCompiler): void;
export declare function getOperator(name: string): OperatorCompiler | undefined;
export declare function hasOperator(name: string): boolean;
// Introspection for validators — walkers that need to know whether a head
// token is a known operator (vs. an arbitrary data literal).
export declare function listOperators(): string[];
// A compiler callback — operators call this to compile their child arguments.
// `expected` is the type the child should produce; 'value' means anything.
export type CompileFn = (
  expr: unknown,
  expected: ExpressionType,
  path: (string | number)[],
) => CompiledExpression;
// An operator's compile-time function: given the raw expression array and a
// recursive compiler, return a CompiledExpression. The operator owns arity
// checking and argument compilation; the central compiler does not look at
// the shape of individual operator arguments. `expected` is the type the
// enclosing context wants back — used by `interpolate`/`step` to decide how
// their child branches should be compiled.
export type OperatorCompiler = (
  args: unknown[],
  compile: CompileFn,
  path: (string | number)[],
  expected: ExpressionType,
) => CompiledExpression;
