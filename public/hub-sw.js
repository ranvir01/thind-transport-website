/**
 * LoadOff service worker: Web Push, notification clicks, and an offline
 * shell for the whole hub — driver and office alike, no signal must never
 * mean a blank page. (Action queueing lives in IndexedDB on the page side;
 * see offline-queue.ts.)
 */
const SHELL_CACHE = "hauldesk-shell-v2"

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(["/hub-icon-192.png", "/hub-icon-512.png", "/hub.webmanifest"]).catch(() => {})
    )
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("hauldesk-") && k !== SHELL_CACHE).map((k) => caches.delete(k)))
      ),
    ])
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return

  // Static assets: cache-first (immutable hashes), populate as we go.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/hub-icon")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const copy = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
            return response
          })
      )
    )
    return
  }

  // Hub navigations (office and driver): network-first, cached page as the
  // offline fallback (a stale screen with a "reconnecting" banner beats a
  // blank one). Login stays network-only so a signed-out shell is never cached.
  if (
    event.request.mode === "navigate" &&
    url.pathname.startsWith("/hub") &&
    !url.pathname.startsWith("/hub/login")
  ) {
    const sectionHome = url.pathname.startsWith("/hub/driver") ? "/hub/driver" : "/hub"
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          return (
            cached ||
            caches.match(sectionHome) ||
            new Response(
              "<html><body style='background:#0E1621;color:#F4F6F8;font-family:sans-serif;text-align:center;padding:40vh 20px 0'>No signal — LoadOff reconnects automatically.</body></html>",
              { headers: { "Content-Type": "text/html" } }
            )
          )
        })
    )
  }
})

self.addEventListener("push", (event) => {
  let data = { title: "LoadOff", body: "", link: "/hub" }
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
