import { describe, expect, it } from 'bun:test'
import { cli } from '@stacksjs/cli'
import registerMobileCommands from '../../app/Commands/Mobile'

describe('mobile Buddy commands', () => {
  it('registers every native build and iPhone preview entry point', () => {
    const buddy = cli('buddy')
    registerMobileCommands(buddy)

    const names = buddy.commands.map(command => command.rawName)
    expect(names).toContain('build:android')
    expect(names).toContain('build:ios')
    expect(names).toContain('build:mobile')
    expect(names).toContain('build:iphone')
    expect(names).toContain('preview:iphone')
  })

  it('does not shadow commands supplied by a newer Buddy release', () => {
    const buddy = cli('buddy')
    buddy.command('build:ios', 'Framework iOS build')
    registerMobileCommands(buddy)

    expect(buddy.commands.filter(command => command.rawName === 'build:ios')).toHaveLength(1)
  })

  it('ships the self-contained mobile runtime used by clean builds', async () => {
    const packageJson = await Bun.file(new URL('../../package.json', import.meta.url)).json()
    const gitignore = await Bun.file(new URL('../../.gitignore', import.meta.url)).text()
    const runtime = await Bun.file(new URL('../../storage/framework/core/mobile/dist/index.js', import.meta.url)).text()

    // From npm, not the vendored path. Production excludes the whole

    // storage/framework tree on purpose (see SOURCE_RELEASE_EXCLUDES and

    // app/ProductionPreloader.ts), so a file: dependency into that tree

    // cannot install on the server — the release shipped it gutted and the

    // deploy died on `ENOENT: failed opening cache/package/version dir`.

    // @stacksjs/mobile is published now, which it was not when this was

    // vendored; the built runtime asserted below still ships in the repo,

    // so clean iOS builds keep the self-contained copy this test guards.

    expect(packageJson.dependencies['@stacksjs/mobile']).toMatch(/^\^0\.70\./)
    expect(gitignore).toContain('!storage/framework/core/mobile/dist/**')
    expect(runtime).not.toContain('craft-native/mobile')
  })
})
