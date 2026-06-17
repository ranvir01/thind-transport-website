self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", () => {
  // Network-first placeholder. The driver POD flow keeps its own visible
  // "saved — will sync" state until the production upload queue is connected.
})
