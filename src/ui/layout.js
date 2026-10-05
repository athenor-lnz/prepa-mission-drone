import { h, icon } from './dom.js';
import { FORMS, formValidated } from '../lib/forms.js';

export const STEPS = [
  { n: 1, key: 'cadre', label: 'Cadre', routes: ['cadre'] },
  { n: 2, key: 'lieu', label: 'Zone', routes: ['lieu'] },
  { n: 3, key: 'mens', label: 'MENS', routes: ['meteo', 'espace', 'notam', 'supaip'] },
  { n: 4, key: 'macloe', label: 'MACLOE', routes: ['macloe'] },
  { n: 5, key: 'smepp', label: 'SMEPP', routes: ['smepp'] },
  { n: 6, key: 'fiche', label: 'Synthèse', routes: ['fiche'] }
];
export const stepOf = (route) => STEPS.find((s) => s.routes.includes(route)) || STEPS[0];
export const missionUrl = (id, route) => `#/mission/${id}/${route}`;

export function isStepDone(mission, step) {
  if (!mission) return false;
  if (step.key === 'cadre') return !!mission.context?.missionType && !!mission.context?.capture && (mission.context?.useCases?.length || 0) > 0;
  if (step.key === 'lieu') return Number.isFinite(mission.place?.lat) && Number.isFinite(mission.place?.lon);
  if (step.key === 'mens') {
    const m = mission.mens || {};
    const meteo = !!(m.meteo?.slots?.length || m.meteo?.manual);
    const espace = !!(m.espace?.fetchedAt || m.espace?.localAnalysisAt);
    const notam = !!m.notam?.fetchedAt;
    const sup = !!m.supaip?.fetchedAt;
    return meteo && espace && notam && sup;
  }
  if (step.key === 'macloe') return formValidated(FORMS.macloe, mission.validation?.macloe);
  if (step.key === 'smepp') return formValidated(FORMS.smepp, mission.validation?.smepp);
  if (step.key === 'fiche') return false;
  return false;
}

export function topbar(mission, route, { onBack } = {}) {
  const cur = stepOf(route);
  return h('header', { class: 'topbar' },
    h('button', { class: 'icon-btn back', 'aria-label': 'Retour', onclick: onBack || (() => { location.hash = '#/'; }) }, icon('back')),
    h('nav', { class: 'steps', 'aria-label': 'Étapes de la mission' },
      STEPS.map((s) => {
        const state = s.n === cur.n ? 'cur' : (isStepDone(mission, s) ? 'done' : 'todo');
        return h('a', { class: `step ${state}`, href: missionUrl(mission.id, s.routes[0]), 'aria-current': state === 'cur' ? 'step' : null, 'aria-label': `Étape ${s.n} : ${s.label}${state === 'done' ? ', validée' : ''}` },
          h('span', { class: 'dot' }, state === 'done' ? icon('check', 16) : String(s.n)),
          state === 'cur' ? h('span', { class: 'step-label' }, s.label) : null);
      })));
}
export function ctaBar(...kids) { return h('div', { class: 'cta-bar' }, kids); }
export function ctaButton(label, onclick, { disabled = false, withArrow = true } = {}) {
  return h('button', { class: 'cta primary', disabled, onclick }, h('span', {}, label), withArrow ? icon('arrow') : null);
}
export function segmented(options, value, onChange, label) {
  return h('div', { class: 'seg', role: 'tablist', 'aria-label': label },
    options.map((o) => h('button', { role: 'tab', 'aria-selected': String(o.value === value), class: o.value === value ? 'on' : '', onclick: () => onChange(o.value) }, o.label)));
}
export function subtabs(mission, items, current) {
  return h('div', { class: 'seg', role: 'tablist' },
    items.map((i) => h('a', { role: 'tab', 'aria-selected': String(i.route === current), class: i.route === current ? 'on' : '', href: missionUrl(mission.id, i.route) }, i.label, i.badge ? h('span', { class: 'badge-dot', 'aria-label': i.badge }) : null)));
}
