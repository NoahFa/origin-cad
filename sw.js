// Origin CAD – macht die App ohne Internet nutzbar (Werkstatt). Bei jeder Änderung an Dateien CACHE und ?v= gemeinsam hochzählen.
const CACHE='ocad-v26';
const ASSETS=['./','./index.html','./cad.js?v=26','./font.js?v=26','./vendor/clipper.js?v=26','./vendor/earcut.min.js?v=26','./view3d.js?v=26','./korpus.js?v=26','./raum.js?v=26','./start.js?v=26','./fonts/ibm-plex-sans-latin-400-normal.woff2','./fonts/ibm-plex-sans-latin-500-normal.woff2','./fonts/ibm-plex-sans-latin-600-normal.woff2','./fonts/ibm-plex-mono-latin-400-normal.woff2','./fonts/ibm-plex-mono-latin-500-normal.woff2','./manifest.webmanifest?v=26','./icon.svg?v=26','./apple-touch-icon.png?v=26','./icon-192.png?v=26','./icon-512.png?v=26','./icon-maskable-512.png?v=26'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ocad-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  // Eigene Dateien: erst Netz (immer aktueller Stand), ohne Netz aus dem Zwischenspeicher
  e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}return res}).catch(async()=>await caches.match(r)||(r.mode==='navigate'?await caches.match('./index.html'):null)||new Response('Offline',{status:503})))});
