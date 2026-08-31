export declare function registerInterpolateOps(): void;
declare type Interp = {
  kind: 'linear'
} | {
  kind: 'exponential'
  base: number
} | {
  kind: 'cubic-bezier'
  bezier: (u: number) => number
}
// Pick the blender for a given return type. For types we don't know how to
// interpolate (strings, booleans, resolved images) we fall back to stepping —
// the spec says this is the required behaviour.
declare type Blender = (_a: unknown, _b: unknown, _t: number) => unknown;
