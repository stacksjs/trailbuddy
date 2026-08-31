#!/usr/bin/env bun
/**
 * Vendors ts-maps into this repo: the browser chunk the map pages lazily import
 * (`public/js/ts-maps.mjs`), its stylesheet (`public/css/ts-maps.css`), and the
 * type declarations that describe that exact chunk (`types/ts-maps/`).
 *
 * All three outputs are committed, because CI and the deploy image never run
 * this — they serve and typecheck what is in the tree. That is deliberate: the
 * map chunk is a vendored build artefact, not something a release should be
 * able to change silently.
 *
 * The declarations are vendored *because* the runtime is. The published
 * `ts-maps` package is behind the source tree — it has no `styles` module and
 * none of the game layers (`TerritoryLayer`, `RunTrailLayer`, `TerritoryStore`,
 * `LoopDetector`) this app's territory and recorder screens are built on. If
 * the app typechecked against npm while running the sibling build, every one of
 * those would be a type error, and the two could drift without anything
 * noticing. Emitting both from one source in one command is what stops that.
 * `tsconfig.app.json` maps the `ts-maps` specifier at `types/ts-maps`.
 *
 * Source resolution, in order:
 *
 *   1. `TS_MAPS_SOURCE` — an explicit checkout, for CI or a one-off.
 *   2. `../../Libraries/ts-maps` — the sibling checkout. Preferred.
 *   3. `node_modules/ts-maps` — the published package, as a fallback.
 *
 * Bundling from `src` rather than from `dist` is what keeps (2) honest: a
 * checkout's `dist/` can be stale, its `src/` cannot. Declarations have to come
 * from `dist/`, so the sibling is rebuilt first.
 */

import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')

interface Source {
  /** Package root: the directory holding `src/` and `dist/`. */
  base: string
  /** Whether `dist/` has to be rebuilt before its declarations are copied. */
  buildable: boolean
  label: string
}

function candidate(dir: string, label: string): Source | null {
  // The published package flattens `packages/ts-maps/src` to `src`.
  for (const base of [join(dir, 'packages/ts-maps'), dir]) {
    if (existsSync(join(base, 'src/index.ts')) && existsSync(join(base, 'src/core-map/ts-maps.css')))
      return { base, buildable: existsSync(join(base, 'build.ts')), label: `${label} (${base})` }
  }
  return null
}

function resolveSource(): Source {
  const explicit = process.env.TS_MAPS_SOURCE?.trim()
  const tried: string[] = []

  const candidates: Array<[string, string]> = [
    ...(explicit ? [[resolve(explicit), 'TS_MAPS_SOURCE'] as [string, string]] : []),
    [resolve(ROOT, '../../Libraries/ts-maps'), 'sibling checkout'],
    [join(ROOT, 'node_modules/ts-maps'), 'node_modules'],
  ]

  for (const [dir, label] of candidates) {
    const found = candidate(dir, label)
    if (found)
      return found
    tried.push(`${label}: ${dir}`)
  }

  throw new Error(
    `[build:maps] no ts-maps source found. Tried:\n  ${tried.join('\n  ')}\n`
    + 'Set TS_MAPS_SOURCE to a ts-maps checkout, or run `bun install`.',
  )
}

/** Every `.d.ts` under `dir`, as paths relative to it. */
async function declarations(dir: string, prefix = ''): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory())
      found.push(...await declarations(join(dir, entry.name), rel))
    else if (entry.name.endsWith('.d.ts'))
      found.push(rel)
  }
  return found
}

const source = resolveSource()
console.error(`[build:maps] source: ${source.label}`)

// --- runtime ----------------------------------------------------------------

await mkdir(join(ROOT, 'public/js'), { recursive: true })
await mkdir(join(ROOT, 'public/css'), { recursive: true })

const outfile = join(ROOT, 'public/js/ts-maps.mjs')
const bundle = await Bun.build({
  entrypoints: [join(source.base, 'src/index.ts')],
  format: 'esm',
  minify: true,
  target: 'browser',
  // The chunk is served from `public/`, so it cannot reach back into the
  // source tree at runtime; everything has to be inlined.
  splitting: false,
})

if (!bundle.success) {
  for (const log of bundle.logs)
    console.error(log)
  throw new Error('[build:maps] bundle failed')
}

await Bun.write(outfile, await bundle.outputs[0].arrayBuffer())
await copyFile(join(source.base, 'src/core-map/ts-maps.css'), join(ROOT, 'public/css/ts-maps.css'))

// --- declarations -----------------------------------------------------------

if (source.buildable) {
  // `dist/` is what carries declarations, and a checkout's is whatever was
  // last built there — which is not necessarily the `src/` just bundled.
  console.error('[build:maps] rebuilding source checkout for declarations…')
  const proc = Bun.spawn({
    cmd: ['bun', 'run', 'build'],
    cwd: source.base,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (await proc.exited !== 0)
    throw new Error(`[build:maps] \`bun run build\` failed in ${source.base}`)
}

const distDir = join(source.base, 'dist')
if (!existsSync(join(distDir, 'index.d.ts')))
  throw new Error(`[build:maps] no declarations at ${distDir}. Build the ts-maps checkout first.`)

const typesDir = join(ROOT, 'types/ts-maps')
await rm(typesDir, { recursive: true, force: true })
const files = await declarations(distDir)
for (const file of files) {
  const target = join(typesDir, file)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(join(distDir, file), target)
}

const kb = (path: string) => `${Math.round(Bun.file(path).size / 1024)} KB`
console.error(`[build:maps] ${relative(ROOT, outfile)}  ${kb(outfile)}`)
console.error(`[build:maps] public/css/ts-maps.css ${kb(join(ROOT, 'public/css/ts-maps.css'))}`)
console.error(`[build:maps] types/ts-maps/ ${files.length} declaration files`)
