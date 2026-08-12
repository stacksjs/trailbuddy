export function registerWildLoopServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(error => console.warn('[pwa] service worker registration failed', error))
}

