import { h, icon, sheet, toast, confirmDialog } from '../ui/dom.js';
import { missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { buildMissionKml, buildKmz, downloadBlob, safeFileName } from '../lib/kml.js';
import { drawMissionMap, missionMapItems, tileConfig } from '../lib/final-map.js';

function fmtDist(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(2)+' km';}
function routeDistance(points=[]){
  const r=Math.PI/180,R=6371008.8;let d=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
    const q=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
    d+=2*R*Math.asin(Math.min(1,Math.sqrt(q)));
  }
  return d;
}
function lineItem(name,color,label){
  return h('div',{class:'final-layer-row'},
    h('span',{class:'final-layer-swatch line',style:'--swatch:'+color}),
    h('span',{class:'final-layer-copy'},h('strong',{},name),h('small',{},label))
  );
}
function zoneItem(name,color){
  return h('div',{class:'final-layer-row'},
    h('span',{class:'final-layer-swatch zone',style:'--swatch:'+color}),
    h('span',{class:'final-layer-copy'},h('strong',{},name),h('small',{},'Zone de dégagement'))
  );
}

export function renderFinalMap({mission}){
  const root=h('main',{class:'route-tool final-map-tool'});
  let data=missionMapItems(mission);
  let map=null,base=null,mode='sat',overlay=null,poiMode=false;


  function persistPois(pois){
    mutate(mission,(m)=>{m.macloeMap||={};m.macloeMap.pois=pois;});
    data=missionMapItems(mission);
  }
  function redraw(){
    overlay?.remove();
    overlay=drawMissionMap(L,map,mission,{labels:true,showRadius:true}).group;
    drawPanel();
  }
  function addPoi(latlng){
    let sh,color='#CDB23A';
    const name=h('input',{maxlength:80,placeholder:'Ex. DZ Nord'});
    const category=h('select',{},
      ...['DZ','Objectif','Obstacle','Point d’observation','PC','Zone sensible','Autre'].map((x)=>h('option',{value:x},x)));
    const note=h('textarea',{rows:3,maxlength:500,placeholder:'Note optionnelle'});
    const colors=['#CDB23A','#1976D2','#43A047','#E53935','#8E24AA','#F57C00','#FFFFFF'];
    const picker=h('div',{class:'annot-colors'},...colors.map((col)=>h('button',{
      class:'annot-color '+(col===color?'on':''),
      style:'--swatch:'+col,
      onclick:(e)=>{color=col;[...e.currentTarget.parentElement.children].forEach((b)=>b.classList.toggle('on',b===e.currentTarget));}
    })));
    sh=sheet('Ajouter un POI',h('div',{class:'stack'},
      h('label',{class:'field-label'},'Nom',name),
      h('label',{class:'field-label'},'Type',category),
      h('div',{},h('span',{class:'lbl'},'Couleur'),picker),
      h('label',{class:'field-label'},'Note',note),
      h('button',{class:'btn primary block',onclick:()=>{
        const n=name.value.trim();if(!n)return toast('Donne un nom au POI.','bad');
        const poi={id:Math.random().toString(36).slice(2,9),name:n,category:category.value,color,note:note.value.trim(),lat:+latlng.lat.toFixed(7),lon:+latlng.lng.toFixed(7)};
        persistPois([...(mission.macloeMap?.pois||[]),poi]);sh.close();poiMode=false;redraw();toast('POI ajouté');
      }},'Ajouter le POI')
    ),{autofocus:false});
  }
  function openPoi(p){
    let sh;
    sh=sheet(p.name,h('div',{class:'stack'},
      h('p',{class:'note'},[p.category,p.note].filter(Boolean).join(' · ')||'POI'),
      h('p',{class:'mono'},p.lat.toFixed(6)+' · '+p.lon.toFixed(6)),
      h('button',{class:'btn danger block',onclick:async()=>{
        if(!await confirmDialog('Supprimer ce POI ?',p.name,'Supprimer'))return;
        persistPois((mission.macloeMap?.pois||[]).filter((x)=>x.id!==p.id));sh.close();redraw();
      }},'Supprimer')
    ),{autofocus:false});
  }
  function exportKml(){
    const text=buildMissionKml(mission);
    downloadBlob(new Blob([text],{type:'application/vnd.google-earth.kml+xml'}),safeFileName(mission.name)+'.kml');
    toast('KML exporté');
  }
  function exportKmz(){
    const text=buildMissionKml(mission);
    downloadBlob(buildKmz(text),safeFileName(mission.name)+'.kmz');
    toast('KMZ exporté');
  }
  function drawPanel(){
    const panel=root.querySelector('.final-map-panel');if(!panel)return;
    const dist=routeDistance(data.route);
    panel.replaceChildren(
      h('div',{class:'route-panel-head'},
        h('div',{},h('strong',{},'Vue d’ensemble mission'),h('small',{},data.route.length?data.route.length+' points · '+fmtDist(dist):'Aucun cheminement')),
        h('span',{class:'pill go'},'SYNTHÈSE')),
      h('div',{class:'final-map-actions'},
        h('button',{class:'btn '+(poiMode?'primary':'ghost'),onclick:()=>{poiMode=!poiMode;drawPanel();}},poiMode?'Touchez la carte…':'+ POI'),
        h('button',{class:'btn ghost',onclick:exportKml},'KML'),
        h('button',{class:'btn ghost',onclick:exportKmz},'KMZ')),
      h('div',{class:'final-layer-list'},
        data.missionPoint?h('div',{class:'final-layer-row'},h('span',{class:'final-layer-swatch point'}),h('span',{class:'final-layer-copy'},h('strong',{},'Point mission'),h('small',{},data.radiusM?'Rayon '+(data.radiusM>=1000?(data.radiusM/1000)+' km':data.radiusM+' m'):'Point seul'))):null,
        data.route.length>=2?lineItem('Cheminement','#1976D2',data.route.length+' points'):null,
        ...data.lLines.map((x)=>lineItem(x.name||'Ligne de débouché',x.color||'#C2185B','Ligne de débouché')),
        ...data.eLines.map((x)=>lineItem(x.name||'Ligne d’esquive',x.color||'#F57C00','Ligne d’esquive')),
        ...data.zones.map((z)=>zoneItem(z.name||'Zone de dégagement',z.color||'#43A047')),
        ...data.pois.map((p)=>h('button',{class:'final-layer-row final-poi-row',onclick:()=>openPoi(p)},
          h('span',{class:'final-layer-swatch point',style:'background:'+p.color}),
          h('span',{class:'final-layer-copy'},h('strong',{},p.name),h('small',{},p.category||'POI')),
          icon('arrow',16)))
      ),
      h('a',{class:'btn primary block',href:missionUrl(mission.id,'pdf')},'Aperçu du PDF',icon('arrow',18)),
      h('button',{class:'btn ghost block',onclick:()=>location.hash=missionUrl(mission.id,'fiche')},'Retour à la synthèse')
    );
  }

  function setBase(name){
    mode=name;if(base)map.removeLayer(base);
    const t=tileConfig(name);
    base=L.tileLayer(t.url,{minZoom:t.min,maxZoom:t.max,maxNativeZoom:t.native||t.max,attribution:t.attr}).addTo(map);
    root.querySelectorAll('[data-final-base]').forEach((b)=>b.classList.toggle('on',b.dataset.finalBase===name));
  }
  function init(){
    const dist=routeDistance(data.route);
    root.replaceChildren(
      h('div',{class:'route-map',id:'final-map'}),
      h('header',{class:'route-top'},
        h('button',{class:'icon-btn',onclick:()=>location.hash=missionUrl(mission.id,'fiche'),'aria-label':'Retour'},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},mission.name),h('strong',{},'Carte finale')),
        h('div',{class:'seg mini-seg'},
          h('button',{'data-final-base':'plan'},'Plan'),
          h('button',{'data-final-base':'sat',class:'on'},'Sat'),
          h('button',{'data-final-base':'oaci'},'OACI'))),
      h('section',{class:'route-panel final-map-panel'})
    );
    const center=data.missionPoint?[data.missionPoint.lat,data.missionPoint.lon]:data.route.length?[data.route[0].lat,data.route[0].lon]:[46.6,2.4];
    map=L.map('final-map',{zoomControl:false,attributionControl:true}).setView(center,data.route.length?15:6);
    map.attributionControl.setPrefix(false);
    root.querySelectorAll('[data-final-base]').forEach((b)=>b.onclick=()=>setBase(b.dataset.finalBase));
    setBase(mode);
    const res=drawMissionMap(L,map,mission,{labels:true,showRadius:true});overlay=res.group;
    drawPanel();
    map.on('click',(e)=>{if(poiMode)addPoi(e.latlng);});
    if(res.bounds?.isValid())map.fitBounds(res.bounds,{padding:[45,45],maxZoom:17});
  }
  queueMicrotask(init);
  return {el:root,destroy(){map?.remove();}};
}
