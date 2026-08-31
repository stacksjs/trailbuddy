import type { CollisionIndex } from './CollisionIndex';
/**
 * The canvas labels are drawn on, above the tiles rather than inside them.
 *
 * Symbols used to be painted into each tile's own canvas, which had three
 * consequences worth undoing:
 *
 *   - **WebGL tiles had no labels at all.** A canvas bound to a WebGL context
 *     cannot also hand out a 2D context, so the symbol pass was skipped
 *     entirely — you opted into the faster renderer and silently lost every
 *     piece of text on the map.
 *   - **Rotation was baked in.** Placement happened once, when the tile was
 *     drawn, so turning the map carried the labels round with it: text upside
 *     down at a bearing of 180, and collision boxes still computed for north.
 *   - **Labels stopped at tile edges**, because a tile can only draw inside
 *     itself however wide the collision index's view is.
 *
 * One viewport-sized canvas fixes all three. It lives in the map's own
 * `symbolPane`, which sits above the tiles and below markers and popups — a
 * marker should never end up behind a street name — and which the map
 * counter-rotates, so placement is done in screen space and glyphs stay
 * upright however the map is turned.
 *
 * Redrawing happens at settled moments: the end of a pan, a zoom, a rotation,
 * or when tiles arrive. In between the pane carries the canvas along with the
 * map, so labels stay stuck to the ground without re-placing hundreds of them
 * every frame.
 */
export declare interface SymbolOverlayHost {
  drawSymbols: (ctx: CanvasRenderingContext2D, collision: CollisionIndex) => void
  createCollisionIndex: () => CollisionIndex
}
export declare class SymbolOverlay {
  canvas: HTMLCanvasElement | null;
  _map: any;
  _host: SymbolOverlayHost;
  _ratio: number;
  _frame: number | null;
  constructor(map: any, host: SymbolOverlayHost);
  _attach(): void;
  _pixelRatio(): number;
  _resize(): void;
  _position(): void;
  schedule(): void;
  redraw(): void;
  remove(): void;
}
