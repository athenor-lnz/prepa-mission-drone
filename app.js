const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stepOrder=['cadre','zone','mens','macloe','smepp','synthese'];
const titles={cadre:'Cadre de mission',zone:'Zone de mission',mens:'MENS',macloe:'MACLOE',smepp:'SMEPP',synthese:'Synthèse'};
let currentStep='cadre',map,marker,circle,baseLayer;
let smeppValidated=new Set();
const layers={};

const SEEDED_AIR_CONTACTS=[
 {
  id:'sia-lfr51',
  name:'LIMOGES ATS',
  type:'ATS / zone réglementée',
  zone:'LFR51',
  phone:'05 55 48 40 37',
  freq:'ATIS 128.075 · TWR 118.175 · INFO 124.050',
  notes:'Activité connue via les services ATS de Limoges.',
  source:'SIA / AIXM 2026-10-01',
  locked:true
 },
 {
  id:'sia-lfv6956afp',
  name:'LE LUC Opérations',
  type:'Opérations',
  zone:'LFV6956AFP',
  phone:'04 98 11 73 55',
  freq:'',
  notes:'Contact PPR mentionné dans la remarque de zone.',
  source:'SIA / AIXM 2026-10-01',
  locked:true
 }
];


let toastTimer=null;
function showToast(message,type='info',duration=2600){
 const el=$('#appToast');
 if(!el) return;
 clearTimeout(toastTimer);
 el.textContent=message;
 el.className='app-toast show '+type;
 toastTimer=setTimeout(()=>{el.className='app-toast'},duration);
}

function updateMensProgress(){
 const checks=$$('[data-check]');
 const done=checks.filter(x=>x.checked).length;
 if($('#mensProgress')) $('#mensProgress').textContent=`${done}/4`;
 const mapState={meteo:'meteoState',espace:'espaceState',notam:'notamState',supaip:'supaipState'};
 checks.forEach(x=>{
  const el=$('#'+mapState[x.dataset.check]);
  if(el){
   el.textContent=x.checked?'Validé':'À vérifier';
   el.classList.toggle('validated',x.checked);
  }
 });
}

const macloe=[
 {
  k:'M',t:'Mission',d:'Analyse de la mission demandée.',
  h:'Pars d’un verbe missionnel clair et reformule ce qui est réellement attendu du dispositif drone.',
  tips:['APPUYER','RECHERCHER','RECONNAÎTRE','OBSERVER','RENSEIGNER','PRENDRE DES VUES'],
  example:'Ex. Observer la toiture afin d’identifier les points chauds et fournir des vues exploitables.'
 },
 {
  k:'A',t:'Allure / effet recherché',d:'Comment réaliser l’action et avec quel effet.',
  h:'Précise la discrétion, le rythme, la hauteur, la distance et la nature de l’effet recherché.',
  tips:['DISCRÉTION','RECHERCHE','POLICE TECHNIQUE','APPUI','OBSERVATION'],
  example:'Ex. Vol lent, discret, à hauteur modérée, avec priorité à la stabilité de l’image.'
 },
 {
  k:'C',t:'Cheminement',d:'Itinéraire : comment ? par où ?',
  h:'Prépare le trajet réel du drone et les zones de sécurité.',
  tips:['Zone de décollage / atterrissage','Zone sensible','Zone de survol','Zone de dégagement','Obstacles','Axes à éviter'],
  example:'Ex. Décollage au sud, progression par l’ouest, balayage toiture puis repli par le même axe.'
 },
 {
  k:'L',t:'Ligne de débouché',d:'Ligne à partir de laquelle l’action sensible commence.',
  h:'Matérialise le moment où le drone entre dans la zone utile à la mission ou à la captation.',
  tips:['Vue par l’adversaire','Risque pour la mission','Début de captation','Point de mise en station'],
  example:'Ex. À partir de l’angle nord-ouest du bâtiment, début de la captation et maintien à 60 m.'
 },
 {
  k:'O',t:'Objectif',d:'Résultat concret à obtenir.',
  h:'Décris précisément ce qui doit être observé, confirmé, documenté ou transmis.',
  tips:['Légalité de la captation','Exploitation attendue','Photo / vidéo','Déport d’image','Critère de fin de mission'],
  example:'Ex. Confirmer l’absence de reprise de feu et produire 6 vues générales + 3 vues thermiques.'
 },
 {
  k:'E',t:'Esquive',d:'Retour, urgence et solutions de repli.',
  h:'Prépare avant le décollage les actions à réaliser si la mission doit être interrompue.',
  tips:['Itinéraire de retour','Itinéraire d’urgence','Zone d’atterrissage de secours','Perte de liaison','Intrusion de tiers / trafic'],
  example:'Ex. Repli immédiat vers la zone sud et atterrissage sur le terrain dégagé en cas de perte de liaison.'
 }
];
const smepp=[
 {
  k:'S',badge:'S',t:'Situation',d:'Situation générale puis situation particulière.',
  subs:[
   {k:'generale',badge:'G',t:'Situation générale',d:'Présentation de la mission, cadre juridique…',h:'Présente le contexte global de la mission et le cadre juridique applicable.'},
   {k:'particuliere',badge:'P',t:'Situation particulière',d:'Contexte actuel, amis, adversaire, population, géolocalisation.',h:'Décris la situation locale et les éléments concrets qui peuvent influencer la mission.'}
  ]
 },
 {k:'M',badge:'M',t:'Mission',d:'Formulation claire de la mission confiée.',h:'Verbes proposés dans le cours : APPUYER, PRENDRE DES VUES, FAIRE DIVERSION, RECONNAÎTRE, OBSERVER, RENSEIGNER.'},
 {
  k:'E',badge:'E',t:'Exécution',d:'AMICAL — déroulement détaillé de la mission.',
  subs:[
   {k:'A1',badge:'A',t:'Articulation',d:'Articulation au sol / en vol.',h:'Précise l’organisation du dispositif au sol et en vol.'},
   {k:'M1',badge:'M',t:'Mission TP / observateur',d:'Mission du télépilote / observateur d’aéronef.',h:'Répartis clairement les rôles entre télépilote et observateur.'},
   {k:'I',badge:'I',t:'Itinéraire / cheminement',d:'Cheminement prévu pour la mission.',h:'Sous-rubrique ajoutée pour matérialiser le I de AMICAL ; le cours cite le cheminement dans la conduite à tenir.'},
   {k:'C',badge:'C',t:'Conduite à tenir',d:'Synchronisation, cheminement, ligne de débouché, rappels de sécurité…',h:'Décris la conduite de mission et les règles à appliquer pendant l’action.'},
   {k:'A2',badge:'A',t:'Amis / renforts',d:'Amis sur place, renfort…',h:'Identifie les personnels ou unités amies présents et les renforts mobilisables.'},
   {k:'L',badge:'L',t:'Liaison',d:'Autorité d’emploi, OCT, compte rendu.',h:'Précise les liaisons et modalités de compte rendu avec l’autorité d’emploi et l’OCT.'}
  ]
 },
 {k:'PP',badge:'P',t:'Points particuliers',d:'Contraintes ou éléments spécifiques à garder à l’esprit.',h:'URBAIN / RURAL ; POPULATION ; LIMITE DANS LE TEMPS ; ESPACE AÉRIEN ; MÉTÉO.'},
 {k:'PC',badge:'P',t:'Place du chef',d:'Cinquième rubrique du SMEPP.',h:'Le support de cours identifie « Place du chef » comme rubrique du SMEPP mais ne détaille pas davantage son contenu sur cette diapositive. Renseigne la place du chef prévue pour la mission.'}
];

function buildGuides(host,items,prefix){
 host.innerHTML=items.map(x=>{
  const tips=(x.tips||[]).map(t=>`<span>${t}</span>`).join('');
  return `<article class="guide-item open">
    <div class="guide-head">
      <span class="badge">${x.badge||x.k}</span>
      <div><b>${x.t}</b><small>${x.d}</small></div>
      <button class="help-btn" type="button">Rappel</button>
    </div>
    <div class="guide-help">
      <p>${x.h||''}</p>
      ${tips?`<div class="guide-tip-chips">${tips}</div>`:''}
      ${x.example?`<div class="guide-example"><b>Exemple</b><span>${x.example}</span></div>`:''}
    </div>
    <textarea id="${prefix}-${x.k}" placeholder="Saisir ou dicter..."></textarea>
  </article>`;
 }).join('');
 host.querySelectorAll('.help-btn').forEach(b=>b.onclick=()=>b.closest('.guide-item').classList.toggle('open'));
 host.querySelectorAll('textarea').forEach(t=>t.addEventListener('input',updateProgress));
}

function buildSmeppAccordion(host){
 host.innerHTML=smepp.map((x,index)=>{
  const editor=x.subs
   ? `<div class="subfields">${x.subs.map(s=>`
      <section class="subfield">
       <div class="subfield-head">
        <span class="sub-badge">${s.badge||''}</span>
        <div><b>${s.t}</b><small>${s.d}</small></div>
        <button class="sub-help-btn" type="button">Rappel</button>
       </div>
       <div class="sub-help">${s.h||''}</div>
       <textarea id="smepp-${x.k}-${s.k}" data-smepp-parent="${x.k}" placeholder="Saisir ou dicter..."></textarea>
      </section>`).join('')}</div>`
   : `<div class="single-smepp-field">
       <div class="accordion-main-help">${x.h||''}</div>
       <textarea id="smepp-${x.k}" data-smepp-parent="${x.k}" placeholder="Saisir ou dicter..."></textarea>
      </div>`;

  return `<article class="smepp-accordion" data-smepp-key="${x.k}">
    <button class="smepp-accordion-toggle" type="button" aria-expanded="${index===0?'true':'false'}">
      <span class="smepp-status-icon">○</span>
      <span class="badge">${x.badge||x.k}</span>
      <span class="smepp-head-copy"><b>${x.t}</b><small>${x.d}</small></span>
      <span class="smepp-state-label">À faire</span>
      <span class="smepp-chevron">⌄</span>
    </button>
    <div class="smepp-accordion-body ${index===0?'open':''}">
      ${editor}
      <div class="smepp-validation-row">
        <span class="smepp-validation-hint">Complète la rubrique avant validation.</span>
        <button class="smepp-validate" data-validate-smepp="${x.k}" type="button" disabled>Valider et continuer</button>
      </div>
    </div>
  </article>`;
 }).join('');

 host.querySelectorAll('.smepp-accordion-toggle').forEach(btn=>btn.addEventListener('click',()=>{
  const card=btn.closest('.smepp-accordion');
  const body=card.querySelector('.smepp-accordion-body');
  const willOpen=!body.classList.contains('open');
  host.querySelectorAll('.smepp-accordion-body').forEach(b=>b.classList.remove('open'));
  host.querySelectorAll('.smepp-accordion-toggle').forEach(b=>b.setAttribute('aria-expanded','false'));
  if(willOpen){
   body.classList.add('open');
   btn.setAttribute('aria-expanded','true');
  }
  renderSmeppStates();
 }));

 host.querySelectorAll('.sub-help-btn').forEach(b=>b.onclick=()=>{
  const field=b.closest('.subfield');
  field.classList.toggle('open-help');
 });

 host.querySelectorAll('textarea').forEach(t=>t.addEventListener('input',()=>{
  const key=t.dataset.smeppParent;
  if(smeppValidated.has(key)){
   smeppValidated.delete(key);
  }
  updateProgress();
  renderSmeppStates();
 }));

 host.querySelectorAll('[data-validate-smepp]').forEach(btn=>btn.addEventListener('click',()=>{
  const key=btn.dataset.validateSmepp;
  const item=smepp.find(x=>x.k===key);
  if(!itemComplete('smepp',item)) return;
  smeppValidated.add(key);
  saveLocal();
  updateProgress();
  const index=smepp.findIndex(x=>x.k===key);
  const next=smepp.slice(index+1).find(x=>!smeppValidated.has(x.k));
  host.querySelectorAll('.smepp-accordion-body').forEach(b=>b.classList.remove('open'));
  host.querySelectorAll('.smepp-accordion-toggle').forEach(b=>b.setAttribute('aria-expanded','false'));
  if(next){
   const nextCard=host.querySelector('[data-smepp-key="'+next.k+'"]');
   nextCard.querySelector('.smepp-accordion-body').classList.add('open');
   nextCard.querySelector('.smepp-accordion-toggle').setAttribute('aria-expanded','true');
   setTimeout(()=>nextCard.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }
  renderSmeppStates();
 }));
 renderSmeppStates();
}

function renderSmeppStates(){
 const host=$('#smeppFields');
 if(!host) return;
 const firstPending=smepp.find(x=>!smeppValidated.has(x.k));
 smepp.forEach(item=>{
  const card=host.querySelector('[data-smepp-key="'+item.k+'"]');
  if(!card) return;
  const done=smeppValidated.has(item.k);
  const body=card.querySelector('.smepp-accordion-body');
  const isOpen=body.classList.contains('open');
  const complete=itemComplete('smepp',item);
  const icon=card.querySelector('.smepp-status-icon');
  const label=card.querySelector('.smepp-state-label');
  const validate=card.querySelector('.smepp-validate');
  const hint=card.querySelector('.smepp-validation-hint');

  card.classList.toggle('validated',done);
  card.classList.toggle('current',!done && isOpen);
  card.classList.toggle('ready-to-validate',!done && complete);

  icon.textContent=done?'✓':(isOpen?'•':'○');
  label.textContent=done?'Validé':(isOpen?'En cours':'À faire');

  if(validate){
   validate.disabled=!complete || done;
   validate.textContent=done?'Validé ✓':'Valider et continuer';
  }
  if(hint){
   hint.textContent=done?'Rubrique validée.':(complete?'Tout est renseigné : tu peux valider.':'Complète la rubrique avant validation.');
  }
 });
 const progress=smeppValidated.size;
 if($('#smeppProgress')) $('#smeppProgress').textContent=`${progress}/5`;
}

buildGuides($('#macloeFields'),macloe,'macloe');
buildSmeppAccordion($('#smeppFields'));

function syncBottomNav(step){
 $('.bottom-nav button').forEach(b=>b.classList.remove('active'));
 if(step==='zone') $('[data-open-step="zone"]')?.classList.add('active');
 else if(step==='synthese') $('[data-open-step="synthese"]')?.classList.add('active');
 else $('[data-prepa-nav]')?.classList.add('active');
}
function showMission(step='cadre'){
 $('#homeScreen').classList.remove('active');
 $('#missionScreen').classList.add('active');
 go(step);
 syncBottomNav(step);
}
function showHome(){saveLocal();$('#missionScreen').classList.remove('active');$('#homeScreen').classList.add('active');$('.bottom-nav button').forEach(b=>b.classList.remove('active'));$('[data-home]').classList.add('active');refreshHome()}
$('#newMissionBtn').onclick=()=>showMission('cadre');$('#resumeBtn').onclick=()=>showMission(currentStep);$('#backHome').onclick=showHome;
$('[data-home]').onclick=showHome;
$('[data-open-step]').forEach(b=>b.onclick=()=>showMission(b.dataset.openStep));
$('[data-prepa-nav]')?.addEventListener('click',()=>showMission(['cadre','mens','macloe','smepp'].includes(currentStep)?currentStep:'cadre'));
$$('[data-jump]').forEach(b=>b.onclick=()=>showMission(b.dataset.jump));

function go(step){
 currentStep=step;
 $$('.panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===step));
 $$('.stepbar button').forEach(b=>b.classList.toggle('active',b.dataset.step===step));
 const i=stepOrder.indexOf(step);$('#stepCounter').textContent=`Étape ${i+1}/${stepOrder.length}`;$('#stepTitle').textContent=titles[step];
 $('#prevBtn').style.visibility=i===0?'hidden':'visible';$('#nextBtn').textContent=i===stepOrder.length-1?'Terminer ✓':'Suivant →';
 if(step==='zone')setTimeout(initMap,50);
 if(step==='mens'){updateMensProgress();setTimeout(()=>fetchWeather(false),80);}
 if(step==='synthese')renderSummary();
 syncBottomNav(step);
}
$$('.stepbar button').forEach(b=>b.onclick=()=>go(b.dataset.step));
$('#prevBtn').onclick=()=>{const i=stepOrder.indexOf(currentStep);if(i>0)go(stepOrder[i-1])};
$('#nextBtn').onclick=()=>{const i=stepOrder.indexOf(currentStep);if(i<stepOrder.length-1)go(stepOrder[i+1]);else showHome()};

function initMap(){
 if(map){map.invalidateSize();return}
 const lat=+$('#lat').value,lng=+$('#lng').value;
 map=L.map('map',{zoomControl:false}).setView([lat,lng],14);

 const LocateControl=L.Control.extend({
  options:{position:'bottomright'},
  onAdd(){
   const container=L.DomUtil.create('div','leaflet-bar leaflet-control locate-control');
   const btn=L.DomUtil.create('button','leaflet-locate-btn',container);
   btn.type='button';
   btn.title='Me localiser';
   btn.setAttribute('aria-label','Me localiser');
   btn.innerHTML='⌖';
   L.DomEvent.disableClickPropagation(container);
   L.DomEvent.on(btn,'click',()=>{
    if(!navigator.geolocation){showToast('Localisation non disponible sur cet appareil.','error');return}
    btn.classList.add('loading');
    navigator.geolocation.getCurrentPosition(
      p=>{btn.classList.remove('loading');setPos(p.coords.latitude,p.coords.longitude,true);showToast('Position mise à jour.','success')},
      ()=>{btn.classList.remove('loading');showToast('Impossible d’obtenir ta position. Vérifie l’autorisation de localisation.','error')},
      {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
    );
   });
   return container;
  }
 });

 new LocateControl().addTo(map);
 L.control.zoom({position:'bottomright'}).addTo(map);

 layers.osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap'});
 layers.sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'© Esri'});
 layers.oaci=L.tileLayer('https://data.geopf.fr/private/wmts?apikey=ign_scan_ws&Layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&Style=normal&TileMatrixSet=PM&SERVICE=WMTS&REQUEST=GetTile&Version=1.0.0&FORMAT=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}',{
  minZoom:6,
  maxNativeZoom:11,
  maxZoom:20,
  keepBuffer:4,
  attribution:'Carte OACI-VFR 2026 © DSNA/SIA · Géoplateforme'
 });
 let oaciErrors=0;
 layers.oaci.on('tileerror',()=>{
  oaciErrors++;
  if(oaciErrors===3) showToast('Le fond OACI ne répond pas correctement. Utilise OSM/Satellite et le lien SIA en attendant.','error',4200);
 });

 setBase(localStorage.getItem('pmd-base')||'sat');
 marker=L.marker([lat,lng],{draggable:true}).addTo(map);
 circle=L.circle([lat,lng],{radius:+$('#radius').value,color:'#0b78f6',fillOpacity:.18}).addTo(map);
 marker.on('dragend',e=>{const p=e.target.getLatLng();setPos(p.lat,p.lng,false)});
 map.on('click',e=>setPos(e.latlng.lat,e.latlng.lng,false));
 ['lat','lng','radius'].forEach(id=>$('#'+id).addEventListener('change',syncMap));
 $('#centerBtn').onclick=syncMap;
}
function setBase(n){
 if(!map||!layers[n])return;
 if(baseLayer)map.removeLayer(baseLayer);
 baseLayer=layers[n].addTo(map);
 localStorage.setItem('pmd-base',n);
 $$('[data-base]').forEach(b=>b.classList.toggle('active',b.dataset.base===n));
}
$$('[data-base]').forEach(b=>b.onclick=()=>setBase(b.dataset.base));
function setPos(lat,lng,center=true){
 $('#lat').value=lat.toFixed(6);
 $('#lng').value=lng.toFixed(6);
 if(marker)marker.setLatLng([lat,lng]);
 if(circle)circle.setLatLng([lat,lng]);
 if(center&&map)map.setView([lat,lng],15);
 updateAirspaceContext();
}
function syncMap(){
 setPos(+$('#lat').value,+$('#lng').value,true);
 if(circle)circle.setRadius(+$('#radius').value||0);
}

function weatherCodeLabel(code){
 const map={
  0:'Ciel clair',1:'Plutôt dégagé',2:'Partiellement nuageux',3:'Couvert',
  45:'Brouillard',48:'Brouillard givrant',51:'Bruine faible',53:'Bruine',55:'Bruine forte',
  61:'Pluie faible',63:'Pluie',65:'Pluie forte',71:'Neige faible',73:'Neige',75:'Neige forte',
  80:'Averses faibles',81:'Averses',82:'Averses fortes',95:'Orage',96:'Orage avec grêle',99:'Orage fort avec grêle'
 };
 return map[code]||('Code météo '+code);
}
function nearestHourlyIndex(times,target){
 let best=0,bestDelta=Infinity;
 times.forEach((t,i)=>{const d=Math.abs(new Date(t).getTime()-target.getTime());if(d<bestDelta){best=i;bestDelta=d}});
 return best;
}
let weatherKey='';
async function fetchWeather(force=true){
 const host=$('#weatherResults');
 if(!host)return;
 const lat=+$('#lat').value,lng=+$('#lng').value;
 const raw=$('#missionDateTime')?.value;
 const target=raw?new Date(raw):new Date();
 const key=`${lat.toFixed(4)}|${lng.toFixed(4)}|${raw||'now'}`;
 if(!force&&weatherKey===key)return;
 weatherKey=key;
 host.innerHTML='<div class="tool-placeholder loading">Chargement de la météo…</div>';
 if($('#weatherContext')) $('#weatherContext').textContent=`Position ${lat.toFixed(5)}, ${lng.toFixed(5)} · créneau ${target.toLocaleString('fr-FR')}`;
 try{
  const params=new URLSearchParams({
   latitude:String(lat),longitude:String(lng),timezone:'auto',forecast_days:'16',
   current:'temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
   hourly:'temperature_2m,precipitation_probability,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
  });
  const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params.toString(),{cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const d=await res.json();
  const i=nearestHourlyIndex(d.hourly.time,target);
  const vis=(d.hourly.visibility?.[i]??0)/1000;
  const values=[
   ['Température',Math.round(d.hourly.temperature_2m[i])+' °C'],
   ['Vent',Math.round(d.hourly.wind_speed_10m[i])+' km/h'],
   ['Rafales',Math.round(d.hourly.wind_gusts_10m[i])+' km/h'],
   ['Direction',Math.round(d.hourly.wind_direction_10m[i])+'°'],
   ['Visibilité',vis?vis.toFixed(1)+' km':'—'],
   ['Pluie',Math.round(d.hourly.precipitation_probability[i]??0)+' %'],
   ['Nuages',Math.round(d.hourly.cloud_cover[i]??0)+' %'],
   ['Conditions',weatherCodeLabel(d.hourly.weather_code[i])]
  ];
  host.innerHTML=values.map(v=>`<div class="weather-metric"><small>${v[0]}</small><b>${v[1]}</b></div>`).join('')+
   '<div class="weather-source">Source : Open-Meteo · donnée indicative à confirmer dans le cadre de la préparation opérationnelle.</div>';
 }catch(err){
  host.innerHTML='<div class="tool-placeholder error">Impossible de récupérer la météo automatiquement. Tu peux toujours renseigner l’analyse manuellement.</div>';
  showToast('Météo indisponible pour le moment.','error');
 }
}
function updateAirspaceContext(){
 const el=$('#airspaceContext');
 if(!el)return;
 const lat=+$('#lat').value,lng=+$('#lng').value,alt=+$('#altitude').value;
 el.innerHTML=`<div><small>Point mission</small><b>${lat.toFixed(5)}, ${lng.toFixed(5)}</b></div>
 <div><small>Altitude prévue</small><b>${alt} m</b></div>
 <div><small>Analyse</small><b>OACI + validation SIA</b></div>`;
}
function initMensTools(){
 if($('#missionDateTime')&&!$('#missionDateTime').value){
  const d=new Date();
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('#missionDateTime').value=local;
 }
 $('#fetchWeatherBtn')?.addEventListener('click',()=>fetchWeather(true));
 $('#openOaciMapBtn')?.addEventListener('click',()=>{showMission('zone');setTimeout(()=>setBase('oaci'),120)});
 $('#openSiaAipBtn')?.addEventListener('click',()=>window.open('https://www.sia.aviation-civile.gouv.fr/','_blank','noopener'));
 $('#openSofiaBtn')?.addEventListener('click',()=>window.open('https://sofia-briefing.aviation-civile.gouv.fr/sofia/pages/homepage.html','_blank','noopener'));
 $('#openSupAipBtn')?.addEventListener('click',()=>window.open('https://www.sia.aviation-civile.gouv.fr/documents/supaip/aip/','_blank','noopener'));
 $$('[data-check]').forEach(x=>x.addEventListener('change',()=>{updateMensProgress();saveLocal();refreshHome()}));
 ['lat','lng','altitude','missionDateTime'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{weatherKey='';updateAirspaceContext()}));
 updateAirspaceContext();
 updateMensProgress();
}

function getCustomAirContacts(){
 try{return JSON.parse(localStorage.getItem('pmd-air-contacts')||'[]')}catch(e){return []}
}
function getAirContacts(){
 return [...SEEDED_AIR_CONTACTS,...getCustomAirContacts()];
}
function saveCustomAirContacts(items){
 localStorage.setItem('pmd-air-contacts',JSON.stringify(items));
 renderAirContacts();
}
function normalizePhone(phone=''){
 const raw=String(phone).trim();
 const cleaned=raw.replace(/[^\d+]/g,'');
 return cleaned.startsWith('0')?'+33'+cleaned.slice(1):cleaned;
}
function siaSearchUrl(query=''){
 const q=String(query).trim().toUpperCase();
 return 'https://www.sia.aviation-civile.gouv.fr/catalogsearch/result/?q='+encodeURIComponent(q||'VAC')+'&format=pdf';
}
function renderAirContacts(){
 const host=$('#contactsList');
 if(!host) return;
 const q=($('#contactSearch')?.value||'').trim().toLowerCase();
 const contacts=getAirContacts().filter(c=>[c.name,c.type,c.zone,c.phone,c.freq,c.notes].join(' ').toLowerCase().includes(q));
 if(!contacts.length){
  host.innerHTML='<div class="empty-contact">Aucun contact correspondant.</div>';
  return;
 }
 host.innerHTML=contacts.map(c=>{
  const tel=normalizePhone(c.phone);
  const zone=c.zone?'<span class="contact-zone">'+esc(c.zone)+'</span>':'';
  const source=c.source?'<small class="contact-source">'+esc(c.source)+'</small>':'';
  const freq=c.freq?'<div class="contact-frequency">◌ '+esc(c.freq)+'</div>':'';
  const note=c.notes?'<p>'+esc(c.notes)+'</p>':'';
  const del=c.locked?'':`<button class="contact-delete" data-delete-contact="${esc(c.id)}" type="button">Supprimer</button>`;
  return `<article class="contact-card">
    <div class="contact-top">
      <div><b>${esc(c.name)}</b><small>${esc(c.type||'Contact')}</small></div>
      ${zone}
    </div>
    ${freq}
    ${note}
    <div class="contact-actions">
      ${tel?`<a class="call-btn" href="tel:${tel}">☎ ${esc(c.phone)}</a>`:''}
      ${c.zone?`<button class="sia-btn" type="button" data-sia-query="${esc(c.zone)}">SIA ↗</button>`:''}
      ${del}
    </div>
    ${source}
  </article>`;
 }).join('');
 host.querySelectorAll('[data-delete-contact]').forEach(btn=>btn.onclick=()=>{
  const next=getCustomAirContacts().filter(c=>c.id!==btn.dataset.deleteContact);
  saveCustomAirContacts(next);
 });
 host.querySelectorAll('[data-sia-query]').forEach(btn=>btn.onclick=()=>window.open(siaSearchUrl(btn.dataset.siaQuery),'_blank','noopener'));
}
function resetContactForm(){
 ['contactName','contactZone','contactPhone','contactFreq','contactNotes'].forEach(id=>{if($('#'+id))$('#'+id).value=''});
 if($('#contactType')) $('#contactType').value='TWR';
}
function initAirDirectory(){
 if(!$('#contactsList')) return;
 renderAirContacts();
 $('#contactSearch')?.addEventListener('input',renderAirContacts);
 $('#toggleContactForm')?.addEventListener('click',()=>$('#contactForm')?.classList.toggle('hidden-contact'));
 $('#cancelContactBtn')?.addEventListener('click',()=>{resetContactForm();$('#contactForm')?.classList.add('hidden-contact')});
 $('#saveContactBtn')?.addEventListener('click',()=>{
  const name=$('#contactName')?.value.trim();
  const phone=$('#contactPhone')?.value.trim();
  if(!name || !phone){showToast('Renseigne au minimum un nom et un numéro de téléphone.','error');return}
  const item={
   id:'custom-'+Date.now(),
   name,
   type:$('#contactType')?.value||'Autre',
   zone:($('#contactZone')?.value||'').trim().toUpperCase(),
   phone,
   freq:($('#contactFreq')?.value||'').trim(),
   notes:($('#contactNotes')?.value||'').trim(),
   source:'Ajout personnel',
   locked:false
  };
  const items=getCustomAirContacts();
  items.push(item);
  saveCustomAirContacts(items);
  resetContactForm();
  $('#contactForm')?.classList.add('hidden-contact');
  showToast('Contact ajouté à l’annuaire.','success');
 });
 $('#openVacBtn')?.addEventListener('click',()=>{
  const q=$('#vacIcao')?.value.trim();
  window.open(siaSearchUrl(q),'_blank','noopener');
 });
 $('#vacIcao')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#openVacBtn')?.click()}});
}

function itemComplete(prefix,item){
 if(item.subs){
  return item.subs.every(s=>$('#'+prefix+'-'+item.k+'-'+s.k)?.value.trim());
 }
 return !!$('#'+prefix+'-'+item.k)?.value.trim();
}
function updateProgress(){
 const m=macloe.filter(x=>itemComplete('macloe',x)).length;
 $('#macloeProgress').textContent=`${m}/6`;
 if($('#smeppProgress')) $('#smeppProgress').textContent=`${smeppValidated.size}/5`;
 refreshHome();
}
function collect(){
 return {
  title:$('#missionTitle').value,missionDateTime:$('#missionDateTime')?.value||'',type:$('#missionType').value,capture:$('input[name=capture]:checked')?.value||'',
  useCases:$$('input[name=useCase]:checked').map(x=>x.value),
  zone:{lat:+$('#lat').value,lng:+$('#lng').value,altitude:+$('#altitude').value,radius:+$('#radius').value,environment:$('#environment').value,base:localStorage.getItem('pmd-base')||'sat'},
  mens:{
   checks:Object.fromEntries($('[data-check]').map(x=>[x.dataset.check,x.checked])),
   meteoNotes:$('#meteoNotes')?.value||'',
   airspaceNotes:$('#airspaceNotes')?.value||'',
   notamNotes:$('#notamNotes')?.value||'',
   supaipNotes:$('#supaipNotes')?.value||''
  },
  macloe:Object.fromEntries(macloe.map(x=>[x.k,$('#macloe-'+x.k)?.value||''])),
  smeppValidated:[...smeppValidated],
  smepp:Object.fromEntries(smepp.map(x=>[
   x.k,
   x.subs
    ? Object.fromEntries(x.subs.map(s=>[s.k,$('#smepp-'+x.k+'-'+s.k)?.value||'']))
    : ($('#smepp-'+x.k)?.value||'')
  ])),
  airContacts:getCustomAirContacts(),
  updatedAt:new Date().toISOString()
 }
}
function saveLocal(){localStorage.setItem('pmd-mission',JSON.stringify(collect()))}

function missionFile(){
 const d=collect();
 const safe=(d.title||'mission-drone').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'mission-drone';
 const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
 return {blob,file:new File([blob],safe+'.json',{type:'application/json'}),name:safe+'.json'};
}
function exportMission(){
 const {blob,name}=missionFile();
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download=name;
 a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),500);
 showToast('Mission exportée : '+name,'success');
}
async function shareMission(){
 const {file}=missionFile();
 try{
  if(navigator.canShare && navigator.canShare({files:[file]})){
   await navigator.share({title:'PrépaMission Drone — '+(collect().title||'Mission'),text:'Préparation de mission drone',files:[file]});
   return;
  }
  if(navigator.share){
   await navigator.share({title:'PrépaMission Drone — '+(collect().title||'Mission'),text:'Préparation de mission drone exportée en JSON.'});
   exportMission();
   return;
  }
  exportMission();
  showToast('Partage natif indisponible : le fichier a été téléchargé.','info');
 }catch(err){
  if(err?.name!=='AbortError') console.warn(err);
 }
}
async function importMissionFile(file){
 if(!file) return;
 try{
  const data=JSON.parse(await file.text());
  if(!data || typeof data!=='object' || !data.zone || !data.mens) throw new Error('Format invalide');
  localStorage.setItem('pmd-mission',JSON.stringify(data));
  if(Array.isArray(data.airContacts)){
   const existing=getCustomAirContacts();
   const byKey=new Map(existing.map(c=>[(c.zone||'')+'|'+(c.phone||''),c]));
   data.airContacts.forEach(c=>{if(c?.phone)byKey.set((c.zone||'')+'|'+c.phone,c)});
   localStorage.setItem('pmd-air-contacts',JSON.stringify([...byKey.values()]));
  }
  showToast('Mission importée. Chargement…','success',1200);
  setTimeout(()=>location.reload(),700);
 }catch(err){
  showToast('Impossible d’importer ce fichier de mission.','error');
 }
}
function loadLocal(){
 try{
  const d=JSON.parse(localStorage.getItem('pmd-mission')||'null');
  if(!d)return;
  $('#missionTitle').value=d.title||'';
  if($('#missionDateTime')&&d.missionDateTime)$('#missionDateTime').value=d.missionDateTime;
  $('#missionType').value=d.type||$('#missionType').value;
  const cap=$('input[name=capture][value="'+(d.capture||'')+'"]');if(cap)cap.checked=true;
  $$('input[name=useCase]').forEach(x=>x.checked=(d.useCases||[]).includes(x.value));
  if(d.zone){
   ['lat','lng','altitude','radius'].forEach(k=>$('#'+k).value=d.zone[k]??$('#'+k).value);
   $('#environment').value=d.zone.environment||$('#environment').value;
  }
  if(d.mens){
   $$('[data-check]').forEach(x=>x.checked=!!d.mens.checks?.[x.dataset.check]);
   if($('#meteoNotes'))$('#meteoNotes').value=d.mens.meteoNotes||d.mens.notes||'';
   if($('#airspaceNotes'))$('#airspaceNotes').value=d.mens.airspaceNotes||'';
   if($('#notamNotes'))$('#notamNotes').value=d.mens.notamNotes||'';
   if($('#supaipNotes'))$('#supaipNotes').value=d.mens.supaipNotes||'';
  }
  macloe.forEach(x=>{const el=$('#macloe-'+x.k);if(el)el.value=d.macloe?.[x.k]||''});
  smepp.forEach(x=>{
   if(x.subs){
    x.subs.forEach(s=>{
     const el=$('#smepp-'+x.k+'-'+s.k);
     if(el)el.value=(typeof d.smepp?.[x.k]==='object'?d.smepp?.[x.k]?.[s.k]:'')||'';
    });
   }else{
    const el=$('#smepp-'+x.k);
    if(el)el.value=(typeof d.smepp?.[x.k]==='string'?d.smepp?.[x.k]:'')||'';
   }
  });
  smeppValidated=new Set(Array.isArray(d.smeppValidated)?d.smeppValidated:[]);
  renderSmeppStates();
  updateMensProgress();
  updateProgress();
  updateAirspaceContext();
 }catch(e){
  console.warn('Mission locale illisible',e);
 }
}
function refreshHome(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=smeppValidated.size;$('#homeMissionTitle').textContent=d.title||'Mission sans titre';$('#homeMissionMeta').textContent=d.title?`${d.type} · ${d.zone.environment}`:'Aucune mission enregistrée';$('#homeMens').textContent=`MENS ${m}/4`;$('#homeMacloe').textContent=`MACLOE ${ma}/6`;$('#homeSmepp').textContent=`SMEPP ${sm}/5`}
function renderSummary(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=smeppValidated.size;$('#summary').innerHTML=`
 <div class="summary-box"><b>Mission</b><p>${esc(d.title||'Sans titre')}\n${esc(d.missionDateTime?new Date(d.missionDateTime).toLocaleString('fr-FR'):'Créneau non renseigné')}\n${esc(d.type)} · ${esc(d.capture)}\n${esc(d.useCases.join(' · ')||'Aucun cas d’usage')}</p></div>
 <div class="summary-box"><b>Zone</b><p>${d.zone.lat.toFixed(6)}, ${d.zone.lng.toFixed(6)}\nAltitude ${d.zone.altitude} m · Rayon ${d.zone.radius} m\n${esc(d.zone.environment)} · ${esc(d.zone.base.toUpperCase())}</p></div>
 <div class="summary-box"><b>Préparation</b><p>MENS ${m}/4 · MACLOE ${ma}/6 · SMEPP ${sm}/5</p></div>`;
 const ready=m===4&&ma===6&&sm===5;$('#readiness').querySelector('b').textContent=ready?'Mission prête':'Mission en préparation';$('#readiness').querySelector('small').textContent=ready?'Toutes les étapes sont complétées.':'Complète les étapes restantes avant validation.'}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#saveBtn').onclick=()=>{saveLocal();refreshHome();showToast('Mission enregistrée sur cet appareil.','success')};$('#saveTop').onclick=()=>{saveLocal();showToast('Mission enregistrée.','success')};
$('#exportBtn').onclick=exportMission;
$('#shareBtn')?.addEventListener('click',shareMission);
const importInput=$('#missionImportFile');
$('#importBtn')?.addEventListener('click',()=>importInput?.click());
$('#importHomeBtn')?.addEventListener('click',()=>importInput?.click());
importInput?.addEventListener('change',async e=>{await importMissionFile(e.target.files?.[0]);e.target.value=''});
$('#themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('pmd-theme',next)};
document.documentElement.dataset.theme=localStorage.getItem('pmd-theme')||'dark';
$('input,select,textarea').forEach(e=>e.addEventListener('change',()=>{refreshHome();updateMensProgress()}));
initAirDirectory();initMensTools();loadLocal();renderAirContacts();refreshHome();go('cadre');


let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const btn = $('#installBtn');
  if (btn) btn.classList.remove('hidden-install');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = $('#installBtn');
  if (btn) btn.classList.add('hidden-install');
});

const installBtn = $('#installBtn');
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add('hidden-install');
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service worker non enregistré :', error);
    });
  });
}
