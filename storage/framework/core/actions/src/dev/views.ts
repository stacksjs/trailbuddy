import { serve } from 'bun-plugin-stx/serve'

// Run stx dev server for resources/views
// This serves .stx templates from the project's resources/views directory
// User views override default views - check user path first, then defaults
const userViewsPath = 'resources/views'
const defaultViewsPath = 'storage/framework/defaults/resources/views'
const userLayoutsPath = 'resources/layouts'
const defaultLayoutsPath = 'storage/framework/defaults/resources/layouts'
const preferredPort = Number(process.env.PORT) || 3000

// Load project-level STX config for component/layout/partial paths
let stxConfig: Record<string, string> = {}
try {
  const configModule = await import(`${process.cwd()}/config/stx.ts`)
  stxConfig = configModule.default || {}
}
catch {
  // No stx config found, use defaults
}

const componentsDir = stxConfig.componentsDir || 'resources/components'

// Start the server directly - no subprocess overhead!
// Patterns are checked in order: user views first, then defaults
await serve({
  patterns: [userViewsPath, defaultViewsPath],
  port: preferredPort,
  componentsDir,
  layoutsDir: userLayoutsPath,
  partialsDir: userViewsPath,
  fallbackLayoutsDir: defaultLayoutsPath,
  fallbackPartialsDir: defaultViewsPath,
})
