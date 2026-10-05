import { h, icon, sheet, toast, confirmDialog } from '../ui/dom.js';
import { store, getPrefs, setPrefs, flush } from '../state.js';
import { formatRange } from '../lib/time.js';
import { LABELS } from '../lib/verdict.js';
import { meteoVerdict } from '../lib/recap.js';
import { FORMS, validatedProgress, formValidated } from '../lib/forms.js';
import { missionUrl, isStepDone } from '../ui/layout.js';

function nextRoute(m) {
  if (!isStepDone(m, { key: 'cadre' })) return 'cadre';
  if (!isStepDone(m, { key: 'lieu' })) return 'lieu';
  if (!m.mens.meteo.slots.length && !m.mens.meteo.manual) return 'meteo';
  if (!m.mens.espace.fetchedAt && !m.mens.espace.localAnalysisAt) return 'espace';
  if (!m.mens.notam.fetchedAt) return 'notam';
  if (!m.mens.supaip.fetchedAt) return 'supaip';
  if (!formValidated(FORMS.macloe, m.validation?.macloe)) return 'macloe';
  if (!formValidated(FORMS.smepp, m.validation?.smepp)) return 'smepp';
  return 'fiche';
}

function card(m, rerender) {
  const v = meteoVerdict(m);
  const st = v && v.status !== 'unknown' ? v.status : null;
  const sm = validatedProgress(FORMS.smepp, m.validation?.smepp);
  const ma = validatedProgress(FORMS.macloe, m.validation?.macloe);
  return h('li', { class: 'mcard' },
    h('a', { class: 'mcard-main', href: missionUrl(m.id, nextRoute(m)) },
      h('div', { class: 'mcard-top' },
        h('strong', { class: 'mcard-name' }, m.name),
        st ? h('span', { class: `pill ${st}` }, LABELS[st]) : h('span', { class: 'pill unknown' }, 'À préparer')),
      h('div', { class: 'mcard-sub' }, m.place.label || (m.place.lat !== null ? 'Point sur la carte' : 'Zone à définir')),
      h('div', { class: 'mcard-meta mono' }, formatRange(m.window.start, m.window.end)),
      h('div', { class: 'mcard-meta' }, `MACLOE ${ma.done}/${ma.total} · SMEPP ${sm.done}/${sm.total}`)),
    h('button', { class: 'icon-btn', 'aria-label': `Actions pour ${m.name}`, onclick: () => actions(m, rerender) }, icon('more')));
}

function actions(m, rerender) {
  let sh;
  const item = (label, fn, cls = '') => h('button', { class: `btn ghost block ${cls}`, onclick: async () => { sh.close(); await fn(); } }, label);
  sh = sheet(m.name, h('div', { class: 'stack' },
    item('Renommer', () => rename(m, rerender)),
    item('Dupliquer', () => { store.duplicate(m.id); rerender(); toast('Mission dupliquée'); }),
    item('Exporter cette mission', () => exportMission(m)),
    item('Partager cette mission', () => shareMission(m)),
    item('Supprimer', async () => {
      if (await confirmDialog('Supprimer la mission ?', `« ${m.name} » sera effacée de cet appareil. Pense à l’exporter avant si besoin.`)) {
        store.remove(m.id); rerender(); toast('Mission supprimée');
      }
    }, 'danger-text')));
}

function rename(m, rerender) {
  const input = h('input', { value: m.name, maxlength: 200, 'aria-label': 'Nom de la mission' });
  const save = () => { const v = input.value.trim(); if (v) { store.save({ ...m, name: v }); rerender(); } s.close(); };
  const s = sheet('Renommer', h('div', { class: 'stack' }, input, h('button', { class: 'btn primary block', onclick: save }, 'Enregistrer')));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  input.select();
}

function missionFilename(m) {
  const safe=(m.name||'mission-drone').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'mission-drone';
  return `${safe}.json`;
}
function exportMission(m) {
  const blob = new Blob([store.exportMission(m.id)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: missionFilename(m) });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Mission exportée');
}
async function shareMission(m) {
  const file = new File([store.exportMission(m.id)], missionFilename(m), { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `Prépa Mission — ${m.name}`, text: 'Préparation de mission drone', files: [file] });
    } else if (navigator.share) {
      await navigator.share({ title: `Prépa Mission — ${m.name}`, text: 'Préparation de mission drone' });
      exportMission(m);
    } else exportMission(m);
  } catch (e) { if (e?.name !== 'AbortError') toast('Partage indisponible : mission exportée', 'bad'); }
}

function settings(rerender) {
  const p = getPrefs();
  const opt = (value, label, cur, key) => h('button', { class: value === cur ? 'on' : '', 'aria-pressed': String(value === cur), onclick: () => { setPrefs({ [key]: value }); sh.close(); settings(rerender); rerender(); } }, label);
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    try { const r = store.importJSON(await f.text()); toast(`Import : ${r.added} ajoutée(s), ${r.updated} mise(s) à jour, ${r.skipped} ignorée(s)`); rerender(); sh.close(); }
    catch (e) { toast(e.message, 'bad'); }
  });
  const sh = sheet('Réglages', h('div', { class: 'stack' },
    h('div', {}, h('span', { class: 'lbl' }, 'Thème'), h('div', { class: 'seg' }, opt('auto', 'Auto', p.theme, 'theme'), opt('light', 'Clair', p.theme, 'theme'), opt('dark', 'Sombre', p.theme, 'theme'))),
    h('div', {}, h('span', { class: 'lbl' }, 'Unité du vent'), h('div', { class: 'seg' }, opt('kt', 'kt', p.windUnit, 'windUnit'), opt('m/s', 'm/s', p.windUnit, 'windUnit'), opt('km/h', 'km/h', p.windUnit, 'windUnit'))),
    h('div', {}, h('span', { class: 'lbl' }, 'Sauvegarde'),
      h('button', { class: 'btn ghost block', onclick: exportAll }, 'Exporter toutes les missions'),
      h('button', { class: 'btn ghost block', onclick: () => file.click() }, 'Importer un fichier'), file,
      h('p', { class: 'note' }, 'Les missions sont conservées dans ce navigateur. Exporte-les avant de vider le cache ou de changer d’appareil.'))));
}

function exportAll() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `missions-drone-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function renderAccueil() {
  flush();
  const root = h('main', { class: 'screen home' });
  const draw = () => {
    const missions = store.list();
    root.replaceChildren(...[
      h('header', { class: 'home-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Prépa Mission'), h('h1', {}, 'Drone')),
        h('button', { class: 'icon-btn', 'aria-label': 'Réglages', onclick: () => settings(draw) }, icon('sun'))),
      !store.isPersistent ? h('div', { class: 'banner warn', role: 'alert' }, icon('warn'), 'Stockage du navigateur indisponible : les missions seront perdues à la fermeture. Exporte-les.') : null,
      missions.length
        ? h('ul', { class: 'mlist' }, missions.map((m) => card(m, draw)))
        : h('div', { class: 'empty' },
            h('div', { class: 'empty-ico' }, icon('locate', 40)),
            h('h2', {}, 'Aucune mission'),
            h('p', {}, 'Cadre, zone, MENS, MACLOE, SMEPP puis synthèse.'),
            h('button', { class: 'btn ghost', onclick: () => settings(draw) }, 'Importer des missions')),
      h('div', { class: 'cta-bar' }, h('button', { class: 'cta primary', onclick: () => { const m = store.create(); location.hash = missionUrl(m.id, 'cadre'); } }, icon('plus'), h('span', {}, 'Nouvelle mission')))].filter(Boolean));
  };
  draw();
  return { el: root };
}
