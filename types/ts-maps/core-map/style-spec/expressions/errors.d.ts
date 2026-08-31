// A small error class for expression compilation and evaluation failures.
// Attaches the offending expression and the path through the AST so that
// style authors can locate the problem without guessing.
export declare class ExpressionError extends Error {
  expression: unknown;
  path: (string | number)[];
  constructor(message: string, expression: unknown, path?: (string | number)[]);
}
