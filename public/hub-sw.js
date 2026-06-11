/**
 * HaulDesk service worker: Web Push + notification clicks.
 * (Offline action queueing for driver screens arrives with the full
 * driver-hub phase; this worker keeps installs light and reliable.)
 */
self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = { title: "HaulDesk", body: "", link: "/hub" }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/hub-icon-192.png",
      badge: "/hub-icon-192.png",
      data: { link: data.link },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || "/hub"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/hub") && "focus" in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      return self.clients.openWindow(link)
    })
  )
})
