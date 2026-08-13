import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

process.env.APP_ENV ||= 'production'
process.env.NODE_ENV ||= 'production'

const port = Number(process.env.PORT) || 3049
const defaultResources = join(process.cwd(), 'storage/framework/defaults/resources')
const apiBase = process.env.API_URL || `http://127.0.0.1:${Number(process.env.PORT_API) || 3050}`

// Local framework development uses the checked-out Tools source. A deployed
// release uses the exact npm versions in package.json, so production never
// silently falls back to the stale generated pantry copy.
const localServeEntry = join(homedir(), 'Code/Tools/stx/packages/bun-plugin/dist/serve.js')
const localStxEntry = join(homedir(), 'Code/Tools/stx/packages/stx/dist/index.js')
const [{ serve }, stxModule, serverModule] = await Promise.all([
  existsSync(localServeEntry) ? import(localServeEntry) : import('bun-plugin-stx/serve'),
  existsSync(localStxEntry) ? import(localStxEntry) : import('@stacksjs/stx'),
  import('@stacksjs/server'),
])

await serverModule.injectGlobalAutoImports()

function optimizeDocumentResponse(request: Request, response: Response): Response | undefined {
  const method = request.method.toUpperCase()
  const contentType = response.headers.get('content-type') || ''
  if ((method !== 'GET' && method !== 'HEAD') || response.status !== 200 || !contentType.startsWith('text/html'))
    return

  const headers = new Headers(response.headers)

  // WildLoop's forms submit through the bearer-token API and no STX template
  // contains @csrf. Avoid minting a unique cookie on every first page view: it
  // prevents browser/shared caching and made every anonymous response unique.
  const retainedCookies = headers.getSetCookie().filter(cookie => !cookie.startsWith('X-CSRF-Token='))
  headers.delete('set-cookie')
  for (const cookie of retainedCookies)
    headers.append('set-cookie', cookie)

  if (retainedCookies.length === 0)
    headers.set('cache-control', 'public, max-age=60, stale-while-revalidate=600')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

await serve({
  // Only application pages are routable. Framework defaults remain available
  // as component/layout fallbacks, but must not become public endpoints or add
  // hundreds of unrelated templates to discovery and cache prewarming.
  patterns: ['resources/views'],
  port,
  autoIncrementPort: false,
  reusePort: true,
  componentsDir: join(defaultResources, 'components'),
  layoutsDir: 'resources/layouts',
  partialsDir: 'resources/components',
  fallbackLayoutsDir: join(defaultResources, 'layouts'),
  fallbackPartialsDir: join(defaultResources, 'views'),
  publicDir: 'public',
  quiet: process.env.APP_DEBUG !== 'true',
  stxModule,
  // Every WildLoop view is a source-derived shell; activity, trail, social,
  // and account data load through the client API. Cache one compiled render
  // per source file and warm static routes before real traffic arrives.
  renderCache: true,
  renderCacheVary: 'source',
  prewarmRenderCache: true,
  watchDirs: ['app', 'config', 'resources'],
  async onRequest(request: Request) {
    const gated = await serverModule.maintenanceGate(request)
    if (gated)
      return gated

    const url = new URL(request.url)
    if (!serverModule.isApiBoundRequest(request, url.pathname))
      return

    try {
      return await serverModule.proxyToBackend(request, apiBase)
    }
    catch (error) {
      console.error(`[wildloop] API proxy to ${apiBase} failed`, error)
      return new Response('Bad Gateway', { status: 502 })
    }
  },
  onResponse: optimizeDocumentResponse,
})
