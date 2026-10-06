// PWA : cache de la coque applicative. Les API et tuiles externes restent réseau uniquement.
const VERSION = 'pmd-design-b-v23';
const SHELL = [
  './','index.html','css/app.css','design/tokens.css','manifest.webmanifest','icons/icon.svg','icons/icon-maskable.svg','icons/drone-logo.svg',
  'src/main.js','src/state.js',
  'src/lib/geo.js','src/lib/units.js','src/lib/verdict.js','src/lib/storage.js','src/lib/time.js','src/lib/weather.js','src/lib/airspace.js','src/lib/forms.js','src/lib/recap.js','src/lib/checklists.js',
  'src/services/http.js','src/services/geocode.js','src/services/meteo.js','src/services/airspace.js','src/services/aerodata.js','src/services/elevation.js','src/services/contacts.js','src/services/speech.js',
  'src/ui/dom.js','src/ui/layout.js','src/ui/dictate.js',
  'src/views/accueil.js','src/views/cadre.js','src/views/lieu.js','src/views/meteo.js','src/views/espace.js','src/views/fiche.js','src/views/outils.js','src/views/checklists.js','src/views/aerodata.js','src/views/cheminement.js','src/views/etapes.js',
  'data/aerodata/index.json','data/aerodata/spaces-00.b64','data/aerodata/spaces-01.b64','data/aerodata/spaces-02.b64','data/aerodata/spaces-03.b64','data/aerodata/spaces-04.b64','data/aerodata/spaces-05.b64','data/aerodata/spaces-06.b64','data/aerodata/spaces-07.b64','data/aerodata/spaces-08.b64','data/aerodata/spaces-09.b64','data/aerodata/spaces-10.b64','data/aerodata/aerodromes.b64',
  'vendor/leaflet/leaflet.css','vendor/leaflet/leaflet.js',
  'vendor/fonts/sora-latin-600-normal.woff2','vendor/fonts/sora-latin-700-normal.woff2','vendor/fonts/manrope-latin-500-normal.woff2','vendor/fonts/manrope-latin-600-normal.woff2','vendor/fonts/manrope-latin-700-normal.woff2','vendor/fonts/jetbrains-mono-latin-500-normal.woff2'
];
self.addEventListener('install',(e)=>{e.waitUntil(caches.open(VERSION).then((c)=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',(e)=>{e.waitUntil(caches.keys().then((ks)=>Promise.all(ks.filter((k)=>k!==VERSION).map((k)=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',(e)=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then((r)=>{
    if(r.ok){const copy=r.clone();caches.open(VERSION).then((c)=>c.put(e.request,copy));}
    return r;
  }).catch(async()=>{
    const hit=await caches.match(e.request,{ignoreSearch:true});
    if(hit)return hit;
    if(e.request.mode==='navigate')return caches.match('index.html');
    return Response.error();
  }));
});
