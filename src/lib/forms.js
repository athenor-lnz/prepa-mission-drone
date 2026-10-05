// Définition des formulaires SMEPP et MACLOE, progression et export texte.
// Les intitulés suivent le cahier des charges (docs/01, M6). Le porteur peut les ajuster ici.

export const SMEPP = {
  id: 'smepp',
  title: 'SMEPP',
  sections: [
    { id: 'S', letter: 'S', title: 'Situation', fields: [
      { key: 'S1', label: 'Situation générale', hint: 'Contexte général de l\'intervention.' },
      { key: 'S2', label: 'Situation particulière', hint: 'Éléments propres au lieu et au moment.' }
    ] },
    { id: 'M', letter: 'M', title: 'Mission', fields: [
      { key: 'M', label: 'Mission de l\'équipe drone', hint: 'Ce que l\'équipe doit accomplir.' }
    ] },
    { id: 'E', letter: 'E', title: 'Exécution', fields: [
      { key: 'E1', label: 'Articulation du dispositif', hint: 'Qui fait quoi, où, avec quels moyens.' },
      { key: 'E2', label: 'Mission de chaque militaire', hint: 'Rôle de chacun.' },
      { key: 'E3', label: 'Conduite à tenir', hint: 'Consignes, cas particuliers.' },
      { key: 'E4', label: 'Amis, liaison OCT / CR', hint: 'Unités amies, moyens de liaison, comptes rendus.' }
    ] },
    { id: 'P1', letter: 'P', title: 'Points particuliers', fields: [
      { key: 'P1', label: 'Contraintes, environnement, ERP', hint: 'Obstacles, population, établissements recevant du public.' }
    ] },
    { id: 'P2', letter: 'P', title: 'Place du chef', fields: [
      { key: 'P2', label: 'Place du chef', hint: 'Où se tient le chef de mission.' }
    ] }
  ]
};

export const MACLOE = {
  id: 'macloe',
  title: 'MACLOE',
  sections: [
    ['M', 'Mission'], ['A', 'Allure'], ['C', 'Cheminement'], ['L', 'Ligne de débouché'], ['O', 'Objectif'], ['E', 'Esquive']
  ].map(([k, label]) => ({ id: k, letter: k, title: label, fields: [{ key: k, label, hint: 'Vol hors vue.' }] }))
};

export const FORMS = { smepp: SMEPP, macloe: MACLOE };

export function allFields(form) {
  return form.sections.flatMap((s) => s.fields.map((f) => ({ ...f, sectionId: s.id, letter: s.letter, sectionTitle: s.title })));
}

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

export function progress(form, values = {}) {
  const fields = allFields(form);
  return { done: fields.filter((f) => filled(values[f.key])).length, total: fields.length };
}

export function sectionProgress(section, values = {}) {
  const done = section.fields.filter((f) => filled(values[f.key])).length;
  return { done, total: section.fields.length };
}

/** Texte complet à copier ; les champs vides sont signalés, jamais inventés. */
export function toText(form, values = {}) {
  const lines = [form.title];
  for (const s of form.sections) {
    lines.push('', `${s.letter} — ${s.title}`);
    for (const f of s.fields) {
      const v = filled(values[f.key]) ? values[f.key].trim() : '(non renseigné)';
      lines.push(s.fields.length > 1 ? `${f.label} : ${v}` : v);
    }
  }
  return lines.join('\n');
}

/** Ajoute un texte dicté à la fin d'un champ, avec un espace si besoin. */
export function appendDictation(current, added) {
  const a = String(added ?? '').trim();
  if (!a) return current ?? '';
  const c = String(current ?? '');
  if (!c.trim()) return a;
  return /\s$/.test(c) ? c + a : `${c} ${a}`;
}
