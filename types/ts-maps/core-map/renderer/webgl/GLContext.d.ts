export declare interface GLContextOptions {
  alpha?: boolean
  premultipliedAlpha?: boolean
  antialias?: boolean
}
// Thin wrapper around a WebGL2 rendering context. Centralises program
// compilation + buffer creation + viewport resizing so the higher-level
// renderer stays focused on draw orchestration. When WebGL2 is unavailable,
// the constructor throws a typed error so callers can fall back cleanly.
export declare class WebGLUnsupportedError extends Error {
  constructor(message?: string);
}
export declare class GLContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, opts?: GLContextOptions);
  compileProgram(vertSrc: string, fragSrc: string): WebGLProgram;
  _compileShader(type: GLenum, src: string): WebGLShader;
  createBuffer(data: ArrayBufferView, usage?: number): WebGLBuffer;
  resize(width: number, height: number): void;
  clear(r: number, g: number, b: number, a: number): void;
}
