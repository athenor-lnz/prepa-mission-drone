// Récapitulatif de mission à copier. N'affiche que des données saisies ou récupérées, avec leur source.
import { formatAll } from './geo.js';
import { computeVerdict, LABELS } from './verdict.js';
import { formatRange, formatClock } from './time.js';
import { FORMS, validatedProgress } from './forms.js';
import { msToKt } from './units.js';
import { summarizeZones } from './airspace.js';

export const GENDRONE = { todo: 'À faire', sent: 'Envoyée', validated: 'Validée' };
export const VISUALDRONE = { todo: 'À faire', declared: 'Déclaré' };
export const GENDRONE_ORDER = ['todo', 'sent', 'validated'];
export const VISUALDRONE_ORDER = ['todo', 'declared'];

const kt = (ms) => (Number.isFinite(ms) ? `${Math.round(msToKt(ms))} kt` : '—');
const TYPE_LABELS={judiciaire:'Police judiciaire',administratif:'Police administrative',sauvegarde:'Sauvegarde de la vie humaine',entrainement:'Entraînement',communication:'Communication',autre:'Autre'};
const CAPTURE_LABELS={observation:'Observation',captation:'Captation',enregistrement:'Enregistrement'};

export function meteoVerdict(mission) {
  const m = mission.mens?.meteo;
  if (!m?.slots?.length) return null;
  return computeVerdict(m.slots, m.gustLimitMs);
}

export function espaceLine(mission) {
  const e = mission.mens?.espace;
  if (!e || (!e.fetchedAt && !e.localAnalysisAt)) return 'Non vérifié';
  const parts=[];
  if(e.localAnalysisAt){
    if(e.controlled===true)parts.push('CTR/TMA/CTA détectée dans le rayon');
    else if(e.controlled===false)parts.push('Aucune CTR/TMA/CTA détectée dans le rayon selon la base locale');
    if(e.localZones?.length)parts.push(`${e.localZones.length} espace(s) SIA intersectant le rayon`);
    if(e.aerodromes?.length)parts.push(`AD proche : ${e.aerodromes[0].icao||''} ${e.aerodromes[0].name||''}`.trim());
  }
  if (e.fetchedAt) {
    const s = summarizeZones(e.zones || []);
    if (s.level === 'forbidden') parts.push('Restriction UAS : vol interdit au point');
    else if (s.level === 'limited') parts.push(`Restriction UAS : hauteur max ${s.maxHeightM} m`);
    else if (s.level === 'unknown') parts.push('Restriction UAS : voir détail');
    else parts.push('Aucune restriction UAS cartographiée au point');
  }
  return parts.join(' · ') || 'Vérifié';
}

export function buildRecap(mission) {
  const L=[];
  L.push(`MISSION : ${mission.name}`);
  L.push(`Cadre : ${TYPE_LABELS[mission.context?.missionType]||'non défini'} · ${CAPTURE_LABELS[mission.context?.capture]||'non défini'}`);
  L.push(`Cas d’usage : ${mission.context?.useCases?.length ? mission.context.useCases.join(' · ') : 'non renseigné'}`);

  const p=mission.place;
  if(Number.isFinite(p.lat)&&Number.isFinite(p.lon)){
    const f=formatAll(p.lat,p.lon);
    L.push(`Zone : ${p.label||'(sans adresse)'}`);
    L.push(`  DD  ${f.dd}`,`  DMS ${f.dms}`,`  UTM ${f.utm}`,`  Rayon de travail : ${p.radiusM} m`);
  } else L.push('Zone : non définie');
  L.push(`Créneau (heure locale du lieu) : ${formatRange(mission.window.start,mission.window.end)}`);

  const me=mission.mens.meteo; const v=meteoVerdict(mission);
  if(v&&v.status!=='unknown'){
    L.push(`Météo : ${LABELS[v.status]} — rafales max ${kt(v.maxGust)}, vent moyen max ${kt(v.maxWind)}, seuil ${kt(me.gustLimitMs)}`);
    L.push(`  Source : ${me.manual?'saisie manuelle':me.source||'inconnue'}${me.fetchedAt?`, ${formatClock(me.fetchedAt)}`:''}`);
  } else L.push('Météo : non évaluée');
  if(Number.isFinite(me.kp))L.push(`  Kp max : ${me.kp}`);
  if(me.alerts?.length)L.push(`  Alertes saisies : ${me.alerts.join(' ; ')}`);

  L.push(`Espace aérien : ${espaceLine(mission)}`);
  const es=mission.mens.espace;
  if(es.localDataset) L.push(`  Base locale : ${es.localDataset.source||'GeoGM/SIA'}${es.localDataset.effective?` · effectif ${es.localDataset.effective}`:''}`);
  (es.localZones||[]).slice(0,12).forEach((z)=>L.push(`  - ${[z.type,z.id,z.name].filter(Boolean).join(' · ')} · ${z.floor||'—'} → ${z.ceiling||'—'}`));
  if(es.aerodromes?.length) {
    const a=es.aerodromes[0]; L.push(`  Aérodrome le plus proche : ${a.icao||'—'} · ${a.name||''} · ${Number.isFinite(a.distanceM)?(a.distanceM/1000).toFixed(1)+' km':'distance —'}`);
  }

  const nt=mission.mens.notam.items.length,sp=mission.mens.supaip.items.length;
  L.push(`NOTAM : ${nt?`${nt} reporté(s)`:mission.mens.notam.fetchedAt?'consultés, rien reporté':'non vérifiés'}`);
  mission.mens.notam.items.forEach((i)=>L.push(`  - ${i.id||'(sans id)'}${i.validity?` (${i.validity})`:''}`));
  L.push(`SUP AIP : ${sp?`${sp} reporté(s)`:mission.mens.supaip.fetchedAt?'consultés, rien reporté':'non vérifiés'}`);
  mission.mens.supaip.items.forEach((i)=>L.push(`  - ${i.id||'(sans id)'} ${i.title||''}${i.validity?` (${i.validity})`:''}`));

  const ma=validatedProgress(FORMS.macloe,mission.validation?.macloe);
  const sm=validatedProgress(FORMS.smepp,mission.validation?.smepp);
  L.push(`MACLOE : ${ma.done} / ${ma.total} parties validées`,`SMEPP : ${sm.done} / ${sm.total} parties validées`);
  L.push(`GENDRONE : ${GENDRONE[mission.admin.gendrone]??'—'}`,`Visu@ldrone : ${VISUALDRONE[mission.admin.visualdrone]??'—'}`);
  L.push('','Aide à la préparation : ne remplace ni les sources officielles ni l’autorisation de vol.');
  return L.join('\n');
}
