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

const macloe=[
 {k:'M',t:'Mission',d:'Analyse de la mission demandée.',h:'Exemples du cours : APPUYER, RECHERCHER, RECONNAÎTRE…'},
 {k:'A',t:'Allure',d:'Effet recherché.',h:'Exemples du cours : DISCRÉTION, RECHERCHE, POLICE TECHNIQUE, MAINTIEN DE L’ORDRE…'},
 {k:'C',t:'Cheminement',d:'Itinéraire : comment ? par où ?',h:'À prendre en compte : zone de décollage / atterrissage, zone sensible, zone de survol, zone de dégagement.'},
 {k:'L',t:'Ligne de débouché',d:'Ligne à partir de laquelle l’action plus sensible commence / zone de captation.',h:'À apprécier : vue par l’adversaire, risque pour la mission, réalisation de la mission.'},
 {k:'O',t:'Objectif',d:'Réalisation concrète de la mission.',h:'Pour l’acquisition d’images : légalité, exploitation, photo / vidéo, déporté.'},
 {k:'E',t:'Esquive',d:'Préparation du retour et de l’urgence.',h:'À définir : itinéraire de retour et itinéraire d’urgence.'}
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
 host.innerHTML=items.map(x=>`<article class="guide-item"><div class="guide-head"><span class="badge">${x.badge||x.k}</span><div><b>${x.t}</b><small>${x.d}</small></div><button class="help-btn" type="button">Rappel</button></div><div class="guide-help">${x.h||''}</div><textarea id="${prefix}-${x.k}" placeholder="Saisir ou dicter..."></textarea></article>`).join('');
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

function showMission(step='cadre'){
 $('#homeScreen').classList.remove('active');$('#missionScreen').classList.add('active');go(step);
 $$('.bottom-nav button').forEach(b=>b.classList.remove('active'));
 $$('[data-open-step]').forEach(b=>b.classList.toggle('active',b.dataset.openStep===step));
}
function showHome(){saveLocal();$('#missionScreen').classList.remove('active');$('#homeScreen').classList.add('active');$('[data-home]').classList.add('active');refreshHome()}
$('#newMissionBtn').onclick=()=>showMission('cadre');$('#resumeBtn').onclick=()=>showMission(currentStep);$('#backHome').onclick=showHome;
$('[data-home]').onclick=showHome;
$$('[data-open-step]').forEach(b=>b.onclick=()=>showMission(b.dataset.openStep));
$$('[data-jump]').forEach(b=>b.onclick=()=>showMission(b.dataset.jump));

function go(step){
 currentStep=step;
 $$('.panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===step));
 $$('.stepbar button').forEach(b=>b.classList.toggle('active',b.dataset.step===step));
 const i=stepOrder.indexOf(step);$('#stepCounter').textContent=`Étape ${i+1}/${stepOrder.length}`;$('#stepTitle').textContent=titles[step];
 $('#prevBtn').style.visibility=i===0?'hidden':'visible';$('#nextBtn').textContent=i===stepOrder.length-1?'Terminer ✓':'Suivant →';
 if(step==='zone')setTimeout(initMap,50);if(step==='synthese')renderSummary();
}
$$('.stepbar button').forEach(b=>b.onclick=()=>go(b.dataset.step));
$('#prevBtn').onclick=()=>{const i=stepOrder.indexOf(currentStep);if(i>0)go(stepOrder[i-1])};
$('#nextBtn').onclick=()=>{const i=stepOrder.indexOf(currentStep);if(i<stepOrder.length-1)go(stepOrder[i+1]);else showHome()};

function initMap(){
 if(map){map.invalidateSize();return}
 const lat=+$('#lat').value,lng=+$('#lng').value;
 map=L.map('map',{zoomControl:false}).setView([lat,lng],14);
 L.control.zoom({position:'bottomright'}).addTo(map);
 layers.osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap'});
 layers.sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'© Esri'});
 layers.oaci=L.tileLayer('https://data.geopf.fr/private/wmts?apikey=ign_scan_ws&Layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&Style=normal&TileMatrixSet=PM&SERVICE=WMTS&REQUEST=GetTile&Version=1.0.0&FORMAT=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}',{
  minZoom:6,
  maxNativeZoom:15,
  maxZoom:20,
  attribution:'Carte OACI-VFR © DSNA/SIA · diffusion Géoplateforme/IGN'
 });
 setBase(localStorage.getItem('pmd-base')||'sat');
 marker=L.marker([lat,lng],{draggable:true}).addTo(map);
 circle=L.circle([lat,lng],{radius:+$('#radius').value,color:'#0b78f6',fillOpacity:.18}).addTo(map);
 marker.on('dragend',e=>{const p=e.target.getLatLng();setPos(p.lat,p.lng,false)});
 map.on('click',e=>setPos(e.latlng.lat,e.latlng.lng,false));
 ['lat','lng','radius'].forEach(id=>$('#'+id).addEventListener('change',syncMap));
 $('#locateBtn').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>setPos(p.coords.latitude,p.coords.longitude,true),()=>alert('Localisation indisponible.'));
 $('#centerBtn').onclick=syncMap;
}
function setBase(n){if(!map)return;if(baseLayer)map.removeLayer(baseLayer);baseLayer=layers[n].addTo(map);localStorage.setItem('pmd-base',n);$$('[data-base]').forEach(b=>b.classList.toggle('active',b.dataset.base===n))}
$$('[data-base]').forEach(b=>b.onclick=()=>setBase(b.dataset.base));
function setPos(lat,lng,center=true){$('#lat').value=lat.toFixed(6);$('#lng').value=lng.toFixed(6);marker.setLatLng([lat,lng]);circle.setLatLng([lat,lng]);if(center)map.setView([lat,lng],15)}
function syncMap(){setPos(+$('#lat').value,+$('#lng').value,true);circle.setRadius(+$('#radius').value||0)}

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
  if(!name || !phone){alert('Renseigne au minimum un nom et un numéro de téléphone.');return}
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
  title:$('#missionTitle').value,type:$('#missionType').value,capture:$('input[name=capture]:checked')?.value||'',
  useCases:$$('input[name=useCase]:checked').map(x=>x.value),
  zone:{lat:+$('#lat').value,lng:+$('#lng').value,altitude:+$('#altitude').value,radius:+$('#radius').value,environment:$('#environment').value,base:localStorage.getItem('pmd-base')||'sat'},
  mens:{checks:Object.fromEntries($$('[data-check]').map(x=>[x.dataset.check,x.checked])),notes:$('#mensNotes').value},
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
  alert('Le partage natif n’est pas disponible : le fichier a été téléchargé.');
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
  alert('Mission importée. L’application va la charger.');
  location.reload();
 }catch(err){
  alert('Impossible d’importer ce fichier de mission.');
 }
}
function loadLocal(){try{const d=JSON.parse(localStorage.getItem('pmd-mission')||'null');if(!d)return;$('#missionTitle').value=d.title||'';$('#missionType').value=d.type||$('#missionType').value;$$('input[name=useCase]').forEach(x=>x.checked=(d.useCases||[]).includes(x.value));if(d.zone){['lat','lng','altitude','radius'].forEach(k=>$('#'+k).value=d.zone[k]??$('#'+k).value);$('#environment').value=d.zone.environment||$('#environment').value}if(d.mens){$$('[data-check]').forEach(x=>x.checked=!!d.mens.checks?.[x.dataset.check]);$('#mensNotes').value=d.mens.notes||''}macloe.forEach(x=>{if($('#macloe-'+x.k))$('#macloe-'+x.k).value=d.macloe?.[x.k]||''});smepp.forEach(x=>{
 if(x.subs){
  x.subs.forEach(s=>{
   const el=$('#smepp-'+x.k+'-'+s.k);
   if(el) el.value=(typeof d.smepp?.[x.k]==='object' ? d.smepp?.[x.k]?.[s.k] : '') || '';
  });
 }else{
  const el=$('#smepp-'+x.k);
  if(el) el.value=(typeof d.smepp?.[x.k]==='string' ? d.smepp?.[x.k] : '') || '';
 }
});smeppValidated=new Set(Array.isArray(d.smeppValidated)?d.smeppValidated:[]);renderSmeppStates();updateProgress()}catch(e){}}
function refreshHome(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=smeppValidated.size;$('#homeMissionTitle').textContent=d.title||'Mission sans titre';$('#homeMissionMeta').textContent=d.title?`${d.type} · ${d.zone.environment}`:'Aucune mission enregistrée';$('#homeMens').textContent=`MENS ${m}/4`;$('#homeMacloe').textContent=`MACLOE ${ma}/6`;$('#homeSmepp').textContent=`SMEPP ${sm}/5`}
function renderSummary(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=smeppValidated.size;$('#summary').innerHTML=`
 <div class="summary-box"><b>Mission</b><p>${esc(d.title||'Sans titre')}\n${esc(d.type)} · ${esc(d.capture)}\n${esc(d.useCases.join(' · ')||'Aucun cas d’usage')}</p></div>
 <div class="summary-box"><b>Zone</b><p>${d.zone.lat.toFixed(6)}, ${d.zone.lng.toFixed(6)}\nAltitude ${d.zone.altitude} m · Rayon ${d.zone.radius} m\n${esc(d.zone.environment)} · ${esc(d.zone.base.toUpperCase())}</p></div>
 <div class="summary-box"><b>Préparation</b><p>MENS ${m}/4 · MACLOE ${ma}/6 · SMEPP ${sm}/5</p></div>`;
 const ready=m===4&&ma===6&&sm===5;$('#readiness').querySelector('b').textContent=ready?'Mission prête':'Mission en préparation';$('#readiness').querySelector('small').textContent=ready?'Toutes les étapes sont complétées.':'Complète les étapes restantes avant validation.'}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#saveBtn').onclick=()=>{saveLocal();refreshHome();alert('Mission enregistrée localement.')};$('#saveTop').onclick=saveLocal;
$('#exportBtn').onclick=exportMission;
$('#shareBtn')?.addEventListener('click',shareMission);
const importInput=$('#missionImportFile');
$('#importBtn')?.addEventListener('click',()=>importInput?.click());
$('#importHomeBtn')?.addEventListener('click',()=>importInput?.click());
importInput?.addEventListener('change',async e=>{await importMissionFile(e.target.files?.[0]);e.target.value=''});
$('#themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('pmd-theme',next)};
document.documentElement.dataset.theme=localStorage.getItem('pmd-theme')||'dark';
$$('input,select,textarea').forEach(e=>e.addEventListener('change',refreshHome));
initAirDirectory();loadLocal();renderAirContacts();refreshHome();go('cadre');


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
