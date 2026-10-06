import { h, icon, sheet, toast, confirmDialog } from '../ui/dom.js';
import { mutate } from '../state.js';
import { missionUrl } from '../ui/layout.js';
import { analyzeAerodata, info as aerodataInfo, vacDirectUrl, hasDirectVac, SIA_URL, SOFIA_URL, SUPAIP_URL } from '../services/aerodata.js';

const TILES={
  plan:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap',max:19},
  sat:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Imagerie © Esri',max:19},
  oaci:{url:'https://data.geopf.fr/private/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&TILEMATRIXSET=PM_6_11&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&apikey=ign_scan_ws',attr:'OACI-VFR © DSNA/SIA · Géoplateforme',max:20,native:11,min:6}
};
const TYPE_COLORS={CTR:'#1976D2',TMA:'#2F80ED',CTA:'#5B8DEF',R:'#E53935',P:'#F9A825',D:'#EF6C00',TRA:'#8E24AA','D-OTHER':'#7E57C2',SECTOR:'#26A69A',RAS:'#78909C',FIR:'#607D8B',UIR:'#90A4AE',UTA:'#546E7A',OCA:'#455A64'};
const OFFICIAL={espace:{label:'Voir sur le SIA',url:SIA_URL},notam:{label:'Ouvrir SOFIA-Briefing',url:SOFIA_URL},supaip:{label:'Voir les SUP AIP',url:SUPAIP_URL}};
const TAB_LABELS={espace:'Espace',notam:'NOTAM',supaip:'SUP AIP'};
const safeText=(v)=>String(v??'').trim();
const typeColor=(t)=>TYPE_COLORS[t]||'#CDB23A';
const hasPoint=(m)=>Number.isFinite(m.place?.lat)&&Number.isFinite(m.place?.lon);

function parseClockRange(schedule=''){
  const s=String(schedule);
  const m=s.match(/(?:^|\D)([0-2]\d)[:h]?([0-5]\d)\s*[-–→]\s*([0-2]\d)[:h]?([0-5]\d)(?:\D|$)/);
  if(!m)return null;
  return {start:+m[1]*60 + +m[2],end:+m[3]*60 + +m[4]};
}
function temporalStatus(schedule,mode,mission){
  if(mode==='all')return 'shown';
  const r=parseClockRange(schedule);
  if(!r)return 'unknown';
  let start,end;
  if(mode==='now'){
    const d=new Date();start=end=d.getHours()*60+d.getMinutes();
  }else{
    const a=mission.window?.start?new Date(mission.window.start):null,b=mission.window?.end?new Date(mission.window.end):null;
    if(!a||!b||Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))return 'unknown';
    start=a.getHours()*60+a.getMinutes();end=b.getHours()*60+b.getMinutes();
  }
  if(end<r.start)return 'upcoming';
  if(start>r.end)return 'inactive';
  return 'active';
}
function fmtDistance(m){return !Number.isFinite(m)?'—':m<1000?Math.round(m)+' m':(m/1000).toFixed(m<10000?1:0)+' km';}
function markerIcon(text,color){
  return L.divIcon({className:'mens-map-label',html:'<span style="--zone-color:'+color+'">'+String(text||'').replace(/[<>&"]/g,'').slice(0,55)+'</span>',iconSize:[150,32],iconAnchor:[75,16]});
}
function noticeItem(kind,it){
  const title=kind==='notam'?(it.id||'NOTAM'):(it.title||it.id||'SUP AIP');
  return title;
}

export function renderMensMap({mission,current='espace'}){
  current=['espace','notam','supaip'].includes(current)?current:'espace';
  const root=h('main',{class:'mens-map-screen'});
  let map=null,base=null,overlay=null,local=null,meta=null,busy=false;
  let baseMode='sat',timeMode='mission';
  const enabledTypes=new Set(['CTR','TMA','CTA','R','P','D','TRA']);
  let showAerodromes=true,showNotam=true,showSupaip=true;

  async function analyze(){
    if(!hasPoint(mission)||busy)return;
    busy=true;drawHud();
    try{
      meta=await aerodataInfo();
      const radius=Math.max(10000,Number(mission.place.radiusM)||500);
      local=await analyzeAerodata({lat:mission.place.lat,lon:mission.place.lon,radiusM:radius,nearest:20});
      mutate(mission,(m)=>{
        const es=m.mens.espace;
        es.localAnalysisAt=new Date().toISOString();
        if(local?.meta)es.localDataset={source:local.meta.source,effective:local.meta.effective,featureCount:local.meta.spaceCount,aerodromeCount:local.meta.aerodromeCount};
        es.localZones=(local?.zones||[]).slice(0,150).map((z)=>({id:z.id,type:z.type,subType:z.subType,name:z.name,className:z.className,floor:z.floor,ceiling:z.ceiling,schedule:z.schedule,remark:z.remark,pointOnly:z.pointOnly}));
        es.aerodromes=(local?.aerodromes||[]).map((a)=>({icao:a.icao,name:a.name,type:a.type,altitudeFt:a.altitudeFt,distanceM:a.distanceM,remark:a.remark,frequencies:a.frequencies,runways:a.runways}));
        es.controlled=(local?.zones||[]).some((z)=>['CTR','TMA','CTA'].includes(z.type));
      });
      renderLayers();drawHud();
    }catch(e){toast(e.message||'Analyse aéronautique indisponible','bad');}
    finally{busy=false;drawHud();}
  }
  function setBase(name){
    baseMode=name;if(base)map.removeLayer(base);
    const t=TILES[name];base=L.tileLayer(t.url,{minZoom:t.min,maxZoom:t.max,maxNativeZoom:t.native||t.max,attribution:t.attr,keepBuffer:4}).addTo(map);
  }
  function zoneVisible(z){
    if(!enabledTypes.has(z.type))return false;
    const st=temporalStatus(z.schedule,timeMode,mission);
    return timeMode==='all'||st!=='inactive';
  }
  function statusLabel(z){
    const st=temporalStatus(z.schedule,timeMode,mission);
    return st==='active'?'Actif':st==='upcoming'?'À venir':st==='inactive'?'Inactif':st==='shown'?'Affiché':'Horaire à vérifier';
  }
  function statusClass(z){
    const st=temporalStatus(z.schedule,timeMode,mission);
    return st==='active'?'active':st==='upcoming'?'upcoming':st==='inactive'?'inactive':'unknown';
  }
  function openZone(z){
    const official=OFFICIAL.espace;
    let sh;
    sh=sheet([z.id,z.name].filter(Boolean).join(' · ')||'Espace aérien',
      h('div',{class:'stack mens-detail-sheet'},
        h('div',{class:'mens-detail-head'},
          h('span',{class:'mens-zone-symbol',style:'--zone-color:'+typeColor(z.type)},z.type||'?'),
          h('div',{},h('strong',{},[z.id,z.name].filter(Boolean).join(' · ')||'Espace aérien'),h('small',{},[z.type,z.subType].filter(Boolean).join(' · '))),
          h('span',{class:'mens-time-pill '+statusClass(z)},statusLabel(z))),
        h('div',{class:'mens-detail-grid'},
          h('div',{},h('span',{},'Limites verticales'),h('strong',{},(z.floor||'—')+' → '+(z.ceiling||'—'))),
          h('div',{},h('span',{},'Classe'),h('strong',{},z.className||'—')),
          h('div',{},h('span',{},'Horaires publiés'),h('strong',{},z.schedule||'À vérifier')),
          h('div',{},h('span',{},'Type'),h('strong',{},z.type||'—'))),
        z.remark?h('div',{class:'mens-detail-note'},z.remark):null,
        h('div',{class:'banner warn'},icon('warn',18),h('span',{},'L’état temporel est une aide à la lecture. Vérifier la publication SIA officielle avant le vol.')),
        h('a',{class:'btn primary block',href:official.url,target:'_blank',rel:'noopener noreferrer'},official.label+' ↗'),
        h('button',{class:'btn ghost block',onclick:()=>{sh.close();map.fitBounds(L.geoJSON({type:'Feature',geometry:z.geometry}).getBounds(),{padding:[30,30]});}},'Zoomer sur la zone')
      ),{autofocus:false});
  }
  function openAerodrome(a){
    const vac=a.icao?vacDirectUrl(a.icao,meta?.effective):SIA_URL;
    sheet([a.icao,a.name].filter(Boolean).join(' · ')||'Aérodrome',
      h('div',{class:'stack mens-detail-sheet'},
        h('div',{class:'mens-detail-head'},h('span',{class:'mens-ad-symbol'},'✈'),h('div',{},h('strong',{},a.name||'Aérodrome'),h('small',{},[a.icao,fmtDistance(a.distanceM)].filter(Boolean).join(' · ')))),
        Number.isFinite(a.altitudeFt)?h('p',{},'Altitude : '+a.altitudeFt+' ft'):null,
        a.frequencies?.length?h('div',{},h('span',{class:'lbl'},'Fréquences'),...a.frequencies.slice(0,8).map((f)=>h('p',{class:'mono small'},typeof f==='string'?f:[f.service,f.mhz&&f.mhz+' MHz',f.callsign].filter(Boolean).join(' · ')))):null,
        h('a',{class:'btn primary block',href:vac,target:'_blank',rel:'noopener noreferrer'},a.icao&&hasDirectVac(a.icao)?'Ouvrir la VAC ↗':'Rechercher au SIA ↗')
      ),{autofocus:false});
  }
  function openNotice(kind,it){
    let sh;
    const label=noticeItem(kind,it);
    const official=OFFICIAL[kind];
    sh=sheet(label,h('div',{class:'stack mens-detail-sheet'},
      h('div',{class:'mens-detail-head'},
        h('span',{class:'mens-notice-symbol '+kind},kind==='notam'?'N':'S'),
        h('div',{},h('strong',{},label),h('small',{},it.validity||'Validité non renseignée'))),
      kind==='notam'&&it.text?h('div',{class:'mens-detail-note'},it.text):null,
      kind==='supaip'&&it.title?h('div',{class:'mens-detail-note'},it.title):null,
      Number.isFinite(it.lat)&&Number.isFinite(it.lon)?h('p',{class:'mono small'},it.lat.toFixed(6)+' · '+it.lon.toFixed(6)):h('p',{class:'note'},'Cet élément n’a pas de géométrie renseignée dans la mission.'),
      it.url?h('a',{class:'btn primary block',href:it.url,target:'_blank',rel:'noopener noreferrer'},'Ouvrir le document ↗'):h('a',{class:'btn primary block',href:official.url,target:'_blank',rel:'noopener noreferrer'},official.label+' ↗'),
      h('button',{class:'btn danger block',onclick:async()=>{
        if(!await confirmDialog('Supprimer cet élément ?',label,'Supprimer'))return;
        mutate(mission,(m)=>{m.mens[kind].items=m.mens[kind].items.filter((x)=>x.addedAt!==it.addedAt||x.id!==it.id);});
        sh.close();renderLayers();drawHud();
      }},'Supprimer')
    ),{autofocus:false});
  }
  function renderLayers(){
    if(!map||!overlay)return;
    overlay.clearLayers();
    const zones=local?.zones||[];
    for(const z of zones){
      if(!zoneVisible(z)||!z.geometry||z.geometry.type==='Point')continue;
      const color=typeColor(z.type),st=temporalStatus(z.schedule,timeMode,mission);
      const opacity=st==='inactive'?.15:st==='upcoming'?.5:.82;
      try{
        const l=L.geoJSON({type:'Feature',geometry:z.geometry},{style:{color,weight:3,fillColor:color,fillOpacity:.12,opacity}}).addTo(overlay);
        l.on('click',()=>openZone(z));
        const geo=l.getBounds?.();if(geo?.isValid?.()){
          const c=geo.getCenter();L.marker(c,{interactive:false,icon:markerIcon([z.id||z.name||z.type,statusLabel(z)].filter(Boolean).join(' · '),color)}).addTo(overlay);
        }
      }catch{}
    }
    if(showAerodromes)for(const a of local?.aerodromes||[]){
      if(!Number.isFinite(a.lat)||!Number.isFinite(a.lon))continue;
      const m=L.circleMarker([a.lat,a.lon],{radius:7,color:'#fff',weight:2,fillColor:'#8E24AA',fillOpacity:1}).addTo(overlay);
      m.bindTooltip([a.icao,a.name].filter(Boolean).join(' · '));m.on('click',()=>openAerodrome(a));
    }
    const addNotice=(kind,it,color)=>{
      if(!Number.isFinite(it.lat)||!Number.isFinite(it.lon))return;
      const r=Number(it.radiusM)||500;
      const l=L.circle([it.lat,it.lon],{radius:r,color,weight:3,dashArray:'7 5',fillColor:color,fillOpacity:.12}).addTo(overlay);
      l.bindTooltip(noticeItem(kind,it));l.on('click',()=>openNotice(kind,it));
    };
    if(showNotam)for(const it of mission.mens.notam.items||[])addNotice('notam',it,'#E53935');
    if(showSupaip)for(const it of mission.mens.supaip.items||[])addNotice('supaip',it,'#F9A825');
    if(hasPoint(mission)){
      L.circle([mission.place.lat,mission.place.lon],{radius:mission.place.radiusM||500,color:'#1976D2',weight:3,dashArray:'8 6',fillOpacity:.03}).addTo(overlay);
      L.circleMarker([mission.place.lat,mission.place.lon],{radius:8,color:'#fff',weight:3,fillColor:'#1976D2',fillOpacity:1}).bindTooltip('Zone mission').addTo(overlay);
    }
  }
  function layerSheet(){
    const types=[...new Set((local?.zones||[]).map((z)=>z.type).filter(Boolean))];
    let sh;
    const toggle=(label,checked,onchange,color)=>h('label',{class:'mens-layer-toggle'},
      h('input',{type:'checkbox',checked,onchange:(e)=>onchange(e.target.checked)}),
      h('span',{class:'mens-layer-color',style:'--zone-color:'+color}),
      h('span',{},label));
    sh=sheet('Couches cartographiques',h('div',{class:'stack mens-layers-sheet'},
      h('div',{},h('span',{class:'lbl'},'Fonds de carte'),
        h('div',{class:'seg'},...['plan','sat','oaci'].map((x)=>h('button',{class:baseMode===x?'on':'',onclick:()=>{setBase(x);sh.close();layerSheet();}},x==='plan'?'Plan':x==='sat'?'Satellite':'OACI')))),
      h('div',{},h('span',{class:'lbl'},'Espaces aériens SIA'),
        h('div',{class:'mens-layer-list'},...types.map((t)=>toggle(t,enabledTypes.has(t),(on)=>{on?enabledTypes.add(t):enabledTypes.delete(t);renderLayers();},typeColor(t))))),
      h('div',{},h('span',{class:'lbl'},'Aérodromes et informations temporaires'),
        h('div',{class:'mens-layer-list'},
          toggle('Aérodromes',showAerodromes,(v)=>{showAerodromes=v;renderLayers();},'#8E24AA'),
          toggle('NOTAM géolocalisés',showNotam,(v)=>{showNotam=v;renderLayers();},'#E53935'),
          toggle('SUP AIP géolocalisés',showSupaip,(v)=>{showSupaip=v;renderLayers();},'#F9A825'))),
      h('p',{class:'note'},'Les NOTAM et SUP AIP ne sont cartographiés que lorsqu’une position a été enregistrée dans la mission.')
    ),{autofocus:false});
  }
  function timeSheet(){
    let sh;
    const choose=(v)=>{timeMode=v;renderLayers();sh.close();drawHud();};
    sh=sheet('Filtre temporel',h('div',{class:'stack'},
      h('div',{class:'seg'},h('button',{class:timeMode==='now'?'on':'',onclick:()=>choose('now')},'Maintenant'),h('button',{class:timeMode==='mission'?'on':'',onclick:()=>choose('mission')},'Créneau mission'),h('button',{class:timeMode==='all'?'on':'',onclick:()=>choose('all')},'Tous')),
      h('div',{class:'mens-time-summary'},
        h('span',{class:'lbl'},'Créneau de la mission'),
        h('strong',{},mission.window?.start&&mission.window?.end?new Date(mission.window.start).toLocaleString('fr-FR')+' → '+new Date(mission.window.end).toLocaleString('fr-FR'):'Non renseigné')),
      h('div',{class:'banner warn'},icon('warn',18),h('span',{},'Le filtre interprète uniquement les horaires SIA simples. Les horaires complexes restent affichés comme « à vérifier ».'))
    ),{autofocus:false});
  }
  function addNotice(kind){
    let sh;
    const isN=kind==='notam';
    const id=h('input',{maxlength:80,placeholder:isN?'Ex. A1234/26':'Ex. SUP AIP 123/26'});
    const title=h('input',{maxlength:300,placeholder:'Titre / objet'});
    const text=h('textarea',{rows:4,maxlength:20000,placeholder:'Résumé / impact opérationnel'});
    const validity=h('input',{maxlength:160,placeholder:'Validité / horaires'});
    const url=h('input',{maxlength:500,placeholder:'https://… (facultatif)'});
    const geo=h('input',{type:'checkbox',checked:hasPoint(mission)});
    const radius=h('input',{type:'number',min:50,max:50000,value:String(Math.max(500,mission.place?.radiusM||500)),inputmode:'numeric'});
    const save=()=>{
      if(!id.value.trim()&&!title.value.trim())return toast('Renseigne une référence ou un titre.','bad');
      const item={id:id.value.trim(),validity:validity.value.trim(),addedAt:new Date().toISOString()};
      if(isN)item.text=text.value.trim();else{item.title=title.value.trim();item.url=url.value.trim();}
      if(geo.checked&&hasPoint(mission)){item.lat=mission.place.lat;item.lon=mission.place.lon;item.radiusM=Math.max(50,Math.min(50000,Number(radius.value)||500));}
      mutate(mission,(m)=>{m.mens[kind].items.push(item);m.mens[kind].fetchedAt=new Date().toISOString();m.mens[kind].source='consultation officielle · saisie manuelle';});
      sh.close();renderLayers();drawHud();toast((isN?'NOTAM':'SUP AIP')+' ajouté');
    };
    sh=sheet(isN?'Ajouter un NOTAM':'Ajouter un SUP AIP',h('div',{class:'stack mens-add-notice'},
      h('label',{class:'field-label'},isN?'Numéro':'Référence',id),
      !isN?h('label',{class:'field-label'},'Titre',title):null,
      isN?h('label',{class:'field-label'},'Texte / impact',text):null,
      h('label',{class:'field-label'},'Validité',validity),
      !isN?h('label',{class:'field-label'},'Lien document',url):null,
      h('label',{class:'mens-geo-check'},geo,h('span',{},'Afficher sur la carte autour de la zone mission')),
      h('label',{class:'field-label'},'Rayon cartographique (m)',radius),
      h('button',{class:'btn primary block',onclick:save},'Ajouter à la mission')
    ),{autofocus:false});
  }
  function listSheet(kind){
    const data=mission.mens[kind],official=OFFICIAL[kind];
    let sh;
    sh=sheet(kind==='notam'?'NOTAM mission':'SUP AIP mission',h('div',{class:'stack'},
      h('a',{class:'btn primary block',href:official.url,target:'_blank',rel:'noopener noreferrer'},official.label+' ↗'),
      h('button',{class:'btn ghost block',onclick:()=>{sh.close();addNotice(kind);}},kind==='notam'?'+ Ajouter un NOTAM':'+ Ajouter un SUP AIP'),
      data.items?.length?h('div',{class:'mens-notice-list'},...data.items.map((it)=>h('button',{class:'mens-notice-row',onclick:()=>{sh.close();openNotice(kind,it);}},
        h('span',{class:'mens-notice-symbol '+kind},kind==='notam'?'N':'S'),
        h('span',{},h('strong',{},noticeItem(kind,it)),h('small',{},it.validity||'Validité non renseignée')),
        icon('arrow',16)
      ))):h('p',{class:'note'},'Aucun élément reporté dans la mission.'),
      !data.items?.length?h('button',{class:'btn ghost block',onclick:()=>{mutate(mission,(m)=>{m.mens[kind].fetchedAt=new Date().toISOString();m.mens[kind].source='consultation officielle · aucun élément reporté';});sh.close();drawHud();toast('Consultation enregistrée');}},'Source consultée · rien à reporter'):null
    ),{autofocus:false});
  }
  function counts(){
    const zones=(local?.zones||[]).filter(zoneVisible).length;
    return {zones,notam:(mission.mens.notam.items||[]).length,supaip:(mission.mens.supaip.items||[]).length};
  }
  function drawHud(){
    const hud=root.querySelector('.mens-map-hud');if(!hud)return;
    const c=counts();
    hud.replaceChildren(
      h('div',{class:'mens-map-tabs'},
        ...['espace','notam','supaip'].map((r)=>h('button',{class:current===r?'on':'',onclick:()=>{
          current=r;history.replaceState(null,'',missionUrl(mission.id,r));drawHud();
        }},TAB_LABELS[r]))),
      h('div',{class:'mens-map-tools'},
        h('button',{class:'mens-float-btn',onclick:layerSheet},icon('layers',20),h('span',{},'Couches')),
        h('button',{class:'mens-float-btn',onclick:timeSheet},icon('sun',20),h('span',{},'Créneau'))),
      h('div',{class:'mens-map-bottom'},
        h('div',{class:'mens-map-counts'},
          h('button',{onclick:()=>{current='espace';drawHud();}},h('strong',{},String(c.zones)),h('small',{},'Espaces')),
          h('button',{onclick:()=>listSheet('notam')},h('strong',{},String(c.notam)),h('small',{},'NOTAM')),
          h('button',{onclick:()=>listSheet('supaip')},h('strong',{},String(c.supaip)),h('small',{},'SUP AIP'))),
        current==='espace'
          ? h('button',{class:'cta primary',disabled:busy,onclick:analyze},busy?'Analyse…':'Actualiser la zone',icon('arrow',18))
          : h('button',{class:'cta primary',onclick:()=>listSheet(current)},current==='notam'?'Gérer les NOTAM':'Gérer les SUP AIP',icon('arrow',18))),
      h('div',{class:'mens-map-disclaimer'},'Aide à la préparation · confirmer les publications officielles SIA / SOFIA')
    );
  }
  function init(){
    if(!hasPoint(mission)){
      root.replaceChildren(h('div',{class:'empty mens-map-empty'},h('h1',{},'Zone de mission requise'),h('p',{},'Définis d’abord le point et le rayon de mission.'),h('a',{class:'btn primary',href:missionUrl(mission.id,'lieu')},'Choisir la zone')));
      return;
    }
    root.replaceChildren(
      h('div',{id:'mens-full-map',class:'mens-full-map'}),
      h('header',{class:'mens-map-head'},
        h('button',{class:'icon-btn',onclick:()=>location.hash=missionUrl(mission.id,'etapes'),'aria-label':'Retour'},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},mission.name),h('strong',{},'MENS · Carte aéronautique')),
        h('a',{class:'icon-btn',href:OFFICIAL[current].url,target:'_blank',rel:'noopener noreferrer','aria-label':'Source officielle'},'?')),
      h('div',{class:'mens-map-hud'})
    );
    map=L.map('mens-full-map',{zoomControl:false,attributionControl:true}).setView([mission.place.lat,mission.place.lon],12);
    map.attributionControl.setPrefix(false);
    overlay=L.layerGroup().addTo(map);setBase(baseMode);drawHud();
    const bounds=L.circle([mission.place.lat,mission.place.lon],{radius:Math.max(5000,mission.place.radiusM||500)}).getBounds();
    map.fitBounds(bounds,{padding:[20,20],maxZoom:13});
    analyze();
  }
  queueMicrotask(init);
  return {el:root,destroy(){map?.remove();}};
}
