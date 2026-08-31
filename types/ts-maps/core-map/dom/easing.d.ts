export declare function linear(t: number): number;
export declare function easeInQuad(t: number): number;
export declare function easeOutQuad(t: number): number;
export declare function easeInOutQuad(t: number): number;
export declare function easeInCubic(t: number): number;
export declare function easeOutCubic(t: number): number;
export declare function easeInOutCubic(t: number): number;
export declare function easeInQuart(t: number): number;
export declare function easeOutQuart(t: number): number;
export declare function easeInOutQuart(t: number): number;
/**
 * `easeOutBack` overshoots slightly past 1 before settling — useful for tiny
 * button-like pops. Do **not** use this as a camera-easing default because
 * the overshoot translates into a brief zoom past the target, which looks
 * glitchy on map moves.
 */
export declare function easeOutBack(t: number): number;
/**
 * Returns an easing function that evaluates a cubic Bezier curve with the
 * given control points at `t`. The endpoints are fixed at `(0, 0)` and
 * `(1, 1)`; `(x1, y1)` and `(x2, y2)` are the two inner control points.
 *
 * This is the same parameterization as CSS `cubic-bezier(x1, y1, x2, y2)`,
 * so `cubicBezier(0.25, 0.1, 0.25, 1)` reproduces the CSS `ease` curve.
 *
 * Newton-Raphson is used to find the Bezier parameter `s` that matches the
 * requested `x = t`. We cap iteration to 10 with an epsilon of 1e-5, which
 * is plenty for frame-rate-driven animation.
 */
export declare function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction;
/**
 * Zero-dependency easing functions. Every function takes `t` in `[0, 1]` and
 * returns a value in `[0, 1]` (the `easeOutBack` variant can temporarily
 * overshoot past `1`, by design — it's the "spring-tap" feel used in button
 * micro-animations, not the default for camera moves).
 *
 * The default camera easing is `easeInOutCubic`, which matches what most
 * slippy-map libraries (Leaflet, Mapbox GL JS's `easeTo`) feel like out of
 * the box.
 */
export type EasingFunction = (_t: number) => number;
