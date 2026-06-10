/* ============================================================
   RepFlow — service worker KILL-SWITCH.

   The PWA / offline mode has been retired (online-only site for
   now; a standalone APK is planned later). This worker exists only
   to clean up after the old one: browsers re-fetch this registered
   script on the next visit, so this code unregisters the worker,
   deletes its caches, and reloads open pages to load fresh from the
   network. Once unregistered there is no service worker left.
   ============================================================ */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.navigate(c.url));   // reload to drop SW control
  })());
});
