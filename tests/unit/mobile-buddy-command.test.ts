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
    const projectRoot = new URL('../../', import.meta.url).pathname
    const clientSources: string[] = []
    for await (const path of new Bun.Glob('resources/**/*.{stx,ts}').scan({ cwd: projectRoot, absolute: true }))
      clientSources.push(await Bun.file(path).text())

    // Production installs from npm because storage/framework is excluded from
    // server releases. STX clients deliberately import the checked-in bundle,
    // which carries Craft's browser runtime without an unresolved native peer.
    expect(packageJson.dependencies['@stacksjs/mobile']).toMatch(/^\^0\.70\./)
    expect(gitignore).toContain('!storage/framework/core/mobile/dist/**')
    expect(runtime).not.toContain('craft-native/mobile')
    expect(clientSources.some(source => source.includes('~/storage/framework/core/mobile/dist/index.js'))).toBe(true)
    expect(clientSources.every(source => !source.includes("from '@stacksjs/mobile'"))).toBe(true)
  })
})
