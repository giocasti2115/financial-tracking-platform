const APP_SHELL_CACHE = "aurea-shell-v2"
const ASSET_CACHE = "aurea-assets-v1"
const API_CACHE = "aurea-api-v1"
const OFFLINE_URL = "/offline.html"

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-dark-32x32.png",
  "/apple-icon.png",
  "/icon.svg",
  OFFLINE_URL,
]

const ASSET_DESTINATIONS = new Set(["style", "script", "image", "font"])

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL)
    }),
  )
})

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [APP_SHELL_CACHE, ASSET_CACHE, API_CACHE]
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }

      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => !cacheWhitelist.includes(key)).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  const url = new URL(event.request.url)

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event))
    return
  }

  if (url.origin === self.location.origin && ASSET_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request, ASSET_CACHE))
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, API_CACHE))
  }
})

async function handleNavigationRequest(event) {
  const cache = await caches.open(APP_SHELL_CACHE)

  try {
    const preloadResponse = await event.preloadResponse
    if (preloadResponse) {
      cache.put(event.request, preloadResponse.clone())
      return preloadResponse
    }

    const networkResponse = await fetch(event.request)
    cache.put(event.request, networkResponse.clone())
    return networkResponse
  } catch (error) {
    const cachedResponse = await cache.match(event.request)
    return cachedResponse ?? cache.match(OFFLINE_URL)
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cachedResponse)

  return cachedResponse ?? networkFetch
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cachedResponse = await cache.match(request)
    return cachedResponse ?? new Response(null, { status: 504, statusText: "Gateway Timeout" })
  }
}
