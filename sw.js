/* ============================================================
   Light Workout — service worker (offline support)
   Caches the whole app shell on install so every page, script,
   style and image works with no network after the first visit.

   To ship an update: bump CACHE_VERSION. The old cache is then
   deleted on activate and the new files are fetched once.
   ============================================================ */
const CACHE_VERSION = "light-workout-v1";

// All app assets, paths relative to this file (the site root/scope).
const ASSETS = [
  "./",
  "index.html",
  "workout.html",
  "manifest.webmanifest",
  "css/styles.css",
  "js/home.js",
  "js/workout.js",
  "data/exercises.js",
  "icons/icon.svg",
  // exercise demo visuals
  "images/pelvic-tilt.gif",
  "images/dead-bug.gif",
  "images/glutebridge.webp",
  "images/bird-dog.gif",
  "images/wall-sit.gif",
  "images/side-plank-clamshell.gif",
  "images/hip-hinge.gif",
  "images/mcgill-curl-up.gif",
  "images/cat-camel.gif",
];

// Pre-cache everything on install.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll is atomic-ish but fails if ANY request 404s; allSettled is
      // forgiving so one missing optional image can't break the install.
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// Drop old caches when a new version activates.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for same-origin GETs: instant offline, falls back to network
// (and caches the result) for anything not pre-cached.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("index.html")); // last-ditch fallback for navigations
    })
  );
});
