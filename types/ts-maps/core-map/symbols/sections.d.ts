import type { FormattedSection } from '../style-spec/expressions/formatted';
import type { GlyphAtlas } from './GlyphAtlas';
/**
 * Measure a formatted label as one box.
 *
 * Height is the tallest section's, so a small section next to a large one does
 * not shrink the label's footprint and let something else overlap it.
 */
export declare function measureSections(atlas: GlyphAtlas, sections: FormattedSection[], base: SectionBaseStyle): SectionLayout;
/**
 * Draw a formatted label from `x` along a shared baseline at `y`.
 *
 * Sections sit on the baseline rather than being centred on it, which is what
 * keeps a size change reading as one line of text instead of two runs that
 * happen to be adjacent.
 */
export declare function drawSections(ctx: CanvasRenderingContext2D, atlas: GlyphAtlas, sections: FormattedSection[], x: number, y: number, base: SectionBaseStyle): void;
export declare interface SectionBaseStyle {
  size: number
  color: string
  italic?: boolean
  bold?: boolean
  family?: string
  haloColor?: string
  haloWidth?: number
}
export declare interface SectionLayout {
  width: number
  height: number
  ascent: number
  descent: number
}
