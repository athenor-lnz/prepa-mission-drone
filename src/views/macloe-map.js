import { h, icon, sheet, toast, confirmDialog } from '../ui/dom.js';
import { mutate } from '../state.js';
import { missionUrl } from '../ui/layout.js';

const TILES={
  plan:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap',max:19},
  sat:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Imagerie © Esri',max:19},
  oaci:{url:'https://data.geopf.fr/private/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&TILEMATRIXSET=PM_6_11&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&apikey=ign_scan_ws',attr:'OACI-VFR © DSNA/SIA · Géoplateforme',max:20,native:11,min:6}
};
const COLORS=['#E53935','#F9A825','#CDB23A','#43A047','#1E88E5','#8E24AA','#FFFFFF'];
const clone=(x)=>structuredClone(x);
const id=()=>Math.random().toString(36).slice(2,9);

function ensure(m){
  m.macloeMap||={};
  m.macloeMap.annotations||={L:{lines:[]},E:{lines:[],zones:[]}};
  m.macloeMap.annotations.L||={lines:[]};
  m.macloeMap.annotations.E||={lines:[],zones:[]};
  m.macloeMap.annotations.L.lines||=[];
  m.macloeMap.annotations.E.lines||=[];
  m.macloeMap.annotations.E.zones||=[];
}
function sectionData(mission,section){
  ensure(mission);
  return mission.macloeMap.annotations[section];
}
function hasPoints(obj,min){return Array.isArray(obj?.points)&&obj.points.length>=min;}
function colorPicker(current,onChange){
  return h('div',{class:'annot-colors'},...COLORS.map((c)=>h('button',{
    class:'annot-color '+(c===current?'on':''),
    style:'--swatch:'+c,
    'aria-label':'Couleur '+c,
    onclick:(e)=>{onChange(c);e.currentTarget.parentElement.querySelectorAll('.annot-color').forEach((b)=>b.classList.toggle('on',b===e.currentTarget));}
  })));
}

export function renderMacloeMap({mission,section='L'}){
  section=section==='E'?'E':'L';
  ensure(mission);
  const root=h('main',{class:'route-tool annot-tool'});
  let data=clone(sectionData(mission,section));
  let map=null,base=null,drawLayer=null,routeLayer=null,mode=null,current=null,baseMode='sat';

  function persist(){
    mutate(mission,(m)=>{
      ensure(m);
      m.macloeMap.annotations[section]=clone(data);
      if((m.validation?.macloe||[]).includes(section))m.validation.macloe=m.validation.macloe.filter((x)=>x!==section);
    });
  }
  function setBase(name){
    baseMode=name;if(base)map.removeLayer(base);const t=TILES[name];
    base=L.tileLayer(t.url,{minZoom:t.min,maxZoom:t.max,maxNativeZoom:t.native||t.max,attribution:t.attr}).addTo(map);
    root.querySelectorAll('[data-annot-base]').forEach((b)=>b.classList.toggle('on',b.dataset.annotBase===name));
  }
  function drawRoute(){
    routeLayer.clearLayers();
    const r=mission.macloeMap?.route||[];
    if(r.length>=2){
      L.polyline(r.map((p)=>[p.lat,p.lon]),{color:'#2F80ED',weight:5,opacity:.8}).addTo(routeLayer);
      r.forEach((p,i)=>L.circleMarker([p.lat,p.lon],{radius:6,weight:2,color:'#fff',fillColor:'#2F80ED',fillOpacity:1})
        .bindTooltip(i===0?'Départ':i===r.length-1?'Arrivée':'Point '+(i+1)).addTo(routeLayer));
    }
  }
  function centerLabel(points,name,color){
    if(!points?.length||!name)return;
    const i=Math.floor(points.length/2),p=points[i];
    L.marker([p.lat,p.lon],{interactive:false,icon:L.divIcon({
      className:'annot-label-icon',html:'<span style="--label-color:'+color+'">'+name.replace(/[<>&"]/g,'')+'</span>',
      iconSize:[140,26],iconAnchor:[70,13]
    })}).addTo(drawLayer);
  }
  function renderAnnotations(){
    if(!drawLayer)return;drawLayer.clearLayers();
    for(const x of data.lines||[]){
      if(current?.id===x.id)continue;
      if(x.points?.length)L.polyline(x.points.map((p)=>[p.lat,p.lon]),{color:x.color||'#E53935',weight:5,opacity:.95}).addTo(drawLayer);
      centerLabel(x.points,x.name,x.color||'#E53935');
    }
    for(const z of data.zones||[]){
      if(current?.id===z.id)continue;
      if(z.points?.length>=2)L.polygon(z.points.map((p)=>[p.lat,p.lon]),{color:z.color||'#43A047',weight:3,fillColor:z.color||'#43A047',fillOpacity:.18}).addTo(drawLayer);
      centerLabel(z.points,z.name,z.color||'#43A047');
    }
    if(current?.points?.length){
      const pts=current.points.map((p)=>[p.lat,p.lon]);
      if(current.kind==='zone')L.polygon(pts,{color:current.color,weight:4,fillColor:current.color,fillOpacity:.15,dashArray:'7 5'}).addTo(drawLayer);
      else L.polyline(pts,{color:current.color,weight:5,dashArray:'7 5'}).addTo(drawLayer);
      current.points.forEach((p)=>L.circleMarker([p.lat,p.lon],{radius:6,color:'#fff',weight:2,fillColor:current.color,fillOpacity:1}).addTo(drawLayer));
    }
  }
  function begin(kind,preset=null){
    const isZone=kind==='zone';
    let sh,name=preset?.name||'',color=preset?.color||COLORS[isZone?3:0];
    const input=h('input',{value:name,maxlength:80,placeholder:isZone?'Ex. Zone secours Sud':'Ex. Ligne de débouché Nord'});
    const colors=colorPicker(color,(c)=>color=c);
    sh=sheet(isZone?'Zone de dégagement':'Ligne cartographique',h('div',{class:'stack annot-create'},
      h('label',{class:'field-label'},'Nom',input),
      h('div',{},h('span',{class:'lbl'},'Couleur'),colors),
      h('button',{class:'btn primary block',onclick:()=>{
        name=input.value.trim();if(!name)return toast('Donne un nom.','bad');
        sh.close();
        current={id:preset?.id||id(),kind,name,color,points:preset?.points?clone(preset.points):[]};
        mode=kind;drawPanel();renderAnnotations();
      }},preset?'Modifier / retracer':'Commencer le tracé')
    ),{autofocus:false});
  }
  function finish(){
    if(!current)return;
    const min=current.kind==='zone'?3:2;
    if(current.points.length<min)return toast(current.kind==='zone'?'Ajoute au moins 3 points.':'Ajoute au moins 2 points.','bad');
    if(current.kind==='zone')data.zones=[...(data.zones||[]).filter((x)=>x.id!==current.id),clone(current)];
    else data.lines=[...(data.lines||[]).filter((x)=>x.id!==current.id),clone(current)];
    current=null;mode=null;persist();renderAnnotations();drawPanel();
  }
  function cancelDraw(){current=null;mode=null;renderAnnotations();drawPanel();}
  function undo(){if(current?.points?.length){current.points.pop();renderAnnotations();drawPanel();}}
  function openExisting(kind,obj){
    let sh;
    sh=sheet(obj.name,h('div',{class:'stack'},
      h('div',{class:'annot-preview'},h('span',{style:'--swatch:'+obj.color,class:'annot-dot'}),h('strong',{},obj.name),h('small',{},obj.points.length+' point(s)')),
      h('button',{class:'btn primary block',onclick:()=>{sh.close();begin(kind,obj);}},'Modifier nom / couleur'),
      h('button',{class:'btn ghost block',onclick:()=>{sh.close();begin(kind,{...obj,points:[]});}},'Retracer'),
      h('button',{class:'btn danger block',onclick:async()=>{
        if(!await confirmDialog('Supprimer ?',obj.name,'Supprimer'))return;
        if(kind==='zone')data.zones=data.zones.filter((x)=>x.id!==obj.id);else data.lines=data.lines.filter((x)=>x.id!==obj.id);
        persist();sh.close();renderAnnotations();drawPanel();
      }},'Supprimer')
    ),{autofocus:false});
  }
  function drawPanel(){
    const p=root.querySelector('.annot-panel');if(!p)return;
    const title=section==='L'?'Ligne de débouché':'Esquive';
    const rows=[
      ...(data.lines||[]).map((x)=>({kind:'line',x})),
      ...(data.zones||[]).map((x)=>({kind:'zone',x}))
    ];
    p.replaceChildren(
      h('div',{class:'route-panel-head'},h('div',{},h('strong',{},title),h('small',{},'Cheminement affiché en bleu')),h('span',{class:'pill'},section)),
      mode?h('div',{class:'annot-drawing'},
        h('strong',{},current.name),
        h('small',{},current.kind==='zone'?'Touchez la carte pour dessiner la zone':'Touchez la carte pour tracer la ligne'),
        h('div',{class:'route-mini-actions'},
          h('button',{class:'btn ghost small',onclick:undo},'↶ Dernier point'),
          h('button',{class:'btn ghost small',onclick:cancelDraw},'Annuler')),
        h('button',{class:'btn primary block',onclick:finish},current.kind==='zone'?'Terminer la zone':'Terminer la ligne')
      ):h('div',{class:'annot-add-grid'},
        h('button',{class:'btn primary',onclick:()=>begin('line')},'+ Ligne'),
        section==='E'?h('button',{class:'btn primary',onclick:()=>begin('zone')},'+ Zone de dégagement'):null),
      rows.length?h('div',{class:'annot-list'},...rows.map(({kind,x})=>h('button',{class:'annot-row',onclick:()=>openExisting(kind,x)},
        h('span',{class:'annot-dot',style:'--swatch:'+x.color}),
        h('span',{class:'annot-copy'},h('strong',{},x.name),h('small',{},kind==='zone'?'Zone de dégagement':'Ligne')),
        icon('arrow',17)
      ))):h('p',{class:'note'},section==='L'?'Aucune ligne ajoutée.':'Aucune ligne ni zone de dégagement ajoutée.'),
      h('button',{class:'btn ghost block',onclick:()=>{persist();location.hash=missionUrl(mission.id,'macloe');}},'Retour à MACLOE')
    );
  }
  function init(){
    root.replaceChildren(
      h('div',{class:'route-map',id:'annot-map'}),
      h('header',{class:'route-top'},
        h('button',{class:'icon-btn',onclick:()=>{persist();location.hash=missionUrl(mission.id,'macloe');},'aria-label':'Retour'},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},'MACLOE · '+section),h('strong',{},section==='L'?'Ligne de débouché':'Esquive')),
        h('div',{class:'seg mini-seg'},
          h('button',{'data-annot-base':'plan'},'Plan'),
          h('button',{'data-annot-base':'sat',class:'on'},'Sat'),
          h('button',{'data-annot-base':'oaci'},'OACI'))),
      h('section',{class:'route-panel annot-panel'})
    );
    const r=mission.macloeMap?.route||[];
    const center=r.length?[r[0].lat,r[0].lon]:Number.isFinite(mission.place.lat)?[mission.place.lat,mission.place.lon]:[46.6,2.4];
    map=L.map('annot-map',{zoomControl:false,attributionControl:true}).setView(center,r.length?15:6);
    map.attributionControl.setPrefix(false);
    routeLayer=L.layerGroup().addTo(map);drawLayer=L.layerGroup().addTo(map);
    root.querySelectorAll('[data-annot-base]').forEach((b)=>b.onclick=()=>setBase(b.dataset.annotBase));setBase(baseMode);
    drawRoute();renderAnnotations();drawPanel();
    if(r.length>=2)map.fitBounds(L.latLngBounds(r.map((p)=>[p.lat,p.lon])),{padding:[45,45],maxZoom:17});
    map.on('click',(e)=>{
      if(!current)return;
      current.points.push({lat:+e.latlng.lat.toFixed(7),lon:+e.latlng.lng.toFixed(7)});
      renderAnnotations();drawPanel();
    });
  }
  queueMicrotask(init);
  return {el:root,destroy(){map?.remove();}};
}
