// Bouton micro réutilisable : consentement unique, dictée fr-FR, résultat provisoire affiché en direct.
import { h, icon, sheet, toast } from './dom.js';
import { getPrefs, setPrefs } from '../state.js';
import { speechSupported, startDictation } from '../services/speech.js';

function askConsent() {
  return new Promise((resolve) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    const s = sheet('Dictée vocale', h('div', { class: 'stack' },
      h('p', {}, 'La dictée utilise le service de reconnaissance vocale de votre navigateur. Selon l\'appareil, le son peut être envoyé à un serveur distant (Google, Apple…).'),
      h('p', { class: 'note' }, 'Ne dictez pas d\'information sensible. Vous pouvez toujours saisir au clavier.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => { fin(false); s.close(); } }, 'Annuler'),
        h('button', { class: 'btn primary', onclick: () => { setPrefs({ dictationConsent: true }); fin(true); s.close(); } }, 'J\'accepte'))), { onClose: () => fin(false) });
  });
}

/**
 * @param {{onText:(t:string)=>void, onInterim?:(t:string)=>void, label?:string}} o
 * @returns {HTMLButtonElement}
 */
export function micButton({ onText, onInterim, label = 'Dicter' }) {
  let session = null;
  const btn = h('button', { class: 'icon-btn mic', type: 'button', 'aria-label': label, 'aria-pressed': 'false' }, icon('mic'));
  const stopUi = () => { session = null; btn.classList.remove('rec'); btn.setAttribute('aria-pressed', 'false'); onInterim?.(''); };
  btn.addEventListener('click', async () => {
    if (session) { session.stop(); return; }
    if (!speechSupported()) { toast('Dictée non disponible sur ce navigateur : utilisez le micro du clavier.', 'bad'); return; }
    if (!getPrefs().dictationConsent && !(await askConsent())) return;
    btn.classList.add('rec'); btn.setAttribute('aria-pressed', 'true');
    session = startDictation({ onInterim, onFinal: onText, onEnd: stopUi, onError: (m) => toast(m, 'bad') });
  });
  if (!speechSupported()) btn.title = 'Dictée non disponible sur ce navigateur';
  return btn;
}
