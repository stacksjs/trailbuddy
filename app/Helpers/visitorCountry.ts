/**
 * The ISO 3166-1 alpha-2 country a request most likely comes from.
 *
 * Trail catalogs are intensely local: a visitor in Munich searching a US-first
 * catalog gets a list of places they cannot drive to, which reads as the site
 * having no trails rather than the site showing the wrong ones. Every catalog
 * query therefore wants a country, and almost no caller has one to pass.
 *
 * Signals, most trustworthy first:
 *
 *  1. An edge geo header. A CDN resolves the client IP against a real
 *     geolocation database, which is far better than anything derivable from
 *     the request alone. Several vendors' spellings are accepted so this keeps
 *     working if the edge changes.
 *
 *  2. The region subtag of `Accept-Language` (`de-DE` -> DE). Weaker: it is a
 *     language preference, not a location, and `en-US` is the default on
 *     devices nowhere near the US. Good enough as a fallback, and the browser
 *     volunteers it on every request.
 *
 * Returns undefined when nothing is known, which callers must treat as "do not
 * filter" — showing the whole catalog is a far better failure than confidently
 * showing the wrong country's.
 */

/** Edge geo headers, in the order they should be trusted. */
const GEO_HEADERS = [
  'cf-ipcountry', // Cloudflare
  'x-vercel-ip-country', // Vercel
  'x-geo-country', // rpx / generic reverse proxies
  'x-country-code',
  'fastly-client-country', // Fastly
  'cloudfront-viewer-country', // AWS CloudFront
]

function headerValue(request: any, name: string): string | undefined {
  const headers = request?.headers
  if (!headers)
    return undefined

  // Headers arrive as a Headers instance on the server and as a plain object
  // through some test harnesses; both are worth supporting.
  const raw = typeof headers.get === 'function'
    ? headers.get(name)
    : (headers[name] ?? headers[name.toLowerCase()])

  const value = typeof raw === 'string' ? raw.trim() : ''
  return value || undefined
}

/** `XX`, uppercased, or undefined when it is not a country code. */
function normalizeCountry(value: string | undefined): string | undefined {
  if (!value)
    return undefined

  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code))
    return undefined

  // Cloudflare sends T1 for Tor exit nodes and XX when it cannot place the
  // address. Both are "unknown" wearing the shape of an answer.
  if (code === 'XX' || code === 'T1')
    return undefined

  return code
}

/** The region subtag of the highest-weighted acceptable language. */
export function countryFromAcceptLanguage(header: string | undefined): string | undefined {
  if (!header)
    return undefined

  const entries = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map(p => p.trim()).find(p => p.startsWith('q='))
      // A tag with no q is q=1 by definition, and the highest weight wins.
      const weight = q ? Number.parseFloat(q.slice(2)) : 1
      return { tag: (tag ?? '').trim(), weight: Number.isFinite(weight) ? weight : 0 }
    })
    .filter(entry => entry.tag && entry.tag !== '*')
    .sort((a, b) => b.weight - a.weight)

  for (const { tag } of entries) {
    // `de-DE`, `en-GB`, `zh-Hant-TW` — the region is the last 2-letter subtag.
    const subtags = tag.split('-')
    for (let i = subtags.length - 1; i >= 1; i--) {
      const country = normalizeCountry(subtags[i])
      if (country)
        return country
    }
  }

  return undefined
}

export function visitorCountry(request: any): string | undefined {
  for (const header of GEO_HEADERS) {
    const country = normalizeCountry(headerValue(request, header))
    if (country)
      return country
  }

  return countryFromAcceptLanguage(headerValue(request, 'accept-language'))
}
