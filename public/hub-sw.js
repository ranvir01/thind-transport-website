self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  // Network-first placeholder. The driver POD flow keeps its own visible
  // "saved — will sync" state until the production upload queue is connected.
  if (event.request.mode === "navigate" && new URL(event.request.url).pathname.startsWith("/hub/driver")) {
    event.respondWith(
      fetch(event.request).catch(() => Response.redirect("/hub/driver/offline", 302))
    )
  }
})
