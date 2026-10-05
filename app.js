const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stepOrder=['cadre','zone','mens','macloe','smepp','synthese'];
const titles={cadre:'Cadre de mission',zone:'Zone de mission',mens:'MENS',macloe:'MACLOE',smepp:'SMEPP',synthese:'Synthèse'};
let currentStep='cadre',map,marker,circle,baseLayer;
const layers={};

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
 host.innerHTML=items.map(x=>{
  const mainHelp=x.h ? `<div class="guide-help">${x.h}</div>` : '';
  const editor=x.subs
   ? `<div class="subfields">${x.subs.map(s=>`
      <section class="subfield">
       <div class="subfield-head">
        <span class="sub-badge">${s.badge||''}</span>
        <div><b>${s.t}</b><small>${s.d}</small></div>
        <button class="sub-help-btn" type="button">Rappel</button>
       </div>
       <div class="sub-help">${s.h||''}</div>
       <textarea id="${prefix}-${x.k}-${s.k}" data-parent="${x.k}" placeholder="Saisir ou dicter..."></textarea>
      </section>`).join('')}</div>`
   : `<textarea id="${prefix}-${x.k}" data-parent="${x.k}" placeholder="Saisir ou dicter..."></textarea>`;
  return `<article class="guide-item">
   <div class="guide-head"><span class="badge">${x.badge||x.k}</span><div><b>${x.t}</b><small>${x.d}</small></div>${x.h?'<button class="help-btn" type="button">Rappel</button>':''}</div>
   ${mainHelp}
   ${editor}
  </article>`;
 }).join('');
 host.querySelectorAll('.help-btn').forEach(b=>b.onclick=()=>b.closest('.guide-item').classList.toggle('open'));
 host.querySelectorAll('.sub-help-btn').forEach(b=>b.onclick=()=>{
   const field=b.closest('.subfield');
   field.classList.toggle('open');
 });
 host.querySelectorAll('textarea').forEach(t=>t.addEventListener('input',updateProgress));
}
buildGuides($('#macloeFields'),macloe,'macloe');
buildGuides($('#smeppFields'),smepp,'smepp');

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

function itemComplete(prefix,item){
 if(item.subs){
  return item.subs.every(s=>$('#'+prefix+'-'+item.k+'-'+s.k)?.value.trim());
 }
 return !!$('#'+prefix+'-'+item.k)?.value.trim();
}
function updateProgress(){
 const m=macloe.filter(x=>itemComplete('macloe',x)).length;
 const s=smepp.filter(x=>itemComplete('smepp',x)).length;
 $('#macloeProgress').textContent=`${m}/6`;
 $('#smeppProgress').textContent=`${s}/5`;
 refreshHome();
}
function collect(){
 return {
  title:$('#missionTitle').value,type:$('#missionType').value,capture:$('input[name=capture]:checked')?.value||'',
  useCases:$$('input[name=useCase]:checked').map(x=>x.value),
  zone:{lat:+$('#lat').value,lng:+$('#lng').value,altitude:+$('#altitude').value,radius:+$('#radius').value,environment:$('#environment').value,base:localStorage.getItem('pmd-base')||'sat'},
  mens:{checks:Object.fromEntries($$('[data-check]').map(x=>[x.dataset.check,x.checked])),notes:$('#mensNotes').value},
  macloe:Object.fromEntries(macloe.map(x=>[x.k,$('#macloe-'+x.k)?.value||''])),
  smepp:Object.fromEntries(smepp.map(x=>[
   x.k,
   x.subs
    ? Object.fromEntries(x.subs.map(s=>[s.k,$('#smepp-'+x.k+'-'+s.k)?.value||'']))
    : ($('#smepp-'+x.k)?.value||'')
  ])),
  updatedAt:new Date().toISOString()
 }
}
function saveLocal(){localStorage.setItem('pmd-mission',JSON.stringify(collect()))}
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
});updateProgress()}catch(e){}}
function refreshHome(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=smepp.filter(x=>itemComplete('smepp',x)).length;$('#homeMissionTitle').textContent=d.title||'Mission sans titre';$('#homeMissionMeta').textContent=d.title?`${d.type} · ${d.zone.environment}`:'Aucune mission enregistrée';$('#homeMens').textContent=`MENS ${m}/4`;$('#homeMacloe').textContent=`MACLOE ${ma}/6`;$('#homeSmepp').textContent=`SMEPP ${sm}/5`}
function renderSummary(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=smepp.filter(x=>itemComplete('smepp',x)).length;$('#summary').innerHTML=`
 <div class="summary-box"><b>Mission</b><p>${esc(d.title||'Sans titre')}\n${esc(d.type)} · ${esc(d.capture)}\n${esc(d.useCases.join(' · ')||'Aucun cas d’usage')}</p></div>
 <div class="summary-box"><b>Zone</b><p>${d.zone.lat.toFixed(6)}, ${d.zone.lng.toFixed(6)}\nAltitude ${d.zone.altitude} m · Rayon ${d.zone.radius} m\n${esc(d.zone.environment)} · ${esc(d.zone.base.toUpperCase())}</p></div>
 <div class="summary-box"><b>Préparation</b><p>MENS ${m}/4 · MACLOE ${ma}/6 · SMEPP ${sm}/5</p></div>`;
 const ready=m===4&&ma===6&&sm===5;$('#readiness').querySelector('b').textContent=ready?'Mission prête':'Mission en préparation';$('#readiness').querySelector('small').textContent=ready?'Toutes les étapes sont complétées.':'Complète les étapes restantes avant validation.'}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#saveBtn').onclick=()=>{saveLocal();refreshHome();alert('Mission enregistrée localement.')};$('#saveTop').onclick=saveLocal;
$('#exportBtn').onclick=()=>{const b=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='prepa-mission-drone.json';a.click();URL.revokeObjectURL(a.href)};
$('#themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('pmd-theme',next)};
document.documentElement.dataset.theme=localStorage.getItem('pmd-theme')||'dark';
$$('input,select,textarea').forEach(e=>e.addEventListener('change',refreshHome));
loadLocal();refreshHome();go('cadre');


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
