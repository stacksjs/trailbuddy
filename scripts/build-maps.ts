#!/usr/bin/env bun
/**
 * Vendors the browser chunk the map pages lazily import (`public/js/ts-maps.mjs`)
 * and its stylesheet (`public/css/ts-maps.css`) out of the installed `ts-maps`.
 *
 * Both outputs are committed, because CI and the deploy image never run this —
 * they serve what is in the tree. That is deliberate: the map chunk is a
 * vendored build artefact, not something a release should be able to change
 * silently. The chunk is separate from the page bundles so that a screen with
 * no map never pays for one.
 *
 * The source is `node_modules/ts-maps` by default, so what lands here is
 * whatever the lockfile pins and anyone can reproduce it. `TS_MAPS_SOURCE`
 * points the build at a checkout instead — for working on the library and this
 * app together — and says so in its output, because a chunk built from a
 * working tree is not the chunk the lockfile describes. There is deliberately
 * no automatic fallback to a sibling checkout: silently preferring one would
 * mean this command produced different bytes on a maintainer's machine than
 * anywhere else.
 */

import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')

interface Source {
  /** Entry point handed to the bundler. */
  entry: string
  /** The stylesheet that ships alongside it. */
  css: string
  label: string
}

function candidate(dir: string, label: string): Source | null {
  // A checkout nests the package; the published tarball is the package.
  for (const base of [dir, join(dir, 'packages/ts-maps')]) {
    const css = join(base, 'src/core-map/ts-maps.css')
    if (!existsSync(css))
      continue
    // Source when there is source — a checkout's `dist` can be stale, its `src`
    // cannot. The published package ships only the built entry.
    for (const entry of [join(base, 'src/index.ts'), join(base, 'dist/index.js')]) {
      if (existsSync(entry))
        return { entry, css, label: `${label} → ${relative(ROOT, entry)}` }
    }
  }
  return null
}

function resolveSource(): Source {
  const explicit = process.env.TS_MAPS_SOURCE?.trim()

  if (explicit) {
    const found = candidate(resolve(explicit), 'TS_MAPS_SOURCE')
    if (!found)
      throw new Error(`[build:maps] no ts-maps package at TS_MAPS_SOURCE (${resolve(explicit)})`)
    console.error('[build:maps] building from a checkout, not the lockfile — do not commit this unless you mean to')
    return found
  }

  const installed = candidate(join(ROOT, 'node_modules/ts-maps'), 'node_modules')
  if (!installed)
    throw new Error('[build:maps] ts-maps is not installed. Run `bun install`.')
  return installed
}

const source = resolveSource()
console.error(`[build:maps] source: ${source.label}`)

await mkdir(join(ROOT, 'public/js'), { recursive: true })
await mkdir(join(ROOT, 'public/css'), { recursive: true })

const outfile = join(ROOT, 'public/js/ts-maps.mjs')
const bundle = await Bun.build({
  entrypoints: [source.entry],
  format: 'esm',
  minify: true,
  target: 'browser',
  // The chunk is served from `public/`, so it cannot reach back into
  // `node_modules` at runtime; everything has to be inlined.
  splitting: false,
})

if (!bundle.success) {
  for (const log of bundle.logs)
    console.error(log)
  throw new Error('[build:maps] bundle failed')
}

await Bun.write(outfile, await bundle.outputs[0].arrayBuffer())
await copyFile(source.css, join(ROOT, 'public/css/ts-maps.css'))

const kb = (path: string) => `${Math.round(Bun.file(path).size / 1024)} KB`
console.error(`[build:maps] public/js/ts-maps.mjs  ${kb(outfile)}`)
console.error(`[build:maps] public/css/ts-maps.css ${kb(join(ROOT, 'public/css/ts-maps.css'))}`)
