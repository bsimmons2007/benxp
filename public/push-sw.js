// Custom push handlers imported into the Workbox-generated service worker via
// vite-plugin-pwa workbox.importScripts. Kept separate so generateSW keeps
// managing precache/runtime caching untouched.
 

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (_e) {
    payload = { title: 'YouXP', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'YouXP'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'youxp',
    renotify: !!payload.tag,
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if one is open, navigating it to the target route.
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl).catch(() => {})
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
      return undefined
    })
  )
})
