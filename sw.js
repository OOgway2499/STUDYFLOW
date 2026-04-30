/* ========================================
   StudyFlow — Service Worker
   Caches the app shell for offline access
   ======================================== */

const CACHE_NAME = 'studyflow-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/config.js',
    '/auth.js',
    '/db.js',
    '/app.js',
    '/manifest.json',
];

// Install — cache all core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network-first for API calls, cache-first for assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always go to network for Supabase API calls, Google Fonts, CDN scripts
    if (url.hostname.includes('supabase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('cdn.jsdelivr')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }

    // For same-origin assets: cache-first, fallback to network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // Refresh cache in background (stale-while-revalidate)
                fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
                    }
                }).catch(() => {});
                return cached;
            }
            return fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // If offline and no cache, return a simple offline page for HTML requests
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return new Response('<html><body style="background:#0a0a0f;color:#f0f0f5;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="text-align:center"><h1>📡 Offline</h1><p>Please check your internet connection</p></div></body></html>', {
                        headers: { 'Content-Type': 'text/html' }
                    });
                }
            });
        })
    );
});
