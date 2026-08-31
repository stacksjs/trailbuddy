// Returns the unique ID of an object, assigning it one if it doesn't have it.
export declare function stamp(obj: any): number;
export declare function setLastId(id: number): void;
// Returns a function which executes `fn` no more than one time per given amount of `time`.
export declare function throttle< T extends (...args: any[]) => any >(fn: T, time: number, context?: any): (...args: Parameters < T>) => void;
// Returns the number `num` modulo `range` so it lies within `range[0]` and `range[1]`.
export declare function wrapNum(x: number, range: [number, number] | number[], includeMax?: boolean): number;
// Always returns false.
export declare function falseFn(..._args: any[]): false;
// Returns the number `num` rounded with specified `precision` (default 6 decimal places).
export declare function formatNum(num: number, precision?: number | false): number;
// Trims and splits the string on whitespace and returns the array of parts.
export declare function splitWords(str: string): string[];
// Merges the given properties to the `options` of the `obj`, returning the resulting options.
export declare function setOptions< T extends { options?: Record<string, any> } >(obj: T, options?: Record<string, any>): Record<string, any>;
// Simple templating facility: `'Hello {a}, {b}'` + `{a: 'foo', b: 'bar'}` -> `'Hello foo, bar'`.
export declare function template(str: string, data: Record<string, any>): string;
// No-op function.
export declare function noop(): void;
/**
 * Various utility functions, used internally.
 * @defaultValue 0
 */
export declare let lastId: number;
