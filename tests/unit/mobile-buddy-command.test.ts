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

    expect(packageJson.dependencies['@stacksjs/mobile']).toBe('file:storage/framework/core/mobile')
    expect(gitignore).toContain('!storage/framework/core/mobile/dist/**')
    expect(runtime).not.toContain('craft-native/mobile')
  })
})
