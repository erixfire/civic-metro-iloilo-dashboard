/**
 * Service Worker — Civic Metro Iloilo Dashboard
 * Handles: Web Push notifications, offline caching
 */

const CACHE_NAME = 'civic-iloilo-v1'
const PRECACHE   = ['/', '/index.html']

// Install: precache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return // always network for API
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ?? fetch(e.request).then((res) => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone))
        }
        return res
      })
    )
  )
})

// Push: show notification
self.addEventListener('push', (e) => {
  let data = { title: 'Civic Metro Iloilo', body: 'New update from OpCen.', url: '/', icon: '/icons/icon-192.png' }
  if (e.data) {
    try { Object.assign(data, JSON.parse(e.data.text())) } catch (_) {}
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon  ?? '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      data:    { url: data.url },
      vibrate: [200, 100, 200],
      tag:     'civic-update',
      renotify: true,
    })
  )
})

// Notification click: open/focus the relevant URL
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.includes(url) || url === '/')
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
