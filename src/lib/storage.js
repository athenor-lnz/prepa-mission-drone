// Stockage des missions dans le navigateur, avec export/import JSON.
// Tolère l'absence de localStorage (navigation privée, stockage bloqué) : repli en mémoire.

export const KEY = 'pmd.missions.v1';
export const EXPORT_FORMAT = 'prepa-mission-drone/missions@1';
/** 20 kt en m/s : seuil de rafales par défaut (réglable par mission). */
export const DEFAULT_GUST_LIMIT_MS = 10.3;
const MAX_TEXT = 20000;
const MAX_ITEMS = 500;

export function newId(now = new Date(), rand = Math.random) {
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `m_${d}_${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
}

export function newMission({ now = new Date(), name = 'Nouvelle mission' } = {}) {
  const iso = now.toISOString();
  return {
    id: newId(now),
    name,
    createdAt: iso,
    updatedAt: iso,
    place: { label: '', lat: null, lon: null, radiusM: 500 },
    window: { start: '', end: '', tz: 'Europe/Paris' },
    mens: {
      meteo: { gustLimitMs: DEFAULT_GUST_LIMIT_MS, fetchedAt: null, source: null, manual: false, slots: [], hours: [], tz: null, utcOffsetSeconds: 0, kp: null, alerts: [], forPlace: null, kpError: null, kpEntries: null },
      espace: { fetchedAt: null, source: null, controlled: null, zones: [], error: null },
      notam: { fetchedAt: null, source: null, items: [] },
      supaip: { fetchedAt: null, source: null, items: [] }
    },
    smepp: { S1: '', S2: '', M: '', E1: '', E2: '', E3: '', E4: '', P1: '', P2: '' },
    macloe: { M: '', A: '', C: '', L: '', O: '', E: '' },
    admin: { gendrone: 'todo', visualdrone: 'todo' }
  };
}


const str = (v, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strOrNull = (v) => (typeof v === 'string' ? v.slice(0, 100) : null);
const list = (v) => (Array.isArray(v) ? v.slice(0, MAX_ITEMS) : []);

/**
 * Reconstruit une mission propre à partir d'un objet inconnu (import, ancienne version).
 * Retourne null si l'identifiant ou les dates sont inutilisables. Aucun champ inconnu n'est conservé.
 */
export function sanitizeMission(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !/^[\w-]{1,64}$/.test(raw.id)) return null;
  if (typeof raw.updatedAt !== 'string' || Number.isNaN(Date.parse(raw.updatedAt))) return null;
  const base = newMission({ now: new Date(raw.updatedAt) });
  const m = { ...base, id: raw.id, name: str(raw.name, 200) || base.name };
  m.createdAt = typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : raw.updatedAt;
  m.updatedAt = raw.updatedAt;
  const p = raw.place || {};
  m.place = { label: str(p.label, 300), lat: numOrNull(p.lat), lon: numOrNull(p.lon), radiusM: numOrNull(p.radiusM) ?? 500 };
  if (m.place.lat !== null && (m.place.lat < -90 || m.place.lat > 90)) m.place.lat = null;
  if (m.place.lon !== null && (m.place.lon < -180 || m.place.lon > 180)) m.place.lon = null;
  const w = raw.window || {};
  m.window = { start: str(w.start, 16), end: str(w.end, 16), tz: str(w.tz, 60) || 'Europe/Paris' };
  const me = raw.mens?.meteo || {};
  const slot = (s) => ({ t: str(s?.t, 16), hour: str(s?.hour, 5), wind: numOrNull(s?.wind), gust: numOrNull(s?.gust), dir: numOrNull(s?.dir), wind80: numOrNull(s?.wind80), temp: numOrNull(s?.temp), pop: numOrNull(s?.pop), vis: numOrNull(s?.vis), cloud: numOrNull(s?.cloud) });
  m.mens.meteo = {
    gustLimitMs: numOrNull(me.gustLimitMs) > 0 ? me.gustLimitMs : DEFAULT_GUST_LIMIT_MS,
    fetchedAt: strOrNull(me.fetchedAt), source: strOrNull(me.source), manual: me.manual === true,
    slots: list(me.slots).map(slot), hours: list(me.hours).slice(0, 400).map(slot),
    tz: strOrNull(me.tz), utcOffsetSeconds: numOrNull(me.utcOffsetSeconds) ?? 0, kp: numOrNull(me.kp),
    alerts: list(me.alerts).map((a) => str(a, 300)).filter(Boolean),
    forPlace: strOrNull(me.forPlace), kpError: strOrNull(me.kpError),
    kpEntries: Array.isArray(me.kpEntries) ? me.kpEntries.slice(0, 80).map((e) => ({ t: str(e?.t, 19), kp: numOrNull(e?.kp) })).filter((e) => e.t && e.kp !== null) : null
  };
  const es = raw.mens?.espace || {};
  m.mens.espace = {
    fetchedAt: strOrNull(es.fetchedAt), source: strOrNull(es.source),
    controlled: typeof es.controlled === 'boolean' ? es.controlled : null,
    zones: list(es.zones).map((z) => ({ id: str(z?.id, 100), limit: str(z?.limit, 200), remark: str(z?.remark, 500), meters: numOrNull(z?.meters) })),
    error: strOrNull(es.error)
  };
  const nt = raw.mens?.notam || {};
  m.mens.notam = { fetchedAt: strOrNull(nt.fetchedAt), source: strOrNull(nt.source), items: list(nt.items).map((i) => ({ id: str(i?.id, 60), text: str(i?.text), validity: str(i?.validity, 120), addedAt: strOrNull(i?.addedAt) })) };
  const sp = raw.mens?.supaip || {};
  m.mens.supaip = { fetchedAt: strOrNull(sp.fetchedAt), source: strOrNull(sp.source), items: list(sp.items).map((i) => ({ id: str(i?.id, 60), title: str(i?.title, 300), validity: str(i?.validity, 120), url: /^https?:\/\//i.test(i?.url) ? str(i.url, 500) : '', addedAt: strOrNull(i?.addedAt) })) };
  for (const k of Object.keys(m.smepp)) m.smepp[k] = str(raw.smepp?.[k]);
  for (const k of Object.keys(m.macloe)) m.macloe[k] = str(raw.macloe?.[k]);
  const g = raw.admin?.gendrone;
  const v = raw.admin?.visualdrone;
  m.admin = { gendrone: ['todo', 'sent', 'validated'].includes(g) ? g : 'todo', visualdrone: ['todo', 'declared'].includes(v) ? v : 'todo' };
  return m;
}

export function createMissionStore(storage = globalThis.localStorage, clock = () => new Date()) {
  let memory = [];
  let persistent = true;

  function read() {
    if (!persistent) return memory;
    try {
      const raw = storage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.map((m) => sanitizeMission(m) ?? m) : [];
    } catch {
      persistent = false;
      return memory;
    }
  }
  function write(list) {
    memory = list;
    if (!persistent) return;
    try {
      storage.setItem(KEY, JSON.stringify(list));
    } catch {
      persistent = false;
    }
  }

  const byRecent = (a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);

  return {
    /** false si le stockage est indisponible (à signaler à l'utilisateur). */
    get isPersistent() { return persistent; },
    list() { return [...read()].sort(byRecent); },
    get(id) { return read().find((m) => m.id === id) ?? null; },
    create(opts) {
      const m = newMission({ now: clock(), ...opts });
      write([...read(), m]);
      return m;
    },
    save(mission) {
      const updated = { ...mission, updatedAt: clock().toISOString() };
      const list = read();
      const i = list.findIndex((m) => m.id === updated.id);
      if (i >= 0) { list[i] = updated; write([...list]); } else write([...list, updated]);
      return updated;
    },
    remove(id) { write(read().filter((m) => m.id !== id)); },
    duplicate(id) {
      const src = this.get(id);
      if (!src) return null;
      const now = clock();
      const copy = { ...structuredClone(src), id: newId(now), name: `${src.name} (copie)`, createdAt: now.toISOString(), updatedAt: now.toISOString() };
      write([...read(), copy]);
      return copy;
    },
    exportJSON() {
      return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: clock().toISOString(), missions: read() }, null, 2);
    },
    /** Fusion par identifiant : la version la plus récente l'emporte. Retourne { added, updated, skipped }. */
    importJSON(text) {
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Fichier illisible (JSON invalide).'); }
      if (!data || data.format !== EXPORT_FORMAT || !Array.isArray(data.missions)) throw new Error('Fichier non reconnu.');
      const list = read();
      const res = { added: 0, updated: 0, skipped: 0 };
      for (const raw of data.missions.slice(0, 2000)) {
        const m = sanitizeMission(raw);
        if (!m) { res.skipped++; continue; }
        const i = list.findIndex((x) => x.id === m.id);
        if (i < 0) { list.push(m); res.added++; }
        else if (list[i].updatedAt < m.updatedAt) { list[i] = m; res.updated++; }
        else res.skipped++;
      }
      write([...list]);
      return res;
    }
  };
}
