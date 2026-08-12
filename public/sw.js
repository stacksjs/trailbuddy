const CACHE_PREFIX = 'wildloop-'
const CACHE = `${CACHE_PREFIX}shell-v2`
const SHELL = ['/offline', '/css/ts-maps.css', '/js/ts-maps.mjs', '/manifest.webmanifest']

function cacheable(response) {
  if (!response.ok || response.type !== 'basic') return false
  const cacheControl = response.headers.get('cache-control') || ''
  return !/(?:no-store|private)/i.test(cacheControl) && !response.headers.has('set-cookie')
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // HTML may contain session-specific state. Never persist it in a shared
    // browser cache; use only the deliberately static offline page as fallback.
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline'))))
    return
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (cacheable(response)) caches.open(CACHE).then(cache => cache.put(request, response.clone()))
    return response
  })))
})
