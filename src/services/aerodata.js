// Base aéronautique locale GeoGM/SIA.
// Importe le ZIP GeoGM/SIA (espaces.geojson + aerodromes.geojson + index.json) sans dépendance externe.
// Les données sont conservées en IndexedDB sur l'appareil.

const DB='pmd-aerodata-v1';
const STORE='data';
const DECODER=new TextDecoder();
let cache={meta:null,spaces:null,aerodromes:null};

function openDb(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE); };
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
async function getKey(key){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);
    r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);
  });
}
async function putKey(key,value){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
}
async function deleteDb(){
  cache={meta:null,spaces:null,aerodromes:null};
  return new Promise((resolve)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=r.onerror=r.onblocked=()=>resolve();});
}

function findEocd(view){
  const min=Math.max(0,view.byteLength-65557);
  for(let i=view.byteLength-22;i>=min;i--) if(view.getUint32(i,true)===0x06054b50)return i;
  return -1;
}
async function inflateRaw(bytes){
  if(typeof DecompressionStream==='undefined')throw new Error('Décompression ZIP non prise en charge par ce navigateur.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzipSelected(file,wanted,onProgress){
  const buf=await file.arrayBuffer(),view=new DataView(buf);
  const eocd=findEocd(view); if(eocd<0)throw new Error('ZIP invalide : répertoire central introuvable.');
  const count=view.getUint16(eocd+10,true),cdOffset=view.getUint32(eocd+16,true);
  let p=cdOffset; const out={};
  for(let n=0;n<count;n++){
    if(view.getUint32(p,true)!==0x02014b50)throw new Error('ZIP invalide : entrée centrale illisible.');
    const method=view.getUint16(p+10,true),compressed=view.getUint32(p+20,true);
    const nameLen=view.getUint16(p+28,true),extraLen=view.getUint16(p+30,true),commentLen=view.getUint16(p+32,true);
    const localOffset=view.getUint32(p+42,true);
    const name=DECODER.decode(new Uint8Array(buf,p+46,nameLen));
    const key=Object.keys(wanted).find((k)=>wanted[k](name));
    if(key){
      onProgress?.(`Lecture de ${name.split('/').pop()}…`);
      if(view.getUint32(localOffset,true)!==0x04034b50)throw new Error('ZIP invalide : entrée locale illisible.');
      const ln=view.getUint16(localOffset+26,true),le=view.getUint16(localOffset+28,true);
      const start=localOffset+30+ln+le;
      const raw=new Uint8Array(buf,start,compressed);
      let bytes;
      if(method===0)bytes=new Uint8Array(raw);
      else if(method===8)bytes=await inflateRaw(raw);
      else throw new Error(`Compression ZIP non prise en charge (méthode ${method}).`);
      out[key]=DECODER.decode(bytes);
    }
    p+=46+nameLen+extraLen+commentLen;
  }
  return out;
}

function boundsOf(geometry){
  if(!geometry)return null;
  if(geometry.type==='Point'){
    const [x,y]=geometry.coordinates||[];return Number.isFinite(x)&&Number.isFinite(y)?[x,y,x,y]:null;
  }
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const walk=(v)=>{
    if(Array.isArray(v)&&v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){
      minX=Math.min(minX,v[0]);maxX=Math.max(maxX,v[0]);minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);
    } else if(Array.isArray(v))v.forEach(walk);
  };
  walk(geometry.coordinates);
  return Number.isFinite(minX)?[minX,minY,maxX,maxY]:null;
}
function prepSpaces(fc){
  return (fc?.features||[]).flatMap((f)=>{
    if(!f?.geometry)return[];
    const bbox=boundsOf(f.geometry);if(!bbox)return[];
    const p=f.properties||{};
    return [{
      geometry:f.geometry,bbox,
      p:{territoire:p.territoire||'',type:p.type||'',subType:p.sous_type||'',id:p.id||'',name:p.nom||'',className:p.classe||'',ceiling:p.plafond||'',floor:p.plancher||'',schedule:p.horaire||'',remark:p.remarque||''}
    }];
  });
}
function prepAerodromes(fc){
  return (fc?.features||[]).flatMap((f)=>{
    if(f?.geometry?.type!=='Point')return[];
    const [lon,lat]=f.geometry.coordinates||[];if(!Number.isFinite(lat)||!Number.isFinite(lon))return[];
    const p=f.properties||{};
    return [{lat,lon,icao:p.icao||'',name:p.nom||'',type:p.type||'',altitudeFt:Number.isFinite(p.altitude_ft)?p.altitude_ft:null,remark:p.remarque||'',runways:Array.isArray(p.pistes)?p.pistes:[],frequencies:Array.isArray(p.frequences)?p.frequences:[]}];
  });
}

export async function importAerodata(file,{onProgress}={}){
  if(!file)throw new Error('Aucun fichier sélectionné.');
  let spacesText=null,aerodromesText=null,indexText='{}';
  if(/\.zip$/i.test(file.name)||file.type==='application/zip'){
    const out=await unzipSelected(file,{
      spaces:(n)=>/\/TOUT\/espaces\.geojson$/i.test(n)||/espaces\.geojson$/i.test(n),
      aerodromes:(n)=>/\/TOUT\/aerodromes\.geojson$/i.test(n)||/aerodromes\.geojson$/i.test(n),
      index:(n)=>/\/sortie\/index\.json$/i.test(n)||/index\.json$/i.test(n)
    },onProgress);
    spacesText=out.spaces;aerodromesText=out.aerodromes;indexText=out.index||'{}';
  } else throw new Error('Sélectionne le ZIP GeoGM/SIA complet.');

  if(!spacesText||!aerodromesText)throw new Error('Le ZIP ne contient pas espaces.geojson et aerodromes.geojson.');
  onProgress?.('Préparation de l’index local…');
  const rawSpaces=JSON.parse(spacesText),rawAerodromes=JSON.parse(aerodromesText);
  let idx={};try{idx=JSON.parse(indexText)}catch{}
  const spaces=prepSpaces(rawSpaces),aerodromes=prepAerodromes(rawAerodromes);
  const meta={source:idx.source||file.name,effective:idx.effective||null,created:idx.cree||null,importedAt:new Date().toISOString(),spaceCount:spaces.length,aerodromeCount:aerodromes.length};
  onProgress?.('Enregistrement sur cet appareil…');
  await Promise.all([putKey('meta',meta),putKey('spaces',spaces),putKey('aerodromes',aerodromes)]);
  cache={meta,spaces,aerodromes};
  return meta;
}

export async function info(){
  if(!cache.meta)cache.meta=await getKey('meta');
  return cache.meta;
}
async function loadSpaces(){ if(!cache.spaces)cache.spaces=await getKey('spaces')||[]; return cache.spaces; }
async function loadAerodromes(){ if(!cache.aerodromes)cache.aerodromes=await getKey('aerodromes')||[]; return cache.aerodromes; }
export async function clearAerodata(){await deleteDb();}

function inRing(ring,x,y){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-15)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function inPolygon(poly,x,y){
  if(!poly?.length||!inRing(poly[0],x,y))return false;
  for(let i=1;i<poly.length;i++)if(inRing(poly[i],x,y))return false;
  return true;
}
function inside(g,x,y){
  if(g.type==='Polygon')return inPolygon(g.coordinates,x,y);
  if(g.type==='MultiPolygon')return g.coordinates.some((p)=>inPolygon(p,x,y));
  return false;
}
function segDistM(lon,lat,a,b){
  const kx=111320*Math.cos(lat*Math.PI/180),ky=110540;
  const ax=(a[0]-lon)*kx,ay=(a[1]-lat)*ky,bx=(b[0]-lon)*kx,by=(b[1]-lat)*ky;
  const vx=bx-ax,vy=by-ay,den=vx*vx+vy*vy,t=den?Math.max(0,Math.min(1,-(ax*vx+ay*vy)/den)):0;
  return Math.hypot(ax+t*vx,ay+t*vy);
}
function ringNear(lon,lat,radius,ring){
  for(let i=1;i<ring.length;i++)if(segDistM(lon,lat,ring[i-1],ring[i])<=radius)return true;
  return false;
}
function intersectsCircle(g,lon,lat,radius){
  if(g.type==='Point')return haversine(lat,lon,g.coordinates[1],g.coordinates[0])<=radius;
  if(inside(g,lon,lat))return true;
  if(g.type==='Polygon')return g.coordinates.some((r)=>ringNear(lon,lat,radius,r));
  if(g.type==='MultiPolygon')return g.coordinates.some((p)=>p.some((r)=>ringNear(lon,lat,radius,r)));
  return false;
}
function haversine(lat1,lon1,lat2,lon2){
  const R=6371008.8,r=Math.PI/180,dLat=(lat2-lat1)*r,dLon=(lon2-lon1)*r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
}
function priority(p){
  if(p.type==='P')return 100;if(p.type==='R')return 98;if(p.type==='D')return 96;if(p.type==='CTR')return 94;
  if(p.type==='TRA')return 90;if(p.type==='D-OTHER')return 86;if(p.type==='TMA')return 70;if(p.type==='CTA')return 60;return 40;
}
function cleanHit(f){
  return { ...f.p, geometry:f.geometry, pointOnly:f.geometry.type==='Point', priority:priority(f.p) };
}

export async function analyzeAerodata({lat,lon,radiusM=500,nearest=5}){
  const meta=await info();if(!meta)return {meta:null,zones:[],aerodromes:[],controlled:null};
  const [spaces,aerodromes]=await Promise.all([loadSpaces(),loadAerodromes()]);
  const latPad=radiusM/110540+0.0015,lonPad=radiusM/(111320*Math.max(.1,Math.cos(lat*Math.PI/180)))+0.0015;
  const q=[lon-lonPad,lat-latPad,lon+lonPad,lat+latPad];
  const zones=[];
  for(const f of spaces){
    const b=f.bbox;if(b[2]<q[0]||b[0]>q[2]||b[3]<q[1]||b[1]>q[3])continue;
    if(intersectsCircle(f.geometry,lon,lat,radiusM))zones.push(cleanHit(f));
  }
  zones.sort((a,b)=>b.priority-a.priority||String(a.id).localeCompare(String(b.id)));
  const near=aerodromes.map((a)=>({...a,distanceM:haversine(lat,lon,a.lat,a.lon)})).sort((a,b)=>a.distanceM-b.distanceM).slice(0,nearest);
  const controlled=zones.some((z)=>['CTR','TMA','CTA'].includes(z.type)) ? true : false;
  return {meta,zones,aerodromes:near,controlled};
}

export function vacSearchUrl(icao){
  return `https://www.sia.aviation-civile.gouv.fr/catalogsearch/result/?q=${encodeURIComponent(String(icao||'').trim().toUpperCase())}&format=pdf`;
}
export const SIA_URL='https://www.sia.aviation-civile.gouv.fr/';
export const SOFIA_URL='https://sofia-briefing.aviation-civile.gouv.fr/sofia/pages/homepage.html';
export const SUPAIP_URL='https://www.sia.aviation-civile.gouv.fr/documents/supaip/aip/';
