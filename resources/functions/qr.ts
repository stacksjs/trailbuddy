import { QRErrorCorrectLevel, toMatrix } from 'ts-qr-codes'

/**
 * Render a QR code as an inline SVG path.
 *
 * `ts-qr-codes` gives us the module matrix; drawing it is left to us on
 * purpose. An SVG rather than a canvas means the code is resolution
 * independent — it stays crisp on a Retina laptop and in a print stylesheet —
 * needs no DOM to produce, so it survives a server render, and costs a few
 * hundred bytes of markup instead of a rasterised image.
 *
 * The whole matrix becomes ONE `<path>` with a move-and-draw per dark module.
 * A `<rect>` per module is the obvious encoding and produces ~900 elements for
 * a URL this length, which is enough DOM to be visible in a layout pass.
 */

export interface QrOptions {
  /**
   * Modules of empty space around the code. The spec calls for 4 and scanners
   * genuinely need it: a QR flush against surrounding artwork often will not
   * acquire. Do not lower this without testing on a real phone.
   */
  quietZone?: number
  /** Error-correction level. M (~15% recoverable) is the usual default. */
  level?: 'L' | 'M' | 'Q' | 'H'
}

export interface QrSvg {
  /** The `d` attribute for a single `<path>`, in module units. */
  path: string
  /** Width/height of the viewBox, in module units, including the quiet zone. */
  size: number
  /** Modules per side, excluding the quiet zone. */
  modules: number
}

const LEVELS = {
  L: QRErrorCorrectLevel.L,
  M: QRErrorCorrectLevel.M,
  Q: QRErrorCorrectLevel.Q,
  H: QRErrorCorrectLevel.H,
} as const

/**
 * Build the SVG geometry for `text`.
 *
 * Returns null rather than throwing when the text cannot be encoded — a URL
 * too long for the largest version, or an empty string. A missing QR is a
 * missing decoration; a thrown error from a marketing page is an outage.
 */
export function qrSvg(text: string, options: QrOptions = {}): QrSvg | null {
  const value = text.trim()
  if (!value)
    return null

  const quietZone = options.quietZone ?? 4

  try {
    const matrix = toMatrix(value, LEVELS[options.level ?? 'M'])
    const modules = matrix.length
    if (!modules)
      return null

    // `h1v1h-1z` closes a unit square from the move point, so each dark module
    // costs about 12 bytes and the renderer sees one path.
    let path = ''
    for (let row = 0; row < modules; row++) {
      const line = matrix[row]!
      for (let col = 0; col < modules; col++) {
        if (line[col])
          path += `M${col + quietZone} ${row + quietZone}h1v1h-1z`
      }
    }

    return { path, size: modules + quietZone * 2, modules }
  }
  catch {
    return null
  }
}

/**
 * A complete `<svg>` string for `text`, ready to drop into a template.
 *
 * `shape-rendering="crispEdges"` matters: without it the renderer antialiases
 * every module edge, which softens the black/white boundary a scanner is
 * looking for.
 */
export function qrSvgMarkup(
  text: string,
  options: QrOptions & { title?: string, class?: string } = {},
): string {
  const code = qrSvg(text, options)
  if (!code)
    return ''

  const title = options.title ?? `QR code for ${text}`
  const className = options.class ? ` class="${escapeAttribute(options.class)}"` : ''

  return [
    `<svg viewBox="0 0 ${code.size} ${code.size}" xmlns="http://www.w3.org/2000/svg"`,
    ` role="img" aria-label="${escapeAttribute(title)}" shape-rendering="crispEdges"${className}>`,
    // The light modules are drawn, not left transparent: a QR over a coloured
    // or dark background needs its own white field to be readable at all.
    `<rect width="${code.size}" height="${code.size}" fill="#fff"/>`,
    `<path d="${code.path}" fill="#0b1b15"/>`,
    '</svg>',
  ].join('')
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
