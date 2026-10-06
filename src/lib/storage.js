// Stockage des missions dans le navigateur, avec export/import JSON.
// Tolère l'absence de localStorage : repli en mémoire.
import { isLocalDateTime } from './time.js';

export const KEY = 'pmd.missions.v1';
export const EXPORT_FORMAT = 'prepa-mission-drone/missions@1';
export const MISSION_EXPORT_FORMAT = 'prepa-mission-drone/mission@1';
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
    context: {
      missionType: '',
      capture: 'observation',
      useCases: [],
      administrativeOrder: { held: false, cameraCount: null, placeNote: '' }
    },
    place: { label: '', lat: null, lon: null, radiusM: 500 },
    window: { start: '', end: '', tz: 'Europe/Paris' },
    mens: {
      meteo: { gustLimitMs: DEFAULT_GUST_LIMIT_MS, fetchedAt: null, source: null, manual: false, slots: [], hours: [], tz: null, utcOffsetSeconds: 0, kp: null, alerts: [], forPlace: null, kpError: null, kpEntries: null },
      espace: { fetchedAt: null, source: null, controlled: null, zones: [], error: null, localAnalysisAt: null, localDataset: null, localZones: [], aerodromes: [] },
      notam: { fetchedAt: null, source: null, items: [] },
      supaip: { fetchedAt: null, source: null, items: [] }
    },
    macloe: { M: '', A: '', C: '', L: '', O: '', E: '' },
    smepp: { S1: '', S2: '', M: '', E_A: '', E_M: '', E_I: '', E_C: '', E_A2: '', E_L: '', P1: '', P2: '' },
    validation: { macloe: [], smepp: [] },
    admin: { gendrone: 'todo', visualdrone: 'todo' }
  };
}

const str = (v, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strOrNull = (v, max = 100) => (typeof v === 'string' ? v.slice(0, max) : null);
const list = (v, max = MAX_ITEMS) => (Array.isArray(v) ? v.slice(0, max) : []);
const known = (v, values, fallback = '') => values.includes(v) ? v : fallback;

function cleanZone(z) {
  return {
    id: str(z?.id, 100), type: str(z?.type, 40), subType: str(z?.subType ?? z?.sous_type, 60),
    name: str(z?.name ?? z?.nom, 200), className: str(z?.className ?? z?.classe, 20),
    floor: str(z?.floor ?? z?.plancher, 100), ceiling: str(z?.ceiling ?? z?.plafond, 100),
    schedule: str(z?.schedule ?? z?.horaire, 300), remark: str(z?.remark ?? z?.remarque, 1200),
    vertical: str(z?.vertical, 40), pointOnly: z?.pointOnly === true,
    limit: str(z?.limit, 200), meters: numOrNull(z?.meters)
  };
}
function cleanFrequency(x){
  if(typeof x==='string'){
    try { const parsed=JSON.parse(x); if(parsed&&typeof parsed==='object')x=parsed; }
    catch { return {service:'',mhz:'',callsign:'',schedule:'',text:str(x,200)}; }
  }
  return {
    service:str(x?.service,40),mhz:str(x?.mhz,30),callsign:str(x?.callsign ?? x?.indicatif,120),
    schedule:str(x?.schedule ?? x?.horaire,120),text:str(x?.text,200)
  };
}
function cleanRunway(x){
  if(typeof x==='string'){
    try { const parsed=JSON.parse(x); if(parsed&&typeof parsed==='object')x=parsed; }
    catch { return {designation:'',lengthM:null,widthM:null,surface:'',text:str(x,300)}; }
  }
  const length=Number(x?.lengthM ?? x?.longueur_m),width=Number(x?.widthM ?? x?.largeur_m);
  return {
    designation:str(x?.designation,40),
    lengthM:Number.isFinite(length)?length:null,widthM:Number.isFinite(width)?width:null,
    surface:str(x?.surface ?? x?.revetement,80),text:str(x?.text,300)
  };
}
function cleanAerodrome(a) {
  return {
    icao: str(a?.icao, 12), name: str(a?.name ?? a?.nom, 240), type: str(a?.type, 40),
    altitudeFt: numOrNull(a?.altitudeFt ?? a?.altitude_ft), distanceM: numOrNull(a?.distanceM),
    remark: str(a?.remark ?? a?.remarque, 1000),
    frequencies: list(a?.frequencies ?? a?.frequences, 50).map(cleanFrequency),
    runways: list(a?.runways ?? a?.pistes, 50).map(cleanRunway)
  };
}

/** Reconstruit une mission propre depuis un import ou une ancienne version. */
export function sanitizeMission(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !/^[\w-]{1,64}$/.test(raw.id)) return null;
  if (typeof raw.updatedAt !== 'string' || Number.isNaN(Date.parse(raw.updatedAt))) return null;

  const base = newMission({ now: new Date(raw.updatedAt) });
  const m = { ...base, id: raw.id, name: str(raw.name, 200) || base.name };
  m.createdAt = typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : raw.updatedAt;
  m.updatedAt = raw.updatedAt;

  const ctx = raw.context || {};
  const ao = ctx.administrativeOrder || {};
  m.context = {
    missionType: known(ctx.missionType, ['judiciaire','administratif','sauvegarde','entrainement','communication','autre'], ''),
    capture: known(ctx.capture, ['observation','captation','enregistrement'], 'observation'),
    useCases: list(ctx.useCases, 20).map((x) => str(x, 60)).filter(Boolean),
    administrativeOrder: {
      held: ao.held === true,
      cameraCount: Number.isInteger(Number(ao.cameraCount)) && Number(ao.cameraCount) > 0 ? Math.min(99, Number(ao.cameraCount)) : null,
      placeNote: str(ao.placeNote, 1000)
    }
  };
  if (m.context.missionType === 'judiciaire') m.context.capture = 'enregistrement';

  const p = raw.place || {};
  m.place = { label: str(p.label, 300), lat: numOrNull(p.lat), lon: numOrNull(p.lon), radiusM: numOrNull(p.radiusM) ?? 500 };
  if (m.place.lat !== null && (m.place.lat < -90 || m.place.lat > 90)) m.place.lat = null;
  if (m.place.lon !== null && (m.place.lon < -180 || m.place.lon > 180)) m.place.lon = null;
  m.place.radiusM = Math.max(10, Math.min(10000, m.place.radiusM));

  const w = raw.window || {};
  const start = isLocalDateTime(w.start) ? w.start : '';
  const end = isLocalDateTime(w.end) && (!start || w.end > start) ? w.end : '';
  m.window = { start, end, tz: str(w.tz, 60) || 'Europe/Paris' };

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
    zones: list(es.zones).map(cleanZone),
    error: strOrNull(es.error, 300),
    localAnalysisAt: strOrNull(es.localAnalysisAt),
    localDataset: es.localDataset && typeof es.localDataset === 'object' ? {
      source: str(es.localDataset.source, 100), effective: str(es.localDataset.effective, 50), featureCount: numOrNull(es.localDataset.featureCount), aerodromeCount: numOrNull(es.localDataset.aerodromeCount)
    } : null,
    localZones: list(es.localZones, 100).map(cleanZone),
    aerodromes: list(es.aerodromes, 30).map(cleanAerodrome)
  };

  const nt = raw.mens?.notam || {};
  m.mens.notam = { fetchedAt: strOrNull(nt.fetchedAt), source: strOrNull(nt.source), items: list(nt.items).map((i) => ({ id: str(i?.id, 60), text: str(i?.text), validity: str(i?.validity, 120), addedAt: strOrNull(i?.addedAt) })) };
  const sp = raw.mens?.supaip || {};
  m.mens.supaip = { fetchedAt: strOrNull(sp.fetchedAt), source: strOrNull(sp.source), items: list(sp.items).map((i) => ({ id: str(i?.id, 60), title: str(i?.title, 300), validity: str(i?.validity, 120), url: /^https?:\/\//i.test(i?.url) ? str(i.url, 500) : '', addedAt: strOrNull(i?.addedAt) })) };

  for (const k of Object.keys(m.macloe)) m.macloe[k] = str(raw.macloe?.[k]);

  // Migration de l'ancien SMEPP (E1..E4) vers AMICAL complet.
  const rs = raw.smepp || {};
  m.smepp.S1 = str(rs.S1); m.smepp.S2 = str(rs.S2); m.smepp.M = str(rs.M);
  m.smepp.E_A = str(rs.E_A ?? rs.E1);
  m.smepp.E_M = str(rs.E_M ?? rs.E2);
  m.smepp.E_I = str(rs.E_I);
  m.smepp.E_C = str(rs.E_C ?? rs.E3);
  m.smepp.E_A2 = str(rs.E_A2 ?? rs.E4);
  m.smepp.E_L = str(rs.E_L);
  m.smepp.P1 = str(rs.P1); m.smepp.P2 = str(rs.P2);

  const val = raw.validation || {};
  const validIds = (xs, allowed) => list(xs, 20).map(String).filter((x) => allowed.includes(x));
  m.validation = {
    macloe: validIds(val.macloe, ['M','A','C','L','O','E']),
    smepp: validIds(val.smepp, ['S','M','E','P1','P2'])
  };

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
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeMission).filter(Boolean);
    } catch {
      persistent = false;
      return memory;
    }
  }
  function write(items) {
    memory = items;
    if (!persistent) return;
    try { storage.setItem(KEY, JSON.stringify(items)); }
    catch { persistent = false; }
  }
  const byRecent = (a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);

  function mergeMission(list, mission) {
    const i = list.findIndex((x) => x.id === mission.id);
    if (i < 0) { list.push(mission); return 'added'; }
    if (list[i].updatedAt < mission.updatedAt) { list[i] = mission; return 'updated'; }
    return 'skipped';
  }

  return {
    get isPersistent() { return persistent; },
    list() { return [...read()].sort(byRecent); },
    get(id) { return read().find((m) => m.id === id) ?? null; },
    create(opts) {
      const m = newMission({ now: clock(), ...opts });
      write([...read(), m]); return m;
    },
    save(mission) {
      const updated = sanitizeMission({ ...mission, updatedAt: clock().toISOString() });
      if (!updated) throw new Error('Mission invalide.');
      const items = read();
      const i = items.findIndex((m) => m.id === updated.id);
      if (i >= 0) items[i] = updated; else items.push(updated);
      write([...items]); return updated;
    },
    remove(id) { write(read().filter((m) => m.id !== id)); },
    duplicate(id) {
      const src = this.get(id); if (!src) return null;
      const now = clock();
      const copy = structuredClone(src);
      copy.id = newId(now); copy.name = `${src.name} (copie)`; copy.createdAt = now.toISOString(); copy.updatedAt = now.toISOString();
      write([...read(), copy]); return copy;
    },
    exportJSON() { return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: clock().toISOString(), missions: read() }, null, 2); },
    exportMission(id) {
      const mission = this.get(id); if (!mission) throw new Error('Mission introuvable.');
      return JSON.stringify({ format: MISSION_EXPORT_FORMAT, exportedAt: clock().toISOString(), mission }, null, 2);
    },
    importJSON(text) {
      let data; try { data = JSON.parse(text); } catch { throw new Error('Fichier illisible (JSON invalide).'); }
      const items = read();
      const res = { added: 0, updated: 0, skipped: 0 };
      let incoming = [];
      if (data?.format === EXPORT_FORMAT && Array.isArray(data.missions)) incoming = data.missions.slice(0, 2000);
      else if (data?.format === MISSION_EXPORT_FORMAT && data.mission) incoming = [data.mission];
      else throw new Error('Fichier non reconnu.');
      for (const raw of incoming) {
        const m = sanitizeMission(raw);
        if (!m) { res.skipped++; continue; }
        res[mergeMission(items, m)]++;
      }
      write([...items]); return res;
    }
  };
}
