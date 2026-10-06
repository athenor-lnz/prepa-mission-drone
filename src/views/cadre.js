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
    title:'Catégorie ouverte',
    mode:'VLOS',
    range:'Selon sous-catégorie',
    description:'Vol en catégorie ouverte. Vérifier la classe du drone et la sous-catégorie applicable.',
    highlights:[
      ['Vue','En vue'],
      ['Période','Jour'],
      ['Hauteur','Selon sous-catégorie']
    ],
    rules:[
      ['Qualification minimale','Niveau 1'],
      ['En / hors vue','En vue'],
      ['Jour / nuit','Uniquement de jour · journée aéronautique'],
      ['Observateur','Selon situation ; maintien du drone en vue requis'],
      ['Drones autorisés','Classes C0, C1, C2 ou drone autorisé'],
      ['ADS-B In','Non obligatoire'],
      ['Transport / largage','Non'],
      ['Hauteur de vol','Selon sous-catégorie et environnement'],
      ['Survol personnes impliquées','À éviter ; respecter les conditions de la sous-catégorie'],
      ['Survol personnes non impliquées','Selon classe/sous-catégorie ; survol accidentel uniquement dans les cas autorisés'],
      ['Attroupements','Interdit / distances à respecter'],
      ['Rassemblements','Interdit / distances à respecter']
    ]
  },
  {
    id:'sts-gn-01-1',
    title:'Scénario 1.1 · En vue',
    mode:'VLOS',
    range:'Vol en vue',
    description:'Scénario GN 01.1 : vol en vue directe avec les équipements et distances prévues par le scénario.',
    highlights:[
      ['Vue','VLOS · en vue'],
      ['Hauteur','120 m max'],
      ['Jour / nuit','Jour et nuit'],
      ['Distances','30 m / 120 m']
    ],
    rules:[
      ['Qualification minimale','Niveau 1'],
      ['En / hors vue','En vue'],
      ['Jour / nuit','Jour et nuit'],
      ['Observateur','Observateur d’aéronef'],
      ['Drones autorisés','Classes autorisées ou DGA selon doctrine'],
      ['ADS-B In','Oui · facultatif pour les drones de MTOM < 250 g'],
      ['Équipements de sécurité','Coupe-circuit + parachute selon appréciation de l’exploitant ; géofencing + détection d’obstacle à 360° + RTH'],
      ['Transport / largage de charge non dangereuse','Oui'],
      ['Hauteur de vol autorisée','120 m maximum'],
      ['Survol de personnes impliquées','Oui'],
      ['Survol de personnes non impliquées','Possible en optimisant les trajectoires'],
      ['Distance de sécurité / attroupement','30 m'],
      ['Distance de sécurité / rassemblement','120 m'],
      ['Réduction possible','Distance réduite à 5 m si mode trépied activé, lorsque applicable']
    ]
  },
  {
    id:'hors-vue-1km',
    title:'Scénario 2.2 · Hors vue · 1 km',
    mode:'BVLOS',
    range:'Élongation max 1 km',
    description:'Scénario GN 02.2 : vol hors vue dans la limite de 1 km avec observateur d’aéronef.',
    highlights:[
      ['Vue','BVLOS · hors vue'],
      ['Élongation','1 km max'],
      ['Hauteur','50 / 80 m'],
      ['Jour / nuit','Jour et nuit']
    ],
    rules:[
      ['Qualification minimale','Niveau 1'],
      ['En / hors vue','Hors vue · 1 km maximum'],
      ['Jour / nuit','Jour et nuit'],
      ['Observateur','Observateur d’aéronef'],
      ['Drone','MTOM < 2 kg selon la fiche'],
      ['Drones autorisés','Classes autorisées ou DGA selon doctrine'],
      ['ADS-B In','Oui · facultatif pour les drones de MTOM < 250 g'],
      ['Équipements de sécurité','Coupe-circuit + parachute selon appréciation de l’exploitant ; géofencing + détection d’obstacle à 360° + RTH'],
      ['Transport / largage de charge non dangereuse','Non'],
      ['Hauteur · zone faiblement peuplée','50 m maximum'],
      ['Hauteur · zone peuplée','80 m maximum'],
      ['Survol de personnes impliquées','Oui'],
      ['Survol de personnes non impliquées','Possible en optimisant les trajectoires'],
      ['Distance de sécurité / attroupement','30 m'],
      ['Distance de sécurité / rassemblement','120 m'],
      ['Réduction possible','Distance réduite à 5 m si mode trépied activé, lorsque applicable']
    ]
  },
  {
    id:'hors-vue-2km',
    title:'Scénario 2.2 · Hors vue · 2 km',
    mode:'BVLOS',
    range:'Élongation max 2 km',
    description:'Variante hors vue enregistrée dans l’application. Vérifier impérativement que le cadre opérationnel applicable autorise cette élongation.',
    highlights:[
      ['Vue','BVLOS'],
      ['Élongation','2 km'],
      ['Attention','Cadre à confirmer']
    ],
    rules:[
      ['Point d’attention','La fiche fournie rappelle le cas 2.2 à 1 km maximum.'],
      ['Avant engagement','Confirmer la doctrine / autorisation spécifique permettant 2 km.'],
      ['Autres règles','Appliquer les contraintes du scénario hors vue retenu après confirmation du cadre applicable.']
    ],
    warning:'Ta fiche de référence indique 1 km maximum pour le cas d’usage 2.2. Le choix 2 km reste affiché dans l’application mais doit être confirmé avant utilisation.'
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
      h('div', { class: 'banner bad' }, icon('warn'), h('span', {}, 'Dès visualisation de la zone concernée : enregistrement systématique.')),
      h('p', {}, 'L’enregistrement doit être réalisé sur un coffre-fort numérique autorisé. VXCORE reste activé pour cette mission dans l’application.'),
      h('button', { class: 'btn primary block', onclick: () => modal.close() }, 'Configurer le cadre judiciaire')), { autofocus:false });
  }

  function selectType(value) {
    mutate(mission, (m) => {
      m.context.missionType = value;
      if (value === 'judiciaire') m.context.vxcore = true;
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

  function openCase(item) {
    let modal;
    const selected = c.useCases.includes(item.id);
    modal = sheet(item.title, h('div', { class: 'stack usecase-sheet usecase-rules-sheet' },
      h('div', { class: 'usecase-sheet-badges' },
        h('span', { class: `usecase-mode ${item.mode === 'BVLOS' ? 'bvlos' : ''}` }, item.mode),
        h('span', { class: 'pill' }, item.range)),
      h('p', { class: 'usecase-sheet-text' }, item.description),
      item.warning ? h('div',{class:'banner warn'},icon('warn'),h('span',{},item.warning)) : null,
      item.highlights?.length ? h('div',{class:'usecase-highlight-grid'},
        ...item.highlights.map(([label,value])=>h('div',{class:'usecase-highlight'},
          h('span',{},label),h('strong',{},value)
        ))) : null,
      h('div',{class:'usecase-rules'},
        h('div',{class:'usecase-rules-head'},h('strong',{},'Règles à retenir'),h('small',{},'Rappel rapide')),
        ...(item.rules||[]).map(([label,value])=>h('div',{class:'usecase-rule-row'},
          h('span',{},label),
          h('strong',{},value)
        ))),
      h('div', { class: 'banner info' }, icon('info'), h('span', {}, 'Mémo opérationnel : la documentation et les consignes en vigueur restent la référence.')),
      h('button', {
        class: `btn block ${selected ? 'ghost' : 'primary'}`,
        onclick: () => { toggleCase(item.id); modal.close(); }
      }, selected ? 'Retirer ce cas d’usage' : 'Sélectionner ce cas d’usage')
    ), { autofocus:false });
  }

  function updateJudicial(patch) {
    mutate(mission, (m) => {
      m.context.judicial = { ...(m.context.judicial || {}), ...patch };
    });
    draw();
  }

  function judicialRule(ju) {
    if (ju.placeType === 'public') {
      if (ju.procedure === 'public-prelim') return {
        authority:'Procureur de la République',
        duration:'1 mois maximum · renouvelable 1 fois',
        title:'Enquête préliminaire / flagrance / procédures 74 à 74-2 CPP'
      };
      if (ju.procedure === 'public-instruction') return {
        authority:'Juge d’instruction',
        duration:'4 mois maximum · renouvelable sans excéder 2 ans',
        title:'Instruction / information'
      };
    }
    if (ju.placeType === 'private') {
      if (ju.procedure === 'private-prelim') return {
        authority:'JLD · ordonnance',
        duration:'1 mois maximum · renouvelable 1 fois',
        title:'Enquête préliminaire / flagrance'
      };
      if (ju.procedure === 'private-instruction') return {
        authority:'Juge d’instruction · ordonnance',
        duration:'4 mois maximum · renouvelable sans excéder 2 ans',
        title:'Instruction'
      };
    }
    return null;
  }

  function judicialComplete(ju) {
    if (!ju?.placeType || !ju?.basis || !ju?.procedure || !ju?.authorizationHeld || !ju?.authorizationPlace || !ju?.authorizationDuration || !ju?.secureVaultReady) return false;
    if (ju.placeType === 'private' && !ju.authorizationOffence) return false;
    return true;
  }

  function checkLine(label, checked, onclick, note='') {
    return h('button', {
      class:`judicial-check ${checked?'on':''}`,
      'aria-pressed':String(checked),
      onclick
    },
      h('span',{class:'check-dot'},checked?icon('check',16):''),
      h('span',{class:'judicial-check-copy'},h('strong',{},label),note?h('small',{},note):null)
    );
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
    const ju = c.judicial || {
      placeType:'', basis:'', procedure:'', authorizationHeld:false,
      authorizationPlace:false, authorizationDuration:false, authorizationOffence:false, secureVaultReady:false
    };
    const jRule = judicialRule(ju);
    const judicialOk = c.missionType !== 'judiciaire' || judicialComplete(ju);
    const nameOk = !!mission.name.trim() && mission.name.trim() !== 'Nouvelle mission';
    const windowOk = isLocalDateTime(mission.window.start) && isLocalDateTime(mission.window.end) && mission.window.end > mission.window.start;
    const adminOk = c.missionType !== 'administratif' || (
      ao.held === true &&
      Number.isInteger(Number(ao.cameraCount)) && Number(ao.cameraCount) > 0 &&
      !!ao.placeNote.trim()
    );
    const vxcoreOk = c.missionType === 'judiciaire' ? c.vxcore === true : typeof c.vxcore === 'boolean';
    const ready = nameOk && windowOk && !!c.missionType && adminOk && judicialOk && vxcoreOk && c.useCases.length > 0;

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
          ? h('section',{class:'card-sec judicial-card'},
              h('div',{class:'judicial-title'},
                h('div',{class:'judicial-title-icon'},'⚖'),
                h('div',{},h('span',{class:'lbl'},'Captation d’image'),h('h2',{},'Police judiciaire'))),
              h('div',{class:'banner bad'},icon('warn'),h('span',{},'Dès visualisation de la zone concernée : enregistrement systématique.')),

              h('div',{class:'judicial-step'},
                h('div',{class:'judicial-step-head'},h('span',{class:'judicial-step-num'},'1'),h('strong',{},'Type de lieu')),
                h('div',{class:'judicial-place-grid'},
                  h('button',{
                    class:`judicial-place ${ju.placeType==='public'?'on':''}`,
                    onclick:()=>updateJudicial({placeType:'public',basis:'',procedure:'',authorizationOffence:false})
                  },h('span',{class:'judicial-place-icon'},'🏢'),h('strong',{},'Lieu public'),h('small',{},'Crime/délit, décès-disparition, personne en fuite')),
                  h('button',{
                    class:`judicial-place ${ju.placeType==='private'?'on':''}`,
                    onclick:()=>updateJudicial({placeType:'private',basis:'private-706',procedure:'',authorizationOffence:false})
                  },h('span',{class:'judicial-place-icon'},'⌂'),h('strong',{},'Lieu privé'),h('small',{},'Cadre plus restrictif · criminalité organisée'))
                )),

              ju.placeType
                ? h('div',{class:'judicial-step'},
                    h('div',{class:'judicial-step-head'},h('span',{class:'judicial-step-num'},'2'),h('strong',{},ju.placeType==='public'?'Dans quel cas ?':'Cadre d’infraction')),
                    ju.placeType==='public'
                      ? h('div',{class:'judicial-options'},
                          h('button',{class:`judicial-option ${ju.basis==='public-3y'?'on':''}`,onclick:()=>updateJudicial({basis:'public-3y'})},
                            h('strong',{},'Crime ou délit ≥ 3 ans'),h('small',{},'Enquête ou instruction portant sur un crime ou délit puni d’au moins 3 ans d’emprisonnement.')),
                          h('button',{class:`judicial-option ${ju.basis==='public-death-disappearance'?'on':''}`,onclick:()=>updateJudicial({basis:'public-death-disappearance'})},
                            h('strong',{},'Mort ou disparition'),h('small',{},'Recherche des causes de la mort ou d’une disparition · art. 74, 74-1 et 80-4 CPP.')),
                          h('button',{class:`judicial-option ${ju.basis==='public-fugitive'?'on':''}`,onclick:()=>updateJudicial({basis:'public-fugitive'})},
                            h('strong',{},'Personne en fuite'),h('small',{},'Procédure de recherche d’une personne en fuite · art. 74-2 CPP.')))
                      : h('div',{class:'banner warn'},icon('warn'),h('span',{},'Lieu privé : uniquement pour une infraction entrant dans le champ des articles 706-73 ou 706-73-1 CPP · criminalité organisée.')))
                : null,

              ju.placeType
                ? h('div',{class:'judicial-step'},
                    h('div',{class:'judicial-step-head'},h('span',{class:'judicial-step-num'},'3'),h('strong',{},'Contexte de la procédure')),
                    h('div',{class:'judicial-options'},
                      ju.placeType==='public'
                        ? [
                            h('button',{class:`judicial-option ${ju.procedure==='public-prelim'?'on':''}`,onclick:()=>updateJudicial({procedure:'public-prelim'})},
                              h('strong',{},'Préliminaire / flagrance / 74 à 74-2'),h('small',{},'Autorisation du procureur de la République.')),
                            h('button',{class:`judicial-option ${ju.procedure==='public-instruction'?'on':''}`,onclick:()=>updateJudicial({procedure:'public-instruction'})},
                              h('strong',{},'Instruction / information'),h('small',{},'Autorisation du juge d’instruction.'))
                          ]
                        : [
                            h('button',{class:`judicial-option ${ju.procedure==='private-prelim'?'on':''}`,onclick:()=>updateJudicial({procedure:'private-prelim'})},
                              h('strong',{},'Préliminaire / flagrance'),h('small',{},'Autorisation par ordonnance du JLD.')),
                            h('button',{class:`judicial-option ${ju.procedure==='private-instruction'?'on':''}`,onclick:()=>updateJudicial({procedure:'private-instruction'})},
                              h('strong',{},'Instruction'),h('small',{},'Autorisation par ordonnance du juge d’instruction.'))
                          ])
                  )
                : null,

              jRule
                ? h('div',{class:'judicial-authority'},
                    h('span',{class:'lbl'},'Autorité compétente'),
                    h('strong',{},jRule.authority),
                    h('span',{},jRule.duration),
                    h('small',{},jRule.title))
                : null,

              ju.placeType
                ? h('div',{class:'judicial-step'},
                    h('div',{class:'judicial-step-head'},h('span',{class:'judicial-step-num'},'4'),h('strong',{},'Autorisation du magistrat')),
                    checkLine('Autorisation obtenue',ju.authorizationHeld,()=>updateJudicial({authorizationHeld:!ju.authorizationHeld}),'Elle doit être versée au dossier de procédure.'),
                    checkLine('Lieu identifié dans l’autorisation',ju.authorizationPlace,()=>updateJudicial({authorizationPlace:!ju.authorizationPlace})),
                    checkLine('Durée précisée',ju.authorizationDuration,()=>updateJudicial({authorizationDuration:!ju.authorizationDuration})),
                    ju.placeType==='private'
                      ? checkLine('Infraction motivant ce mode d’action mentionnée',ju.authorizationOffence,()=>updateJudicial({authorizationOffence:!ju.authorizationOffence}))
                      : null)
                : null,

              ju.placeType
                ? h('div',{class:'judicial-step judicial-recording'},
                    h('div',{class:'judicial-step-head'},h('span',{class:'judicial-step-num'},'5'),h('strong',{},'Enregistrement et après mission')),
                    checkLine('Coffre-fort numérique autorisé disponible',ju.secureVaultReady,()=>updateJudicial({secureVaultReady:!ju.secureVaultReady}),'En l’absence d’un système autorisé, l’enregistrement est interdit.'),
                    h('div',{class:'judicial-reminders'},
                      h('div',{},h('strong',{},'Pendant'),h('span',{},'Activer l’enregistrement dès visualisation de la zone concernée.')),
                      h('div',{},h('strong',{},'Après'),h('span',{},'Transmettre les images via le coffre-fort numérique · communiquer les heures début/fin pour le PV · réaliser le REMA / GENDRONE.')),
                      h('div',{},h('strong',{},'Conservation'),h('span',{},'7 jours maximum avant suppression automatique, sauf placement sous scellé.')),
                      h('div',{},h('strong',{},'Télépilote'),h('span',{},'L’enquêteur ne peut pas être le télépilote dans son propre dossier.')))
                  )
                : null
            )
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
          h('span', { class: 'lbl' }, 'VXCORE'),
          h('p', { class: 'note' }, c.missionType === 'judiciaire'
            ? 'Dans l’application, VXCORE est activé pour le cadre judiciaire. La règle à retenir est l’enregistrement sur un coffre-fort numérique autorisé.'
            : 'VXCORE sera-t-il utilisé pour cette mission ?'),
          c.missionType === 'judiciaire'
            ? h('div', { class: 'banner info' }, icon('info'), h('span', {}, 'VXCORE activé · vérifier que le système de coffre-fort numérique autorisé est disponible.'))
            : segmented([
                { value: 'non', label: 'Non' },
                { value: 'oui', label: 'Oui' }
              ], c.vxcore === true ? 'oui' : c.vxcore === false ? 'non' : '', (v) => {
                mutate(mission, (m) => { m.context.vxcore = v === 'oui'; });
                draw();
              }, 'Utilisation de VXCORE')),

        h('section', { class: 'card-sec usecase-section' },
          h('span', { class: 'lbl' }, 'Cas d’usage / scénario'),
          h('p', { class: 'note' }, 'Coche le ou les scénarios retenus. Appuie sur un scénario pour afficher son explication.'),
          h('div', { class: 'usecase-list' }, CASES.map((item) => {
            const selected=c.useCases.includes(item.id);
            return h('div', {
              class: `usecase-card compact ${selected ? 'on' : ''}`,
              role:'button', tabindex:'0',
              onclick: () => openCase(item),
              onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(item); } }
            },
              h('button', {
                class: `check-dot usecase-check ${selected ? 'on' : ''}`,
                'aria-label': `${selected ? 'Retirer' : 'Sélectionner'} ${item.title}`,
                'aria-pressed': String(selected),
                onclick: (e) => { e.stopPropagation(); toggleCase(item.id); }
              }, selected ? icon('check', 16) : ''),
              h('span', { class:'usecase-copy' },
                h('span', { class:'usecase-title-row' },
                  h('strong', {}, item.title),
                  h('span', { class:`usecase-mode ${item.mode==='BVLOS'?'bvlos':''}` }, item.mode)),
                h('span', { class:'usecase-range' }, item.range)),
              h('span', { class:'usecase-more', 'aria-hidden':'true' }, icon('arrow',18))
            );
          }))),

        !ready
          ? h('div', { class: 'banner warn' }, icon('warn'), h('span', {},
              !nameOk ? 'Donne un nom à la mission.'
              : !windowOk ? 'Renseigne un début et une fin de mission valides.'
              : !c.missionType ? 'Sélectionne le type de mission.'
              : !adminOk ? 'Complète les informations de l’arrêté préfectoral.'
              : !judicialOk ? 'Complète le cadre judiciaire : lieu, procédure, autorisation et coffre-fort numérique.'
              : !vxcoreOk ? 'Indique si VXCORE sera utilisé.'
              : !c.useCases.length ? 'Sélectionne au moins un cas d’usage.'
              : 'Complète le cadre de mission.'))
          : null),
      ctaBar(ctaButton('Valider · Zone de mission', () => { location.hash = missionUrl(mission.id, 'lieu'); }, { disabled: !ready }))
    );
  }

  draw();
  return { el: root };
}
