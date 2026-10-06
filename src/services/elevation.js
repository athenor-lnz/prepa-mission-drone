// Profil altimétrique officiel Géoplateforme / IGN.
const BASE='https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json';

function distM(a,b){
  const R=6371008.8,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
  const q=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}
export function routeDistance(points=[]){
  let d=0;for(let i=1;i<points.length;i++)d+=distM(points[i-1],points[i]);return d;
}
export async function fetchElevationProfile(points=[],sampling=80){
  if(!Array.isArray(points)||points.length<2)throw new Error('Trace au moins deux points pour calculer le profil.');
  const clean=points.filter((p)=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)).slice(0,100);
  if(clean.length<2)throw new Error('Tracé invalide.');
  const n=Math.max(10,Math.min(300,Math.round(sampling)));
  const qs=new URLSearchParams({
    lon:clean.map((p)=>p.lon).join('|'),
    lat:clean.map((p)=>p.lat).join('|'),
    resource:'ign_rge_alti_wld',
    delimiter:'|',
    indent:'false',
    measures:'false',
    zonly:'false',
    profile_mode:'simple',
    sampling:String(n)
  });
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),12000);
  try{
    const r=await fetch(BASE+'?'+qs,{signal:ctl.signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('Service altimétrique : HTTP '+r.status);
    const data=await r.json();
    const src=(data?.elevations||[]).filter((p)=>Number.isFinite(Number(p.z))&&Number(p.z)>-99990);
    if(src.length<2)throw new Error('Aucun profil altimétrique exploitable pour ce tracé.');
    let distance=0,prev=null;
    const profile=src.map((p)=>{
      const cur={lat:Number(p.lat),lon:Number(p.lon),z:Number(p.z)};
      if(prev)distance+=distM(prev,cur);
      prev=cur;
      return {...cur,distanceM:distance};
    });
    return {profile,distanceM:distance,source:'IGN · RGE ALTI'};
  }catch(e){
    if(e?.name==='AbortError')throw new Error('Calcul altimétrique trop long.');
    if(e instanceof TypeError)throw new Error('Profil altimétrique indisponible hors connexion.');
    throw e;
  }finally{clearTimeout(timer);}
}
