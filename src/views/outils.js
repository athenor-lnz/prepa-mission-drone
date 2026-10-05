import { h, sheet, copyText } from '../ui/dom.js';
import { parseLatLon, formatAll } from '../lib/geo.js';
import { CATEGORIES, convertAll, formatNumber } from '../lib/units.js';
import { segmented } from '../ui/layout.js';

export function openTools({ lat = null, lon = null } = {}) {
  let tab = 'coord';
  const body = h('div', { class: 'stack' });
  const sh = sheet('Outils', body);
  const state = { coord: lat !== null ? formatAll(lat, lon).dd : '', cat: 'speed', value: '', from: 'kt' };

  const draw = () => body.replaceChildren(
    segmented([{ value: 'coord', label: 'Coordonnées' }, { value: 'unit', label: 'Unités' }], tab, (v) => { tab = v; draw(); }, 'Outil'),
    tab === 'coord' ? coordPane() : unitPane());

  function row(label, value) {
    return h('div', { class: 'res-row' },
      h('div', {}, h('span', { class: 'lbl' }, label), h('div', { class: 'mono big' }, value)),
      h('button', { class: 'btn ghost small', onclick: () => copyText(value) }, 'Copier'));
  }

  function coordPane() {
    const out = h('div', { class: 'stack' });
    const input = h('input', { value: state.coord, inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', placeholder: '43.6045, 1.4442 · N 43° 36′ 16″ E 1° 26′ 39″ · 31T 374439 4829123', 'aria-label': 'Coordonnées à convertir' });
    const upd = () => {
      state.coord = input.value;
      const c = parseLatLon(input.value);
      if (!input.value.trim()) return out.replaceChildren(h('p', { class: 'note' }, 'Saisissez des coordonnées dans n\'importe quel format : DD, DDM, DMS ou UTM.'));
      if (!c) return out.replaceChildren(h('p', { class: 'err' }, 'Format non reconnu.'));
      const f = formatAll(c.lat, c.lon);
      out.replaceChildren(row('DD', f.dd), row('DDM', f.ddm), row('DMS', f.dms), row('UTM', f.utm));
    };
    input.addEventListener('input', upd);
    upd();
    return h('div', { class: 'stack' }, input, out);
  }

  function unitPane() {
    const cat = CATEGORIES[state.cat];
    const out = h('div', { class: 'stack' });
    const input = h('input', { value: state.value, inputmode: 'decimal', placeholder: 'Valeur', 'aria-label': 'Valeur à convertir' });
    const from = h('select', { 'aria-label': 'Unité de départ', onchange: () => { state.from = from.value; upd(); } }, Object.keys(cat.units).map((u) => h('option', { value: u, selected: u === state.from }, u)));
    const upd = () => {
      state.value = input.value;
      const v = Number(input.value.replace(',', '.'));
      if (!input.value.trim() || !Number.isFinite(v)) return out.replaceChildren(h('p', { class: 'note' }, 'Saisissez une valeur.'));
      const all = convertAll(state.cat, v, state.from);
      out.replaceChildren(...Object.entries(all).map(([u, x]) => row(u, formatNumber(x))));
    };
    input.addEventListener('input', upd);
    upd();
    return h('div', { class: 'stack' },
      segmented(Object.entries(CATEGORIES).map(([k, c]) => ({ value: k, label: c.label.split(' ')[0] })), state.cat, (k) => { state.cat = k; state.from = Object.keys(CATEGORIES[k].units)[0]; draw(); }, 'Grandeur'),
      h('div', { class: 'row' }, input, from), out);
  }
  draw();
  return sh;
}
