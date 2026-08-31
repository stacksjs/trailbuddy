/**
 * Dark palette, tuned for data on top.
 *
 * Roads sit close to the background rather than reading as bright lines: on a
 * dark incident or fleet map the overlay is the subject, and a road network at
 * high contrast competes with it. Water is desaturated navy rather than blue
 * for the same reason — it should read as "not land" without pulling the eye.
 */
export declare const DARK: Palette;
/** Light palette: a clean neutral street style, same skeleton. */
export declare const LIGHT: Palette;
// The two palettes the built-in styles are cut from.
//
// Light and dark share one layer skeleton (see `basemap.ts`) and differ only
// in this table, so a colour added to one is a compile error until it exists
// in the other. That is the whole point: the usual way a pair of themes drifts
// is one of them quietly gaining a layer the other never got.
export declare interface Palette {
  background: string
  land: string
  green: string
  water: string
  roadMajor: string
  roadMinor: string
  roadCasing: string
  buildings: string
  boundary: string
  label: string
  labelHalo: string
  labelMuted: string
}
