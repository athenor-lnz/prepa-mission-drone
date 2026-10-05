const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stepOrder=['cadre','zone','mens','macloe','smepp','synthese'];
const titles={cadre:'Cadre de mission',zone:'Zone de mission',mens:'MENS',macloe:'MACLOE',smepp:'SMEPP',synthese:'Synthèse'};
let currentStep='cadre',map,marker,circle,baseLayer;
const layers={};

const macloe=[
 {k:'M',t:'Mission',d:"Verbe missionnel : observer, renseigner, reconnaître, appuyer, prendre des vues…",h:"Action demandée, bénéficiaire, effet attendu. Ex. Observer la zone afin d'identifier les points chauds."},
 {k:'A',t:'Allure / effet recherché',d:'Vitesse, discrétion, nature de l’action et effet recherché.',h:'Précise le rythme du vol, la discrétion, l’altitude ou le type d’effet recherché.'},
 {k:'C',t:'Cheminement',d:'Itinéraire, zone de décollage, zones sensibles, obstacles, dégagements.',h:'Décris le trajet prévu, les zones à éviter et les solutions de dégagement.'},
 {k:'L',t:'Ligne de débouché',d:'Ligne ou zone à partir de laquelle la mission ou captation devient utile.',h:'Indique le seuil spatial où l’action commence réellement.'},
 {k:'O',t:'Objectif',d:'Résultat concret attendu de l’action.',h:'Distingue-le de la Mission : ici, précise ce qui doit être obtenu ou constaté.'},
 {k:'E',t:'Esquive',d:'Retour, urgence, zone de repli ou interruption.',h:'Prévois l’atterrissage de sécurité, le repli et les cas d’arrêt.'}
];
const smepp=[
 {k:'S',t:'Situation',d:'Contexte général, environnement et contraintes.',h:'Décris les faits, le terrain, les tiers, les risques et les contraintes déjà identifiées.'},
 {k:'M',t:'Mission',d:'Objectif de la mission en une phrase.',h:'Résume qui fait quoi, quand, où et dans quel but.'},
 {k:'E',t:'Exécution',d:'Déroulement, phasage et conduite pratique.',h:'Ordre des actions, séquences de vol, critères de bascule ou d’arrêt.'},
 {k:'P',t:'Personnel / moyens',d:'Télépilote, observateur, drone, batteries, capteurs.',h:'Liste les personnels engagés et les moyens réellement disponibles.'},
 {k:'T',t:'Transmissions',d:'Moyens de communication, coordination et compte rendu.',h:'Précise les contacts, canaux, téléphones, modalités de CR et coordination.'}
];

function buildGuides(host,items,prefix){
 host.innerHTML=items.map(x=>`<article class="guide-item"><div class="guide-head"><span class="badge">${x.k}</span><div><b>${x.t}</b><small>${x.d}</small></div><button class="help-btn" type="button">Rappel</button></div><div class="guide-help">${x.h}</div><textarea id="${prefix}-${x.k}" placeholder="Saisir ou dicter..."></textarea></article>`).join('');
 host.querySelectorAll('.help-btn').forEach(b=>b.onclick=()=>b.closest('.guide-item').classList.toggle('open'));
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
 map=L.map('map',{zoomControl:true}).setView([lat,lng],14);
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

function updateProgress(){
 const m=macloe.filter(x=>$('#macloe-'+x.k)?.value.trim()).length,s=smepp.filter(x=>$('#smepp-'+x.k)?.value.trim()).length;
 $('#macloeProgress').textContent=`${m}/6`;$('#smeppProgress').textContent=`${s}/5`;refreshHome()
}
function collect(){
 return {
  title:$('#missionTitle').value,type:$('#missionType').value,capture:$('input[name=capture]:checked')?.value||'',
  useCases:$$('input[name=useCase]:checked').map(x=>x.value),
  zone:{lat:+$('#lat').value,lng:+$('#lng').value,altitude:+$('#altitude').value,radius:+$('#radius').value,environment:$('#environment').value,base:localStorage.getItem('pmd-base')||'sat'},
  mens:{checks:Object.fromEntries($$('[data-check]').map(x=>[x.dataset.check,x.checked])),notes:$('#mensNotes').value},
  macloe:Object.fromEntries(macloe.map(x=>[x.k,$('#macloe-'+x.k)?.value||''])),
  smepp:Object.fromEntries(smepp.map(x=>[x.k,$('#smepp-'+x.k)?.value||''])),
  updatedAt:new Date().toISOString()
 }
}
function saveLocal(){localStorage.setItem('pmd-mission',JSON.stringify(collect()))}
function loadLocal(){try{const d=JSON.parse(localStorage.getItem('pmd-mission')||'null');if(!d)return;$('#missionTitle').value=d.title||'';$('#missionType').value=d.type||$('#missionType').value;$$('input[name=useCase]').forEach(x=>x.checked=(d.useCases||[]).includes(x.value));if(d.zone){['lat','lng','altitude','radius'].forEach(k=>$('#'+k).value=d.zone[k]??$('#'+k).value);$('#environment').value=d.zone.environment||$('#environment').value}if(d.mens){$$('[data-check]').forEach(x=>x.checked=!!d.mens.checks?.[x.dataset.check]);$('#mensNotes').value=d.mens.notes||''}macloe.forEach(x=>{if($('#macloe-'+x.k))$('#macloe-'+x.k).value=d.macloe?.[x.k]||''});smepp.forEach(x=>{if($('#smepp-'+x.k))$('#smepp-'+x.k).value=d.smepp?.[x.k]||''});updateProgress()}catch(e){}}
function refreshHome(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=Object.values(d.smepp).filter(v=>v.trim()).length;$('#homeMissionTitle').textContent=d.title||'Mission sans titre';$('#homeMissionMeta').textContent=d.title?`${d.type} · ${d.zone.environment}`:'Aucune mission enregistrée';$('#homeMens').textContent=`MENS ${m}/4`;$('#homeMacloe').textContent=`MACLOE ${ma}/6`;$('#homeSmepp').textContent=`SMEPP ${sm}/5`}
function renderSummary(){const d=collect(),m=Object.values(d.mens.checks).filter(Boolean).length,ma=Object.values(d.macloe).filter(v=>v.trim()).length,sm=Object.values(d.smepp).filter(v=>v.trim()).length;$('#summary').innerHTML=`
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
