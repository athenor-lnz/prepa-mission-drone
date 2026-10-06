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
  return 'etapes';
}

function preparationProgress(m) {
  const checks = [
    isStepDone(m, { key: 'cadre' }),
    isStepDone(m, { key: 'lieu' }),
    !!(m.workflow?.mensExternal || m.mens.meteo.slots.length || m.mens.meteo.manual),
    !!(m.workflow?.mensExternal || m.mens.espace.fetchedAt || m.mens.espace.localAnalysisAt),
    !!(m.workflow?.mensExternal || m.mens.notam.fetchedAt),
    !!(m.workflow?.mensExternal || m.mens.supaip.fetchedAt),
    formValidated(FORMS.macloe, m.validation?.macloe),
    formValidated(FORMS.smepp, m.validation?.smepp)
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}

function mensState(m) {
  return [
    ['M', 'Météo', !!(m.workflow?.mensExternal || m.mens.meteo.slots.length || m.mens.meteo.manual)],
    ['E', 'Espace', !!(m.workflow?.mensExternal || m.mens.espace.fetchedAt || m.mens.espace.localAnalysisAt)],
    ['N', 'NOTAM', !!(m.workflow?.mensExternal || m.mens.notam.fetchedAt)],
    ['S', 'SUP AIP', !!(m.workflow?.mensExternal || m.mens.supaip.fetchedAt)]
  ];
}

function missionStatus(m) {
  const v = meteoVerdict(m);
  const st = v && v.status !== 'unknown' ? v.status : null;
  return st ? [st, LABELS[st]] : ['unknown', 'À préparer'];
}

function featuredCard(m, rerender) {
  const [st, label] = missionStatus(m);
  const p = preparationProgress(m);
  const route = nextRoute(m);
  return h('section', { class: 'mission-featured', 'aria-label': 'Mission en cours' },
    h('div', { class: 'featured-top' },
      h('div', {},
        h('span', { class: 'eyebrow' }, 'Mission en cours'),
        h('h2', { class: 'featured-name' }, m.name)),
      h('button', { class: 'icon-btn featured-more', 'aria-label': `Actions pour ${m.name}`, onclick: () => actions(m, rerender) }, icon('more'))),
    h('div', { class: 'featured-place' }, icon('locate', 18), h('span', {}, m.place.label || (m.place.lat !== null ? 'Point défini sur la carte' : 'Zone à définir'))),
    h('div', { class: 'featured-time mono' }, formatRange(m.window.start, m.window.end)),
    h('div', { class: 'progress-head' },
      h('span', {}, 'Préparation'),
      h('strong', { class: 'mono' }, `${p.pct}%`)),
    h('div', { class: 'mission-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(p.pct) },
      h('i', { style: `width:${p.pct}%` })),
    h('div', { class: 'mens-mini', 'aria-label': 'État MENS' },
      mensState(m).map(([letter, name, done]) => h('div', { class: `mens-mini-item ${done ? 'done' : ''}`, title: name },
        h('span', { class: 'mens-mini-letter' }, done ? '✓' : letter),
        h('small', {}, name)))),
    h('div', { class: 'featured-actions' },
      h('span', { class: `pill ${st}` }, label),
      h('a', { class: 'btn featured-continue', href: missionUrl(m.id, route) }, h('span', {}, p.pct === 100 ? 'Voir la synthèse' : 'Continuer'), icon('arrow', 20))));
}

function card(m, rerender) {
  const [st, label] = missionStatus(m);
  const p = preparationProgress(m);
  return h('li', { class: 'mcard compact' },
    h('a', { class: 'mcard-main', href: missionUrl(m.id, nextRoute(m)) },
      h('div', { class: 'mcard-top' },
        h('strong', { class: 'mcard-name' }, m.name),
        h('span', { class: `pill ${st}` }, label)),
      h('div', { class: 'mcard-sub' }, m.place.label || (m.place.lat !== null ? 'Point sur la carte' : 'Zone à définir')),
      h('div', { class: 'mcard-foot' },
        h('span', { class: 'mcard-meta mono' }, formatRange(m.window.start, m.window.end)),
        h('span', { class: 'mcard-progress mono' }, `${p.pct}%`))),
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
      h('div', { class: 'settings-save-actions' },
        h('button', { class: 'btn ghost block', onclick: exportAll }, 'Exporter toutes les missions'),
        h('button', { class: 'btn ghost block', onclick: () => file.click() }, 'Importer un fichier')),
      file,
      h('p', { class: 'note' }, 'Les missions sont conservées dans ce navigateur. Exporte-les avant de vider le cache ou de changer d’appareil.'))));
}

function exportAll() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `missions-drone-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function forceUpdate(){
  try {
    // Ne touche ni au localStorage ni à IndexedDB : les missions restent intactes.
    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k)=>caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r)=>r.unregister().catch(()=>false)));
    }
    try {
      await fetch(location.pathname+'?force='+Date.now(), { cache:'no-store', credentials:'same-origin' });
    } catch {}
    try { sessionStorage.setItem('pmd.justForcedUpdate','1'); } catch {}
    const cleanHash=location.hash||'#/';
    location.replace(location.pathname+'?force='+Date.now()+cleanHash);
  } catch (e) {
    toast('Mise à jour forcée impossible', 'bad');
  }
}

function maintenanceSheet(){
  let sh;
  sh=sheet('Maintenance',h('div',{class:'stack'},
    h('div',{class:'banner warn'},icon('warn'),h('span',{},'Cette action efface uniquement le cache de l’application et recharge la dernière version. Les missions enregistrées ne sont pas supprimées.')),
    h('button',{class:'btn primary block',onclick:async()=>{sh.close();await forceUpdate();}},'Forcer la mise à jour'),
    h('p',{class:'note'},'Astuce : ce menu est accessible en touchant 5 fois rapidement le badge de version, ou par un appui long.')
  ));
}

export function renderAccueil() {
  flush();
  const root = h('main', { class: 'screen home cockpit-home' });
  let versionTaps=0,versionTapTimer=null,versionHoldTimer=null;
  const versionTap=()=>{
    clearTimeout(versionTapTimer);
    versionTaps++;
    if(versionTaps>=5){versionTaps=0;maintenanceSheet();return;}
    versionTapTimer=setTimeout(()=>{versionTaps=0;},1800);
  };
  const versionHoldStart=()=>{
    clearTimeout(versionHoldTimer);
    versionHoldTimer=setTimeout(()=>{versionTaps=0;maintenanceSheet();},1200);
  };
  const versionHoldEnd=()=>clearTimeout(versionHoldTimer);
  try { if(sessionStorage.getItem('pmd.justForcedUpdate')==='1'){sessionStorage.removeItem('pmd.justForcedUpdate');setTimeout(()=>toast('Cache vidé · application rechargée'),250);} } catch {}
  const createMission = () => { const m = store.create(); location.hash = missionUrl(m.id, 'cadre'); };
  const draw = () => {
    const missions = store.list();
    const current = missions[0];
    const others = missions.slice(1);
    root.replaceChildren(...[
      h('header', { class: 'cockpit-head' },
        h('div', { class: 'cockpit-brand' },
          h('div', { class: 'cockpit-drone', 'aria-hidden': 'true' }, h('img', { src: 'icons/drone-logo.svg?v=11', alt: '', width: '76', height: '76' })),
          h('div', {},
            h('div', { class: 'cockpit-title-row' },
              h('h1', {}, 'Prépa Mission'),
              h('button', {
                class: 'app-version mono',
                title: 'Version de l’application',
                'aria-label':'Version v32',
                onclick:versionTap,
                onpointerdown:versionHoldStart,
                onpointerup:versionHoldEnd,
                onpointercancel:versionHoldEnd,
                onpointerleave:versionHoldEnd
              }, 'v32')),
            h('p', { class: 'cockpit-sub' }, 'Drone'))),
        h('button', { class: 'icon-btn cockpit-settings', 'aria-label': 'Réglages', onclick: () => settings(draw) }, icon('sun'))),
      !store.isPersistent ? h('div', { class: 'banner warn', role: 'alert' }, icon('warn'), 'Stockage du navigateur indisponible : les missions seront perdues à la fermeture. Exporte-les.') : null,
      h('section', { class: 'cockpit-data-access' },
        h('a', { class: 'cockpit-data-link', href: '#/data' },
          h('span', { class: 'cockpit-data-icon' }, icon('layers', 21)),
          h('span', { class: 'cockpit-data-copy' },
            h('strong', {}, 'Données aéronautiques'),
            h('small', {}, 'SIA · XML/AIXM · GeoJSON')),
          icon('arrow', 19))),
      h('section', { class: 'cockpit-create' },
        h('button', { class: 'cockpit-new', onclick: createMission },
          h('span', { class: 'cockpit-new-icon' }, icon('plus', 24)),
          h('span', { class: 'cockpit-new-copy' }, h('strong', {}, 'Nouvelle mission'), h('small', {}, 'Cadre · Zone · MENS · Briefing')),
          icon('arrow', 24))),
      current ? featuredCard(current, draw) : null,
      current ? h('section', { class: 'cockpit-quick' },
        h('a', { class: 'cockpit-checklists', href: `#/mission/${current.id}/checklists` },
          h('span', { class: 'cockpit-check-icon' }, icon('check', 22)),
          h('span', { class: 'cockpit-check-copy' },
            h('strong', {}, 'Check-lists opérationnelles'),
            h('small', {}, 'Avant départ · Sur zone · Décollage · Pannes · Retour')),
          icon('arrow', 20))) : null,
      current && others.length ? h('div', { class: 'section-title' }, h('h2', {}, 'Missions récentes'), h('span', { class: 'pill' }, String(others.length))) : null,
      others.length
        ? h('ul', { class: 'mlist cockpit-list' }, others.map((m) => card(m, draw)))
        : (!current ? h('div', { class: 'empty cockpit-empty' },
            h('div', { class: 'empty-ico cockpit-empty-logo' }, h('img', { src: 'icons/drone-logo.svg?v=11', alt: '', width: '64', height: '64' })),
            h('h2', {}, 'Prêt pour la première mission'),
            h('p', {}, 'Crée une mission pour lancer le parcours de préparation.'),
            h('button', { class: 'btn ghost', onclick: () => settings(draw) }, 'Importer des missions')) : null)
    ].filter(Boolean));
  };
  draw();
  return { el: root };
}

