import { h, icon } from '../ui/dom.js';
import { missionUrl } from '../ui/layout.js';
import { drawMissionMap, missionMapItems, tileConfig } from '../lib/final-map.js';
import { FORMS } from '../lib/forms.js';

const TYPE_LABELS={judiciaire:'Police judiciaire',administratif:'Police administrative',sauvegarde:'Sauvegarde de la vie humaine',entrainement:'Entraînement',communication:'Communication',autre:'Autre'};
const USECASE_LABELS={
  ouverte:'Catégorie ouverte',
  'sts-gn-01-1':'Scénario 1.1 · En vue',
  'hors-vue-1km':'Scénario 2.2 · Hors vue · 1 km',
  'hors-vue-2km':'Scénario 2.2 · Hors vue · 2 km'
};
function txt(v,f='—'){const s=String(v??'').trim();return s||f;}
function fmtDateTime(v){
  if(!v)return '—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())?v:d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
}
function row(label,value){return h('div',{class:'pdf-kv'},h('strong',{},label),h('span',{},txt(value)));}
function sectionTitle(n,title){return h('h2',{class:'pdf-section-title'},n+'. '+title);}
function subsection(title,...kids){return h('section',{class:'pdf-block'},h('h3',{},title),...kids);}
function mensPresent(m){
  const me=m.mens?.meteo||{},es=m.mens?.espace||{},nt=m.mens?.notam||{},sp=m.mens?.supaip||{};
  return {
    meteo:!!(me.manual||me.fetchedAt||me.slots?.length),
    espace:!!(es.fetchedAt||es.localAnalysisAt||es.localZones?.length||es.aerodromes?.length),
    notam:!!(nt.fetchedAt||nt.items?.length),
    supaip:!!(sp.fetchedAt||sp.items?.length)
  };
}
function weatherSummary(m){
  const me=m.mens?.meteo||{},s=me.slots?.[0]||me.hours?.[0]||{};
  const items=[];
  if(Number.isFinite(s.temp))items.push(row('Température',Math.round(s.temp)+' °C'));
  if(Number.isFinite(s.wind))items.push(row('Vent',s.wind+' m/s'+(Number.isFinite(s.dir)?' · '+s.dir+'°':'')));
  if(Number.isFinite(s.gust))items.push(row('Rafales',s.gust+' m/s'));
  if(Number.isFinite(s.vis))items.push(row('Visibilité',s.vis>=10000?'> 10 km':Math.round(s.vis)+' m'));
  if(Number.isFinite(s.cloud))items.push(row('Nébulosité',s.cloud+' %'));
  if(!items.length)items.push(h('p',{class:'pdf-note'},me.manual?'Météo renseignée manuellement.':'Données météo présentes dans la mission.'));
  return items;
}
function airspaceSummary(m){
  const es=m.mens?.espace||{},items=[];
  if(es.localZones?.length)items.push(row('Zones locales détectées',String(es.localZones.length)));
  if(es.aerodromes?.length)items.push(row('Aérodromes à proximité',String(es.aerodromes.length)));
  if(es.source)items.push(row('Source',es.source));
  if(es.localDataset?.effective)items.push(row('Cycle',es.localDataset.effective));
  if(!items.length)items.push(h('p',{class:'pdf-note'},'Analyse espace aérien présente dans la mission.'));
  return items;
}
function notamSummary(m){
  const nt=m.mens?.notam||{};
  if(nt.items?.length)return nt.items.map((x)=>h('div',{class:'pdf-item'},h('strong',{},txt(x.id,'NOTAM')),h('p',{},txt(x.text)),x.validity?h('small',{},x.validity):null));
  return [h('p',{class:'pdf-note'},nt.fetchedAt?'NOTAM consultés · aucun élément enregistré.':'Aucun NOTAM enregistré.')];
}
function supaipSummary(m){
  const sp=m.mens?.supaip||{};
  if(sp.items?.length)return sp.items.map((x)=>h('div',{class:'pdf-item'},h('strong',{},txt(x.title||x.id,'SUP AIP')),x.validity?h('small',{},x.validity):null));
  return [h('p',{class:'pdf-note'},sp.fetchedAt?'SUP AIP consultés · aucun élément enregistré.':'Aucun SUP AIP enregistré.')];
}
function formSection(form,values,prefix){
  return h('section',{class:'pdf-form-section'},
    ...form.sections.map((s)=>h('div',{class:'pdf-form-part'},
      h('h3',{},s.letter+' — '+s.title),
      ...s.fields.map((f)=>h('div',{class:'pdf-form-field'},
        s.fields.length>1?h('strong',{},f.label):null,
        h('p',{},txt(values?.[f.key]))
      ))
    ))
  );
}
function legend(mission){
  const data=missionMapItems(mission),items=[];
  if(data.route.length>=2)items.push(['#1976D2','Cheminement','line']);
  data.lLines.forEach((x)=>items.push([x.color||'#C2185B',x.name||'Ligne de débouché','line']));
  data.eLines.forEach((x)=>items.push([x.color||'#F57C00',x.name||'Ligne d’esquive','line']));
  data.zones.forEach((x)=>items.push([x.color||'#43A047',x.name||'Zone de dégagement','zone']));
  data.pois.forEach((x)=>items.push([x.color||'#CDB23A',x.name||'POI','point']));
  if(data.radiusM)items.push(['#1976D2','Zone mission · '+(data.radiusM>=1000?(data.radiusM/1000)+' km':data.radiusM+' m'),'dash']);
  return h('div',{class:'pdf-legend'},...items.map(([c,n,k])=>h('div',{},h('span',{class:'pdf-leg-swatch '+k,style:'--swatch:'+c}),h('span',{},n))));
}

export function renderMissionPdf({mission}){
  const root=h('main',{class:'pdf-view'});
  const present=mensPresent(mission);
  let map=null;

  function printPdf(){
    document.body.classList.add('printing-mission');
    setTimeout(()=>window.print(),150);
  }
  const general=h('section',{class:'pdf-page pdf-page-1'},
    h('header',{class:'pdf-doc-head'},
      h('div',{},h('strong',{},'GENDARMERIE NATIONALE'),h('span',{},'Préparation de mission drone')),
      h('span',{class:'pdf-doc-mark'},'DRONE')),
    sectionTitle('1','Informations générales'),
    h('div',{class:'pdf-kv-grid'},
      row('Nom de la mission',mission.name),
      row('Date / créneau',fmtDateTime(mission.window?.start)+' → '+fmtDateTime(mission.window?.end)),
      row('Lieu',mission.place?.label|| (Number.isFinite(mission.place?.lat)?mission.place.lat.toFixed(5)+' · '+mission.place.lon.toFixed(5):'—')),
      row('Type de mission',TYPE_LABELS[mission.context?.missionType]||mission.context?.missionType),
      row('Scénario',(mission.context?.useCases||[]).map((x)=>USECASE_LABELS[x]||x).join(' · ')),
      row('VXCORE',mission.context?.vxcore===true?'Oui':mission.context?.vxcore===false?'Non':'—')),
    sectionTitle('2','Carte de synthèse'),
    h('div',{class:'pdf-map',id:'pdf-map'}),
    legend(mission)
  );

  const mensKids=[];
  if(mission.workflow?.mensExternal===true)mensKids.push(h('div',{class:'pdf-callout'},'MENS indiqué comme réalisé avec un autre outil.'));
  if(present.meteo)mensKids.push(subsection('3.1 Météo',...weatherSummary(mission)));
  if(present.espace)mensKids.push(subsection('3.2 Espace aérien',...airspaceSummary(mission)));
  if(present.notam)mensKids.push(subsection('3.3 NOTAM',...notamSummary(mission)));
  if(present.supaip)mensKids.push(subsection('3.4 SUP AIP',...supaipSummary(mission)));

  const mens=mensKids.length?h('section',{class:'pdf-page'},sectionTitle('3','MENS · Analyse préalable'),...mensKids):null;
  const macloe=h('section',{class:'pdf-page'},sectionTitle(mensKids.length?'4':'3','MACLOE'),formSection(FORMS.macloe,mission.macloe,'MACLOE'));
  const smepp=h('section',{class:'pdf-page'},sectionTitle(mensKids.length?'5':'4','SMEPP'),formSection(FORMS.smepp,mission.smepp,'SMEPP'));

  root.append(
    h('div',{class:'pdf-appbar no-print'},
      h('button',{class:'icon-btn',onclick:()=>location.hash=missionUrl(mission.id,'fiche'),'aria-label':'Retour'},icon('back')),
      h('div',{},h('span',{class:'eyebrow'},mission.name),h('strong',{},'Aperçu du PDF')),
      h('button',{class:'btn primary',onclick:printPdf},'Enregistrer PDF')),
    h('div',{class:'pdf-document'},general,mens,macloe,smepp),
    h('div',{class:'pdf-actions no-print'},
      h('button',{class:'btn ghost block',onclick:()=>location.hash=missionUrl(mission.id,'final-map')},'Voir la carte finale'),
      h('button',{class:'cta primary',onclick:printPdf},'Imprimer / Enregistrer en PDF',icon('arrow',20)))
  );

  queueMicrotask(()=>{
    const data=missionMapItems(mission);
    const center=data.missionPoint?[data.missionPoint.lat,data.missionPoint.lon]:data.route.length?[data.route[0].lat,data.route[0].lon]:[46.6,2.4];
    map=L.map('pdf-map',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false}).setView(center,data.route.length?15:6);
    const t=tileConfig('sat');
    L.tileLayer(t.url,{maxZoom:t.max,maxNativeZoom:t.native||t.max,attribution:t.attr}).addTo(map);
    const res=drawMissionMap(L,map,mission,{labels:true,showRadius:true});
    if(res.bounds?.isValid())map.fitBounds(res.bounds,{padding:[24,24],maxZoom:17,animate:false});
    setTimeout(()=>map.invalidateSize(),100);
  });

  const onAfter=()=>document.body.classList.remove('printing-mission');
  addEventListener('afterprint',onAfter,{once:false});
  return {el:root,destroy(){map?.remove();removeEventListener('afterprint',onAfter);document.body.classList.remove('printing-mission');}};
}
