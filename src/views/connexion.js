import { h, icon } from '../ui/dom.js';
import { verify, setUnlocked } from '../lib/gate.js';
import { verifier } from '../config.js';

export function renderConnexion({ onUnlocked }) {
  const msg = h('p', { class: 'err', role: 'alert' });
  const input = h('input', { id: 'pw', type: 'password', autocomplete: 'current-password', 'aria-describedby': 'pw-msg', placeholder: 'Mot de passe' });
  msg.id = 'pw-msg';
  const insecure = !globalThis.crypto?.subtle;
  const form = h('form', { class: 'card lock' },
    h('div', { class: 'lock-ico' }, icon('lock', 28)),
    h('span', { class: 'eyebrow' }, 'Usage interne'),
    h('h1', {}, 'Prépa Mission Drone'),
    h('label', { for: 'pw', class: 'lbl' }, 'Mot de passe'),
    input, msg,
    h('button', { class: 'btn primary block', type: 'submit' }, 'Entrer'),
    h('p', { class: 'note' }, 'Verrou léger : il n\'empêche pas la lecture du code source. Ne saisissez aucune donnée classifiée.'));
  if (!verifier) { msg.className = 'note'; msg.textContent = 'Mot de passe non configuré : voir docs/06 (scripts/make-verifier.mjs).'; }
  if (insecure) { msg.className = 'err'; msg.textContent = 'Le verrou exige HTTPS ou localhost.'; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!verifier || insecure) return;
    const btn = form.querySelector('button'); btn.disabled = true;
    const ok = await verify(input.value, verifier);
    btn.disabled = false;
    if (ok) { setUnlocked(true); onUnlocked(); } else { msg.className = 'err'; msg.textContent = 'Mot de passe incorrect'; input.select(); }
  });
  queueMicrotask(() => input.focus());
  return { el: h('main', { class: 'center' }, form) };
}
