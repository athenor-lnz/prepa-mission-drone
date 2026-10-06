import { h, icon } from '../ui/dom.js';
import { missionUrl } from '../ui/layout.js';
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
  const data=missionMapItems(mission);
  let map=null,base=null,mode='sat';

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
      h('section',{class:'route-panel final-map-panel'},
        h('div',{class:'route-panel-head'},
          h('div',{},h('strong',{},'Vue d’ensemble mission'),h('small',{},data.route.length?data.route.length+' points · '+fmtDist(dist):'Aucun cheminement')),
          h('span',{class:'pill go'},'SYNTHÈSE')),
        h('div',{class:'final-layer-list'},
          data.missionPoint?h('div',{class:'final-layer-row'},h('span',{class:'final-layer-swatch point'}),h('span',{class:'final-layer-copy'},h('strong',{},'Point mission'),h('small',{},data.radiusM?'Rayon '+(data.radiusM>=1000?(data.radiusM/1000)+' km':data.radiusM+' m'):'Point seul'))):null,
          data.route.length>=2?lineItem('Cheminement','#1976D2',data.route.length+' points'):null,
          ...data.lLines.map((x)=>lineItem(x.name||'Ligne de débouché',x.color||'#C2185B','Ligne de débouché')),
          ...data.eLines.map((x)=>lineItem(x.name||'Ligne d’esquive',x.color||'#F57C00','Ligne d’esquive')),
          ...data.zones.map((z)=>zoneItem(z.name||'Zone de dégagement',z.color||'#43A047'))
        ),
        h('a',{class:'btn primary block',href:missionUrl(mission.id,'pdf')},'Aperçu du PDF',icon('arrow',18)),
        h('button',{class:'btn ghost block',onclick:()=>location.hash=missionUrl(mission.id,'fiche')},'Retour à la synthèse')
      )
    );
    const center=data.missionPoint?[data.missionPoint.lat,data.missionPoint.lon]:data.route.length?[data.route[0].lat,data.route[0].lon]:[46.6,2.4];
    map=L.map('final-map',{zoomControl:false,attributionControl:true}).setView(center,data.route.length?15:6);
    map.attributionControl.setPrefix(false);
    root.querySelectorAll('[data-final-base]').forEach((b)=>b.onclick=()=>setBase(b.dataset.finalBase));
    setBase(mode);
    const res=drawMissionMap(L,map,mission,{labels:true,showRadius:true});
    if(res.bounds?.isValid())map.fitBounds(res.bounds,{padding:[45,45],maxZoom:17});
  }
  queueMicrotask(init);
  return {el:root,destroy(){map?.remove();}};
}
