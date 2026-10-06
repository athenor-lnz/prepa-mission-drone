import { h, icon, copyText, toast } from '../ui/dom.js';
import { topbar, ctaBar, segmented, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { buildRecap, GENDRONE, VISUALDRONE, GENDRONE_ORDER, VISUALDRONE_ORDER, meteoVerdict, espaceLine } from '../lib/recap.js';
import { FORMS, validatedProgress, sectionProgress, sectionComplete, toText, appendDictation } from '../lib/forms.js';
import { LABELS } from '../lib/verdict.js';
import { formatRange } from '../lib/time.js';
import { micButton } from '../ui/dictate.js';
import { store } from '../state.js';

export function renderFiche({ mission }) {
  const root = h('main', { class: 'screen scroll' });

  function exportCurrent() {
    const safe=(mission.name||'mission-drone').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'mission-drone';
    const blob = new Blob([store.exportMission(mission.id)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${safe}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Mission exportée');
  }
  async function shareCurrent() {
    const safe=(mission.name||'mission-drone').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase();
    const file=new File([store.exportMission(mission.id)],`${safe||'mission-drone'}.json`,{type:'application/json'});
    try {
      if (navigator.canShare?.({files:[file]})) await navigator.share({title:mission.name,text:'Préparation de mission drone',files:[file]});
      else { exportCurrent(); toast('Partage natif indisponible : fichier exporté'); }
    } catch(e){ if(e?.name!=='AbortError') toast('Partage impossible','bad'); }
  }

  function draw() {
    const v = meteoVerdict(mission);
    const st = v && v.status !== 'unknown' ? v.status : null;
    const s = validatedProgress(FORMS.smepp, mission.validation?.smepp);
    const mc = validatedProgress(FORMS.macloe, mission.validation?.macloe);
    const row = (label, value, cls = '', href = null) => h(href ? 'a' : 'div', { class: `srow ${cls}`, href }, h('span', { class: 'lbl' }, label), h('span', { class: 'sval' }, value), href ? icon('arrow', 18) : null);
    const nt = mission.mens.notam; const sp = mission.mens.supaip;
    const name = h('input', { class: 'title-input', value: mission.name, maxlength: 200, 'aria-label': 'Nom de la mission', oninput: (e) => mutate(mission, (m) => { m.name = e.target.value.trim() || 'Nouvelle mission'; }, { debounce: 400 }) });

    root.replaceChildren(topbar(mission, 'fiche', { onBack: () => { location.hash = missionUrl(mission.id, 'etapes'); } }), h('div', { class: 'body' },
      h('div', { class: 'form-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Étape 6'), h('h1', {}, 'Synthèse')), h('span', { class: 'pill go' }, 'MISSION')),
      name,
      h('section', { class: 'card-sec summary' },
        row('Cadre', [mission.context.missionType, mission.context.vxcore === true ? 'VXCORE oui' : mission.context.vxcore === false ? 'VXCORE non' : 'VXCORE —'].filter(Boolean).join(' · ') || 'Non défini', '', missionUrl(mission.id, 'cadre')),
        row('Zone', mission.place.label || (Number.isFinite(mission.place.lat) ? 'Point sur la carte' : 'Non définie'), '', missionUrl(mission.id, 'lieu')),
        row('Créneau', formatRange(mission.window.start, mission.window.end), '', missionUrl(mission.id, 'meteo')),
        row('Météo', st ? LABELS[st] : 'Non évaluée', st || 'unknown', missionUrl(mission.id, 'meteo')),
        row('Espace', espaceLine(mission), '', missionUrl(mission.id, 'espace')),
        row('NOTAM', nt.items.length ? `${nt.items.length} noté(s)` : nt.fetchedAt ? 'Consultés' : 'Non vérifiés', nt.fetchedAt ? '' : 'unknown', missionUrl(mission.id, 'notam')),
        row('SUP AIP', sp.items.length ? `${sp.items.length} noté(s)` : sp.fetchedAt ? 'Consultés' : 'Non vérifiés', sp.fetchedAt ? '' : 'unknown', missionUrl(mission.id, 'supaip'))),
      h('section', { class: 'forms' },
        h('a', { class: 'formcard', href: missionUrl(mission.id, 'macloe') }, h('strong', {}, 'MACLOE'), h('span', { class: 'mono' }, `${mc.done} / ${mc.total}`), h('span', { class: 'bar' }, h('i', { style: `width:${(mc.done / mc.total) * 100}%` }))),
        h('a', { class: 'formcard', href: missionUrl(mission.id, 'smepp') }, h('strong', {}, 'SMEPP'), h('span', { class: 'mono' }, `${s.done} / ${s.total}`), h('span', { class: 'bar' }, h('i', { style: `width:${(s.done / s.total) * 100}%` })))),
      h('section', { class: 'card-sec' }, h('span', { class: 'lbl' }, 'GENDRONE'),
        segmented(GENDRONE_ORDER.map((k) => ({ value: k, label: GENDRONE[k] })), mission.admin.gendrone, (k) => { mutate(mission, (m) => { m.admin.gendrone = k; }); draw(); }, 'Statut GENDRONE'),
        h('span', { class: 'lbl' }, 'Visu@ldrone'),
        segmented(VISUALDRONE_ORDER.map((k) => ({ value: k, label: VISUALDRONE[k] })), mission.admin.visualdrone, (k) => { mutate(mission, (m) => { m.admin.visualdrone = k; }); draw(); }, 'Statut Visu@ldrone'),
        h('p', { class: 'note' }, 'Suivi déclaratif : l’application ne communique pas avec ces systèmes.')),
      h('section', { class: 'card-sec transfer-card' },
        h('span', { class: 'lbl' }, 'Transfert de mission'),
        h('div', { class: 'transfer-actions' },
          h('button', { class: 'btn ghost', onclick: exportCurrent }, 'Exporter JSON'),
          h('button', { class: 'btn ghost', onclick: shareCurrent }, 'Partager')),
        h('button', { class: 'btn ghost block', onclick: () => copyText(buildRecap(mission), 'Récapitulatif copié') }, icon('copy'), 'Copier le récapitulatif'))),
      ctaBar(h('button', { class: 'cta primary', onclick: () => copyText(buildRecap(mission), 'Récapitulatif copié') }, icon('copy'), h('span', {}, 'Copier la synthèse'))));
  }
  draw();
  return { el: root };
}

export function renderForm({ mission, route }) {
  const form = FORMS[route];
  const key = route;
  const validationKey = route;
  const root = h('main', { class: 'screen scroll' });
  let active = form.sections.find((s) => !(mission.validation?.[validationKey] || []).includes(s.id))?.id || form.sections[0].id;

  const isValidated = (id) => (mission.validation?.[validationKey] || []).includes(id);
  const sectionById = (id) => form.sections.find((s) => s.id === id);
  const hasCheminementMap = () => {
    const d=mission.macloeMap||{};
    return (Array.isArray(d.route)&&d.route.length>=2)||(Array.isArray(d.polygon)&&d.polygon.length>=3)||(d.start&&d.end);
  };

  function setValidated(id, on) {
    mutate(mission, (m) => {
      const set = new Set(m.validation[validationKey] || []);
      on ? set.add(id) : set.delete(id);
      m.validation[validationKey] = [...set];
    });
  }

  function nextAfter(id) {
    const i=form.sections.findIndex((s)=>s.id===id);
    return form.sections.slice(i+1).find((s)=>!isValidated(s.id)) || form.sections[i+1] || null;
  }

  function draw() {
    const validated = mission.validation?.[validationKey] || [];
    const vp = validatedProgress(form, validated);
    const sec = sectionById(active) || form.sections[0];
    const sp = sectionProgress(sec, mission[key]);
    const mapComplete = route==='macloe' && sec.id==='C' && hasCheminementMap();
    const complete = sectionComplete(sec, mission[key]) || mapComplete;
    const done = isValidated(sec.id);

    const rail = h('div', { class: 'form-rail', role: 'tablist', 'aria-label': `Sections ${form.title}` },
      form.sections.map((s) => h('button', {
        class: `rail-btn ${s.id===active?'active':''} ${isValidated(s.id)?'validated':''}`,
        role:'tab','aria-selected':String(s.id===active),
        'aria-label':`${s.letter} — ${s.title}${isValidated(s.id)?', validé':''}`,
        onclick:()=>{active=s.id;draw();}
      }, isValidated(s.id)?icon('check',18):s.letter)));

    let validate;
    const fieldNodes = new Map();
    const liveSectionComplete = () => {
      if(route==='macloe' && sec.id==='C' && hasCheminementMap()) return true;
      return sec.fields.every((f) => {
        const value = fieldNodes.get(f.key)?.value ?? mission[key][f.key] ?? '';
        return String(value).trim().length > 0;
      });
    };
    const syncSectionFields = () => {
      mutate(mission, (m) => {
        for (const f of sec.fields) {
          const node = fieldNodes.get(f.key);
          if (node) m[key][f.key] = node.value;
        }
      });
    };

    const fields = sec.fields.map((f) => {
      const ta = h('textarea', {
        rows: 4, maxlength: 20000, value: mission[key][f.key] || '', id: `f-${f.key}`, 'aria-describedby': `h-${f.key}`,
        oninput: () => {
          mutate(mission, (m) => {
            m[key][f.key] = ta.value;
            if ((m.validation[validationKey] || []).includes(sec.id)) m.validation[validationKey] = m.validation[validationKey].filter((x)=>x!==sec.id);
          }, { debounce: 350 });
          const q = sectionProgress(sec, mission[key]);
          const count = root.querySelector('[data-section-count]');
          if (count) count.textContent = `${q.done} / ${q.total} champ(s)`;
          if (validate) {
            validate.disabled = !liveSectionComplete();
            validate.textContent = 'Valider cette partie et continuer';
            validate.className = 'btn block primary';
          }
          root.querySelector('.active-form-section')?.classList.remove('section-validated');
          root.querySelector('.rail-btn.active')?.classList.remove('validated');
        }
      });
      fieldNodes.set(f.key, ta);
      const interim = h('div', { class: 'interim', 'aria-live': 'polite' });
      const mic = micButton({ label: `Dicter : ${f.label}`, onText: (t) => { ta.value = appendDictation(ta.value, t); ta.dispatchEvent(new Event('input')); }, onInterim: (t) => { interim.textContent = t; } });
      return h('div', { class: 'field' },
        h('div', { class: 'field-head' }, h('label', { for: `f-${f.key}` }, f.label), mic),
        h('p', { class: 'note', id: `h-${f.key}` }, f.hint), ta, interim);
    });

    const guidance = h('div', { class: 'form-guidance' },
      sec.help ? h('p', {}, sec.help) : null,
      sec.tips?.length ? h('div', { class: 'tip-chips' }, sec.tips.map((t)=>h('span',{},t))) : null,
      sec.example ? h('div', { class:'example-box' }, h('span',{class:'lbl'},'Exemple'), h('p',{},sec.example)) : null);

    validate = h('button', {
      class: `btn block ${done?'validated-btn':'primary'}`,
      disabled: !complete && !done,
      onclick: () => {
        if (done) { setValidated(sec.id,false); draw(); return; }
        syncSectionFields();
        const cartoOk = route==='macloe' && sec.id==='C' && hasCheminementMap();
        if (!sectionComplete(sec, mission[key]) && !cartoOk) {
          toast('Complète le texte ou enregistre un cheminement sur la carte.', 'bad');
          return;
        }
        setValidated(sec.id,true);
        const n=nextAfter(sec.id);
        if(n) active=n.id;
        draw();
      }
    }, done ? '✓ Partie validée — modifier' : 'Valider cette partie et continuer');

    const backRoute = 'etapes';
    const nextRoute = 'etapes';
    const nextLabel = 'Valider · Retour aux étapes';

    root.replaceChildren(
      topbar(mission, route, { onBack: () => { location.hash = missionUrl(mission.id, backRoute); } }),
      h('div', { class: 'body form-flow' },
        h('div', { class: 'form-head' },
          h('div', {}, h('span', { class: 'eyebrow' }, route==='macloe'?'Étape 4':'Étape 5'), h('h1', {}, form.title), h('p',{class:'note'},form.subtitle)),
          h('span', { class: 'mono' }, `${vp.done} / ${vp.total}`)),
        rail,
        h('section', { class: `card-sec active-form-section ${done?'section-validated':''}` },
          h('div', { class: 'fsec-head' },
            h('span', { class: `letter ${done?'done':''}` }, done?icon('check',18):sec.letter),
            h('div',{class:'fsec-title'},h('h2', {}, sec.title), h('span',{class:'mono small','data-section-count':'1'},mapComplete ? 'Carte OK' : `${sp.done} / ${sp.total} champ(s)`))),
          guidance,
          fields,
          route==='macloe' && sec.id==='C'
            ? h('div',{class:'cheminement-bonus'},
                h('div',{class:'cheminement-bonus-copy'},
                  h('span',{class:'eyebrow'},'Outil bonus'),
                  h('strong',{},hasCheminementMap()?'Carte de cheminement enregistrée':'Carte plein écran'),
                  h('small',{},hasCheminementMap()
                    ? 'Le texte devient facultatif : la carte suffit pour valider Cheminement.'
                    : 'Trace un départ, une arrivée, un itinéraire ou une zone. Cet outil reste facultatif.')),
                h('a',{class:'btn ghost',href:missionUrl(mission.id,'cheminement')},hasCheminementMap()?'Modifier la carte':'Ouvrir la carte'))
            : null,
          validate),
        h('button', { class: 'btn ghost block', onclick: () => copyText(toText(form, mission[key]), `${form.title} copié`) }, icon('copy'), `Copier ${form.title}`)),
      ctaBar(h('button', {
        class:'cta primary',
        disabled: vp.done !== vp.total,
        onclick:()=>{location.hash=missionUrl(mission.id,nextRoute);}
      }, h('span',{},nextLabel), icon('arrow')))
    );
  }
  draw();
  return { el: root };
}
