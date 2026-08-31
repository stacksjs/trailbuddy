import { GLContext } from './GLContext';
export declare interface LineOptions {
  width: number
  color: RGBA
  cap?: 'butt' | 'round' | 'square'
  join?: 'miter' | 'round' | 'bevel'
}
export declare interface CircleOptions {
  radius: number
  color: RGBA
  strokeColor?: RGBA
  strokeWidth?: number
}
declare interface FillProgram {
  program: WebGLProgram
  u_matrix: WebGLUniformLocation | null
  u_color: WebGLUniformLocation | null
  a_position: number
}
declare interface LineProgram {
  program: WebGLProgram
  u_matrix: WebGLUniformLocation | null
  u_color: WebGLUniformLocation | null
  u_width: WebGLUniformLocation | null
  a_position: number
  a_normal: number
  a_progress: number
}
declare interface CircleProgram {
  program: WebGLProgram
  u_matrix: WebGLUniformLocation | null
  u_color: WebGLUniformLocation | null
  u_stroke_color: WebGLUniformLocation | null
  u_stroke_width: WebGLUniformLocation | null
  u_radius: WebGLUniformLocation | null
  a_center: number
  a_offset: number
}
declare interface FillExtrusionProgram {
  program: WebGLProgram
  u_matrix: WebGLUniformLocation | null
  u_color: WebGLUniformLocation | null
  u_opacity: WebGLUniformLocation | null
  a_position: number
  a_normal: number
}
declare interface SkyProgram {
  program: WebGLProgram
  u_sky_color: WebGLUniformLocation | null
  u_horizon_color: WebGLUniformLocation | null
  u_pitch_t: WebGLUniformLocation | null
  u_horizon_blend: WebGLUniformLocation | null
  a_position: number
}
export declare interface FillExtrusionFootprint {
  rings: Array<Array<{ x: number, y: number }>>
}
declare type RGBA = [number, number, number, number];
export declare class WebGLTileRenderer {
  ctx: GLContext;
  _projection: Float32Array;
  _fill: FillProgram;
  _line: LineProgram;
  _circle: CircleProgram;
  _fillExtrusion: FillExtrusionProgram | null;
  _sky: SkyProgram | null;
  _buffers: WebGLBuffer[];
  constructor(canvas: HTMLCanvasElement);
  setProjectionMatrix(m: Float32Array): void;
  clear(): void;
  destroy(): void;
  drawFill(triangles: Float32Array, color: RGBA): void;
  drawLine(linestrip: Float32Array, options: LineOptions): void;
  drawCircles(centers: Float32Array, options: CircleOptions): void;
  drawFillExtrusion(footprints: FillExtrusionFootprint[], heights: number[], base: number[] | number, color: RGBA, opacity: number, projectionMatrix?: Float32Array): number;
  drawSky(skyColor: RGBA, horizonColor: RGBA, pitchT: number, horizonBlend: number): void;
  drawTerrain(positions: Float32Array, indices: Uint32Array, color: RGBA, opacity: number, projectionMatrix?: Float32Array): number;
  _drawCirclesInstanced(prog: CircleProgram, centers: Float32Array): void;
  _drawCirclesBatched(prog: CircleProgram, centers: Float32Array): void;
  _buildFillProgram(): FillProgram;
  _buildLineProgram(): LineProgram;
  _buildCircleProgram(): CircleProgram;
  _buildFillExtrusionProgram(): FillExtrusionProgram;
  _buildSkyProgram(): SkyProgram;
  _disposeBuffer(buf: WebGLBuffer): void;
}
