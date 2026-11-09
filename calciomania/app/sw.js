// Calciomania PM: si aggiorna da sola. Prende sempre la versione nuova dal sito; senza rete usa quella salvata.
const C='presidentepm-v9',F=['./','index.html','manifest.webmanifest','js/motore.js','js/grafica.js','js/icone.js','js/sistemi.js','js/partita.js','js/azione.js','js/campo.js','js/schermi.js','js/coppe.js','js/veri.js','js/carriere.js','js/gioco.js','js/online.js','icon-192.png','icon-512.png','icon-maskable-512.png','icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('presidentepm-')&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
  if(u.origin!==location.origin){if(/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res})));return}
  if(!u.pathname.startsWith(new URL('./',self.registration.scope).pathname))return;
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match('index.html'))))});
