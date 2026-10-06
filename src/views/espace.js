import { h, icon, toast, sheet } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, subtabs, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { formatClock } from '../lib/time.js';
import { importAerodata, info as aerodataInfo, clearAerodata, analyzeAerodata, vacSearchUrl, vacDirectUrl, hasDirectVac, SIA_URL, SOFIA_URL, SUPAIP_URL } from '../services/aerodata.js';
import { listContacts, addContact, removeContact, telHref, phonesInText } from '../services/contacts.js';

const OFFICIAL = {
  sia: { label: 'SIA — information aéronautique', url: SIA_URL },
  sofia: { label: 'SOFIA-Briefing — NOTAM', url: SOFIA_URL },
  supaip: { label: 'SIA — SUP AIP', url: SUPAIP_URL }
};
function extLink(l) { return h('a', { class: 'ext', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, icon('link', 18), l.label); }

function tabs(mission, current) {
  const e = mission.mens;
  return subtabs(mission, [
    { route: 'espace', label: 'Espace' },
    { route: 'notam', label: `NOTAM${e.notam.items.length ? ` · ${e.notam.items.length}` : ''}`, badge: !e.notam.fetchedAt ? 'Non vérifié' : null },
    { route: 'supaip', label: `SUP AIP${e.supaip.items.length ? ` · ${e.supaip.items.length}` : ''}`, badge: !e.supaip.fetchedAt ? 'Non vérifié' : null }
  ], current);
}
function footer(mission, route) {
  const nxt = { espace: ['Suivant · NOTAM', 'notam'], notam: ['Suivant · SUP AIP', 'supaip'], supaip: ['Valider MENS · Retour aux étapes', 'etapes'] }[route];
  return ctaBar(ctaButton(nxt[0], () => { location.hash = missionUrl(mission.id, nxt[1]); }));
}
function fmtDistance(m) { return !Number.isFinite(m) ? '—' : m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(m<10000?1:0)} km`; }

export function renderEspace({ mission }) {
  const root = h('main', { class: 'screen scroll' });
  const p = mission.place;
  const es = mission.mens.espace;
  const hasPoint = Number.isFinite(p.lat) && Number.isFinite(p.lon);
  let loading = false;
  let importing = false;
  let meta = null;
  let local = null;
  let map = null;
  let layer = null;
  let overlay = null;
  let mapMode = 'oaci';
  let zoneFilter = 'ALL';
  let zoneLayers = new Map();
  let pendingFlashType = null;

  const TILES = {
    plan: { url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr:'© OpenStreetMap', max:19 },
    sat: { url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr:'Imagerie © Esri', max:19 },
    oaci: { url:'https://data.geopf.fr/private/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&TILEMATRIXSET=PM_6_11&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&apikey=ign_scan_ws', attr:'OACI-VFR © DSNA/SIA · Géoplateforme', max:20, native:11, min:6 }
  };

  async function refreshMeta() {
    try { meta = await aerodataInfo(); } catch { meta = null; }
  }

  async function runAnalysis({ feedback = false } = {}) {
    if (!hasPoint || loading) return;
    loading = true; draw();
    let localResult = null;
    try {
      if (meta) localResult = await analyzeAerodata({ lat:p.lat, lon:p.lon, radiusM:p.radiusM || 500, nearest:12 });
    } catch (e) { console.warn(e); }
    loading = false;
    local = localResult;
    mutate(mission, (m) => {
      const e = m.mens.espace;
      // Cette application n'utilise pas les restrictions UAS Géoportail.
      e.fetchedAt = null; e.source = null; e.zones = []; e.error = null;
      if (localResult?.meta) {
        e.localAnalysisAt = new Date().toISOString();
        e.localDataset = { source:localResult.meta.source, effective:localResult.meta.effective, featureCount:localResult.meta.spaceCount, aerodromeCount:localResult.meta.aerodromeCount };
        e.localZones = localResult.zones.slice(0,150).map((z)=>({ id:z.id,type:z.type,subType:z.subType,name:z.name,className:z.className,floor:z.floor,ceiling:z.ceiling,schedule:z.schedule,remark:z.remark,pointOnly:z.pointOnly }));
        e.aerodromes = localResult.aerodromes.map((a)=>({ icao:a.icao,name:a.name,type:a.type,altitudeFt:a.altitudeFt,distanceM:a.distanceM,remark:a.remark,frequencies:a.frequencies,runways:a.runways }));
        e.controlled = localResult.controlled;
      }
    });
    draw();
    if (feedback) toast(localResult ? `${localResult.zones.length} espace(s) SIA détecté(s) · ${localResult.aerodromes.length} aérodrome(s) proche(s)` : 'Analyse SIA indisponible');
  }

  function datasetCard() {
    const input = h('input', { type:'file', accept:'.zip,application/zip', hidden:true });
    input.addEventListener('change', async()=>{
      const file=input.files?.[0]; input.value=''; if(!file)return;
      importing=true; draw();
      try {
        meta=await importAerodata(file,{onProgress:(msg)=>{const el=root.querySelector('#air-import-progress');if(el)el.textContent=msg;}});
        toast('Base GeoGM/SIA importée sur cet appareil');
        local=null; await runAnalysis();
      } catch(e){ toast(e.message||'Import impossible','bad'); }
      finally { importing=false; draw(); }
    });
    const eff=meta?.effective ? new Date(meta.effective).toLocaleDateString('fr-FR') : null;
    return h('section',{class:'card-sec aerodata-card'},
      h('div',{class:'dataset-head'},
        h('div',{},h('span',{class:'lbl'},'Base locale GeoGM / SIA'),h('strong',{},meta?'Données disponibles':'À importer'),
          h('p',{class:'note'},meta?`${meta.spaceCount} espaces · ${meta.aerodromeCount} aérodromes${eff?` · effectif ${eff}`:''}`:'Importe ton ZIP GeoGM/SIA. Il restera stocké sur cet appareil.')),
        h('span',{class:`pill ${meta?'go':'warn'}`},meta?'PRÊTE':'LOCAL')),
      h('div',{class:'row'},
        h('button',{class:'btn ghost',disabled:importing,onclick:()=>input.click()},meta?'Mettre à jour':'Importer le ZIP'),
        h('button',{class:'btn ghost',disabled:!meta||importing,onclick:async()=>{await clearAerodata();meta=null;local=null;mutate(mission,(m)=>{m.mens.espace.localAnalysisAt=null;m.mens.espace.localDataset=null;m.mens.espace.localZones=[];m.mens.espace.aerodromes=[];m.mens.espace.controlled=null;});draw();toast('Base locale supprimée');}},'Supprimer')),
      input,
      importing?h('p',{id:'air-import-progress',class:'note',role:'status'},'Import en cours…'):null);
  }

  function zoneSource(){
    return local?.zones || es.localZones || [];
  }
  function zoneTypes(){
    const order=['CTR','TMA','CTA','R','P','D','TRA','D-OTHER','SECTOR','RAS','FIR','UIR','UTA','OCA'];
    const found=[...new Set(zoneSource().map((z)=>z.type).filter(Boolean))];
    return found.sort((a,b)=>{
      const ai=order.indexOf(a),bi=order.indexOf(b);
      return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);
    });
  }
  function filteredZones(){
    const zones=zoneSource();
    return zoneFilter==='ALL'?zones:zones.filter((z)=>z.type===zoneFilter);
  }
  function zoneKey(z){
    return [z.id||'',z.name||'',z.type||'',z.subType||''].join('|');
  }
  function flashLayers(layers){
    const targets=layers.filter(Boolean);
    if(!targets.length)return;
    const normal=(z)=>({color:['P','R','D'].includes(z.type)?'#B3261E':'#8A5200',weight:2,fillOpacity:.08});
    let step=0;
    const tick=()=>{
      const on=step%2===0;
      for(const {layer,z} of targets){
        try{
          layer.bringToFront?.();
          layer.setStyle(on
            ? {color:'#FFD54A',weight:6,fillColor:'#FFD54A',fillOpacity:.28,opacity:1}
            : normal(z));
        }catch{}
      }
      step++;
      if(step<7)setTimeout(tick,220);
      else for(const {layer,z} of targets){try{layer.setStyle(normal(z));}catch{}}
    };
    tick();
  }
  function flashZone(z){
    const item=zoneLayers.get(zoneKey(z));
    if(item)flashLayers([item]);
  }
  function flashType(type){
    flashLayers([...zoneLayers.values()].filter((x)=>x.z.type===type));
  }

  function zoneFilterBar(){
    const types=zoneTypes();
    if(types.length<2)return null;
    return h('div',{class:'air-filter-wrap'},
      h('div',{class:'air-filter-head'},h('span',{class:'lbl'},'Filtrer les zones'),h('span',{class:'mono small'},`${filteredZones().length}/${zoneSource().length}`)),
      h('div',{class:'air-filters'},
        h('button',{class:`air-filter ${zoneFilter==='ALL'?'on':''}`,onclick:()=>{zoneFilter='ALL';pendingFlashType=null;draw();}},'Toutes'),
        types.map((type)=>{
          const count=zoneSource().filter((z)=>z.type===type).length;
          return h('button',{class:`air-filter ${zoneFilter===type?'on':''}`,onclick:()=>{zoneFilter=type;pendingFlashType=type;draw();}},`${type} · ${count}`);
        })
      )
    );
  }

  function localZonesCard() {
    if (!meta) return null;
    const zones=filteredZones();
    const controlled=(local?.controlled ?? es.controlled);
    const head=controlled===true
      ? h('div',{class:'banner warn'},icon('warn'),h('span',{},'Une CTR/TMA/CTA de la base SIA intersecte le rayon de mission.'))
      : controlled===false
        ? h('div',{class:'banner info'},icon('check'),h('span',{},'Aucune CTR/TMA/CTA détectée dans le rayon selon la base SIA locale.'))
        : h('div',{class:'banner warn'},icon('warn'),h('span',{},'Analyse SIA locale à lancer.'));
    return h('section',{class:'card-sec'},
      h('span',{class:'lbl'},'Espaces SIA intersectant le rayon'),
      head,
      zoneFilterBar(),
      zones.length
        ? h('div',{class:'air-zone-list'},zones.slice(0,20).map((z)=>{
            const title=[z.id,z.name].filter(Boolean).join(' · ')||'Espace sans identifiant';
            const type=[z.type,z.subType].filter(Boolean).join(' · ');
            return h('details',{class:'air-zone'},
              h('summary',{onclick:()=>flashZone(z)},h('span',{},h('strong',{},title),h('small',{},type)),h('span',{class:'pill warn'},z.pointOnly?'POINT':'ZONE')),
              h('div',{class:'air-zone-body'},
                h('div',{class:'air-limits'},h('span',{},`Plancher : ${z.floor||'—'}`),h('span',{},`Plafond : ${z.ceiling||'—'}`)),
                z.className?h('p',{class:'note'},`Classe : ${z.className}`):null,
                z.schedule?h('p',{class:'note'},`Horaire : ${z.schedule}`):null,
                z.remark?h('p',{class:'note'},z.remark):null,
                z.remark&&phonesInText(z.remark).length?h('div',{class:'detected-phones'},
                  h('span',{class:'lbl'},'Téléphone détecté dans la remarque SIA'),
                  phonesInText(z.remark).map((phone)=>h('a',{class:'btn contact-call small',href:telHref(phone)},`☎ ${phone}`))):null,
                z.pointOnly?h('div',{class:'banner warn'},icon('warn'),h('span',{},'La source ne fournit pas de contour exploitable pour cet espace : vérification manuelle requise.')):null));
          }))
        : h('p',{class:'note'},es.localAnalysisAt?'Aucun espace du jeu SIA n’intersecte le rayon. Ce résultat ne remplace pas les vérifications officielles.':'Analyse non lancée.'));
  }

  function contactDirectoryCard() {
    const contacts = listContacts();

    const openAdd = () => {
      const name = h('input', { placeholder: 'Nom du contact', maxlength: 160, 'aria-label': 'Nom du contact' });
      const type = h('input', { placeholder: 'Type : TWR, APP, opérations…', maxlength: 80, 'aria-label': 'Type de contact' });
      const zone = h('input', { placeholder: 'Zone / ICAO', maxlength: 40, 'aria-label': 'Zone ou ICAO' });
      const phone = h('input', { placeholder: 'Téléphone', inputmode: 'tel', maxlength: 40, 'aria-label': 'Téléphone' });
      const freq = h('input', { placeholder: 'Fréquence (facultatif)', maxlength: 160, 'aria-label': 'Fréquence' });
      const notes = h('textarea', { rows: 3, placeholder: 'Notes / horaires / consignes', maxlength: 600, 'aria-label': 'Notes' });
      let sh;
      const save = () => {
        try {
          addContact({ name: name.value, type: type.value, zone: zone.value, phone: phone.value, frequency: freq.value, notes: notes.value });
          sh.close();
          toast('Contact ajouté');
          draw();
        } catch (e) {
          toast(e.message, 'bad');
        }
      };
      sh = sheet('Ajouter un contact aéronautique',
        h('div', { class: 'stack' },
          name, type, zone, phone, freq, notes,
          h('button', { class: 'btn primary block', onclick: save }, 'Enregistrer')));
    };

    const body = contacts.length
      ? h('div', { class: 'contact-list' },
          contacts.map((x) =>
            h('article', { class: 'contact-card' },
              h('div', { class: 'contact-main' },
                h('strong', {}, x.name),
                h('small', {}, [x.type, x.zone].filter(Boolean).join(' · '))),
              x.frequency ? h('p', { class: 'mono small' }, x.frequency) : null,
              x.notes ? h('p', { class: 'note' }, x.notes) : null,
              h('div', { class: 'contact-actions' },
                h('a', { class: 'btn contact-call', href: telHref(x.phone) }, `☎ ${x.phone}`),
                h('button', {
                  class: 'btn ghost small',
                  'aria-label': `Supprimer ${x.name}`,
                  onclick: () => { removeContact(x.id); draw(); }
                }, icon('trash', 18))))))
      : h('p', { class: 'note' }, 'Aucun contact personnel enregistré.');

    return h('section', { class: 'card-sec' },
      h('div', { class: 'dataset-head' },
        h('div', {},
          h('span', { class: 'lbl' }, 'Annuaire aéronautique'),
          h('p', { class: 'note' }, 'Contacts personnels stockés uniquement sur cet appareil. Les numéros sont directement appelables.')),
        h('button', { class: 'btn ghost small', onclick: openAdd }, '＋ Contact')),
      body);
  }

  function frequencyLabel(f){
    if(typeof f==='string'){
      try { f=JSON.parse(f); } catch { return f; }
    }
    if(!f||typeof f!=='object')return '';
    if(f.text)return f.text;
    const left=[f.service,f.mhz?f.mhz+' MHz':''].filter(Boolean).join(' ');
    return [left,f.callsign||f.indicatif,f.schedule||f.horaire].filter(Boolean).join(' · ');
  }
  function runwayLabel(r){
    if(typeof r==='string'){
      try { r=JSON.parse(r); } catch { return r; }
    }
    if(!r||typeof r!=='object')return '';
    if(r.text)return r.text;
    const dims=Number.isFinite(r.lengthM)&&Number.isFinite(r.widthM)?`${r.lengthM} × ${r.widthM} m`:Number.isFinite(r.lengthM)?`${r.lengthM} m`:'';
    return [r.designation,dims,r.surface].filter(Boolean).join(' · ');
  }
  function aerodromeCard() {
    if (!meta) return null;
    const ads=local?.aerodromes || es.aerodromes || [];
    return h('section',{class:'card-sec'},
      h('span',{class:'lbl'},'Aérodromes proches · VAC'),
      h('p',{class:'note'},'Distance calculée depuis le point mission. Fréquences et pistes proviennent du GeoJSON SIA importé.'),
      ads.length?h('div',{class:'ad-list'},ads.map((a)=>h('article',{class:'ad-card'},
        h('div',{class:'ad-head'},h('div',{},h('strong',{},`${a.icao||'—'} · ${a.name||'Aérodrome'}`),h('small',{},`${fmtDistance(a.distanceM)}${Number.isFinite(a.altitudeFt)?` · ${a.altitudeFt} ft`:''}`))),
        a.frequencies?.length?h('div',{class:'ad-frequencies'},
          h('span',{class:'lbl'},'Fréquences'),
          a.frequencies.slice(0,6).map((f)=>h('div',{class:'mono small'},frequencyLabel(f)))):null,
        a.runways?.length?h('div',{class:'ad-runways'},
          h('span',{class:'lbl'},'Pistes'),
          a.runways.slice(0,4).map((r)=>h('div',{class:'small'},runwayLabel(r)))):null,
        a.remark?h('p',{class:'note'},a.remark):null,
        a.icao?h('a',{class:'btn ghost small',href:vacDirectUrl(a.icao,meta?.effective),target:'_blank',rel:'noopener noreferrer'},hasDirectVac(a.icao)?'Ouvrir la VAC ↗':'Rechercher au SIA ↗'):null
      ))):h('p',{class:'note'},'Aucun aérodrome disponible dans la base locale.'));
  }

  function initMiniMap() {
    const el=root.querySelector('#air-map'); if(!el||!globalThis.L||!hasPoint)return;
    map?.remove();
    map=L.map(el,{zoomControl:false,attributionControl:true}).setView([p.lat,p.lon],12);
    map.attributionControl.setPrefix(false);
    overlay=L.layerGroup().addTo(map);
    zoneLayers=new Map();
    const setMode=(m)=>{
      mapMode=m; if(layer)map.removeLayer(layer); const t=TILES[m];
      layer=L.tileLayer(t.url, { minZoom: t.min, maxZoom: t.max, maxNativeZoom: t.native || t.max, attribution: t.attr, keepBuffer: 4 }).addTo(map);
      el.parentElement.querySelectorAll('[data-air-base]').forEach((b)=>b.classList.toggle('on',b.dataset.airBase===m));
    };
    el.parentElement.querySelectorAll('[data-air-base]').forEach((b)=>b.onclick=()=>setMode(b.dataset.airBase));
    setMode(mapMode);
    L.circle([p.lat,p.lon],{radius:p.radiusM||500,color:'#2F80ED',fillColor:'#2F80ED',weight:3,dashArray:'8 6',fillOpacity:.08}).addTo(overlay);
    L.marker([p.lat,p.lon]).addTo(overlay);
    for(const z of filteredZones()){
      if(!z.geometry||z.geometry.type==='Point')continue;
      try{
        const geo=L.geoJSON({type:'Feature',geometry:z.geometry},{
          style:{color:['P','R','D'].includes(z.type)?'#B3261E':'#8A5200',weight:2,fillOpacity:.08}
        }).addTo(overlay);
        const label=[z.type,z.id,z.name].filter(Boolean).join(' · ');
        if(label)geo.bindTooltip(label,{sticky:true});
        geo.on('click',()=>flashZone(z));
        zoneLayers.set(zoneKey(z),{layer:geo,z});
      }catch{}
    }
    for(const a of local?.aerodromes||[]){
      const marker=L.circleMarker([a.lat,a.lon],{radius:6,weight:2,fillOpacity:.9}).addTo(overlay);
      marker.bindTooltip(`${a.icao||''} ${a.name||''}`.trim(),{direction:'top'});
      const popup=h('div',{class:'ad-map-popup'},
        h('strong',{},[a.icao,a.name].filter(Boolean).join(' · ')||'Aérodrome'),
        h('small',{},`${fmtDistance(a.distanceM)}${Number.isFinite(a.altitudeFt)?` · ${a.altitudeFt} ft`:''}`),
        a.icao?h('a',{class:'btn ghost small',href:vacDirectUrl(a.icao,meta?.effective),target:'_blank',rel:'noopener noreferrer'},hasDirectVac(a.icao)?'VAC ↗':'SIA ↗'):null
      );
      marker.bindPopup(popup);
    }
    const bounds=L.circle([p.lat,p.lon],{radius:Math.max(1500,p.radiusM||500)}).getBounds();map.fitBounds(bounds,{padding:[16,16],maxZoom:13});
    setTimeout(()=>{
      map.invalidateSize();
      if(pendingFlashType){const type=pendingFlashType;pendingFlashType=null;flashType(type);}
    },80);
  }

  function mapCard() {
    return h('section',{class:'card-sec air-map-card'},
      h('div',{class:'air-map-title'},h('span',{class:'lbl'},'Carte aéronautique'),h('div',{class:'seg mini-seg'},
        h('button',{'data-air-base':'plan'},'Plan'),h('button',{'data-air-base':'sat'},'Sat'),h('button',{'data-air-base':'oaci',class:'on'},'OACI'))),
      h('div',{id:'air-map',class:'air-map','aria-label':'Carte des espaces et aérodromes proches'}));
  }

  function draw() {
    root.replaceChildren(topbar(mission,'espace'),h('div',{class:'body'},
      tabs(mission,'espace'),
      hasPoint ? [
        datasetCard(),
        h('button',{class:'btn primary block',disabled:loading||importing,onclick:()=>runAnalysis({feedback:true})},loading?'Analyse en cours…':'Analyser la zone et le rayon'),
        mapCard(),
        localZonesCard(),
        aerodromeCard(),
        contactDirectoryCard(),
        h('section',{class:'card-sec'},h('span',{class:'lbl'},'Source officielle'),extLink(OFFICIAL.sia)),
        h('div',{class:'official-note'},'La détection locale est une aide à la préparation. Toujours confirmer avec les publications SIA, NOTAM, SUP AIP et l’organisme ATS lorsque nécessaire.')
      ] : h('div',{class:'empty'},h('p',{},'Définis d’abord la zone de mission.'),h('a',{class:'btn primary',href:missionUrl(mission.id,'lieu')},'Choisir la zone')),
      footer(mission,'espace')));
    queueMicrotask(initMiniMap);
  }

  refreshMeta().then(async()=>{ if(meta&&hasPoint){try{local=await analyzeAerodata({lat:p.lat,lon:p.lon,radiusM:p.radiusM||500,nearest:12});}catch{} } draw(); });
  draw();
  return { el:root, destroy(){map?.remove();} };
}

function manualList({ mission, route, kind, fields, title, intro, official, itemView, emptyText }) {
  const root=h('main',{class:'screen scroll'});const data=mission.mens[kind];const inputs={};
  const add=()=>{
    const item={};for(const f of fields)item[f.key]=inputs[f.key].value.trim();
    if(!item[fields[0].key])return toast(`${fields[0].label} requis`,'bad');
    if(item.url&&!/^https?:\/\//i.test(item.url))return toast('Le lien doit commencer par http:// ou https://','bad');
    item.addedAt=new Date().toISOString();
    mutate(mission,(m)=>{const d=m.mens[kind];d.items=[...d.items,item];d.fetchedAt=item.addedAt;d.source='saisie manuelle après consultation officielle';});draw();
  };
  function draw(){
    for(const f of fields)inputs[f.key]=f.long?h('textarea',{rows:4,maxlength:4000,placeholder:f.placeholder||f.label,'aria-label':f.label}):h('input',{placeholder:f.placeholder||f.label,maxlength:500,'aria-label':f.label,inputmode:f.key==='url'?'url':null});
    const verified=!!data.fetchedAt;
    root.replaceChildren(topbar(mission,route),h('div',{class:'body'},
      tabs(mission,route),
      h('div',{class:`banner ${verified?'info':'warn'}`},icon(verified?'check':'warn'),h('span',{},verified?`Consultation notée à ${formatClock(data.fetchedAt)} · ${data.items.length} élément(s) conservé(s).`:`${title} non vérifiés. L’absence de saisie ne signifie jamais l’absence de ${title}.`)),
      h('p',{class:'note'},intro),
      h('section',{class:'card-sec'},h('span',{class:'lbl'},'Source officielle'),extLink(official)),
      data.items.length?h('ul',{class:'items'},data.items.map((it,i)=>h('li',{class:'item'},itemView(it),h('button',{class:'icon-btn','aria-label':'Supprimer cet élément',onclick:()=>{mutate(mission,(m)=>{m.mens[kind].items=m.mens[kind].items.filter((_,j)=>j!==i);});draw();}},icon('trash',20))))):h('p',{class:'note'},emptyText),
      h('section',{class:'card-sec'},h('span',{class:'lbl'},'Reporter un élément'),fields.map((f)=>inputs[f.key]),h('button',{class:'btn primary block',onclick:add},'Ajouter à la mission')),
      !data.items.length?h('button',{class:'btn ghost block',onclick:()=>{mutate(mission,(m)=>{m.mens[kind].fetchedAt=new Date().toISOString();m.mens[kind].source='consultation officielle · saisie manuelle';});draw();}},'J’ai consulté la source : rien à reporter'):null,
      footer(mission,route)));
  }
  draw();return{el:root};
}

export function renderNotam({mission}){
  return manualList({mission,route:'notam',kind:'notam',title:'NOTAM',
    intro:'Ouvre SOFIA-Briefing pour la zone et le créneau, puis reporte ici les NOTAM ayant un impact sur la mission.',
    official:OFFICIAL.sofia,
    fields:[{key:'id',label:'Numéro',placeholder:'Ex. A1234/26'},{key:'text',label:'Texte / impact',long:true,placeholder:'Résumé, plancher/plafond, rayon, impact sur le vol…'},{key:'validity',label:'Validité',placeholder:'Début → fin (UTC si publié ainsi)'}],
    emptyText:'Aucun NOTAM reporté.',
    itemView:(it)=>h('div',{},h('strong',{},it.id||'(sans numéro)'),it.validity?h('div',{class:'mono small'},it.validity):null,it.text?h('p',{},it.text):null)});
}
export function renderSupAip({mission}){
  return manualList({mission,route:'supaip',kind:'supaip',title:'SUP AIP',
    intro:'Consulte les SUP AIP en vigueur sur le site du SIA et reporte ceux qui concernent la zone et le créneau.',
    official:OFFICIAL.supaip,
    fields:[{key:'id',label:'Référence',placeholder:'Ex. SUP AIP 123/26'},{key:'title',label:'Titre',placeholder:'Titre / objet'},{key:'validity',label:'Validité',placeholder:'Période de validité'},{key:'url',label:'Lien',placeholder:'https://… (facultatif)'}],
    emptyText:'Aucun SUP AIP reporté.',
    itemView:(it)=>h('div',{},h('strong',{},it.id||'(sans référence)'),it.title?h('div',{},it.title):null,it.validity?h('div',{class:'mono small'},it.validity):null,it.url?h('a',{class:'ext',href:it.url,target:'_blank',rel:'noopener noreferrer'},icon('link',18),'Ouvrir le document'):null)});
}
