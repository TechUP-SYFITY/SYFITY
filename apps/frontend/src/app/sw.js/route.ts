export const dynamic = 'force-dynamic';

export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local';
  const script = `
    const CACHE_VERSION = '${version}';
    const SHELL_CACHE = 'syfity-shell-' + CACHE_VERSION;
    const OFFLINE_URL = '/offline';
    const PRECACHE_URLS = ['/offline', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];

    self.addEventListener('install', (event) => {
      event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
    });

    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys()
          .then((keys) => Promise.all(
            keys.filter((key) => key.startsWith('syfity-shell-') && key !== SHELL_CACHE).map((key) => caches.delete(key)),
          ))
          .then(() => self.clients.claim()),
      );
    });

    self.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }
    });

    self.addEventListener('fetch', (event) => {
      const { request } = event;
      if (request.method !== 'GET') return;

      const url = new URL(request.url);
      if (url.origin !== self.location.origin) return;

      if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
        return;
      }

      const isPrecached = PRECACHE_URLS.includes(url.pathname);
      const isStaticAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
      if (isPrecached || isStaticAsset) {
        event.respondWith(
          caches.match(request).then((cached) => cached || fetch(request).then((response) => {
            const clone = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })),
        );
      }
    });
  `;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
