export declare function identity(out?: Mat4): Mat4;
// Build an orthographic projection matrix. Column-major to match WebGL.
export declare function ortho(left: number, right: number, bottom: number, top: number, near: number, far: number, out?: Mat4): Mat4;
export declare function translate(out: Mat4, a: Mat4, x: number, y: number, z: number): Mat4;
export declare function scale(out: Mat4, a: Mat4, x: number, y: number, z: number): Mat4;
export declare function rotateZ(out: Mat4, a: Mat4, rad: number): Mat4;
export declare function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4;
// Minimal 4x4 matrix utilities (column-major, GLSL-compatible).
//
// Just the operations the WebGL renderer needs: identity, ortho, translate,
// scale, rotateZ, multiply. A deliberate dependency-free subset; behaviour
// mirrors the equivalent `gl-matrix` entry points so callers familiar with
// that library stay oriented.
export type Mat4 = Float32Array;
