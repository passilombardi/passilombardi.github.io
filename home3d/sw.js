// HOME 3D DESIGN - service worker: rende l'app utilizzabile anche offline
const CACHE = 'home3d-v2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/catalog.js', './js/materials.js', './js/presets.js', './js/three.module.min.js',
  './js/addons/controls/OrbitControls.js', './js/addons/environments/RoomEnvironment.js',
  './js/addons/geometries/RoundedBoxGeometry.js', './js/addons/loaders/GLTFLoader.js',
  './js/addons/utils/BufferGeometryUtils.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) {
    // font Google: prova la rete, poi la cache
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); return res; }).catch(() => caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); }
    return res;
  })));
});
