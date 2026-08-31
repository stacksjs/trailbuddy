import type { RGBA } from './types';
/**
 * Parse a CSS color string into an RGBA tuple with float channels in [0..1].
 * Returns null if the string can't be recognised — callers decide whether to
 * treat that as an error or substitute a default.
 */
export declare function parseColor(css: string): RGBA | null;
/**
 * Linearly blend two RGBA tuples in straight sRGB. t is clamped to [0..1].
 */
export declare function lerpColor(a: RGBA, b: RGBA, t: number): RGBA;
/**
 * Render an RGBA tuple as a CSS `rgba(...)` string. Used mainly for diagnostic
 * output and as the canonical wire form when handing colors to canvas.
 */
export declare function formatColor(c: RGBA): string;
