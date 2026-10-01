const CACHE='anchor-v12';
const SHELL=['app.html','manifest.json','assets/icon-192.png','assets/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE)
  .then(c=>Promise.all(SHELL.map(s=>fetch(s,{cache:'reload'}).then(r=>c.put(s,r)))))
  .then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  const isData=u.pathname.indexOf('/data/')>-1;
  const isHTML=e.request.mode==='navigate'||u.pathname.endsWith('.html');
  if(isHTML){
    e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const cr=r.clone();caches.open(CACHE).then(c=>c.put('app.html',cr));return r;})
      .catch(()=>caches.match('app.html')));
    return;}
  if(isData){
    e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const cr=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cr));return r;})
      .catch(()=>caches.match(e.request)));
    return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request,{cache:'no-cache'}).then(nr=>{
    const cn=nr.clone();caches.open(CACHE).then(c=>c.put(e.request,cn));return nr;})));
});
