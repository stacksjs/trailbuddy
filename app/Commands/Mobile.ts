import type { CLI } from '@stacksjs/types'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { intro, log, outro } from '@stacksjs/cli'
import { ExitCode } from '@stacksjs/types'

interface RegisteredCommand {
  name?: string
  rawName?: string
}

const projectRoot = resolve(import.meta.dir, '../..')

function hasCommand(cli: CLI, name: string): boolean {
  const commands = (cli as CLI & { commands?: RegisteredCommand[] }).commands
  return commands?.some(command => command.rawName === name || command.name === name) ?? false
}

async function runScript(script: string, label: string): Promise<boolean> {
  log.info(`Running bun run ${script}`)
  const craftPackages = resolve(projectRoot, '../../Tools/craft/packages')
  const localIosBuilder = resolve(craftPackages, 'ios/src/index.ts')
  const localAndroidBuilder = resolve(craftPackages, 'android/src/index.ts')
  const env = {
    ...process.env,
    ...(existsSync(localIosBuilder) && !process.env.CRAFT_IOS_SRC ? { CRAFT_IOS_SRC: localIosBuilder } : {}),
    ...(existsSync(localAndroidBuilder) && !process.env.CRAFT_ANDROID_SRC ? { CRAFT_ANDROID_SRC: localAndroidBuilder } : {}),
  }
  const child = Bun.spawn(['bun', 'run', script], {
    cwd: projectRoot,
    env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await child.exited

  if (exitCode !== 0) {
    log.error(`${label} failed with exit code ${exitCode}.`)
    return false
  }

  return true
}

function registerBuildCommand(cli: CLI, platform: 'android' | 'ios'): void {
  const name = `build:${platform}`
  if (hasCommand(cli, name)) return

  cli
    .command(name, `Build the native ${platform === 'ios' ? 'iOS' : 'Android'} application`)
    .alias(`prod:${platform}`)
    .action(async () => {
      const perf = await intro(`buddy ${name}`)
      if (!await runScript(name, `${platform === 'ios' ? 'iOS' : 'Android'} build`))
        process.exit(ExitCode.FatalError)
      await outro(`${platform === 'ios' ? 'iOS' : 'Android'} application built`, { startTime: perf, useSeconds: true })
    })
}

export default function (cli: CLI): void {
  registerBuildCommand(cli, 'android')
  registerBuildCommand(cli, 'ios')

  if (!hasCommand(cli, 'build:mobile')) {
    cli
      .command('build:mobile', 'Build the native iOS and Android applications')
      .alias('prod:mobile')
      .action(async () => {
        const perf = await intro('buddy build:mobile')
        const androidSucceeded = await runScript('build:android', 'Android build')
        const iosSucceeded = await runScript('build:ios', 'iOS build')
        if (!androidSucceeded || !iosSucceeded)
          process.exit(ExitCode.FatalError)
        await outro('iOS and Android applications built', { startTime: perf, useSeconds: true })
      })
  }

  if (!hasCommand(cli, 'build:iphone')) {
    cli
      .command('build:iphone', 'Compile and validate an unsigned Release build for a physical iPhone')
      .action(async () => {
        const perf = await intro('buddy build:iphone')
        if (!await runScript('check:iphone', 'iPhone Release build'))
          process.exit(ExitCode.FatalError)
        await outro('Physical-iPhone Release application built and validated', { startTime: perf, useSeconds: true })
      })
  }

  if (!hasCommand(cli, 'preview:iphone')) {
    cli
      .command('preview:iphone', 'Build, sign, install, and launch WildLoop on a connected iPhone')
      .option('--bundled', 'Bundle the local frontend instead of using the configured remote URL', { default: false })
      .action(async (options: { bundled: boolean }) => {
        const perf = await intro('buddy preview:iphone')
        const script = options.bundled ? 'preview:iphone:bundled' : 'preview:iphone'
        if (!await runScript(script, 'iPhone preview'))
          process.exit(ExitCode.FatalError)
        await outro('WildLoop installed and launched on the connected iPhone', { startTime: perf, useSeconds: true })
      })
  }
}
