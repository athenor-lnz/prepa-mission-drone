// Verrou léger par mot de passe commun. NE PROTÈGE PAS de données sensibles (voir docs/06).
// Le dépôt ne contient qu'un « vérificateur » (sel + empreinte PBKDF2-SHA256), jamais le mot de passe.

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));

async function derive(password, saltHex, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations }, key, 256);
  return toHex(bits);
}

/** Crée le vérificateur à coller dans src/config.js (à faire hors du dépôt public avec scripts/make-verifier.mjs). */
export async function makeVerifier(password, iterations = 200000) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, iterations, hash: await derive(password, salt, iterations) };
}

export async function verify(password, verifier) {
  if (!verifier || !verifier.salt || !verifier.hash) return false;
  const h = await derive(String(password), verifier.salt, verifier.iterations);
  if (h.length !== verifier.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ verifier.hash.charCodeAt(i);
  return diff === 0;
}

const SESSION_KEY = 'pmd.unlocked';
export const isUnlocked = (store = globalThis.sessionStorage) => { try { return store.getItem(SESSION_KEY) === '1'; } catch { return false; } };
export const setUnlocked = (on, store = globalThis.sessionStorage) => { try { on ? store.setItem(SESSION_KEY, '1') : store.removeItem(SESSION_KEY); } catch { /* ignore */ } };
