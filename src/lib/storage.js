// Stockage des missions dans le navigateur, avec export/import JSON.
// Tolère l'absence de localStorage (navigation privée, stockage bloqué) : repli en mémoire.

export const KEY = 'pmd.missions.v1';
export const EXPORT_FORMAT = 'prepa-mission-drone/missions@1';

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
      meteo: { gustLimitMs: 12, fetchedAt: null, source: null, manual: false, slots: [] },
      espace: { fetchedAt: null, source: null, controlled: null, zones: [] },
      notam: { fetchedAt: null, source: null, items: [] },
      supaip: { fetchedAt: null, source: null, items: [] }
    },
    smepp: { S1: '', S2: '', M: '', E1: '', E2: '', E3: '', E4: '', P1: '', P2: '' },
    macloe: { M: '', A: '', C: '', L: '', O: '', E: '' },
    admin: { gendrone: 'todo', visualdrone: 'todo' }
  };
}

export function createMissionStore(storage = globalThis.localStorage, clock = () => new Date()) {
  let memory = [];
  let persistent = true;

  function read() {
    if (!persistent) return memory;
    try {
      const raw = storage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
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
      for (const m of data.missions) {
        if (!m || typeof m.id !== 'string' || typeof m.updatedAt !== 'string') { res.skipped++; continue; }
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
