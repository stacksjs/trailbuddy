// IconAtlas — packs caller-supplied sprite entries into a single canvas.
// Sprite pixel data may come from an HTMLImageElement, an HTMLCanvasElement,
// or a raw ImageData buffer; callers keep ownership of the source bitmap.
export declare interface SpriteEntry {
  id: string
  x: number
  y: number
  width: number
  height: number
  pixelRatio?: number
  sdf?: boolean
}
export declare interface DrawIconOptions {
  size?: number
  rotation?: number
  color?: string
  opacity?: number
  haloColor?: string
  haloWidth?: number
}
export declare class IconAtlas {
  canvas: HTMLCanvasElement;
  constructor();
  addSprite(entry: SpriteEntry, source: HTMLImageElement | HTMLCanvasElement | ImageData): void;
  get(id: string): SpriteEntry | undefined;
  drawIcon(ctx: CanvasRenderingContext2D, id: string, dx: number, dy: number, opts?: DrawIconOptions): void;
}
