import { describe, expect, it } from 'bun:test'
import { qrSvg, qrSvgMarkup } from '../../resources/functions/qr'

/**
 * These pin the geometry, because a QR that renders but does not scan looks
 * exactly like one that works. The end-to-end check — rasterise the SVG and
 * decode it with an independent reader — was run against Chromium's
 * BarcodeDetector and returned the encoded URL; what follows is the structure
 * that has to hold for that to keep being true.
 */

const URL = 'https://wildloop.org/app'

describe('qrSvg', () => {
  it('encodes a URL into a square module matrix', () => {
    const code = qrSvg(URL)!
    expect(code).not.toBeNull()
    // Every QR version is 4n+17 modules per side.
    expect((code.modules - 17) % 4).toBe(0)
  })

  it('surrounds the code with the four-module quiet zone the spec requires', () => {
    // Scanners genuinely need this margin; a code flush against artwork often
    // will not acquire at all.
    const code = qrSvg(URL)!
    expect(code.size).toBe(code.modules + 8)

    const narrow = qrSvg(URL, { quietZone: 1 })!
    expect(narrow.size).toBe(narrow.modules + 2)
  })

  it('draws every dark module as a unit square offset by the quiet zone', () => {
    const code = qrSvg(URL, { quietZone: 4 })!
    // The first move must land on the top-left finder pattern's origin, which
    // sits at module (0,0) — i.e. exactly the quiet-zone offset.
    expect(code.path.startsWith('M4 4h1v1h-1z')).toBe(true)
    // One move-and-close per dark module, nothing else in the path.
    expect(code.path.match(/M/g)!.length).toBe(code.path.match(/z/g)!.length)
  })

  it('grows the version with the payload instead of failing', () => {
    const short = qrSvg('hi')!
    const long = qrSvg('x'.repeat(300))!
    expect(long.modules).toBeGreaterThan(short.modules)
  })

  it('returns null for nothing to encode', () => {
    expect(qrSvg('')).toBeNull()
    expect(qrSvg('   ')).toBeNull()
  })
})

describe('qrSvgMarkup', () => {
  it('paints its own white field rather than relying on the page', () => {
    // The install sections place this on dark backgrounds.
    const markup = qrSvgMarkup(URL)
    expect(markup).toContain('fill="#fff"')
    expect(markup).toContain('<rect')
  })

  it('disables antialiasing, which softens the edges a scanner reads', () => {
    expect(qrSvgMarkup(URL)).toContain('shape-rendering="crispEdges"')
  })

  it('is labelled for assistive technology', () => {
    const markup = qrSvgMarkup(URL, { title: 'Scan to open WildLoop' })
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Scan to open WildLoop"')
  })

  it('escapes a title that would otherwise break out of the attribute', () => {
    const markup = qrSvgMarkup(URL, { title: 'a "quoted" <tag> & more' })
    expect(markup).toContain('&quot;quoted&quot;')
    expect(markup).toContain('&lt;tag&gt;')
    expect(markup).not.toContain('<tag>')
  })

  it('renders nothing rather than throwing when there is nothing to encode', () => {
    // A missing QR is a missing decoration; a thrown error on a marketing
    // page is an outage.
    expect(qrSvgMarkup('')).toBe('')
  })
})
