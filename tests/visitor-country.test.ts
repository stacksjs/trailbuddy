import { describe, expect, it } from 'bun:test'
import { countryFromAcceptLanguage, visitorCountry } from '../app/Helpers/visitorCountry'

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) })

describe('visitorCountry', () => {
  it('prefers an edge geo header over the language header', () => {
    expect(visitorCountry(req({ 'cf-ipcountry': 'DE', 'accept-language': 'en-US,en;q=0.9' }))).toBe('DE')
  })

  it('accepts each vendor spelling', () => {
    expect(visitorCountry(req({ 'x-vercel-ip-country': 'fr' }))).toBe('FR')
    expect(visitorCountry(req({ 'cloudfront-viewer-country': 'jp' }))).toBe('JP')
    expect(visitorCountry(req({ 'x-geo-country': 'at' }))).toBe('AT')
  })

  it('treats Cloudflare\'s unknown markers as unknown, not as a country', () => {
    // XX and T1 have the shape of an answer and are not one.
    expect(visitorCountry(req({ 'cf-ipcountry': 'XX', 'accept-language': 'de-DE' }))).toBe('DE')
    expect(visitorCountry(req({ 'cf-ipcountry': 'T1' }))).toBeUndefined()
  })

  it('falls back to the region subtag of the preferred language', () => {
    expect(visitorCountry(req({ 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' }))).toBe('DE')
    expect(visitorCountry(req({ 'accept-language': 'en-GB,en;q=0.5' }))).toBe('GB')
  })

  it('honours q-weights rather than document order', () => {
    // en-US is listed first but explicitly less preferred than de-DE.
    expect(countryFromAcceptLanguage('en-US;q=0.3,de-DE;q=0.9')).toBe('DE')
  })

  it('reads the region out of a script-bearing tag', () => {
    expect(countryFromAcceptLanguage('zh-Hant-TW')).toBe('TW')
  })

  it('returns undefined rather than guessing', () => {
    expect(visitorCountry(req({}))).toBeUndefined()
    expect(visitorCountry(req({ 'accept-language': '*' }))).toBeUndefined()
    // A bare language carries no region — inventing one would filter the
    // catalog down to the wrong country with full confidence.
    expect(countryFromAcceptLanguage('de')).toBeUndefined()
    expect(countryFromAcceptLanguage('en')).toBeUndefined()
  })

  it('works with plain-object headers as well as a Headers instance', () => {
    expect(visitorCountry({ headers: { 'cf-ipcountry': 'CH' } })).toBe('CH')
  })
})
