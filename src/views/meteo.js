import { h, icon, toast } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, missionUrl } from '../ui/layout.js';
import { mutate, fmtSpeed, speedFromMs, speedToMs, getPrefs } from '../state.js';
import { computeVerdict, LABELS } from '../lib/verdict.js';
import { formatRange, formatClock, isLocalDateTime } from '../lib/time.js';
import { slotsForWindow, chartHours, summarize, compass, windowCovered, kpForWindow, kpStatus, KP_LABEL } from '../lib/weather.js';
import { fetchForecast, fetchKp } from '../services/meteo.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const placeKey = (p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

export function renderMeteo({ mission }) {
  const root = h('main', { class: 'screen scroll' });
  const me = mission.mens.meteo;
  const p = mission.place;
  let loading = false;
  let error = null;
  let manualOpen = false;

  const hasPoint = Number.isFinite(p.lat) && Number.isFinite(p.lon);
  const windowOk = isLocalDateTime(mission.window.start) && isLocalDateTime(mission.window.end) && mission.window.end > mission.window.start;

  function recompute() {
    mutate(mission, (m) => {
      const mm = m.mens.meteo;
      if (mm.manual) return;
      mm.slots = slotsForWindow(mm.hours, m.window.start, m.window.end);
      mm.kp = mm.kpEntries ? kpForWindow(mm.kpEntries, m.window.start, m.window.end, mm.utcOffsetSeconds) : mm.kp;
    });
  }

  async function load() {
    if (!windowOk) { toast('Définis d’abord le début et la fin de mission dans l’étape Mission.', 'bad'); return; }
    if (!hasPoint || loading) return;
    loading = true; error = null; draw();
    const [f, k] = await Promise.all([fetchForecast(p.lat, p.lon), fetchKp()]);
    loading = false;
    if (!f.ok) { error = f.error; manualOpen = true; draw(); return; }
    mutate(mission, (m) => {
      const mm = m.mens.meteo;
      mm.hours = f.data.hours.slice(0, 400); mm.tz = f.data.tz; mm.utcOffsetSeconds = f.data.utcOffsetSeconds;
      mm.fetchedAt = f.fetchedAt; mm.source = f.source; mm.manual = false; mm.forPlace = placeKey(p);
      mm.kpEntries = k.ok ? k.data.slice(-60) : null;
      mm.kpError = k.ok ? null : k.error;
      mm.slots = slotsForWindow(mm.hours, m.window.start, m.window.end);
      mm.kp = mm.kpEntries ? kpForWindow(mm.kpEntries, m.window.start, m.window.end, mm.utcOffsetSeconds) : null;
    });
    draw();
  }

  function verdictCard() {
    const v = computeVerdict(me.slots, me.gustLimitMs);
    const st = v.status;
    const sum = summarize(me.slots);
    const src = me.manual ? 'saisie manuelle' : me.source;
    return h('section', { class: `verdict ${st}`, 'aria-live': 'polite' },
      h('div', { class: 'v-top' },
        h('span', { class: 'eyebrow' }, `Créneau ${formatRange(mission.window.start, mission.window.end)}`),
        h('span', { class: 'mono small' }, me.fetchedAt ? `maj ${formatClock(me.fetchedAt)}` : '')),
      h('div', { class: 'v-main' },
        h('div', { class: 'v-label' }, LABELS[st]),
        h('div', { class: 'v-nums mono' }, st === 'unknown' ? '—' : `${fmtSpeed(v.maxGust)} / ${fmtSpeed(me.gustLimitMs)} ${getPrefs().windUnit}`, h('small', {}, 'rafales max · seuil'))),
      st !== 'unknown' ? h('div', { class: 'meter', role: 'img', 'aria-label': `${Math.round(v.ratio * 100)} % du seuil` }, h('span', { style: `width:${Math.min(100, Math.round(v.ratio * 100))}%` }), h('i', { style: 'left:85%' })) : null,
      h('p', { class: 'v-sub' }, st === 'unknown' ? 'Pas assez de données pour le créneau.' : `${Math.round(v.ratio * 100)} % du seuil · « Prudence » à partir de 85 %`),
      h('p', { class: 'v-src' }, `Source : ${src || '—'}. Aide à la décision, pas une autorisation de vol.`),
      sum ? null : null);
  }

  function stats() {
    const sum = summarize(me.slots);
    if (!sum) return null;
    const kp = me.kp; const ks = kpStatus(kp);
    const unit = getPrefs().windUnit;
    return h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'lbl' }, 'Vent'), h('div', { class: 'num' }, fmtSpeed(sum.wind), h('small', {}, unit)), h('span', { class: 'sub' }, Number.isFinite(sum.dir) ? `${compass(sum.dir)} · ${Math.round(sum.dir)}°` : '—')),
      h('div', { class: 'stat' }, h('span', { class: 'lbl' }, 'Rafales'), h('div', { class: 'num' }, fmtSpeed(sum.gust), h('small', {}, unit)), h('span', { class: 'sub' }, 'max créneau')),
      h('div', { class: 'stat' }, h('span', { class: 'lbl' }, 'Kp'), h('div', { class: 'num' }, Number.isFinite(kp) ? String(Math.round(kp * 10) / 10) : '—', h('small', {}, '/9')), h('span', { class: `sub ${ks}` }, me.manual ? 'non saisi' : KP_LABEL[ks])),
      h('div', { class: 'stat' }, h('span', { class: 'lbl' }, 'Pluie'), h('div', { class: 'num' }, Number.isFinite(sum.pop) ? String(Math.round(sum.pop)) : '—', h('small', {}, '%')), h('span', { class: 'sub' }, Number.isFinite(sum.vis) ? `visi ${(sum.vis / 1000).toFixed(sum.vis >= 10000 ? 0 : 1)} km` : '')),
      h('div', { class: 'stat' }, h('span', { class: 'lbl' }, 'Temp.'), h('div', { class: 'num' }, Number.isFinite(sum.tempMax) ? String(Math.round(sum.tempMax)) : '—', h('small', {}, '°C')), h('span', { class: 'sub' }, Number.isFinite(sum.cloud) ? `nuages ${Math.round(sum.cloud)} %` : '')),
      h('div', { class: 'stat' }, h('span', { class: 'lbl' }, 'Vent 80 m'), h('div', { class: 'num' }, fmtSpeed(sum.wind80), h('small', {}, unit)), h('span', { class: 'sub' }, 'en altitude')));
  }

  function chart() {
    const hrs = chartHours(me.hours, mission.window.start, mission.window.end, 3);
    if (!hrs.length) return null;
    const W = 340; const H = 150; const padB = 22; const padT = 8;
    const vals = hrs.map((x) => speedFromMs(x.gust) ?? 0);
    const lim = speedFromMs(me.gustLimitMs);
    const max = Math.max(lim * 1.25, ...vals, 1);
    const bw = W / hrs.length;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Rafales par heure et seuil de ${Math.round(lim)} ${getPrefs().windUnit}` });
    const inWin = new Set(slotsForWindow(me.hours, mission.window.start, mission.window.end).map((x) => x.t));
    hrs.forEach((x, i) => {
      const v = vals[i]; const bh = Math.max(2, ((H - padB - padT) * v) / max);
      const status = v > lim ? 'nogo' : v > lim * 0.85 ? 'warn' : 'go';
      if (inWin.has(x.t)) s.append(svg('rect', { x: i * bw + 2, y: padT, width: bw - 4, height: H - padB - padT, rx: 10, class: 'win' }));
      s.append(svg('rect', { x: i * bw + bw * 0.22, y: H - padB - bh, width: bw * 0.56, height: bh, rx: 6, class: `bar ${status} ${inWin.has(x.t) ? 'in' : 'out'}` }));
      const t = svg('text', { x: i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'ax' }); t.textContent = x.hour.slice(0, 2); s.append(t);
    });
    const ly = H - padB - ((H - padB - padT) * lim) / max;
    s.append(svg('line', { x1: 0, x2: W, y1: ly, y2: ly, class: 'limit' }));
    return s;
  }

  function limitBox() {
    const unit = getPrefs().windUnit;
    const step = unit === 'kt' ? 1 : unit === 'km/h' ? 2 : 0.5;
    const set = (d) => { const cur = speedFromMs(me.gustLimitMs); const v = Math.max(step, cur + d); mutate(mission, (m) => { m.mens.meteo.gustLimitMs = speedToMs(v); }); draw(); };
    return h('div', { class: 'limitbox' }, h('span', { class: 'lbl' }, 'Rafales · seuil'),
      h('div', { class: 'stepper' },
        h('button', { class: 'icon-btn tint', 'aria-label': 'Baisser le seuil', onclick: () => set(-step) }, icon('minus')),
        h('span', { class: 'mono big' }, `${fmtSpeed(me.gustLimitMs)} ${unit}`),
        h('button', { class: 'icon-btn tint', 'aria-label': 'Monter le seuil', onclick: () => set(step) }, icon('plus'))));
  }

  function alertsBox() {
    const input = h('input', { placeholder: 'Ex. : Vigilance jaune orages dès 17:00', maxlength: 300, 'aria-label': 'Ajouter une alerte' });
    const add = () => { const v = input.value.trim(); if (!v) return; mutate(mission, (m) => { m.mens.meteo.alerts = [...m.mens.meteo.alerts, v]; }); draw(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    return h('section', { class: 'card-sec' },
      h('span', { class: 'lbl' }, 'Alertes météo (saisies à la main)'),
      h('p', { class: 'note' }, 'Les vigilances Météo-France ne sont pas récupérées par l\'application. Consultez-les et notez-les ici.'),
      ...me.alerts.map((a, i) => h('div', { class: 'banner warn' }, icon('warn'), h('span', {}, a), h('button', { class: 'icon-btn', 'aria-label': 'Retirer l\'alerte', onclick: () => { mutate(mission, (m) => { m.mens.meteo.alerts = m.mens.meteo.alerts.filter((_, j) => j !== i); }); draw(); } }, icon('close', 18)))),
      h('div', { class: 'row' }, input, h('button', { class: 'btn ghost', onclick: add }, 'Ajouter')));
  }

  function manualForm() {
    const unit = getPrefs().windUnit;
    const w = h('input', { inputmode: 'decimal', placeholder: `Vent moyen (${unit})`, 'aria-label': `Vent moyen en ${unit}` });
    const g = h('input', { inputmode: 'decimal', placeholder: `Rafales max (${unit})`, 'aria-label': `Rafales max en ${unit}` });
    const kp = h('input', { inputmode: 'decimal', placeholder: 'Kp (facultatif)', 'aria-label': 'Indice Kp' });
    const save = () => {
      const wv = Number(w.value.replace(',', '.')); const gv = Number(g.value.replace(',', '.'));
      if (!w.value.trim() || !g.value.trim() || !Number.isFinite(wv) || !Number.isFinite(gv) || wv < 0 || gv < wv) { toast('Vent moyen et rafales valides requis (rafales ≥ vent).', 'bad'); return; }
      const kv = kp.value.trim() ? Number(kp.value.replace(',', '.')) : null;
      mutate(mission, (m) => {
        const mm = m.mens.meteo;
        mm.manual = true; mm.source = 'saisie manuelle'; mm.fetchedAt = new Date().toISOString(); mm.hours = []; mm.kpEntries = null;
        mm.slots = [{ t: m.window.start, hour: m.window.start.slice(11, 16), wind: speedToMs(wv), gust: speedToMs(gv), dir: null, wind80: null, temp: null, pop: null, vis: null, cloud: null }];
        mm.kp = Number.isFinite(kv) ? kv : null;
      });
      manualOpen = false; draw();
    };
    return h('section', { class: 'card-sec' },
      h('span', { class: 'lbl' }, 'Saisie manuelle'),
      h('p', { class: 'note' }, 'Utilisez une source officielle (Météo-France, aéroport proche). Le verdict sera calculé sur ces valeurs.'),
      h('div', { class: 'row' }, w, g), kp,
      h('button', { class: 'btn primary block', onclick: save }, 'Calculer le verdict'));
  }

  function draw() {
    const needLoad = hasPoint && windowOk && !me.manual && (!me.hours.length || me.forPlace !== placeKey(p));
    root.replaceChildren(topbar(mission, 'meteo'));
    if (!hasPoint) {
      root.append(h('div', { class: 'empty' }, h('h2', {}, 'Lieu manquant'), h('p', {}, 'Définissez d\'abord le lieu de la mission.'), h('a', { class: 'btn primary', href: missionUrl(mission.id, 'lieu') }, 'Choisir le lieu')));
      return;
    }
    if (!windowOk) {
      root.append(h('div', { class: 'empty' },
        h('h2', {}, 'Créneau de mission manquant'),
        h('p', {}, 'Le début et la fin sont désormais définis une seule fois pour toute la mission.'),
        h('a', { class: 'btn primary', href: missionUrl(mission.id, 'cadre') }, 'Définir le créneau')));
      return;
    }
    root.append(h('div', { class: 'body' },
      h('section', { class: 'card-sec mission-window-summary' },
        h('div', { class: 'window-summary-head' },
          h('div', {}, h('span', { class: 'lbl' }, 'Créneau de mission'), h('strong', {}, formatRange(mission.window.start, mission.window.end))),
          h('a', { class: 'btn ghost small', href: missionUrl(mission.id, 'cadre') }, 'Modifier')),
        h('p', { class: 'note' }, 'Ce créneau est défini dans l’étape Mission et utilisé ici pour sélectionner les prévisions météo.')),
      loading ? h('p', { class: 'note', role: 'status' }, 'Chargement des prévisions…') : null,
      error ? h('div', { class: 'banner bad', role: 'alert' }, icon('warn'), h('span', {}, `Prévisions indisponibles : ${error}`)) : null,
      me.slots.length ? [verdictCard(), stats()] : (!loading && !error ? h('div', { class: 'banner warn' }, icon('warn'), 'Aucune prévision pour ce créneau.') : null),
      me.hours.length && !windowCovered(me.hours, mission.window.start, mission.window.end) ? h('div', { class: 'banner warn' }, icon('warn'), 'Le créneau dépasse les prévisions disponibles (7 jours) : le verdict n\'est pas fiable.') : null,
      me.slots.length ? h('section', { class: 'card-sec' }, limitBox(), chart(), h('p', { class: 'note' }, 'Barres : rafales par heure (heure locale du lieu). Zone colorée : votre créneau.')) : null,
      me.kpError ? h('p', { class: 'note' }, `Kp indisponible : ${me.kpError}`) : null,
      alertsBox(),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', disabled: loading, onclick: load }, me.hours.length ? 'Actualiser' : 'Charger les prévisions'),
        h('button', { class: 'btn ghost', onclick: () => { manualOpen = !manualOpen; draw(); } }, me.manual ? 'Modifier la saisie' : 'Saisie manuelle')),
      manualOpen ? manualForm() : null,
      h('p', { class: 'note' }, `Prévisions en heure locale du lieu${me.tz ? ` (${me.tz})` : ''}.`)));
    root.append(ctaBar(ctaButton('Valider · Espace aérien', () => { location.hash = missionUrl(mission.id, 'espace'); }, { disabled: !me.slots.length })));
    if (needLoad && !loading && !error) queueMicrotask(load);
  }
  draw();
  return { el: root };
}
