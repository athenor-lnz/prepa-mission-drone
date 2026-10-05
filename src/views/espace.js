import { h, icon, toast } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, subtabs, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { fetchRestrictions } from '../services/airspace.js';
import { summarizeZones } from '../lib/airspace.js';
import { formatClock } from '../lib/time.js';

const OFFICIAL = [
  { label: 'SIA — information aéronautique (NOTAM, SUP AIP)', url: 'https://www.sia.aviation-civile.gouv.fr/' },
  { label: 'Géoportail — carte des restrictions drones', url: 'https://www.geoportail.gouv.fr/' }
];

function extLink(l) { return h('a', { class: 'ext', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, icon('link', 18), l.label); }

function tabs(mission, current) {
  const e = mission.mens;
  return subtabs(mission, [
    { route: 'espace', label: 'Espace', badge: null },
    { route: 'notam', label: `NOTAM${e.notam.items.length ? ` · ${e.notam.items.length}` : ''}` },
    { route: 'supaip', label: `SUP AIP${e.supaip.items.length ? ` · ${e.supaip.items.length}` : ''}` }
  ], current);
}

function footer(mission, route) {
  const nxt = { espace: ['Suivant · NOTAM', 'notam'], notam: ['Suivant · SUP AIP', 'supaip'], supaip: ['Valider · Fiche', 'fiche'] }[route];
  return ctaBar(ctaButton(nxt[0], () => { location.hash = missionUrl(mission.id, nxt[1]); }));
}

export function renderEspace({ mission }) {
  const root = h('main', { class: 'screen scroll' });
  const p = mission.place;
  const es = mission.mens.espace;
  let loading = false;
  const hasPoint = Number.isFinite(p.lat) && Number.isFinite(p.lon);

  async function check() {
    loading = true; draw();
    const r = await fetchRestrictions(p.lat, p.lon);
    loading = false;
    mutate(mission, (m) => {
      const e = m.mens.espace;
      if (r.ok) { e.fetchedAt = r.fetchedAt; e.source = r.source; e.zones = r.data.slice(0, 50); e.error = null; }
      else { e.error = r.error; e.fetchedAt = null; e.zones = []; }
    });
    draw();
  }

  function result() {
    if (loading) return h('p', { class: 'note', role: 'status' }, 'Interrogation de la Géoplateforme…');
    if (es.error) return h('div', { class: 'banner bad', role: 'alert' }, icon('warn'), h('span', {}, `Non vérifié : ${es.error} Consultez la source officielle ci-dessous.`));
    if (!es.fetchedAt) return h('div', { class: 'banner warn' }, icon('warn'), 'Restrictions UAS non vérifiées pour ce lieu.');
    const s = summarizeZones(es.zones);
    const cls = { none: 'go', limited: 'warn', unknown: 'warn', forbidden: 'nogo' }[s.level];
    const title = { none: 'Aucune restriction UAS cartographiée à ce point', limited: `Hauteur maximale : ${s.maxHeightM} m`, unknown: 'Restriction à interpréter', forbidden: 'Vol interdit à ce point' }[s.level];
    return h('section', { class: `verdict ${cls}` },
      h('div', { class: 'v-top' }, h('span', { class: 'eyebrow' }, 'Restrictions UAS'), h('span', { class: 'mono small' }, `maj ${formatClock(es.fetchedAt)}`)),
      h('div', { class: 'v-title' }, title),
      es.zones.map((z) => h('p', { class: 'zone' }, h('strong', {}, z.limit), z.remark ? ` — ${z.remark}` : '')),
      h('p', { class: 'v-src' }, `Source : ${es.source}. Cette couche ne remplace ni les NOTAM, ni les zones contrôlées, ni l'autorisation de vol.`));
  }

  function controlled() {
    const opt = (v, label) => h('button', { class: es.controlled === v ? 'on' : '', 'aria-pressed': String(es.controlled === v), onclick: () => { mutate(mission, (m) => { m.mens.espace.controlled = v; }); draw(); } }, label);
    return h('section', { class: 'card-sec' },
      h('span', { class: 'lbl' }, 'Zone contrôlée (CTR / TMA) — à vérifier vous-même'),
      h('p', { class: 'note' }, 'L\'application ne sait pas si le lieu est sous une zone contrôlée. Vérifiez sur une source officielle puis indiquez le résultat.'),
      h('div', { class: 'seg' }, opt(true, 'Oui'), opt(false, 'Non'), opt(null, 'Inconnu')));
  }

  function draw() {
    root.replaceChildren(topbar(mission, 'espace'), h('div', { class: 'body' },
      tabs(mission, 'espace'),
      hasPoint ? [result(),
        h('button', { class: 'btn ghost block', disabled: loading, onclick: check }, es.fetchedAt ? 'Actualiser les restrictions UAS' : 'Vérifier les restrictions UAS'),
        controlled(),
        h('section', { class: 'card-sec' }, h('span', { class: 'lbl' }, 'Sources officielles'), OFFICIAL.map(extLink))]
        : h('div', { class: 'empty' }, h('p', {}, 'Définissez d\'abord le lieu.'), h('a', { class: 'btn primary', href: missionUrl(mission.id, 'lieu') }, 'Choisir le lieu'))),
      footer(mission, 'espace'));
  }
  draw();
  return { el: root };
}

function manualList({ mission, route, kind, fields, title, intro, itemView, emptyText }) {
  const root = h('main', { class: 'screen scroll' });
  const data = mission.mens[kind];
  const inputs = {};
  const add = () => {
    const item = {};
    for (const f of fields) item[f.key] = inputs[f.key].value.trim();
    if (!item[fields[0].key]) { toast(`${fields[0].label} requis`, 'bad'); return; }
    if (item.url && !/^https?:\/\//i.test(item.url)) { toast('Le lien doit commencer par http:// ou https://', 'bad'); return; }
    item.addedAt = new Date().toISOString();
    mutate(mission, (m) => { const d = m.mens[kind]; d.items = [...d.items, item]; d.fetchedAt = d.fetchedAt || item.addedAt; d.source = 'saisie manuelle'; });
    draw();
  };
  function draw() {
    for (const f of fields) {
      inputs[f.key] = f.long ? h('textarea', { rows: 3, maxlength: 4000, placeholder: f.placeholder || f.label, 'aria-label': f.label }) : h('input', { placeholder: f.placeholder || f.label, maxlength: 500, 'aria-label': f.label, inputmode: f.key === 'url' ? 'url' : null });
    }
    const verified = !!data.fetchedAt;
    root.replaceChildren(topbar(mission, route), h('div', { class: 'body' },
      tabs(mission, route),
      h('div', { class: `banner ${data.items.length || verified ? 'info' : 'warn'}` }, icon(data.items.length || verified ? 'check' : 'warn'), h('span', {},
        data.items.length ? `${data.items.length} élément(s) saisi(s) à la main. La liste peut être incomplète.` : verified ? 'Consultation notée : rien à signaler (saisi par vous).' : `${title} non vérifiés. L'absence de saisie ne signifie pas l'absence de ${title}.`)),
      h('p', { class: 'note' }, intro),
      h('section', { class: 'card-sec' }, h('span', { class: 'lbl' }, 'Sources officielles'), OFFICIAL.map(extLink)),
      data.items.length ? h('ul', { class: 'items' }, data.items.map((it, i) => h('li', { class: 'item' }, itemView(it), h('button', { class: 'icon-btn', 'aria-label': 'Supprimer cet élément', onclick: () => { mutate(mission, (m) => { m.mens[kind].items = m.mens[kind].items.filter((_, j) => j !== i); }); draw(); } }, icon('trash', 20))))) : h('p', { class: 'note' }, emptyText),
      h('section', { class: 'card-sec' }, h('span', { class: 'lbl' }, 'Ajouter'), fields.map((f) => inputs[f.key]), h('button', { class: 'btn primary block', onclick: add }, 'Ajouter à la mission')),
      !data.items.length ? h('button', { class: 'btn ghost block', onclick: () => { mutate(mission, (m) => { m.mens[kind].fetchedAt = new Date().toISOString(); m.mens[kind].source = 'saisie manuelle'; }); draw(); } }, 'J\'ai consulté la source : rien à signaler') : null),
      footer(mission, route));
  }
  draw();
  return { el: root };
}

export function renderNotam({ mission }) {
  return manualList({
    mission, route: 'notam', kind: 'notam', title: 'NOTAM',
    intro: 'Les NOTAM ne sont pas récupérés automatiquement (pas de source ouverte fiable). Consultez-les et notez ceux qui concernent le lieu et le créneau.',
    fields: [{ key: 'id', label: 'Numéro', placeholder: 'Numéro (ex. A1234/26)' }, { key: 'text', label: 'Texte', long: true, placeholder: 'Texte ou résumé' }, { key: 'validity', label: 'Validité', placeholder: 'Validité (ex. 06/10 08:00 → 07/10 18:00 UTC)' }],
    emptyText: 'Aucun NOTAM noté.',
    itemView: (it) => h('div', {}, h('strong', {}, it.id || '(sans numéro)'), it.validity ? h('div', { class: 'mono small' }, it.validity) : null, it.text ? h('p', {}, it.text) : null)
  });
}

export function renderSupAip({ mission }) {
  return manualList({
    mission, route: 'supaip', kind: 'supaip', title: 'SUP AIP',
    intro: 'Les suppléments AIP sont à consulter sur le site du SIA. Notez ceux qui concernent le lieu et le créneau.',
    fields: [{ key: 'id', label: 'Référence', placeholder: 'Référence (ex. SUP AIP 123/26)' }, { key: 'title', label: 'Titre', placeholder: 'Titre' }, { key: 'validity', label: 'Validité', placeholder: 'Validité' }, { key: 'url', label: 'Lien', placeholder: 'Lien https:// (facultatif)' }],
    emptyText: 'Aucun SUP AIP noté.',
    itemView: (it) => h('div', {}, h('strong', {}, it.id || '(sans référence)'), it.title ? h('div', {}, it.title) : null, it.validity ? h('div', { class: 'mono small' }, it.validity) : null, it.url ? h('a', { class: 'ext', href: it.url, target: '_blank', rel: 'noopener noreferrer' }, icon('link', 18), 'Ouvrir le lien') : null)
  });
}
