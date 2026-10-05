import { h, icon, copyText } from '../ui/dom.js';
import { topbar, ctaBar, segmented, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { buildRecap, GENDRONE, VISUALDRONE, GENDRONE_ORDER, VISUALDRONE_ORDER, meteoVerdict, espaceLine } from '../lib/recap.js';
import { FORMS, progress, sectionProgress, toText, appendDictation } from '../lib/forms.js';
import { LABELS } from '../lib/verdict.js';
import { formatRange } from '../lib/time.js';
import { micButton } from '../ui/dictate.js';

export function renderFiche({ mission }) {
  const root = h('main', { class: 'screen scroll' });
  function draw() {
    const v = meteoVerdict(mission);
    const st = v && v.status !== 'unknown' ? v.status : null;
    const s = progress(FORMS.smepp, mission.smepp); const mc = progress(FORMS.macloe, mission.macloe);
    const row = (label, value, cls = '', href = null) => h(href ? 'a' : 'div', { class: `srow ${cls}`, href }, h('span', { class: 'lbl' }, label), h('span', { class: 'sval' }, value), href ? icon('arrow', 18) : null);
    const nt = mission.mens.notam; const sp = mission.mens.supaip;
    const name = h('input', { class: 'title-input', value: mission.name, maxlength: 200, 'aria-label': 'Nom de la mission', oninput: (e) => mutate(mission, (m) => { m.name = e.target.value.trim() || 'Nouvelle mission'; }, { debounce: 400 }) });
    root.replaceChildren(topbar(mission, 'fiche'), h('div', { class: 'body' },
      name,
      h('section', { class: 'card-sec summary' },
        row('Lieu', mission.place.label || (Number.isFinite(mission.place.lat) ? 'Point sur la carte' : 'Non défini'), '', missionUrl(mission.id, 'lieu')),
        row('Créneau', formatRange(mission.window.start, mission.window.end), '', missionUrl(mission.id, 'meteo')),
        row('Météo', st ? LABELS[st] : 'Non évaluée', st || 'unknown', missionUrl(mission.id, 'meteo')),
        row('Espace aérien', espaceLine(mission), '', missionUrl(mission.id, 'espace')),
        row('NOTAM', nt.items.length ? `${nt.items.length} noté(s)` : nt.fetchedAt ? 'Consultés, rien noté' : 'Non vérifiés', nt.items.length || nt.fetchedAt ? '' : 'unknown', missionUrl(mission.id, 'notam')),
        row('SUP AIP', sp.items.length ? `${sp.items.length} noté(s)` : sp.fetchedAt ? 'Consultés, rien noté' : 'Non vérifiés', sp.items.length || sp.fetchedAt ? '' : 'unknown', missionUrl(mission.id, 'supaip'))),
      h('section', { class: 'forms' },
        h('a', { class: 'formcard', href: missionUrl(mission.id, 'smepp') }, h('strong', {}, 'SMEPP'), h('span', { class: 'mono' }, `${s.done} / ${s.total}`), h('span', { class: 'bar' }, h('i', { style: `width:${(s.done / s.total) * 100}%` }))),
        h('a', { class: 'formcard', href: missionUrl(mission.id, 'macloe') }, h('strong', {}, 'MACLOE'), h('span', { class: 'mono' }, `${mc.done} / ${mc.total}`), h('span', { class: 'bar' }, h('i', { style: `width:${(mc.done / mc.total) * 100}%` })))),
      h('section', { class: 'card-sec' }, h('span', { class: 'lbl' }, 'GENDRONE'),
        segmented(GENDRONE_ORDER.map((k) => ({ value: k, label: GENDRONE[k] })), mission.admin.gendrone, (k) => { mutate(mission, (m) => { m.admin.gendrone = k; }); draw(); }, 'Statut GENDRONE'),
        h('span', { class: 'lbl' }, 'Visu@ldrone'),
        segmented(VISUALDRONE_ORDER.map((k) => ({ value: k, label: VISUALDRONE[k] })), mission.admin.visualdrone, (k) => { mutate(mission, (m) => { m.admin.visualdrone = k; }); draw(); }, 'Statut Visu@ldrone'),
        h('p', { class: 'note' }, 'Suivi purement déclaratif : l\'application ne communique pas avec ces systèmes.'))),
      ctaBar(h('button', { class: 'cta primary', onclick: () => copyText(buildRecap(mission), 'Récapitulatif copié') }, icon('copy'), h('span', {}, 'Copier le récapitulatif'))));
  }
  draw();
  return { el: root };
}

export function renderForm({ mission, route }) {
  const form = FORMS[route];
  const key = route;
  const root = h('main', { class: 'screen scroll' });
  const bar = h('span', { class: 'mono' });
  const updateBar = () => { const p = progress(form, mission[key]); bar.textContent = `${p.done} / ${p.total} champs`; };
  const sections = form.sections.map((sec) => {
    const sp = h('span', { class: 'mono small' });
    const upd = () => { const q = sectionProgress(sec, mission[key]); sp.textContent = `${q.done} / ${q.total}`; };
    upd();
    return { sec, upd, el: h('section', { class: 'card-sec fsec' },
      h('div', { class: 'fsec-head' }, h('span', { class: 'letter' }, sec.letter), h('h2', {}, sec.title), sp),
      sec.fields.map((f) => {
        const ta = h('textarea', { rows: 4, maxlength: 20000, value: mission[key][f.key] || '', id: `f-${f.key}`, 'aria-describedby': `h-${f.key}`, oninput: () => { mutate(mission, (m) => { m[key][f.key] = ta.value; }, { debounce: 400 }); upd(); updateBar(); } });
        const interim = h('div', { class: 'interim', 'aria-live': 'polite' });
        const mic = micButton({ label: `Dicter : ${f.label}`, onText: (t) => { ta.value = appendDictation(ta.value, t); ta.dispatchEvent(new Event('input')); }, onInterim: (t) => { interim.textContent = t; } });
        return h('div', { class: 'field' },
          h('div', { class: 'field-head' }, h('label', { for: `f-${f.key}` }, f.label), mic),
          h('p', { class: 'note', id: `h-${f.key}` }, f.hint), ta, interim);
      })) };
  });
  updateBar();
  root.append(topbar(mission, route, { onBack: () => { location.hash = missionUrl(mission.id, 'fiche'); } }),
    h('div', { class: 'body' },
      h('div', { class: 'form-head' }, h('h1', {}, form.title), bar),
      h('div', { class: 'seg' }, ...['smepp', 'macloe'].map((r) => h('a', { class: r === route ? 'on' : '', href: missionUrl(mission.id, r), role: 'tab', 'aria-selected': String(r === route) }, FORMS[r].title))),
      sections.map((s) => s.el)),
    ctaBar(h('button', { class: 'cta primary', onclick: () => copyText(toText(form, mission[key]), `${form.title} copié`) }, icon('copy'), h('span', {}, `Copier ${form.title}`))));
  return { el: root };
}
