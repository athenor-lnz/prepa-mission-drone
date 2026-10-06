import { h, icon, sheet, toast } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, segmented, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { isLocalDateTime, formatRange } from '../lib/time.js';

const TYPES = [
  ['judiciaire', 'Police judiciaire'],
  ['administratif', 'Police administrative'],
  ['sauvegarde', 'Sauvegarde de la vie humaine'],
  ['entrainement', 'Entraînement'],
  ['communication', 'Communication'],
  ['autre', 'Autre']
];
const CASES = [
  {
    id:'ouverte',
    title:'Catégorie ouverte AE',
    mode:'VLOS',
    range:'Selon sous-catégorie',
    description:'Régime catégorie ouverte. Vérifier la classe du drone, les personnes présentes, la hauteur et les distances applicables à la situation.'
  },
  {
    id:'sts-gn-01-1',
    title:'STS GN 01.1',
    mode:'VLOS',
    range:'Vol en vue',
    description:'Le télépilote conserve l’APAD en vue directe pendant le vol. Vérifier les conditions prévues par le scénario et le matériel engagé.'
  },
  {
    id:'hors-vue-1km',
    title:'Hors vue · 1 km max',
    mode:'BVLOS',
    range:'Élongation max 1 km',
    description:'Cas d’usage hors vue limité à 1 km. Vérifier avant mission les conditions, moyens et contraintes prévus par le scénario applicable.'
  },
  {
    id:'hors-vue-2km',
    title:'Hors vue · 2 km max',
    mode:'BVLOS',
    range:'Élongation max 2 km',
    description:'Cas d’usage hors vue limité à 2 km. Vérifier avant mission les conditions, moyens et contraintes prévus par le scénario applicable.'
  }
];

export function renderCadre({ mission }) {
  const root = h('main', { class: 'screen scroll' });
  const c = mission.context;

  function invalidateWeather() {
    mission.mens.meteo = {
      ...mission.mens.meteo,
      hours: [], slots: [], fetchedAt: null, source: null, manual: false,
      kp: null, kpEntries: null, forPlace: null
    };
  }

  function judicialAlert() {
    let modal;
    modal = sheet('Police judiciaire', h('div', { class: 'stack' },
      h('div', { class: 'banner bad' }, icon('warn'), h('span', {}, 'Enregistrement obligatoire via VXCORE.')),
      h('p', {}, 'Le mode « Enregistrement » est sélectionné automatiquement pour cette mission.'),
      h('button', { class: 'btn primary block', onclick: () => modal.close() }, 'Compris')));
  }

  function selectType(value) {
    mutate(mission, (m) => {
      m.context.missionType = value;
      if (value === 'judiciaire') m.context.capture = 'enregistrement';
    });
    draw();
    if (value === 'judiciaire') judicialAlert();
  }

  function toggleCase(value) {
    mutate(mission, (m) => {
      const set = new Set(m.context.useCases || []);
      set.has(value) ? set.delete(value) : set.add(value);
      m.context.useCases = [...set];
    });
    draw();
  }

  function setWindow(which, value) {
    if (!isLocalDateTime(value)) return;
    mutate(mission, (m) => {
      m.window[which] = value;
      if (which === 'start' && isLocalDateTime(m.window.end) && m.window.end <= value) {
        m.window.end = '';
      }
      if (which === 'end' && isLocalDateTime(m.window.start) && m.window.end <= m.window.start) {
        toast('La fin de mission doit être postérieure au début.', 'bad');
        m.window.end = '';
      }
      invalidateWeather();
    });
    draw();
  }

  function toggleAdministrativeOrder() {
    mutate(mission, (m) => {
      m.context.administrativeOrder.held = !m.context.administrativeOrder.held;
    });
    draw();
  }

  function draw() {
    const ao = c.administrativeOrder || { held: false, cameraCount: null, placeNote: '' };
    const nameOk = !!mission.name.trim() && mission.name.trim() !== 'Nouvelle mission';
    const windowOk = isLocalDateTime(mission.window.start) && isLocalDateTime(mission.window.end) && mission.window.end > mission.window.start;
    const adminOk = c.missionType !== 'administratif' || (
      ao.held === true &&
      Number.isInteger(Number(ao.cameraCount)) && Number(ao.cameraCount) > 0 &&
      !!ao.placeNote.trim()
    );
    const ready = nameOk && windowOk && !!c.missionType && adminOk && !!c.capture && c.useCases.length > 0;

    const missionName = h('input', {
      value: mission.name === 'Nouvelle mission' ? '' : mission.name,
      placeholder: 'Ex. Incendie La Saulce — thermie',
      maxlength: 200,
      autocomplete: 'off',
      'aria-label': 'Nom de la mission',
      oninput: (e) => {
        mutate(mission, (m) => { m.name = e.target.value; }, { debounce: 350 });
      },
      onchange: () => draw()
    });

    const start = h('input', {
      type: 'datetime-local', class: 'mono', value: mission.window.start,
      'aria-label': 'Date et heure de début de mission',
      onchange: (e) => setWindow('start', e.target.value)
    });
    const end = h('input', {
      type: 'datetime-local', class: 'mono', value: mission.window.end,
      'aria-label': 'Date et heure de fin de mission',
      onchange: (e) => setWindow('end', e.target.value)
    });

    root.replaceChildren(
      topbar(mission, 'cadre'),
      h('div', { class: 'body' },
        h('div', { class: 'form-head' },
          h('div', {}, h('span', { class: 'eyebrow' }, 'Étape 1'), h('h1', {}, 'Mission'))),

        h('section', { class: 'card-sec mission-core' },
          h('span', { class: 'lbl' }, 'Identification'),
          h('label', { class: 'field-label' }, 'Nom de la mission', missionName),
          h('div', { class: 'mission-datetime-grid' },
            h('label', { class: 'field-label' }, 'Début de mission', start),
            h('label', { class: 'field-label' }, 'Fin de mission', end)),
          h('p', { class: 'note' }, `Créneau global de la mission : ${formatRange(mission.window.start, mission.window.end)}. Il sera réutilisé pour la météo et la synthèse.`)),

        h('section', { class: 'card-sec' },
          h('span', { class: 'lbl' }, 'Type de mission'),
          h('p', { class: 'note' }, 'Le type choisi conditionne les rappels réglementaires affichés ensuite.'),
          h('div', { class: 'choice-grid' }, TYPES.map(([v, label]) =>
            h('button', {
              class: `choice ${c.missionType === v ? 'on' : ''}`,
              'aria-pressed': String(c.missionType === v),
              onclick: () => selectType(v)
            }, label)))),

        c.missionType === 'judiciaire'
          ? h('div', { class: 'banner bad', role: 'alert' }, icon('warn'), h('span', {}, 'Police judiciaire : enregistrement obligatoire via VXCORE.'))
          : null,

        c.missionType === 'administratif'
          ? h('section', { class: 'card-sec legal-card' },
              h('span', { class: 'lbl' }, 'Arrêté préfectoral'),
              h('button', {
                class: `check-choice ${ao.held ? 'on' : ''}`,
                'aria-pressed': String(ao.held),
                onclick: toggleAdministrativeOrder
              },
                h('span', { class: 'check-dot' }, ao.held ? icon('check', 16) : ''),
                h('span', {}, 'Je suis en possession de l’arrêté préfectoral')),
              ao.held
                ? [
                    h('div', { class: 'banner info' }, icon('check'), h('span', {}, `Créneau de mission retenu : ${formatRange(mission.window.start, mission.window.end)}`)),
                    h('label', { class: 'field-label' }, 'Nombre de caméras autorisé',
                      h('input', {
                        type: 'number', min: 1, max: 99, inputmode: 'numeric',
                        value: ao.cameraCount ?? '',
                        placeholder: 'Ex. 2',
                        onchange: (e) => {
                          const n = Number(e.target.value);
                          mutate(mission, (m) => { m.context.administrativeOrder.cameraCount = Number.isInteger(n) && n > 0 ? Math.min(99, n) : null; });
                          draw();
                        }
                      })),
                    h('label', { class: 'field-label' }, 'Lieu / périmètre mentionné dans l’arrêté',
                      h('textarea', {
                        rows: 3, maxlength: 1000,
                        value: ao.placeNote || '',
                        placeholder: 'Ex. commune, quartier, axe, emprise ou périmètre autorisé…',
                        oninput: (e) => {
                          mutate(mission, (m) => { m.context.administrativeOrder.placeNote = e.target.value; }, { debounce: 350 });
                        },
                        onchange: () => draw()
                      }))
                  ]
                : h('div', { class: 'banner warn' }, icon('warn'), h('span', {}, 'La possession de l’arrêté préfectoral doit être confirmée avant de poursuivre.')))
          : null,

        h('section', { class: 'card-sec' },
          h('span', { class: 'lbl' }, 'Image'),
          h('p', { class: 'note' }, c.missionType === 'judiciaire'
            ? 'Le mode Enregistrement est imposé pour cette mission.'
            : 'Distinguer observation, captation sans conservation et enregistrement pour préparer les obligations applicables.'),
          segmented([
            { value: 'observation', label: 'Observation' },
            { value: 'captation', label: 'Captation' },
            { value: 'enregistrement', label: 'Enregistrement' }
          ], c.capture, (v) => {
            if (c.missionType === 'judiciaire' && v !== 'enregistrement') {
              judicialAlert();
              return;
            }
            mutate(mission, (m) => { m.context.capture = v; });
            draw();
          }, 'Type de captation')),

        h('section', { class: 'card-sec usecase-section' },
          h('span', { class: 'lbl' }, 'Cas d’usage / scénario'),
          h('p', { class: 'note' }, 'Sélectionne le ou les cas prévus pour la mission. Les repères essentiels sont affichés ici ; la documentation opérationnelle en vigueur reste la référence.'),
          h('div', { class: 'usecase-list' }, CASES.map((item) => {
            const selected=c.useCases.includes(item.id);
            return h('button', {
              class: `usecase-card ${selected ? 'on' : ''}`,
              'aria-pressed': String(selected),
              onclick: () => toggleCase(item.id)
            },
              h('span', { class: 'check-dot usecase-check' }, selected ? icon('check', 16) : ''),
              h('span', { class:'usecase-copy' },
                h('span', { class:'usecase-title-row' },
                  h('strong', {}, item.title),
                  h('span', { class:`usecase-mode ${item.mode==='BVLOS'?'bvlos':''}` }, item.mode)),
                h('span', { class:'usecase-range' }, item.range),
                h('small', {}, item.description))
            );
          }))),

        !ready
          ? h('div', { class: 'banner warn' }, icon('warn'), h('span', {},
              !nameOk ? 'Donne un nom à la mission.'
              : !windowOk ? 'Renseigne un début et une fin de mission valides.'
              : !c.missionType ? 'Sélectionne le type de mission.'
              : !adminOk ? 'Complète les informations de l’arrêté préfectoral.'
              : !c.useCases.length ? 'Sélectionne au moins un cas d’usage.'
              : 'Complète le cadre de mission.'))
          : null),
      ctaBar(ctaButton('Valider · Zone de mission', () => { location.hash = missionUrl(mission.id, 'lieu'); }, { disabled: !ready }))
    );
  }

  draw();
  return { el: root };
}
