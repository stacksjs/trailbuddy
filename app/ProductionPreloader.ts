import { Glob } from 'bun'
import { join } from 'node:path'

const isBuild = process.argv.some(argument => argument === 'build' || argument.endsWith('/bun-build'))
const isInstall = process.env.npm_lifecycle_event === 'postinstall'

if (!isBuild && !isInstall) {
  const { autoLoadEnv } = await import('@stacksjs/env')
  autoLoadEnv({ quiet: true, env: process.env.APP_ENV })

  // WildLoop actions intentionally use Stacks' auto-import API. Populate it
  // from published runtime packages so production does not depend on the
  // 420 MB vendored framework source tree.
  const packages = [
    '@stacksjs/actions',
    '@stacksjs/router',
    '@stacksjs/orm',
    '@stacksjs/validation',
    '@stacksjs/strings',
    '@stacksjs/arrays',
    '@stacksjs/objects',
    '@stacksjs/collections',
    '@stacksjs/path',
    '@stacksjs/storage',
    '@stacksjs/env',
    '@stacksjs/config',
    '@stacksjs/logging',
    '@stacksjs/cache',
    '@stacksjs/queue',
    '@stacksjs/events',
    '@stacksjs/notifications',
    '@stacksjs/email',
    '@stacksjs/security',
    '@stacksjs/auth',
    '@stacksjs/database',
    '@stacksjs/error-handling',
  ]

  for (const packageName of packages) {
    try {
      const module = await import(packageName)
      for (const [name, value] of Object.entries(module)) {
        if (name !== 'default' && typeof value !== 'undefined' && !(name in globalThis))
          Object.assign(globalThis, { [name]: value })
      }
    }
    catch {
      // Optional Stacks packages are allowed to be absent.
    }
  }

  const root = join(import.meta.dir, '..')
  const glob = new Glob('**/*.ts')

  for await (const file of glob.scan({ cwd: join(root, 'resources/functions'), absolute: true, onlyFiles: true })) {
    if (file.endsWith('.d.ts')) continue
    try {
      const module = await import(file)
      for (const [name, value] of Object.entries(module)) {
        if (name !== 'default' && typeof value !== 'undefined' && !(name in globalThis))
          Object.assign(globalThis, { [name]: value })
      }
    }
    catch {
      // Browser-only composables are intentionally ignored by the API runtime.
    }
  }

  for await (const file of glob.scan({ cwd: join(root, 'app/Models'), absolute: true, onlyFiles: true })) {
    if (file.endsWith('.d.ts') || file.endsWith('/index.ts')) continue
    const name = file.split('/').pop()?.replace(/\.ts$/, '')
    if (!name || name in globalThis) continue
    try {
      const module = await import(file)
      if (module.default) Object.assign(globalThis, { [name]: module.default })
    }
    catch {
      // A model with an unavailable optional integration should not stop boot.
    }
  }
}
