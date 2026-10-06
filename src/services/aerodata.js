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
    if(key && !(key in out)){
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
export function normalizeFrequency(raw){
  if(typeof raw==='string') return {service:'',mhz:'',callsign:'',schedule:'',text:raw.trim()};
  if(!raw||typeof raw!=='object') return {service:'',mhz:'',callsign:'',schedule:'',text:''};
  return {
    service:String(raw.service||'').trim(),
    mhz:String(raw.mhz||raw.frequence||'').trim(),
    callsign:String(raw.indicatif||raw.callsign||'').trim(),
    schedule:String(raw.horaire||raw.schedule||'').trim(),
    text:''
  };
}
export function normalizeRunway(raw){
  if(typeof raw==='string') return {designation:'',lengthM:null,widthM:null,surface:'',text:raw.trim()};
  if(!raw||typeof raw!=='object') return {designation:'',lengthM:null,widthM:null,surface:'',text:''};
  const length=Number(raw.longueur_m??raw.lengthM),width=Number(raw.largeur_m??raw.widthM);
  return {
    designation:String(raw.designation||'').trim(),
    lengthM:Number.isFinite(length)?length:null,
    widthM:Number.isFinite(width)?width:null,
    surface:String(raw.revetement||raw.surface||'').trim(),
    text:''
  };
}
function prepAerodromes(fc){
  return (fc?.features||[]).flatMap((f)=>{
    if(f?.geometry?.type!=='Point')return[];
    const [lon,lat]=f.geometry.coordinates||[];if(!Number.isFinite(lat)||!Number.isFinite(lon))return[];
    const p=f.properties||{};
    const altitude=Number(p.altitude_ft);
    return [{
      lat,lon,icao:String(p.icao||'').trim(),name:String(p.nom||'').trim(),type:String(p.type||'').trim(),
      altitudeFt:Number.isFinite(altitude)?altitude:null,remark:String(p.remarque||'').trim(),
      runways:(Array.isArray(p.pistes)?p.pistes:[]).map(normalizeRunway),
      frequencies:(Array.isArray(p.frequences)?p.frequences:[]).map(normalizeFrequency)
    }];
  });
}


function localChildren(root,name){
  return [...root.getElementsByTagName('*')].filter((n)=>n.localName===name);
}
function firstText(root,names){
  for(const name of names){
    const n=[...root.getElementsByTagName('*')].find((x)=>x.localName===name);
    const v=n?.textContent?.trim();
    if(v)return v;
  }
  return '';
}
function numText(root,names){
  const v=Number(firstText(root,names));return Number.isFinite(v)?v:null;
}
function axisPair(a,b){
  if(!Number.isFinite(a)||!Number.isFinite(b))return null;
  // AIXM/GML EPSG:4326 est souvent sérialisé lat/lon. On détecte l'ordre le plus plausible,
  // avec un biais France/Europe si les deux variantes seraient théoriquement valides.
  if(Math.abs(a)<=90&&Math.abs(b)<=180){
    if(Math.abs(a)>30&&Math.abs(a)<=70&&Math.abs(b)<=30)return [b,a];
    if(Math.abs(b)>30&&Math.abs(b)<=70&&Math.abs(a)<=30)return [a,b];
    return [b,a];
  }
  return null;
}
function coordsFromNode(node){
  const posLists=localChildren(node,'posList');
  for(const p of posLists){
    const vals=(p.textContent||'').trim().split(/\s+/).map(Number).filter(Number.isFinite);
    if(vals.length<6)continue;
    const pts=[];
    for(let i=0;i+1<vals.length;i+=2){
      const pair=axisPair(vals[i],vals[i+1]);if(pair)pts.push(pair);
    }
    if(pts.length>=3){
      const [x0,y0]=pts[0], [xn,yn]=pts[pts.length-1];
      if(x0!==xn||y0!==yn)pts.push([x0,y0]);
      return {type:'Polygon',coordinates:[pts]};
    }
  }
  const poss=localChildren(node,'pos');
  for(const p of poss){
    const vals=(p.textContent||'').trim().split(/\s+/).map(Number).filter(Number.isFinite);
    if(vals.length>=2){
      const pair=axisPair(vals[0],vals[1]);
      if(pair)return {type:'Point',coordinates:pair};
    }
  }
  return null;
}
function parseXmlDoc(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  const err=[...doc.getElementsByTagName('*')].find((n)=>n.localName==='parsererror');
  if(err)throw new Error('XML invalide ou illisible.');
  return doc;
}
function effectiveFromDoc(doc){
  return firstText(doc,['beginPosition','timePosition','validTime'])||null;
}
function parseAixmSpaces(doc,onProgress){
  const nodes=localChildren(doc,'AirspaceTimeSlice');
  const out=[];
  let skipped=0;
  nodes.forEach((node,i)=>{
    if(i%100===0)onProgress?.(`Conversion espaces : ${i}/${nodes.length}`);
    const geometry=coordsFromNode(node);
    if(!geometry||geometry.type==='Point'){skipped++;return;}
    const bbox=boundsOf(geometry);if(!bbox){skipped++;return;}
    const parent=node.closest?.('[gml\\:id]')||node.parentElement;
    const id=parent?.getAttribute?.('gml:id')||parent?.getAttributeNS?.('http://www.opengis.net/gml/3.2','id')||firstText(node,['designator','identifier']);
    const type=firstText(node,['type']);
    const subType=firstText(node,['localType']);
    const name=firstText(node,['name']);
    const className=firstText(node,['class']);
    const floor=firstText(node,['lowerLimit','lowerLimitReference']);
    const ceiling=firstText(node,['upperLimit','upperLimitReference']);
    out.push({geometry,bbox,p:{
      territoire:'',type,subType,id:id||'',name,className,ceiling,floor,
      schedule:'',remark:''
    }});
  });
  return {items:out,sourceCount:nodes.length,skipped};
}
function parseAixmAerodromes(doc,onProgress){
  const nodes=localChildren(doc,'AirportHeliportTimeSlice');
  const out=[];
  let skipped=0;
  nodes.forEach((node,i)=>{
    if(i%100===0)onProgress?.(`Conversion aérodromes : ${i}/${nodes.length}`);
    const geometry=coordsFromNode(node);
    if(!geometry||geometry.type!=='Point'){skipped++;return;}
    const [lon,lat]=geometry.coordinates;
    const altitude=numText(node,['elevation']);
    out.push({
      lat,lon,
      icao:firstText(node,['locationIndicatorICAO']),
      name:firstText(node,['name']),
      type:firstText(node,['type']),
      altitudeFt:altitude,
      remark:'',
      runways:[],
      frequencies:[]
    });
  });
  return {items:out,sourceCount:nodes.length,skipped};
}

export async function previewAerodataXml(file,{onProgress}={}){
  if(!file)throw new Error('Aucun fichier sélectionné.');
  if(!/\.xml$/i.test(file.name)&&!/xml/i.test(file.type||''))throw new Error('Sélectionne un fichier XML SIA / AIXM.');
  onProgress?.('Lecture du XML…');
  const text=await file.text();
  if(text.length<100)throw new Error('Le fichier XML semble vide.');
  onProgress?.('Analyse AIXM / GML…');
  const doc=parseXmlDoc(text);
  const rootName=doc.documentElement?.localName||'XML';
  const spaces=parseAixmSpaces(doc,onProgress);
  const aerodromes=parseAixmAerodromes(doc,onProgress);
  if(!spaces.items.length&&!aerodromes.items.length){
    throw new Error('Aucun espace aérien ni aérodrome AIXM exploitable détecté dans ce XML.');
  }
  const meta={
    source:file.name,
    format:`AIXM/XML · ${rootName}`,
    effective:effectiveFromDoc(doc),
    created:null,
    importedAt:null,
    spaceCount:spaces.items.length,
    aerodromeCount:aerodromes.items.length,
    sourceSpaceCount:spaces.sourceCount,
    sourceAerodromeCount:aerodromes.sourceCount,
    skippedSpaces:spaces.skipped,
    skippedAerodromes:aerodromes.skipped
  };
  onProgress?.('Conversion terminée · prêt à installer.');
  return {meta,spaces:spaces.items,aerodromes:aerodromes.items};
}

export async function installAerodataCandidate(candidate,{onProgress}={}){
  if(!candidate?.meta||!Array.isArray(candidate.spaces)||!Array.isArray(candidate.aerodromes))throw new Error('Jeu converti invalide.');
  if(!candidate.spaces.length&&!candidate.aerodromes.length)throw new Error('Jeu vide : installation refusée.');
  const meta={...candidate.meta,importedAt:new Date().toISOString()};
  onProgress?.('Installation du nouveau jeu local…');
  // L'écriture du meta est volontairement faite en dernier : l'ancien jeu reste identifiable
  // tant que les nouvelles données n'ont pas été entièrement enregistrées.
  await putKey('spaces',candidate.spaces);
  await putKey('aerodromes',candidate.aerodromes);
  await putKey('meta',meta);
  cache={meta,spaces:candidate.spaces,aerodromes:candidate.aerodromes};
  return meta;
}


const BUNDLED_INDEX='data/aerodata/index.json';
let bundledPromise=null;

async function decodeBundledBase64(text){
  if(typeof DecompressionStream==='undefined')throw new Error('Décompression de la base embarquée non prise en charge par ce navigateur.');
  const clean=String(text||'').trim();
  const raw=atob(clean),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
async function fetchBundledText(path){
  const r=await fetch(path,{cache:'force-cache'});
  if(!r.ok)throw new Error(`Base embarquée introuvable : ${path}`);
  return r.text();
}
function prepCompactSpaces(data){
  return (data?.features||[]).flatMap((f)=>{
    const geometry=f?.g;if(!geometry)return[];
    const bbox=boundsOf(geometry);if(!bbox)return[];
    const p=f.p||{};
    return [{
      geometry,bbox,
      p:{
        territoire:p.x||'',type:p.t||'',subType:p.s||'',id:p.i||'',name:p.n||'',
        className:p.c||'',ceiling:p.u||'',floor:p.l||'',schedule:p.h||'',remark:p.r||''
      }
    }];
  });
}
function prepCompactAerodromes(data){
  return (data?.features||[]).flatMap((f)=>{
    if(f?.g?.type!=='Point')return[];
    const [lon,lat]=f.g.coordinates||[];if(!Number.isFinite(lat)||!Number.isFinite(lon))return[];
    const p=f.p||{},altitude=Number(p.a);
    return [{
      lat,lon,icao:String(p.i||'').trim(),name:String(p.n||'').trim(),type:String(p.t||'').trim(),
      altitudeFt:Number.isFinite(altitude)?altitude:null,remark:String(p.r||'').trim(),
      runways:(Array.isArray(p.p)?p.p:[]).map(normalizeRunway),
      frequencies:(Array.isArray(p.f)?p.f:[]).map(normalizeFrequency)
    }];
  });
}
async function loadBundledAerodata(){
  if(bundledPromise)return bundledPromise;
  bundledPromise=(async()=>{
    const idxResp=await fetch(BUNDLED_INDEX,{cache:'force-cache'});
    if(!idxResp.ok)throw new Error('Manifeste de la base aéronautique embarquée introuvable.');
    const idx=await idxResp.json();
    if(!Array.isArray(idx.spaceBundles)||!idx.aerodromes)throw new Error('Manifeste aéronautique embarqué invalide.');
    const [spaceParts,aeroText]=await Promise.all([
      Promise.all(idx.spaceBundles.map((name)=>fetchBundledText(`data/aerodata/${name}`))),
      fetchBundledText(`data/aerodata/${idx.aerodromes}`)
    ]);
    const [packedSpaces,packedAerodromes]=await Promise.all([
      decodeBundledBase64(spaceParts.join('')),
      decodeBundledBase64(aeroText)
    ]);
    const spaces=prepCompactSpaces(packedSpaces),aerodromes=prepCompactAerodromes(packedAerodromes);
    if(spaces.length!==Number(idx.spaceCount)||aerodromes.length!==Number(idx.aerodromeCount)){
      throw new Error('Contrôle de la base aéronautique embarquée échoué.');
    }
    const meta={
      source:idx.source||'GeoGM / SIA embarqué',
      effective:idx.effective||null,created:idx.created||null,importedAt:null,
      spaceCount:spaces.length,aerodromeCount:aerodromes.length,
      format:idx.format||'Base embarquée',bundled:true
    };
    cache={meta,spaces,aerodromes};
    return meta;
  })().catch((e)=>{bundledPromise=null;throw e;});
  return bundledPromise;
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
  if(cache.meta)return cache.meta;
  const stored=await getKey('meta');
  if(stored){cache.meta=stored;return cache.meta;}
  try{return await loadBundledAerodata();}catch{return null;}
}
async function loadSpaces(){
  if(cache.spaces)return cache.spaces;
  if(cache.meta?.bundled)return cache.spaces||[];
  cache.spaces=await getKey('spaces')||[];
  return cache.spaces;
}
async function loadAerodromes(){
  if(cache.aerodromes)return cache.aerodromes;
  if(cache.meta?.bundled)return cache.aerodromes||[];
  cache.aerodromes=await getKey('aerodromes')||[];
  return cache.aerodromes;
}
export async function clearAerodata(){await deleteDb();bundledPromise=null;}

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
