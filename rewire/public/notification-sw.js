// Custom service worker additions for push notifications
// Imported by workbox-generated SW via importScripts

// Periodic background sync — fires ~daily on Chrome Android when engagement is sufficient
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-checkin-reminder') {
    event.waitUntil(
      self.registration.showNotification('Time to check in!', {
        body: 'Keep your streak going — check in today.',
        icon: '/pwa-192x192.svg',
        tag: 'daily-reminder',
        renotify: true,
      })
    )
  }
})

// Open the app when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
