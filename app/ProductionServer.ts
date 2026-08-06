import process from 'node:process'
import { cli } from '@stacksjs/cli'
// @stacksjs/buddy publishes no entry point for `serve`, so the command has to
// be reached by path. The deep import is deliberate and the two rules below
// are the ones that would otherwise flag it.
// eslint-disable-next-line pickier/no-import-dist, pickier/no-import-node-modules-by-path
import { serve } from '../node_modules/@stacksjs/buddy/dist/commands/serve.js'

process.env.APP_ENV ||= 'production'
process.env.NODE_ENV ||= 'production'

const buddy = cli('buddy')
serve(buddy)
process.argv.splice(2, 0, 'serve')
await buddy.parse()
