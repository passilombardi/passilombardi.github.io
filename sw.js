// Passi Lombardi: funziona anche con poca rete. Le pagine e le voci vengono salvate dopo il primo uso.
const C='passi-v1',F=['./','index.html','manifest.json','icona-192.png','icona-512.png','icona-512-m.png','icona-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(/\/a\/[A-Za-z0-9]+\.mp3$/.test(u.pathname)){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{if(x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(e.request,cp))}return x})));return}
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
