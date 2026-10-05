// Coquille de démarrage : verrou + page d'accueil minimale.
// L'IA de développement remplace ceci par le routeur et les vues (docs/02, docs/07 phase 0).
import { verifier } from './config.js';
import { verify, isUnlocked, setUnlocked } from './lib/gate.js';
import { createMissionStore } from './lib/storage.js';

const root = document.getElementById('app');
const store = createMissionStore();

const THEME_KEY = 'pmd.theme';
function applyTheme() {
  let t = null;
  try { t = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
}
applyTheme();

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
};

function showLock() {
  const msg = el('p', { class: 'err', role: 'alert' });
  const input = el('input', { id: 'pw', type: 'password', autocomplete: 'current-password' });
  const form = el('form', { class: 'card' },
    el('span', { class: 'lbl' }, 'Usage interne'),
    el('h1', {}, 'Prépa Mission Drone'),
    el('label', { for: 'pw', class: 'lbl' }, 'Mot de passe'),
    input,
    msg,
    el('button', { type: 'submit' }, 'Entrer')
  );
  if (!verifier) {
    msg.className = 'note';
    msg.textContent = 'Mot de passe non configuré : lancez « node scripts/make-verifier.mjs » puis copiez le résultat dans src/config.js.';
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!verifier) return;
    if (await verify(input.value, verifier)) { setUnlocked(true); showHome(); }
    else { msg.textContent = 'Mot de passe incorrect'; msg.className = 'err'; input.select(); }
  });
  root.replaceChildren(el('div', { class: 'center' }, form));
  input.focus();
}

function showHome() {
  const missions = store.list();
  const list = missions.length
    ? el('ul', {}, ...missions.map((m) => el('li', {}, `${m.name} — ${m.place.label || 'lieu à définir'}`)))
    : el('p', { class: 'note' }, 'Aucune mission enregistrée.');
  root.replaceChildren(el('div', { class: 'center' }, el('div', { class: 'card' },
    el('h1', {}, 'Missions'),
    list,
    el('button', { type: 'button', onclick: () => { store.create(); showHome(); } }, '+ Nouvelle mission'),
    el('button', { type: 'button', onclick: () => { setUnlocked(false); showLock(); } }, 'Verrouiller'),
    el('p', { class: 'note' }, 'Socle de démarrage : voir docs/07-feuille-de-route.md, phase 0.')
  )));
}

if (isUnlocked() && verifier) showHome(); else showLock();
