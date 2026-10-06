import { h, icon, toast, sheet, confirmDialog } from '../ui/dom.js';
import { mutate } from '../state.js';
import { missionUrl } from '../ui/layout.js';
import { fetchElevationProfile, routeDistance } from '../services/elevation.js';

const TILES={
  plan:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap',max:19},
  sat:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Imagerie © Esri',max:19},
  oaci:{url:'https://data.geopf.fr/private/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&TILEMATRIXSET=PM_6_11&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&apikey=ign_scan_ws',attr:'OACI-VFR © DSNA/SIA · Géoplateforme',max:20,native:11,min:6}
};
const clone=(x)=>structuredClone(x);
const emptyMap=()=>({start:null,end:null,route:[],polygon:[],elevation:[],elevationSource:'',flightProfile:[]});

function fmtDist(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(2)+' km';}
function hasGeometry(d){return (d.route&&d.route.length>=2)||(d.polygon&&d.polygon.length>=3)||(d.start&&d.end);}
function interpAgl(points,ratio){
  const p=[...(points||[])].sort((a,b)=>a.ratio-b.ratio);
  if(!p.length)return null;
  if(ratio<=p[0].ratio)return p[0].aglM;
  if(ratio>=p[p.length-1].ratio)return p[p.length-1].aglM;
  for(let i=1;i<p.length;i++){
    if(ratio<=p[i].ratio){
      const a=p[i-1],b=p[i],t=(ratio-a.ratio)/(b.ratio-a.ratio||1);
      return a.aglM+t*(b.aglM-a.aglM);
    }
  }
  return null;
}

function routePointRatios(points=[]){
  if(points.length<2)return points.map(()=>0);
  const seg=[];let total=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    const r=Math.PI/180,R=6371008.8,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
    const q=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
    const d=2*R*Math.asin(Math.min(1,Math.sqrt(q)));seg.push(d);total+=d;
  }
  let acc=0;const out=[0];
  for(const d of seg){acc+=d;out.push(total?acc/total:0);}
  return out;
}

export function renderCheminement({mission}){
  const root=h('main',{class:'route-tool'});
  let data=clone(mission.macloeMap||emptyMap());
  let mode='route',map=null,base=null,drawLayer=null,markers=[];
  let baseMode='sat',busy=false;

  function persist(){
    mutate(mission,(m)=>{
      m.macloeMap=clone(data);
      if((m.validation?.macloe||[]).includes('C'))m.validation.macloe=m.validation.macloe.filter((x)=>x!=='C');
    });
  }

  function addPoint(latlng){
    const p={lat:+latlng.lat.toFixed(7),lon:+latlng.lng.toFixed(7)};
    if(mode==='start')data.start=p;
    else if(mode==='end')data.end=p;
    else if(mode==='polygon')data.polygon=[...(data.polygon||[]),p];
    else data.route=[...(data.route||[]),p];
    data.elevation=[];data.elevationSource='';
    persist();renderMapShapes();drawPanel();
  }

  function undo(){
    if(mode==='polygon'&&data.polygon.length)data.polygon=data.polygon.slice(0,-1);
    else if(mode==='route'&&data.route.length)data.route=data.route.slice(0,-1);
    else if(mode==='start')data.start=null;
    else if(mode==='end')data.end=null;
    data.elevation=[];persist();renderMapShapes();drawPanel();
  }

  function clearAll(){data=emptyMap();persist();renderMapShapes();drawPanel();}

  function markerIcon(label,cls){
    return L.divIcon({
      className:'route-div-icon',
      html:'<span class="route-pin '+(cls||'')+'">'+label+'</span>',
      iconSize:[Math.max(34,label.length*7+14),34],iconAnchor:[17,17]
    });
  }

  function terrainAtRatio(ratio){
    const prof=data.elevation||[];
    if(prof.length<2)return null;
    const maxD=prof[prof.length-1].distanceM||1;
    let best=prof[0],bestDelta=Infinity;
    for(const p of prof){
      const d=Math.abs((p.distanceM/maxD)-ratio);
      if(d<bestDelta){bestDelta=d;best=p;}
    }
    return Number.isFinite(best?.z)?best.z:null;
  }

  function syncPointHeightsToProfile(){
    const ratios=routePointRatios(data.route||[]);
    data.flightProfile=(data.route||[])
      .map((p,i)=>Number.isFinite(Number(p.aglM))?{ratio:+ratios[i].toFixed(4),aglM:Number(p.aglM)}:null)
      .filter(Boolean)
      .sort((a,b)=>a.ratio-b.ratio);
  }

  function openRoutePoint(i){
    const p=data.route[i];if(!p)return;
    const ratios=routePointRatios(data.route);
    const ratio=ratios[i]||0;
    const terrain=terrainAtRatio(ratio);
    let modal;
    const input=h('input',{
      type:'number',min:0,max:500,inputmode:'decimal',
      value:Number.isFinite(Number(p.aglM))?String(p.aglM):'',
      placeholder:'Ex. 60','aria-label':'Hauteur du drone en mètres AGL',
      oninput:(e)=>{const v=e.target.value.trim();aglValue.textContent=v?v+' m AGL':'À définir';}
    });
    const quick=[20,30,50,60,80,100,120];
    const aglValue=h('strong',{},Number.isFinite(Number(p.aglM))?p.aglM+' m AGL':'À définir');
    const quickWrap=h('div',{class:'agl-quick'},
      ...quick.map((v)=>h('button',{
        class:'agl-chip '+(Number(p.aglM)===v?'on':''),
        onclick:()=>{
          input.value=String(v);
          aglValue.textContent=v+' m AGL';
          [...quickWrap.children].forEach((b)=>b.classList.toggle('on',b.textContent===v+' m'));
        }
      },v+' m'))
    );
    const info=h('div',{class:'route-point-info'},
      h('div',{},h('span',{class:'lbl'},'Coordonnées'),h('strong',{class:'mono'},p.lat.toFixed(6)+' · '+p.lon.toFixed(6))),
      h('div',{},h('span',{class:'lbl'},'Terrain'),h('strong',{},Number.isFinite(terrain)?Math.round(terrain)+' m AMSL':'Non calculé'))
    );
    const save=()=>{
      const raw=input.value.trim();
      if(raw==='')delete p.aglM;
      else{
        const v=Number(raw);
        if(!Number.isFinite(v)||v<0||v>500)return toast('Hauteur entre 0 et 500 m AGL.','bad');
        p.aglM=v;
      }
      syncPointHeightsToProfile();persist();modal.close();renderMapShapes();drawPanel();
    };
    modal=sheet(i===0?'Départ':i===data.route.length-1?'Arrivée':'Point '+(i+1),
      h('div',{class:'stack route-point-sheet'},
        h('div',{class:'agl-title'},
          h('div',{},h('span',{class:'eyebrow'},'Hauteur de vol du drone'),h('small',{},'Au-dessus du sol · AGL')),
          aglValue),
        info,
        h('div',{class:'agl-section'},
          h('span',{class:'lbl'},'Hauteur au-dessus du sol · AGL'),
          quickWrap,
          h('label',{class:'field-label agl-free'},'Saisie libre en mètres',
            h('div',{class:'agl-free-wrap'},input,h('span',{class:'agl-unit'},'m AGL')))),
        h('div',{class:'banner info'},icon('info'),h('span',{},'Exemple : 60 m signifie que le drone vole à 60 m au-dessus du sol à ce point.')),
        Number.isFinite(terrain)&&Number.isFinite(Number(p.aglM))
          ? h('p',{class:'note'},'Altitude estimée du drone : '+Math.round((terrain+Number(p.aglM))*10)/10+' m AMSL.')
          : null,
        h('button',{class:'btn primary block',onclick:save},'Enregistrer la hauteur de vol'),
        h('button',{class:'btn ghost block',onclick:()=>{modal.close();toast('Maintiens puis fais glisser le point sur la carte pour le déplacer.');}},'Déplacer ce point'),
        h('button',{class:'btn danger block',onclick:async()=>{
          if(!await confirmDialog('Supprimer ce point ?','Le tracé sera recalculé sans ce point.','Supprimer'))return;
          data.route.splice(i,1);data.elevation=[];data.elevationSource='';syncPointHeightsToProfile();persist();modal.close();renderMapShapes();drawPanel();
        }},'Supprimer ce point')
      ), { autofocus:false });
  }

  function renderMapShapes(){
    if(!map)return;
    drawLayer.clearLayers();
    markers.forEach((m)=>m.remove());markers=[];
    if(data.route.length>=1){
      L.polyline(data.route.map((p)=>[p.lat,p.lon]),{color:'#2F80ED',weight:5,opacity:.95}).addTo(drawLayer);
      data.route.forEach((p,i)=>{
        const label=i===0?'D':i===data.route.length-1?'A':String(i+1);
        const cls=i===0?'start':i===data.route.length-1?'end':'';
        const m=L.marker([p.lat,p.lon],{draggable:true,bubblingMouseEvents:false,riseOnHover:true,icon:markerIcon(label+(Number.isFinite(Number(p.aglM))?' · '+p.aglM+'m':''),cls)}).addTo(map);
        m.on('click',(e)=>{L.DomEvent.stopPropagation(e);openRoutePoint(i);});
        m.on('contextmenu',(e)=>{L.DomEvent.stopPropagation(e);openRoutePoint(i);});
        m.on('dragend',()=>{
          const q=m.getLatLng();
          data.route[i]={...data.route[i],lat:q.lat,lon:q.lng};
          data.elevation=[];data.elevationSource='';
          syncPointHeightsToProfile();
          persist();renderMapShapes();drawPanel();
        });
        markers.push(m);
      });
    }
    if(data.polygon.length>=2){
      L.polygon(data.polygon.map((p)=>[p.lat,p.lon]),{color:'#CDB23A',weight:3,fillColor:'#CDB23A',fillOpacity:.13}).addTo(drawLayer);
    }
    if(data.start){
      const m=L.marker([data.start.lat,data.start.lon],{draggable:true,icon:markerIcon('D','start')}).addTo(map);
      m.on('dragend',()=>{const q=m.getLatLng();data.start={lat:q.lat,lon:q.lng};persist();drawPanel();});markers.push(m);
    }
    if(data.end){
      const m=L.marker([data.end.lat,data.end.lon],{draggable:true,icon:markerIcon('A','end')}).addTo(map);
      m.on('dragend',()=>{const q=m.getLatLng();data.end={lat:q.lat,lon:q.lng};persist();drawPanel();});markers.push(m);
    }
  }

  function setBase(name){
    baseMode=name;
    if(base)map.removeLayer(base);
    const t=TILES[name];
    base=L.tileLayer(t.url,{minZoom:t.min,maxZoom:t.max,maxNativeZoom:t.native||t.max,attribution:t.attr}).addTo(map);
    root.querySelectorAll('[data-route-base]').forEach((b)=>b.classList.toggle('on',b.dataset.routeBase===name));
  }

  async function calcProfile(){
    if(data.route.length<2)return toast('Trace au moins deux points.','bad');
    busy=true;drawPanel();
    try{
      const sampling=Math.min(180,Math.max(50,Math.round(routeDistance(data.route)/30)));
      const r=await fetchElevationProfile(data.route,sampling);
      data.elevation=r.profile;data.elevationSource=r.source;syncPointHeightsToProfile();persist();toast('Profil altimétrique calculé');
    }catch(e){toast(e.message,'bad');}
    busy=false;drawPanel();
  }


  function profileSvg(){
    syncPointHeightsToProfile();
    const fp=data.flightProfile||[];
    if(fp.length<2)return null;
    const W=720,H=220,pad=30;
    const vals=fp.map((p)=>p.aglM);
    const min=0,max=Math.max(20,Math.ceil(Math.max(...vals)/10)*10+10),span=max-min;
    const xy=(ratio,agl)=>[pad+ratio*(W-pad*2),H-pad-((agl-min)/span)*(H-pad*2)];
    const samples=[];
    for(let i=0;i<=100;i++){
      const ratio=i/100,agl=interpAgl(fp,ratio);
      if(agl!=null)samples.push(xy(ratio,agl));
    }
    const line=samples.map((p)=>p.join(',')).join(' ');
    const controls=fp.map((p)=>{
      const pos=xy(p.ratio,p.aglM);
      return '<circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="7" class="route-chart-control"/><text x="'+pos[0]+'" y="'+Math.max(14,pos[1]-11)+'" text-anchor="middle" class="route-chart-label">'+p.aglM+' m</text>';
    }).join('');
    const box=h('div',{class:'route-profile-chart drone-profile'});
    box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-label="Profil de vol du drone en hauteur AGL"><line x1="'+pad+'" y1="'+(H-pad)+'" x2="'+(W-pad)+'" y2="'+(H-pad)+'" class="route-ground"/><polyline class="route-flight-solid" points="'+line+'"/>'+controls+'<text x="'+pad+'" y="18" class="route-chart-label">'+max+' m AGL</text><text x="'+pad+'" y="'+(H-7)+'" class="route-chart-label">Sol · 0 m</text></svg>';
    return box;
  }

  function panelContent(){
    const dist=routeDistance(data.route||[]);
    const chart=profileSvg();
    const out=[
      h('div',{class:'route-panel-head'},
        h('div',{},h('strong',{},'Cheminement'),h('small',{},data.route.length>=2?data.route.length+' points · '+fmtDist(dist):'Touchez la carte pour tracer')),
        h('span',{class:'pill '+(hasGeometry(data)?'go':'unknown')},hasGeometry(data)?'CARTE OK':'BONUS')),
      h('div',{class:'route-mode-row'},
        ...['route','start','end','polygon'].map((v)=>{
          const labels={route:'Tracer',start:'Départ',end:'Arrivée',polygon:'Zone'};
          return h('button',{class:'route-mode '+(mode===v?'on':''),onclick:()=>{mode=v;drawPanel();}},labels[v]);
        })),
      h('div',{class:'route-mini-actions'},
        h('button',{class:'btn ghost small',onclick:undo},'↶ Dernier point'),
        h('button',{class:'btn ghost small',onclick:async()=>{if(await confirmDialog('Effacer la carte ?','Le tracé, la zone et le profil altimétrique seront supprimés.','Effacer'))clearAll();}},'Effacer'))
    ];
    if(data.route.length){
      out.push(h('section',{class:'route-points-card'},
        h('div',{class:'route-points-head'},h('strong',{},'Points du tracé'),h('small',{},'Touchez un point pour régler la hauteur de vol AGL')),
        h('div',{class:'route-points-list'},
          ...data.route.map((p,i)=>h('button',{
            class:'route-point-row',
            onclick:()=>openRoutePoint(i)
          },
            h('span',{class:'route-point-index'},i===0?'D':i===data.route.length-1?'A':String(i+1)),
            h('span',{class:'route-point-coord mono'},p.lat.toFixed(5)+' · '+p.lon.toFixed(5)),
            h('span',{class:'route-point-agl'},Number.isFinite(Number(p.aglM))?p.aglM+' m AGL':'Hauteur —'),
            icon('arrow',16)
          ))
        )
      ));
    }
    if(data.route.length>=2)out.push(h('button',{class:'btn primary block',disabled:busy,onclick:calcProfile},busy?'Calcul du relief…':data.elevation.length?'Recalculer le terrain IGN':'Calculer le terrain IGN · optionnel'));
    if(chart){
      out.push(h('section',{class:'route-profile'},
        h('div',{class:'route-profile-title'},h('strong',{},'Profil de vol du drone'),h('small',{},'Hauteur AGL')),
        chart,
        h('p',{class:'note'},'La courbe jaune représente la hauteur du drone au-dessus du sol. Elle est interpolée entre les hauteurs renseignées sur les points.')
      ));
    }
    out.push(h('button',{class:'btn ghost block',onclick:()=>{persist();location.hash=missionUrl(mission.id,'macloe');}},'Retour à MACLOE'));
    return out.filter(Boolean);
  }

  function drawPanel(){
    const panel=root.querySelector('.route-panel');
    if(panel)panel.replaceChildren(...panelContent());
  }

  function init(){
    root.replaceChildren(
      h('div',{class:'route-map',id:'route-map'}),
      h('header',{class:'route-top'},
        h('button',{class:'icon-btn',onclick:()=>{persist();location.hash=missionUrl(mission.id,'macloe');},'aria-label':'Retour'},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},'MACLOE · Bonus'),h('strong',{},'Carte de cheminement')),
        h('div',{class:'seg mini-seg'},
          h('button',{'data-route-base':'plan'},'Plan'),
          h('button',{'data-route-base':'sat',class:'on'},'Sat'),
          h('button',{'data-route-base':'oaci'},'OACI'))),
      h('section',{class:'route-panel'},...panelContent())
    );
    const center=Number.isFinite(mission.place.lat)?[mission.place.lat,mission.place.lon]:[46.6,2.4];
    map=L.map('route-map',{zoomControl:false,attributionControl:true}).setView(center,Number.isFinite(mission.place.lat)?15:6);
    map.attributionControl.setPrefix(false);
    drawLayer=L.layerGroup().addTo(map);
    root.querySelectorAll('[data-route-base]').forEach((b)=>b.onclick=()=>setBase(b.dataset.routeBase));
    setBase(baseMode);
    map.on('click',(e)=>addPoint(e.latlng));
    renderMapShapes();
    if(data.route.length>=2)map.fitBounds(L.latLngBounds(data.route.map((p)=>[p.lat,p.lon])),{padding:[40,40],maxZoom:17});
  }

  queueMicrotask(init);
  return {el:root,destroy(){map?.remove();}};
}
