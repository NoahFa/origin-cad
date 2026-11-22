// Origin CAD – macht die App ohne Internet nutzbar (Werkstatt). Bei jeder Änderung an Dateien CACHE und ?v= gemeinsam hochzählen.
const CACHE='ocad-v23';
const ASSETS=['./','./index.html','./cad.js?v=23','./font.js?v=23','./vendor/clipper.js?v=23','./vendor/earcut.min.js?v=23','./view3d.js?v=23','./korpus.js?v=23','./raum.js?v=23','./manifest.webmanifest?v=23','./icon.svg?v=23','./apple-touch-icon.png?v=23','./icon-192.png?v=23','./icon-512.png?v=23','./icon-maskable-512.png?v=23'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ocad-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  // Schriften von Google: aus dem Zwischenspeicher, sonst Netz (ohne Netz nimmt der Browser die Systemschrift)
  if(u.origin!==self.location.origin){if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==='opaque')c.put(r,res.clone());return res}).catch(()=>new Response('',{status:503})));return}
  // Eigene Dateien: erst Netz (immer aktueller Stand), ohne Netz aus dem Zwischenspeicher
  e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}return res}).catch(async()=>await caches.match(r)||(r.mode==='navigate'?await caches.match('./index.html'):null)||new Response('Offline',{status:503})))});
