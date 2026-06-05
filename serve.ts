import { serve } from 'bun-plugin-stx/serve'

/**
 * Frontend (stx) dev server. `./buddy dev` hands off to this file for the
 * frontend, running the API dev server separately on PORT_API (default 3008).
 *
 * The stx server only renders pages, so API-bound traffic must be forwarded to
 * the API server. We mirror the framework's default-server behaviour: proxy
 * anything under `/api/*` plus any non-GET/HEAD verb (POST/PUT/PATCH/DELETE
 * never match a static page) to the API origin. Without this, the client's
 * `/api/trails`, `/api/activities`, `/api/territories/*` calls 404 against the
 * stx server and the app silently falls back to seed data.
 */
const apiPort = Number(process.env.PORT_API) || 3008
const apiBase = `http://127.0.0.1:${apiPort}`
const PROXY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

async function proxyToApi(req: Request): Promise<Response> {
  const incoming = new URL(req.url)
  const target = `${apiBase}${incoming.pathname}${incoming.search}`

  const fwd = new Headers(req.headers)
  fwd.delete('host')
  fwd.delete('content-length')
  fwd.set('x-forwarded-host', incoming.host)
  fwd.set('x-forwarded-proto', incoming.protocol.replace(':', ''))

  const body = req.method === 'GET' || req.method === 'HEAD'
    ? undefined
    : await req.arrayBuffer()

  try {
    const upstream = await fetch(target, { method: req.method, headers: fwd, body, redirect: 'manual' })
    const out = new Headers(upstream.headers)
    out.delete('content-length')
    out.delete('content-encoding')
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
  }
  catch {
    // API server not running (e.g. `bun --watch serve.ts` standalone).
    return Response.json(
      { error: `API server unreachable at ${apiBase}. Run \`./buddy dev\` to start it.` },
      { status: 502 },
    )
  }
}

// eslint-disable-next-line ts/no-top-level-await
await serve({
  patterns: ['resources/views'],
  port: Number(process.env.PORT) || 3000,
  componentsDir: 'resources/components',
  layoutsDir: 'resources/layouts',
  partialsDir: 'resources/components',
  quiet: false,
  onRequest: (req: Request) => {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/') || PROXY_METHODS.has(req.method))
      return proxyToApi(req)
    return undefined
  },
})
