import { h, icon } from './dom.js';

export const STEPS = [
  { n: 1, key: 'lieu', label: 'Lieu', routes: ['lieu'] },
  { n: 2, key: 'meteo', label: 'Météo', routes: ['meteo'] },
  { n: 3, key: 'espace', label: 'Espace', routes: ['espace', 'notam', 'supaip'] },
  { n: 4, key: 'fiche', label: 'Fiche', routes: ['fiche', 'smepp', 'macloe'] }
];
export const stepOf = (route) => STEPS.find((s) => s.routes.includes(route)) || STEPS[0];
export const missionUrl = (id, route) => `#/mission/${id}/${route}`;

/** Barre du haut : retour + pastilles d'étapes (cliquables). */
export function topbar(mission, route, { onBack } = {}) {
  const cur = stepOf(route);
  return h('header', { class: 'topbar' },
    h('button', { class: 'icon-btn back', 'aria-label': 'Retour', onclick: onBack || (() => { location.hash = '#/'; }) }, icon('back')),
    h('nav', { class: 'steps', 'aria-label': 'Étapes de la mission' },
      STEPS.map((s) => {
        const state = s.n < cur.n ? 'done' : s.n === cur.n ? 'cur' : 'todo';
        return h('a', { class: `step ${state}`, href: missionUrl(mission.id, s.routes[0]), 'aria-current': state === 'cur' ? 'step' : null, 'aria-label': `Étape ${s.n} : ${s.label}` },
          h('span', { class: 'dot' }, state === 'done' ? icon('check', 16) : String(s.n)),
          state === 'cur' ? h('span', { class: 'step-label' }, s.label) : null);
      })));
}

export function ctaBar(...kids) {
  return h('div', { class: 'cta-bar' }, kids);
}

export function ctaButton(label, onclick, { disabled = false, withArrow = true } = {}) {
  return h('button', { class: 'cta primary', disabled, onclick }, h('span', {}, label), withArrow ? icon('arrow') : null);
}

export function segmented(options, value, onChange, label) {
  return h('div', { class: 'seg', role: 'tablist', 'aria-label': label },
    options.map((o) => h('button', { role: 'tab', 'aria-selected': String(o.value === value), class: o.value === value ? 'on' : '', onclick: () => onChange(o.value) }, o.label)));
}

/** Sous-onglets d'une étape (liens). */
export function subtabs(mission, items, current) {
  return h('div', { class: 'seg', role: 'tablist' },
    items.map((i) => h('a', { role: 'tab', 'aria-selected': String(i.route === current), class: i.route === current ? 'on' : '', href: missionUrl(mission.id, i.route) }, i.label, i.badge ? h('span', { class: 'badge-dot', 'aria-label': i.badge }) : null)));
}
