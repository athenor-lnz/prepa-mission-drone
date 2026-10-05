// Récapitulatif de mission à copier. N'affiche que des données saisies ou récupérées, avec leur source.
import { formatAll } from './geo.js';
import { computeVerdict, LABELS } from './verdict.js';
import { formatRange, formatClock } from './time.js';
import { FORMS, progress } from './forms.js';
import { msToKt } from './units.js';
import { summarizeZones } from './airspace.js';

export const GENDRONE = { todo: 'À faire', sent: 'Envoyée', validated: 'Validée' };
export const VISUALDRONE = { todo: 'À faire', declared: 'Déclaré' };
export const GENDRONE_ORDER = ['todo', 'sent', 'validated'];
export const VISUALDRONE_ORDER = ['todo', 'declared'];

const kt = (ms) => (Number.isFinite(ms) ? `${Math.round(msToKt(ms))} kt` : '—');

export function meteoVerdict(mission) {
  const m = mission.mens?.meteo;
  if (!m?.slots?.length) return null;
  return computeVerdict(m.slots, m.gustLimitMs);
}

export function espaceLine(mission) {
  const e = mission.mens?.espace;
  if (!e || (!e.fetchedAt && e.controlled === null)) return 'Non vérifié';
  const parts = [];
  if (e.controlled === true) parts.push('Zone contrôlée : oui (saisi)');
  else if (e.controlled === false) parts.push('Zone contrôlée : non (saisi)');
  if (e.fetchedAt) {
    const s = summarizeZones(e.zones || []);
    if (s.level === 'forbidden') parts.push('Restriction UAS : vol interdit');
    else if (s.level === 'limited') parts.push(`Restriction UAS : hauteur max ${s.maxHeightM} m`);
    else if (s.level === 'unknown') parts.push('Restriction UAS : voir détail');
    else parts.push('Aucune restriction UAS cartographiée à ce point');
  }
  return parts.join(' · ') || 'Non vérifié';
}

export function buildRecap(mission) {
  const L = [];
  L.push(`MISSION : ${mission.name}`);
  const p = mission.place;
  if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
    const f = formatAll(p.lat, p.lon);
    L.push(`Lieu : ${p.label || '(sans adresse)'}`);
    L.push(`  DD  ${f.dd}`, `  DMS ${f.dms}`, `  UTM ${f.utm}`, `  Rayon de travail : ${p.radiusM} m`);
  } else L.push('Lieu : non défini');
  L.push(`Créneau (heure locale du lieu) : ${formatRange(mission.window.start, mission.window.end)}`);

  const me = mission.mens.meteo;
  const v = meteoVerdict(mission);
  if (v && v.status !== 'unknown') {
    L.push(`Météo : ${LABELS[v.status]} — rafales max ${kt(v.maxGust)}, vent moyen max ${kt(v.maxWind)}, seuil ${kt(me.gustLimitMs)}`);
    L.push(`  Source : ${me.manual ? 'saisie manuelle' : me.source || 'inconnue'}${me.fetchedAt ? `, ${formatClock(me.fetchedAt)}` : ''}`);
  } else L.push('Météo : non évaluée');
  if (Number.isFinite(me.kp)) L.push(`  Kp max : ${me.kp}`);
  if (me.alerts?.length) L.push(`  Alertes (saisies) : ${me.alerts.join(' ; ')}`);

  L.push(`Espace aérien : ${espaceLine(mission)}`);
  const nt = mission.mens.notam.items.length;
  const sp = mission.mens.supaip.items.length;
  L.push(`NOTAM : ${nt ? `${nt} saisi(s) à la main` : mission.mens.notam.fetchedAt ? 'consultés à la main, rien noté' : 'non vérifiés'}`);
  nt && mission.mens.notam.items.forEach((i) => L.push(`  - ${i.id || '(sans id)'}${i.validity ? ` (${i.validity})` : ''}`));
  L.push(`SUP AIP : ${sp ? `${sp} saisi(s) à la main` : mission.mens.supaip.fetchedAt ? 'consultés à la main, rien noté' : 'non vérifiés'}`);
  sp && mission.mens.supaip.items.forEach((i) => L.push(`  - ${i.id || '(sans id)'} ${i.title || ''}${i.validity ? ` (${i.validity})` : ''}`));

  const s = progress(FORMS.smepp, mission.smepp);
  const m = progress(FORMS.macloe, mission.macloe);
  L.push(`SMEPP : ${s.done} / ${s.total} champs`, `MACLOE : ${m.done} / ${m.total} champs`);
  L.push(`GENDRONE : ${GENDRONE[mission.admin.gendrone] ?? '—'}`, `Visu@ldrone : ${VISUALDRONE[mission.admin.visualdrone] ?? '—'}`);
  L.push('', 'Aide à la préparation : ne remplace ni les sources officielles ni l\'autorisation de vol.');
  return L.join('\n');
}
