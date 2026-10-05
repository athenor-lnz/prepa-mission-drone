// Appels réseau : délai maximal, cache mémoire court, forme de résultat uniforme.
// Succès : { ok:true, data, source, fetchedAt } — échec : { ok:false, error, manualAllowed:true }

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

export async function getJson(url, { source, timeoutMs = 10000, ttl = TTL_MS, fetchImpl = globalThis.fetch } = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.res;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Le service a répondu ${r.status}.`);
    const data = await r.json();
    const res = { ok: true, data, source, fetchedAt: new Date().toISOString() };
    cache.set(url, { at: Date.now(), res });
    return res;
  } catch (e) {
    const error = e.name === 'AbortError' ? 'Délai dépassé.' : (e instanceof TypeError ? 'Service injoignable (hors ligne ou bloqué).' : e.message);
    return { ok: false, error, manualAllowed: true, source };
  } finally {
    clearTimeout(timer);
  }
}

export const clearCache = () => cache.clear();
