// Pick a subdomain for a given tile coord. Stable, so the same tile always
// resolves to the same subdomain — important for HTTP-cache friendliness.
export declare function getSubdomain(tilePoint: { x: number, y: number }, subdomains: string | string[]): string;
// Compose a URL from a template and a bag of variables. The template may
// reference any key provided in `data`; missing keys throw (so typos fail
// loudly rather than silently producing a broken URL).
export declare function composeTileUrl(template: string, data: TileUrlData): string;
export declare interface TileUrlData {
  x: number
  y: number
  z: number
  s: string
  r: string
  '-y'?: number
  [key: string]: any
}
