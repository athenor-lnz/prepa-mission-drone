// État partagé : missions (localStorage), préférences, enregistrement différé.
import { createMissionStore } from './lib/storage.js';
import { msToKt, ktToMs } from './lib/units.js';

export const store = createMissionStore();

const PREFS_KEY = 'pmd.prefs.v1';
const DEFAULT_PREFS = { theme: 'auto', windUnit: 'kt', dictationConsent: false };
let prefs = null;

export function getPrefs() {
  if (prefs) return prefs;
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    prefs = {
      theme: ['auto', 'light', 'dark'].includes(raw.theme) ? raw.theme : DEFAULT_PREFS.theme,
      windUnit: ['kt', 'm/s', 'km/h'].includes(raw.windUnit) ? raw.windUnit : DEFAULT_PREFS.windUnit,
      dictationConsent: raw.dictationConsent === true
    };
  } catch { prefs = { ...DEFAULT_PREFS }; }
  return prefs;
}

export function setPrefs(patch) {
  prefs = { ...getPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* préférences non conservées */ }
  applyTheme();
}

export function applyTheme() {
  const t = getPrefs().theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090D12' : '#EEF0EA');
}

// --- vitesses dans l'unité choisie (les données restent en m/s) ---
const FACT = { kt: (ms) => msToKt(ms), 'm/s': (ms) => ms, 'km/h': (ms) => ms * 3.6 };
export const speedFromMs = (ms) => (Number.isFinite(ms) ? FACT[getPrefs().windUnit](ms) : null);
export function speedToMs(v) {
  const u = getPrefs().windUnit;
  return u === 'kt' ? ktToMs(v) : u === 'km/h' ? v / 3.6 : v;
}
export function fmtSpeed(ms, withUnit = false) {
  const v = speedFromMs(ms);
  if (v === null) return '—';
  const u = getPrefs().windUnit;
  const txt = u === 'm/s' ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
  return withUnit ? `${txt} ${u}` : txt;
}

// --- mission courante : modification + enregistrement ---
let timer = null;
let pending = null;

export function flush() {
  clearTimeout(timer);
  if (pending) { store.save(pending); pending = null; }
}

/** Applique `fn` à une copie de la mission, enregistre (immédiatement ou après un court délai pour la frappe). */
export function mutate(mission, fn, { debounce = 0 } = {}) {
  fn(mission);
  if (!debounce) { clearTimeout(timer); pending = null; const saved = store.save(mission); mission.updatedAt = saved.updatedAt; return; }
  pending = mission;
  clearTimeout(timer);
  timer = setTimeout(flush, debounce);
}

addEventListener('pagehide', flush);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
