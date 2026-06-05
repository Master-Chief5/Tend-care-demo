// Tend service worker — makes the app installable + gives an offline shell.
// Strategy: network-first for page navigations (so updates land immediately),
// stale-while-revalidate for our own static assets, and an offline fallback to
// the cached app shell. Cross-origin requests (map tiles, geocoder) are left to
// the network and never cached, so nothing goes stale there.
// Bump this version whenever the app shell or caching strategy changes so old
// caches are dropped on activate (prevents a stale index.html from referencing
// content-hashed bundles that have since been removed from the server).
const CACHE = 'tend-v2'
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  if (!sameOrigin) return // map tiles / APIs → straight to network

  // Page navigations: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then((res) => {
        caches.open(CACHE).then((c) => c.put('/', res.clone())).catch(() => {})
        return res
      }).catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    )
    return
  }

  // Same-origin assets: serve cache, refresh in the background.
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      }).catch(() => cached)
      return cached || network
    })
  )
})
