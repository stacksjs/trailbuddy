import { runCommand } from '@stacksjs/cli'
import { projectPath } from '@stacksjs/path'
import { generateAppKey } from '@stacksjs/security'
import { exists } from '@stacksjs/storage'
import { setEnvValue } from '@stacksjs/utils'

if (!exists('.env'))
  await runCommand('cp .env.example .env', { cwd: projectPath() })

await setEnvValue('APP_KEY', generateAppKey())
