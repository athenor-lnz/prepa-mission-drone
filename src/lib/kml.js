import { missionMapItems } from './final-map.js';

const esc=(s)=>String(s??'').replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hex=(c,f='1976D2')=>/^#[0-9a-f]{6}$/i.test(c||'')?c.slice(1):f;
const kmlColor=(c,a='ff')=>{const h=hex(c);return a+h.slice(4,6)+h.slice(2,4)+h.slice(0,2);};
const coords=(pts,close=false)=>{
  const a=(pts||[]).map((p)=>`${p.lon},${p.lat},0`);
  if(close&&a.length&&a[0]!==a[a.length-1])a.push(a[0]);
  return a.join(' ');
};
function circlePoints(lat,lon,radiusM,n=64){
  const R=6378137,latr=lat*Math.PI/180;
  return Array.from({length:n},(_,i)=>{
    const a=2*Math.PI*i/n,d=radiusM/R;
    const la=Math.asin(Math.sin(latr)*Math.cos(d)+Math.cos(latr)*Math.sin(d)*Math.cos(a));
    const lo=lon*Math.PI/180+Math.atan2(Math.sin(a)*Math.sin(d)*Math.cos(latr),Math.cos(d)-Math.sin(latr)*Math.sin(la));
    return {lat:la*180/Math.PI,lon:lo*180/Math.PI};
  });
}
function style(id,color,poly=false){
  return `<Style id="${id}"><LineStyle><color>${kmlColor(color)}</color><width>4</width></LineStyle>${poly?`<PolyStyle><color>${kmlColor(color,'55')}</color></PolyStyle>`:''}</Style>`;
}
function linePlacemark(name,pts,color,id,desc=''){
  return `<Placemark><name>${esc(name)}</name><description>${esc(desc)}</description><styleUrl>#${id}</styleUrl><LineString><tessellate>1</tessellate><coordinates>${coords(pts)}</coordinates></LineString></Placemark>`;
}
function polyPlacemark(name,pts,color,id,desc=''){
  return `<Placemark><name>${esc(name)}</name><description>${esc(desc)}</description><styleUrl>#${id}</styleUrl><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords(pts,true)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
}
export function buildMissionKml(mission){
  const d=missionMapItems(mission),styles=[],items=[];
  styles.push(style('route','#1976D2'));
  if(d.route.length>=2)items.push(linePlacemark('Cheminement',d.route,'#1976D2','route'));
  if(d.missionPoint){
    items.push(`<Placemark><name>Point mission</name><Point><coordinates>${d.missionPoint.lon},${d.missionPoint.lat},0</coordinates></Point></Placemark>`);
    if(d.radiusM>0){styles.push(style('radius','#1976D2',true));items.push(polyPlacemark('Zone mission',circlePoints(d.missionPoint.lat,d.missionPoint.lon,d.radiusM),'#1976D2','radius','Rayon '+d.radiusM+' m'));}
  }
  let i=0;
  for(const x of d.lLines){const sid='l'+i++;styles.push(style(sid,x.color));items.push(linePlacemark(x.name||'Ligne de débouché',x.points,x.color,sid,'Ligne de débouché'));}
  i=0;
  for(const x of d.eLines){const sid='e'+i++;styles.push(style(sid,x.color));items.push(linePlacemark(x.name||'Ligne d’esquive',x.points,x.color,sid,'Ligne d’esquive'));}
  i=0;
  for(const z of d.zones){const sid='z'+i++;styles.push(style(sid,z.color,true));items.push(polyPlacemark(z.name||'Zone de dégagement',z.points,z.color,sid,'Zone de dégagement'));}
  for(const p of d.pois||[]){
    items.push(`<Placemark><name>${esc(p.name)}</name><description>${esc([p.category,p.note].filter(Boolean).join(' · '))}</description><Style><IconStyle><color>${kmlColor(p.color||'#CDB23A')}</color><scale>1.15</scale></IconStyle></Style><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(mission.name||'Mission drone')}</name>${styles.join('')}${items.join('')}</Document></kml>`;
}
function crc32(bytes){
  let c=0xffffffff;
  for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
}
function u16(n){return [n&255,(n>>>8)&255]}
function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
export function buildKmz(kml){
  const enc=new TextEncoder(),name=enc.encode('doc.kml'),data=enc.encode(kml),crc=crc32(data);
  const local=new Uint8Array([0x50,0x4b,0x03,0x04,...u16(20),0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),0,0,...name,...data]);
  const central=new Uint8Array([0x50,0x4b,0x01,0x02,...u16(20),...u16(20),0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),0,0,0,0,0,0,0,0,0,0,...name]);
  const end=new Uint8Array([0x50,0x4b,0x05,0x06,0,0,0,0,1,0,1,0,...u32(central.length),...u32(local.length),0,0]);
  return new Blob([local,central,end],{type:'application/vnd.google-earth.kmz'});
}
export function downloadBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200);
}
export function safeFileName(name){
  return (name||'mission-drone').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'mission-drone';
}
