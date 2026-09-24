/* Offline app shell only. No rota records, notes, keys or passphrases use fetch. */
const PREFIX = 'restivism-shell-';
const currentCache = PREFIX + '__RESTIVISM_BUILD__';

async function shellName() {
  return currentCache;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/offline-assets.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline asset manifest unavailable');
    const manifest = await response.json();
    if (!/^[a-f0-9]{16}$/.test(manifest.version) || !Array.isArray(manifest.assets)) throw new Error('Invalid offline manifest');
    const name = PREFIX + manifest.version;
    if (name !== currentCache) throw new Error('App update changed during installation; try again on the next visit.');
    const cache = await caches.open(name);
    try {
      await cache.addAll(manifest.assets.map(asset => new Request(new URL(asset, self.location.origin), { cache: 'reload' })));
    } catch (error) {
      await caches.delete(name);
      throw error;
    }
    // Do not replace an active app mid-handover. The new worker activates after closing it.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const name = await shellName();
    if (!name) return;
    await Promise.all((await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== name).map(key => caches.delete(key)));
    await self.clients.claim();
    for (const client of await self.clients.matchAll()) client.postMessage({ type: 'RESTIVISM_OFFLINE_READY' });
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_READY') return;
  event.waitUntil((async () => {
    const name = await shellName();
    if (name && await (await caches.open(name)).match('/')) event.source?.postMessage({ type: 'RESTIVISM_OFFLINE_READY' });
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    const name = await shellName();
    const cache = name ? await caches.open(name) : null;
    // A navigation uses the matching cached shell and chunks, including timer routes.
    const cached = await cache?.match(event.request.mode === 'navigate' ? '/' : event.request);
    if (cached) return cached;
    return fetch(event.request);
  })());
});
