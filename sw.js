// Hors ligne : met en cache l'application (pas les API). Les données météo/espace aérien exigent toujours le réseau.
const VERSION = 'pmd-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'design/tokens.css', 'manifest.webmanifest', 'icons/icon.svg',
  'src/main.js', 'src/config.js', 'src/state.js',
  'src/lib/geo.js', 'src/lib/units.js', 'src/lib/verdict.js', 'src/lib/storage.js', 'src/lib/gate.js', 'src/lib/time.js', 'src/lib/weather.js', 'src/lib/airspace.js', 'src/lib/forms.js', 'src/lib/recap.js',
  'src/services/http.js', 'src/services/geocode.js', 'src/services/meteo.js', 'src/services/airspace.js', 'src/services/speech.js',
  'src/ui/dom.js', 'src/ui/layout.js', 'src/ui/dictate.js',
  'src/views/connexion.js', 'src/views/accueil.js', 'src/views/lieu.js', 'src/views/meteo.js', 'src/views/espace.js', 'src/views/fiche.js', 'src/views/outils.js',
  'vendor/leaflet/leaflet.css', 'vendor/leaflet/leaflet.js',
  'vendor/fonts/sora-latin-600-normal.woff2', 'vendor/fonts/sora-latin-700-normal.woff2', 'vendor/fonts/manrope-latin-500-normal.woff2', 'vendor/fonts/manrope-latin-600-normal.woff2', 'vendor/fonts/manrope-latin-700-normal.woff2', 'vendor/fonts/jetbrains-mono-latin-500-normal.woff2'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

// Même origine : réseau d'abord (toujours à jour), cache en secours. Autres origines (API, tuiles) : jamais interceptées.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))));
});
