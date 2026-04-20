import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CLI, CliOptions } from '@stacksjs/types'
import process from 'node:process'
import { runAction, setupSSL } from '@stacksjs/actions'
import { log, runCommand } from '@stacksjs/cli'
import { Action } from '@stacksjs/enums'
import { handleError } from '@stacksjs/error-handling'
import { path as p } from '@stacksjs/path'
import { copyFile, storage } from '@stacksjs/storage'
import { ExitCode } from '@stacksjs/types'

interface SetupOptions extends CliOptions {
  skipAws?: boolean
  skipKeygen?: boolean
}

function getTimeoutMs(envVar: string, fallbackMs: number): number {
  const value = Number(process.env[envVar])

  if (Number.isFinite(value) && value > 0)
    return value

  return fallbackMs
}

const KEYGEN_TIMEOUT_MS = getTimeoutMs('KEYGEN_TIMEOUT_MS', 2 * 60_000)
const AWS_CONFIG_TIMEOUT_MS = getTimeoutMs('AWS_CONFIG_TIMEOUT_MS', 15 * 60_000)

export function setup(buddy: CLI): void {
  const descriptions = {
    setup: 'This command ensures your project is setup correctly',
    ssl: 'Setup SSL certificates and hosts file for HTTPS development',
    ohMyZsh: 'Enable Oh My Zsh',
    aws: 'Ensures AWS is connected to the project',
    project: 'Target a specific project',
    verbose: 'Enable verbose output',
    domain: 'Custom domain to setup (defaults to APP_URL)',
    skipHosts: 'Skip adding domain to hosts file',
    skipTrust: 'Skip trusting the certificate',
    skipAws: 'Skip AWS configuration during setup',
    skipKeygen: 'Skip generating an application key during setup',
  }

  buddy
    .command('setup', descriptions.setup)
    .alias('ensure')
    .option('-p, --project [project]', descriptions.project, { default: false })
    .option('--skip-aws', descriptions.skipAws, { default: false })
    .option('--skip-keygen', descriptions.skipKeygen, { default: false })
    .option('--verbose', descriptions.verbose, { default: false })
    .action(async (options: SetupOptions) => {
      log.debug('Running `buddy setup` ...', options)

      // TODO: optimizeConfigDir()
      // TODO: optimizeAddDir()

      await initializeProject(options)
    })

  buddy
    .command('setup:ssl', descriptions.ssl)
    .alias('ssl:setup')
    .option('-d, --domain [domain]', descriptions.domain)
    .option('--skip-hosts', descriptions.skipHosts, { default: false })
    .option('--skip-trust', descriptions.skipTrust, { default: false })
    .option('--verbose', descriptions.verbose, { default: false })
    .action(async (options: CliOptions & { domain?: string, skipHosts?: boolean, skipTrust?: boolean }) => {
      log.debug('Running `buddy setup:ssl` ...', options)

      const success = await setupSSL({
        domain: options.domain,
        skipHosts: options.skipHosts,
        skipTrust: options.skipTrust,
        verbose: options.verbose,
      })

      if (!success) {
        log.warn('SSL setup completed with warnings')
        log.info('You may need to manually trust certificates or update hosts file')
      }
    })

  buddy
    .command('setup:oh-my-zsh', descriptions.ohMyZsh) // if triggered multiple times, it will update the plugin
    .alias('upgrade:oh-my-zsh')
    .option('--verbose', descriptions.verbose, { default: false })
    .action(async (_options?: CliOptions) => {
      log.debug('Running `buddy setup:oh-my-zsh` ...', _options)
      const result = await runAction(Action.UpgradeShell)

      if (result.isErr) {
        log.error(result.error)
        process.exit(ExitCode.FatalError)
      }
    })

  buddy.on('setup:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', buddy.args.join(' '))
    process.exit(ExitCode.FatalError)
  })
}

function hasAppKey(cwd: string): boolean {
  const envPath = join(cwd, '.env')

  if (!existsSync(envPath))
    return false

  return /^APP_KEY=.+$/m.test(readFileSync(envPath, 'utf-8'))
}

export async function ensureAppKey(cwd: string): Promise<void> {
  if (hasAppKey(cwd)) {
    log.success('APP_KEY existed')
    return
  }

  const keyResult = await runCommand('./buddy key:generate', {
    cwd,
    timeoutMs: KEYGEN_TIMEOUT_MS,
  })

  if (keyResult.isErr) {
    handleError(keyResult.error)
    process.exit(ExitCode.FatalError)
  }

  log.success('Generated application key')
}

async function initializeProject(options: SetupOptions): Promise<void> {
  const cwd = options.cwd || p.projectPath()

  await ensureEnvIsSet(options)

  if (!options.skipKeygen) {
    await ensureAppKey(cwd)
  }

  if (!options.skipAws) {
    log.info('Ensuring AWS is connected...')

    const awsResult = await runCommand('./buddy configure:aws', {
      cwd,
      timeoutMs: AWS_CONFIG_TIMEOUT_MS,
    })

    if (awsResult.isErr) {
      handleError(awsResult.error)
      process.exit(ExitCode.FatalError)
    }

    log.success('Configured AWS')
  }

  // TODO: ensure the IDE is setup by making sure .vscode etc exists, and if not, copy them over

  log.success('Project is setup')
  log.info('Happy coding! 💙')
}

export async function ensureEnvIsSet(options: CliOptions): Promise<void> {
  log.info('Ensuring .env exists...')

  const cwd = options.cwd || p.projectPath()
  const envPath = `${cwd}/.env`
  const envExamplePath = `${cwd}/.env.example`

  if (storage.doesNotExist(envPath)) {
    try {
      copyFile(envExamplePath, envPath)
    }
    catch (error) {
      handleError(error)
      process.exit(ExitCode.FatalError)
    }

    log.success('.env created')
  }
  else {
    log.success('.env existed')
  }
}
