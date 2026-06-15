/**
 * =====================================================
 * SERVICE WORKER — ASISTEN AKADEMIK USM
 * Progressive Web App — Offline Support
 * =====================================================
 */

const CACHE_NAME    = 'usm-asisten-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/chat.html',
  '/style.css',
  '/landing.css',
  '/auth.css',
  '/chat.css',
  '/script.js',
  '/config.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Offline fallback HTML
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Offline — Asisten Akademik USM</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Plus Jakarta Sans',sans-serif;
      background:#0F172A;color:#F1F5F9;
      min-height:100dvh;display:flex;
      align-items:center;justify-content:center;
      padding:24px;text-align:center;
    }
    .card{
      background:#1E293B;border:1px solid #334155;
      border-radius:24px;padding:48px 40px;
      max-width:420px;width:100%;
    }
    .icon{font-size:3.5rem;margin-bottom:24px}
    h1{font-size:1.75rem;font-weight:800;margin-bottom:12px}
    p{color:#94A3B8;line-height:1.7;margin-bottom:28px}
    button{
      background:linear-gradient(135deg,#2563EB,#0EA5E9);
      color:white;border:none;padding:14px 28px;
      border-radius:999px;font-size:1rem;font-weight:600;
      cursor:pointer;font-family:inherit;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Tidak Ada Koneksi</h1>
    <p>Asisten Akademik memerlukan koneksi internet untuk menjawab pertanyaan Anda. Silakan periksa koneksi dan coba lagi.</p>
    <button onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`;

// ── Install Event ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Cache addAll partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate Event ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch Event ───────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and external API requests (Supabase, n8n)
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('hstgr.cloud')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('jsdelivr.net')) return;

  // Network-first for HTML pages (fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(OFFLINE_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Return placeholder for images
        if (request.destination === 'image') {
          return new Response('', { status: 404 });
        }
        return new Response('/* offline */', {
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
