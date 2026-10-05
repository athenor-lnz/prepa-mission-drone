// Définitions opérationnelles SMEPP et MACLOE.
// Les sections sont validées explicitement par l'utilisateur : remplir un champ ne suffit pas à rendre la section verte.

export const SMEPP = {
  id: 'smepp',
  title: 'SMEPP',
  subtitle: 'Situation → Mission → Exécution (AMICAL) → Points particuliers → Place du chef',
  sections: [
    { id: 'S', letter: 'S', title: 'Situation', help: 'Poser le contexte avant de donner la mission.', fields: [
      { key: 'S1', label: 'Situation générale', hint: 'Contexte général de l’intervention : événement, environnement, unités engagées, temporalité.' },
      { key: 'S2', label: 'Situation particulière', hint: 'Ce qui concerne directement l’équipe drone : terrain, population, obstacles, météo locale, contraintes et risques immédiats.' }
    ] },
    { id: 'M', letter: 'M', title: 'Mission', help: 'Formuler ce que l’équipe drone doit accomplir, simplement et sans ambiguïté.', fields: [
      { key: 'M', label: 'Mission de l’équipe drone', hint: 'Une phrase claire : action, objectif, zone et effet attendu.' }
    ] },
    { id: 'E', letter: 'E', title: 'Exécution · AMICAL', help: 'Dérouler l’exécution avec le mémo AMICAL.', fields: [
      { key: 'E_A', label: 'A — Articulation du dispositif', hint: 'Composition de l’équipe, répartition des postes, point de décollage, dispositif autour de la zone.' },
      { key: 'E_M', label: 'M — Mission de chacun', hint: 'Rôle du télépilote, de l’observateur, du chef de mission et des autres personnels.' },
      { key: 'E_I', label: 'I — Itinéraires / cheminements', hint: 'Accès au site, cheminement au sol, axes de vol, itinéraire de retour et dégagement.' },
      { key: 'E_C', label: 'C — Conduite à tenir', hint: 'Déroulement prévu, cas non conformes, interruption, panne, perte de liaison, arrivée d’un tiers ou d’un aéronef.' },
      { key: 'E_A2', label: 'A — Amis / appuis / renforts', hint: 'Unités amies, partenaires, appuis disponibles, personnes à prévenir ou à coordonner.' },
      { key: 'E_L', label: 'L — Liaisons / OCT / comptes rendus', hint: 'Moyens radio/téléphonie, liaison avec l’OCT ou le chef opérationnel, modalités et fréquence des comptes rendus.' }
    ] },
    { id: 'P1', letter: 'P', title: 'Points particuliers', help: 'Lister ce qui peut modifier la conduite de la mission.', fields: [
      { key: 'P1', label: 'Points particuliers', hint: 'Contraintes locales, environnement, ERP, foule, routes, lignes électriques, aérodromes, zones sensibles, restrictions spécifiques.' }
    ] },
    { id: 'P2', letter: 'P', title: 'Place du chef', help: 'Définir où se situe le chef et comment il garde la maîtrise de l’action.', fields: [
      { key: 'P2', label: 'Place du chef', hint: 'Position du chef de mission, visibilité sur le dispositif, liaisons et suppléance éventuelle.' }
    ] }
  ]
};

export const MACLOE = {
  id: 'macloe',
  title: 'MACLOE',
  subtitle: 'Préparation opérationnelle guidée',
  sections: [
    { id: 'M', letter: 'M', title: 'Mission', help: 'Pars d’un verbe missionnel clair et reformule ce qui est réellement attendu du dispositif drone.', tips: ['Observer', 'Renseigner', 'Reconnaître', 'Appuyer', 'Prendre des vues'], example: 'Observer la toiture afin d’identifier les points chauds et fournir des vues exploitables.', fields: [
      { key: 'M', label: 'Mission', hint: 'Verbe missionnel + objet + effet attendu.' }
    ] },
    { id: 'A', letter: 'A', title: 'Allure / effet recherché', help: 'Précise la manière de réaliser l’action et l’effet recherché.', tips: ['Vitesse', 'Discrétion', 'Hauteur', 'Distance', 'Nature de l’action'], example: 'Vol lent et discret, priorité à la stabilité de l’image.', fields: [
      { key: 'A', label: 'Allure / effet recherché', hint: 'Vitesse, discrétion, hauteur, distance et nature de l’effet recherché.' }
    ] },
    { id: 'C', letter: 'C', title: 'Cheminement', help: 'Prépare le trajet réel du drone et les zones de sécurité.', tips: ['Décollage / atterrissage', 'Zones sensibles', 'Obstacles', 'Dégagement', 'Axes à éviter'], example: 'Décollage au sud, progression par l’ouest, balayage puis retour par le même axe.', fields: [
      { key: 'C', label: 'Cheminement', hint: 'Itinéraire, zone de décollage, zones sensibles, obstacles, axes de repli.' }
    ] },
    { id: 'L', letter: 'L', title: 'Ligne de débouché', help: 'Matérialise la ligne ou la zone à partir de laquelle l’action utile commence.', tips: ['Début d’observation', 'Début de captation', 'Mise en station', 'Exposition / risque'], example: 'À partir de l’angle nord-ouest du bâtiment, début de la captation.', fields: [
      { key: 'L', label: 'Ligne de débouché', hint: 'Ligne ou zone à partir de laquelle la mission devient utile ou sensible.' }
    ] },
    { id: 'O', letter: 'O', title: 'Objectif', help: 'Décris précisément ce qui doit être observé, confirmé, documenté ou transmis.', tips: ['Résultat attendu', 'Photo / vidéo', 'Thermie', 'Déport image', 'Critère de fin'], example: 'Confirmer l’absence de reprise de feu et produire les vues demandées.', fields: [
      { key: 'O', label: 'Objectif', hint: 'Résultat concret à obtenir et critère de fin de mission.' }
    ] },
    { id: 'E', letter: 'E', title: 'Esquive', help: 'Prépare avant le décollage les actions si la mission doit être interrompue.', tips: ['Retour', 'Urgence', 'Zone de secours', 'Perte liaison', 'Intrusion / trafic'], example: 'Repli vers la zone sud et atterrissage sur le terrain dégagé en cas de perte de liaison.', fields: [
      { key: 'E', label: 'Esquive', hint: 'Retour, urgence, zone de secours, interruption et récupération.' }
    ] }
  ]
};

export const FORMS = { macloe: MACLOE, smepp: SMEPP };

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
export function sectionComplete(section, values = {}) {
  const p = sectionProgress(section, values);
  return p.total > 0 && p.done === p.total;
}
export function validatedProgress(form, validated = []) {
  const set = new Set(Array.isArray(validated) ? validated : []);
  return { done: form.sections.filter((s) => set.has(s.id)).length, total: form.sections.length };
}
export function formValidated(form, validated = []) {
  return validatedProgress(form, validated).done === form.sections.length;
}
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
export function appendDictation(current, added) {
  const a = String(added ?? '').trim();
  if (!a) return current ?? '';
  const c = String(current ?? '');
  if (!c.trim()) return a;
  return /\s$/.test(c) ? c + a : `${c} ${a}`;
}
