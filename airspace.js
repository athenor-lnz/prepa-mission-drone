(function(){
  const DB_NAME='prepa-mission-drone';
  const DB_VERSION=1;
  const STORE='sia';
  const DATA_KEY='dataset';
  let memory=null;

  const ALLOWED_TYPES=new Set(['CTR','TMA','CTA','R','P','D','TRA','D-OTHER','RAS','FIR','UIR','UTA','SECTOR']);

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function dbGet(key){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }
  async function dbPut(key,value){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(value,key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }
  async function dbDelete(key){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }

  function geometryBounds(geometry){
    if(!geometry)return null;
    if(geometry.type==='Point'){
      const [x,y]=geometry.coordinates;
      return [x,y,x,y];
    }
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const walk=v=>{
      if(Array.isArray(v)&&v.length===2&&typeof v[0]==='number'){
        const [x,y]=v;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }else if(Array.isArray(v))v.forEach(walk);
    };
    walk(geometry.coordinates);
    return Number.isFinite(minX)?[minX,minY,maxX,maxY]:null;
  }

  function preprocess(fc,meta={}){
    const features=[];
    for(const f of fc?.features||[]){
      const p=f.properties||{};
      if(!f.geometry||!ALLOWED_TYPES.has(p.type))continue;
      const bbox=geometryBounds(f.geometry);
      if(!bbox)continue;
      features.push({
        geometry:f.geometry,
        bbox,
        p:{
          territoire:p.territoire||null,
          type:p.type||null,
          sous_type:p.sous_type||null,
          id:p.id||null,
          nom:p.nom||null,
          classe:p.classe||null,
          plafond:p.plafond||null,
          plancher:p.plancher||null,
          horaire:p.horaire||null,
          remarque:p.remarque||null
        }
      });
    }
    return {
      version:1,
      source:'GeoGM / SIA AIXM',
      importedAt:new Date().toISOString(),
      effective:meta.effective||meta.effectif||'2026-10-01',
      created:meta.cree||meta.created||null,
      featureCount:features.length,
      features
    };
  }

  async function importZip(file,onProgress){
    if(typeof JSZip==='undefined')throw new Error('JSZip indisponible');
    onProgress?.('Ouverture du ZIP…');
    const zip=await JSZip.loadAsync(file);
    const names=Object.keys(zip.files);
    const spacesName=names.find(n=>/sortie\/TOUT\/espaces\.geojson$/i.test(n))
      ||names.find(n=>/TOUT\/espaces\.geojson$/i.test(n))
      ||names.find(n=>/espaces\.geojson$/i.test(n));
    if(!spacesName)throw new Error('espaces.geojson introuvable dans le ZIP');
    const indexName=names.find(n=>/sortie\/index\.json$/i.test(n))||names.find(n=>/index\.json$/i.test(n));
    onProgress?.('Lecture des espaces aériens…');
    const [spacesText,indexText]=await Promise.all([
      zip.file(spacesName).async('string'),
      indexName?zip.file(indexName).async('string'):Promise.resolve('{}')
    ]);
    onProgress?.('Préparation de l’index spatial…');
    const fc=JSON.parse(spacesText);
    let meta={};try{meta=JSON.parse(indexText)}catch(e){}
    const dataset=preprocess(fc,meta);
    onProgress?.('Enregistrement sur le téléphone…');
    await dbPut(DATA_KEY,dataset);
    memory=dataset;
    return dataset;
  }

  async function load(){
    if(memory)return memory;
    memory=await dbGet(DATA_KEY);
    return memory;
  }
  async function clear(){
    memory=null;
    await dbDelete(DATA_KEY);
  }
  async function info(){
    const d=await load();
    if(!d)return null;
    return {source:d.source,effective:d.effective,created:d.created,importedAt:d.importedAt,featureCount:d.featureCount};
  }

  function pointInRing(lon,lat,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
      const hit=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||1e-15)+xi);
      if(hit)inside=!inside;
    }
    return inside;
  }
  function pointInPolygon(lon,lat,poly){
    if(!poly?.length||!pointInRing(lon,lat,poly[0]))return false;
    for(let i=1;i<poly.length;i++)if(pointInRing(lon,lat,poly[i]))return false;
    return true;
  }
  function pointInside(lon,lat,geometry){
    if(geometry.type==='Polygon')return pointInPolygon(lon,lat,geometry.coordinates);
    if(geometry.type==='MultiPolygon')return geometry.coordinates.some(p=>pointInPolygon(lon,lat,p));
    return false;
  }

  function distanceM(aLon,aLat,bLon,bLat){
    const r=6371008.8,rad=Math.PI/180;
    const p1=aLat*rad,p2=bLat*rad,dp=(bLat-aLat)*rad,dl=(bLon-aLon)*rad;
    const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*r*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function pointSegmentDistanceM(lon,lat,a,b){
    const kx=111320*Math.cos(lat*Math.PI/180),ky=110540;
    const ax=(a[0]-lon)*kx,ay=(a[1]-lat)*ky,bx=(b[0]-lon)*kx,by=(b[1]-lat)*ky;
    const vx=bx-ax,vy=by-ay;
    const den=vx*vx+vy*vy;
    const t=den?Math.max(0,Math.min(1,-(ax*vx+ay*vy)/den)):0;
    return Math.hypot(ax+t*vx,ay+t*vy);
  }
  function ringNearCircle(lon,lat,radius,ring){
    for(let i=1;i<ring.length;i++)if(pointSegmentDistanceM(lon,lat,ring[i-1],ring[i])<=radius)return true;
    return false;
  }
  function geometryIntersectsCircle(lon,lat,radius,geometry){
    if(geometry.type==='Point')return distanceM(lon,lat,geometry.coordinates[0],geometry.coordinates[1])<=radius;
    if(pointInside(lon,lat,geometry))return true;
    if(geometry.type==='Polygon')return geometry.coordinates.some(r=>ringNearCircle(lon,lat,radius,r));
    if(geometry.type==='MultiPolygon')return geometry.coordinates.some(poly=>poly.some(r=>ringNearCircle(lon,lat,radius,r)));
    return false;
  }

  function parseLimit(value){
    if(!value)return null;
    const v=String(value).trim().toUpperCase();
    let m=v.match(/^FL\s*0*(\d+)/);
    if(m)return {ref:'FL',ft:Number(m[1])*100,raw:value};
    m=v.match(/^([\d.]+)\s*FT\s*(ASFC|AMSL)/);
    if(m)return {ref:m[2],ft:Number(m[1]),raw:value};
    return {ref:'UNKNOWN',ft:null,raw:value};
  }
  function verticalStatus(props,altitudeM,terrainM){
    const floor=parseLimit(props.plancher),ceil=parseLimit(props.plafond);
    const topAglFt=(Number(altitudeM)||0)*3.28084;
    const groundAmslFt=terrainM==null?null:Number(terrainM)*3.28084;
    const topAmslFt=groundAmslFt==null?null:groundAmslFt+topAglFt;

    // Un FL dépend du calage altimétrique : on ne transforme pas cette estimation locale en décision automatique.
    if(floor?.ref==='FL'||ceil?.ref==='FL')return 'unknown';

    if(floor?.ref==='ASFC' && topAglFt < floor.ft)return 'below';
    if(floor?.ref==='AMSL'){
      if(topAmslFt==null)return 'unknown';
      if(topAmslFt < floor.ft)return 'below';
    }

    if(ceil?.ref==='ASFC' && 0 > ceil.ft)return 'above';
    if(ceil?.ref==='AMSL'){
      if(groundAmslFt==null)return 'unknown';
      if(groundAmslFt > ceil.ft)return 'above';
    }

    if((floor?.ref==='UNKNOWN'&&floor?.raw)||(ceil?.ref==='UNKNOWN'&&ceil?.raw))return 'unknown';
    return 'intersects';
  }
  function priority(p){
    const type=p.type,sub=p.sous_type;
    if(type==='P')return 100;
    if(type==='R')return 96;
    if(type==='D')return 94;
    if(type==='CTR')return 92;
    if(type==='TRA')return 88;
    if(type==='D-OTHER')return 84;
    if(type==='RAS'&&['RMZ','TMZ','RMZ-TMZ'].includes(sub))return 82;
    if(type==='TMA')return 65;
    if(type==='CTA')return 55;
    if(type==='RAS')return 50;
    return 30;
  }

  async function analyze({lat,lng,radiusM=0,altitudeM=0,terrainElevationM=null}){
    const d=await load();
    if(!d)return {dataset:null,hits:[]};
    const latPad=(radiusM/110540)+0.002;
    const lonPad=(radiusM/(111320*Math.cos(lat*Math.PI/180)))+0.002;
    const q=[lng-lonPad,lat-latPad,lng+lonPad,lat+latPad];
    const hits=[];
    for(const f of d.features){
      const b=f.bbox;
      if(b[2]<q[0]||b[0]>q[2]||b[3]<q[1]||b[1]>q[3])continue;
      if(!geometryIntersectsCircle(lng,lat,radiusM,f.geometry))continue;
      const vertical=verticalStatus(f.p,altitudeM,terrainElevationM);
      hits.push({p:f.p,geometry:f.geometry,bbox:f.bbox,vertical,priority:priority(f.p),pointOnly:f.geometry.type==='Point'});
    }
    hits.sort((a,b)=>{
      const va={intersects:0,unknown:1,below:2,above:2}[a.vertical]??1;
      const vb={intersects:0,unknown:1,below:2,above:2}[b.vertical]??1;
      return va-vb||b.priority-a.priority||String(a.p.id||'').localeCompare(String(b.p.id||''));
    });
    return {dataset:{source:d.source,effective:d.effective,featureCount:d.featureCount},hits};
  }

  window.PrepaAirspace={importZip,load,clear,info,analyze};
})();