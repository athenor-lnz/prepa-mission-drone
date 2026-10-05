import { h, icon } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, segmented, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';

const TYPES = [
  ['judiciaire', 'Police judiciaire'],
  ['administratif', 'Police administrative'],
  ['sauvegarde', 'Sauvegarde de la vie humaine'],
  ['entrainement', 'Entraînement'],
  ['communication', 'Communication'],
  ['autre', 'Autre']
];
const CASES = [
  ['ouverte', 'Catégorie ouverte AE'],
  ['sts-gn-01-1', 'En vue · STS GN 01.1'],
  ['hors-vue-1km', 'Hors vue · 1 km max'],
  ['hors-vue-2km', 'Hors vue · 2 km max']
];

export function renderCadre({ mission }) {
  const root = h('main', { class: 'screen scroll' });
  const c = mission.context;

  function toggleCase(value) {
    mutate(mission, (m) => {
      const set = new Set(m.context.useCases || []);
      set.has(value) ? set.delete(value) : set.add(value);
      m.context.useCases = [...set];
    });
    draw();
  }

  function draw() {
    const ready = !!c.missionType && !!c.capture && c.useCases.length > 0;
    root.replaceChildren(
      topbar(mission, 'cadre'),
      h('div', { class: 'body' },
        h('div', { class: 'form-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Étape 1'), h('h1', {}, 'Cadre de mission'))),
        h('section', { class: 'card-sec' },
          h('span', { class: 'lbl' }, 'Nature de la mission'),
          h('p', { class: 'note' }, 'Le cadre choisi sert à guider les vérifications suivantes ; il ne remplace pas l’analyse juridique.'),
          h('div', { class: 'choice-grid' }, TYPES.map(([v, label]) =>
            h('button', { class: `choice ${c.missionType === v ? 'on' : ''}`, 'aria-pressed': String(c.missionType === v), onclick: () => { mutate(mission, (m) => { m.context.missionType = v; }); draw(); } }, label)))),
        h('section', { class: 'card-sec' },
          h('span', { class: 'lbl' }, 'Image'),
          h('p', { class: 'note' }, 'Distinguer observation, captation sans conservation et enregistrement pour préparer les obligations applicables.'),
          segmented([
            { value: 'observation', label: 'Observation' },
            { value: 'captation', label: 'Captation' },
            { value: 'enregistrement', label: 'Enregistrement' }
          ], c.capture, (v) => { mutate(mission, (m) => { m.context.capture = v; }); draw(); }, 'Type de captation')),
        h('section', { class: 'card-sec' },
          h('span', { class: 'lbl' }, 'Cas d’usage / scénario'),
          h('p', { class: 'note' }, 'Plusieurs cas peuvent être retenus. Les caractéristiques exactes restent à vérifier dans la documentation opérationnelle en vigueur.'),
          h('div', { class: 'check-list' }, CASES.map(([v, label]) =>
            h('button', { class: `check-choice ${c.useCases.includes(v) ? 'on' : ''}`, 'aria-pressed': String(c.useCases.includes(v)), onclick: () => toggleCase(v) },
              h('span', { class: 'check-dot' }, c.useCases.includes(v) ? icon('check', 16) : ''), h('span', {}, label))))),
        !ready ? h('div', { class: 'banner warn' }, icon('warn'), h('span', {}, 'Renseigne la nature de mission, l’image et au moins un cas d’usage pour poursuivre.')) : null),
      ctaBar(ctaButton('Valider · Zone de mission', () => { location.hash = missionUrl(mission.id, 'lieu'); }, { disabled: !ready }))
    );
  }
  draw();
  return { el: root };
}
