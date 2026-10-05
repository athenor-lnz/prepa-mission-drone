// Petits utilitaires DOM : h(), icônes, toast, copie. Aucun innerHTML : le texte passe toujours par textContent.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k === 'value') n.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'readOnly') n[k] = !!v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

const PATHS = {
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  tools: 'M14.7 6.3a4 4 0 005 5l-9.4 9.4a2.1 2.1 0 01-3-3zM14.7 6.3l-3-3',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  locate: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6L6 18',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1'
};

export function icon(name, size = 24) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2.2');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', PATHS[name] || '');
  s.append(p);
  return s;
}

let toastTimer;
export function toast(message, kind = 'info') {
  let box = document.getElementById('toast');
  if (!box) { box = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(box); }
  box.className = `toast ${kind} show`;
  box.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
}

export async function copyText(text, okMessage = 'Copié') {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage);
    return true;
  } catch {
    const ta = h('textarea', { value: text, 'aria-hidden': 'true', style: 'position:fixed;opacity:0' });
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignoré */ }
    ta.remove();
    toast(ok ? okMessage : 'Copie impossible : sélectionnez le texte à la main.', ok ? 'info' : 'bad');
    return ok;
  }
}

/** Feuille modale (bas d'écran). Retourne { close }. Échap et clic sur le fond ferment. */
export function sheet(title, content, { onClose } = {}) {
  const prevFocus = document.activeElement;
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); prevFocus?.focus?.(); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'grab' }),
    h('div', { class: 'sheet-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onclick: close }, icon('close'))),
    content);
  const scrim = h('div', { class: 'scrim', onclick: (e) => { if (e.target === scrim) close(); } }, panel);
  document.body.append(scrim);
  document.addEventListener('keydown', onKey);
  (panel.querySelector('input,textarea,button.primary') || panel.querySelector('button'))?.focus();
  return { close };
}

/** Confirmation destructive : retourne une promesse booléenne. */
export function confirmDialog(title, message, confirmLabel = 'Supprimer') {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const s = sheet(title, h('div', { class: 'stack' },
      h('p', {}, message),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => { finish(false); s.close(); } }, 'Annuler'),
        h('button', { class: 'btn danger', onclick: () => { finish(true); s.close(); } }, confirmLabel))), { onClose: () => finish(false) });
  });
}
