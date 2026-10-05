// Point d'entrée : verrou, routeur par hash, rendu des vues.
import { verifier } from './config.js';
import { isUnlocked, setUnlocked } from './lib/gate.js';
import { store, applyTheme, flush } from './state.js';
import { renderConnexion } from './views/connexion.js';
import { renderAccueil } from './views/accueil.js';
import { renderLieu } from './views/lieu.js';
import { renderMeteo } from './views/meteo.js';
import { renderEspace, renderNotam, renderSupAip } from './views/espace.js';
import { renderFiche, renderForm } from './views/fiche.js';
import { h } from './ui/dom.js';

const app = document.getElementById('app');
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

let current = null;
function mount(view) {
  current?.destroy?.();
  current = view;
  app.replaceChildren(view.el);
  window.scrollTo(0, 0);
  const t = view.el.querySelector('h1, h2');
  if (t) { t.tabIndex = -1; }
}

const ID_RE = /^[\w-]{1,64}$/;
const MISSION_ROUTES = { lieu: renderLieu, meteo: renderMeteo, espace: renderEspace, notam: renderNotam, supaip: renderSupAip, fiche: renderFiche, smepp: renderForm, macloe: renderForm };

function lock() { setUnlocked(false); route(); }

function route() {
  flush();
  if (!verifier || !isUnlocked()) { mount(renderConnexion({ onUnlocked: route })); return; }
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'mission' && ID_RE.test(parts[1] || '')) {
    const mission = store.get(parts[1]);
    const r = parts[2] || 'lieu';
    if (mission && MISSION_ROUTES[r]) { mount(MISSION_ROUTES[r]({ mission, route: r })); return; }
    location.hash = mission ? `#/mission/${mission.id}/lieu` : '#/';
    return;
  }
  mount(renderAccueil({ onLock: lock }));
}

addEventListener('hashchange', route);
try { route(); } catch (e) {
  console.error(e);
  app.replaceChildren(h('main', { class: 'center' }, h('div', { class: 'card' }, h('h1', {}, 'Erreur'), h('p', {}, 'L\'application a rencontré un problème. Rechargez la page ; vos missions sont conservées.'), h('a', { class: 'btn primary', href: '#/' }, 'Accueil'))));
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne non disponible */ });
}
