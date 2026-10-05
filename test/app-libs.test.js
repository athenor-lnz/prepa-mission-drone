import test from 'node:test';
import assert from 'node:assert/strict';
import { inUasCoverage, restrictionsUrl, inPolygon, inGeometry, limitToMeters, zonesAtPoint, summarizeZones } from '../src/lib/airspace.js';
import { SMEPP, MACLOE, progress, sectionProgress, toText, appendDictation, allFields } from '../src/lib/forms.js';
import { newMission, sanitizeMission, createMissionStore, DEFAULT_GUST_LIMIT_MS } from '../src/lib/storage.js';
import { buildRecap, espaceLine } from '../src/lib/recap.js';

const square = [[[1, 43], [2, 43], [2, 44], [1, 44], [1, 43]]];
const hole = [...square, [[1.4, 43.4], [1.6, 43.4], [1.6, 43.6], [1.4, 43.6], [1.4, 43.4]]];

test('couverture de la source de restrictions : métropole oui, Nouvelle-Calédonie non', () => {
  assert.ok(inUasCoverage(43.6, 1.44));
  assert.ok(inUasCoverage(42.0, 9.0));
  assert.ok(!inUasCoverage(-22.27, 166.45));
});

test('restrictionsUrl : BBOX en lon,lat autour du point', () => {
  const u = decodeURIComponent(restrictionsUrl(43.6045, 1.4442));
  assert.match(u, /TYPENAMES=TRANSPORTS\.DRONES\.RESTRICTIONS:carte_restriction_drones_lf/);
  assert.match(u, /BBOX=1\.443700,43\.604000,1\.444700,43\.605000,EPSG:4326/);
});

test('point dans polygone, trous et multipolygones', () => {
  assert.ok(inPolygon(square, 1.5, 43.5));
  assert.ok(!inPolygon(square, 2.5, 43.5));
  assert.ok(!inPolygon(hole, 1.5, 43.5));
  assert.ok(inPolygon(hole, 1.2, 43.2));
  assert.ok(inGeometry({ type: 'MultiPolygon', coordinates: [square] }, 1.5, 43.5));
  assert.ok(!inGeometry({ type: 'Point', coordinates: [1, 43] }, 1, 43));
  assert.ok(!inGeometry(null, 1, 43));
});

test('limitToMeters', () => {
  assert.equal(limitToMeters('Vol interdit *'), 0);
  assert.equal(limitToMeters('30 m'), 30);
  assert.equal(limitToMeters('Hauteur max 60,5 m'), 60.5);
  assert.equal(limitToMeters('voir carte'), null);
  assert.equal(limitToMeters(undefined), null);
});

test('zonesAtPoint ne garde que les zones qui contiennent le point', () => {
  const json = { features: [
    { id: 'a.1', properties: { limite: '30 m', remarque: 'x' }, geometry: { type: 'Polygon', coordinates: square } },
    { id: 'a.2', properties: { limite: 'Vol interdit' }, geometry: { type: 'Polygon', coordinates: [[[5, 5], [6, 5], [6, 6], [5, 5]]] } }
  ] };
  const z = zonesAtPoint(json, 43.5, 1.5);
  assert.equal(z.length, 1);
  assert.equal(z[0].meters, 30);
  assert.deepEqual(zonesAtPoint({}, 43.5, 1.5), []);
});

test('summarizeZones : aucune, limitée, interdite, indéterminée', () => {
  assert.equal(summarizeZones([]).level, 'none');
  assert.deepEqual(summarizeZones([{ meters: 60 }, { meters: 30 }]), { level: 'limited', maxHeightM: 30 });
  assert.equal(summarizeZones([{ meters: 60 }, { meters: 0 }]).level, 'forbidden');
  assert.equal(summarizeZones([{ meters: 60 }, { meters: null }]).level, 'unknown');
});

test('SMEPP : 9 champs, MACLOE : 6 champs, progression par section', () => {
  assert.equal(allFields(SMEPP).length, 9);
  assert.equal(allFields(MACLOE).length, 6);
  const v = { S1: 'x', E1: '  ', E2: 'y' };
  assert.deepEqual(progress(SMEPP, v), { done: 2, total: 9 });
  assert.deepEqual(sectionProgress(SMEPP.sections[2], v), { done: 1, total: 4 });
});

test('toText signale les champs vides au lieu de les inventer', () => {
  const t = toText(SMEPP, { M: 'Reconnaissance' });
  assert.match(t, /Reconnaissance/);
  assert.match(t, /Situation générale : \(non renseigné\)/);
});

test('appendDictation ajoute à la fin avec un espace', () => {
  assert.equal(appendDictation('', ' bonjour '), 'bonjour');
  assert.equal(appendDictation('un', 'deux'), 'un deux');
  assert.equal(appendDictation('un ', 'deux'), 'un deux');
  assert.equal(appendDictation('un', '   '), 'un');
});

test('sanitizeMission : rejette l\'invalide, borne les textes, ne garde que les champs connus', () => {
  assert.equal(sanitizeMission(null), null);
  assert.equal(sanitizeMission({ id: '../x', updatedAt: '2026-10-06T00:00:00Z' }), null);
  assert.equal(sanitizeMission({ id: 'm_1', updatedAt: 'pas une date' }), null);
  const m = sanitizeMission({
    id: 'm_1', updatedAt: '2026-10-06T00:00:00Z', name: 'A'.repeat(500), evil: '<script>', place: { lat: 200, lon: 1 },
    smepp: { S1: 'x'.repeat(50000), ZZ: 'inconnu' }, admin: { gendrone: 'hack' },
    mens: { supaip: { items: [{ id: '1', url: 'javascript:alert(1)' }, { id: '2', url: 'https://sia.aviation-civile.gouv.fr/x' }] }, meteo: { gustLimitMs: -4 } }
  });
  assert.equal(m.name.length, 200);
  assert.equal(m.evil, undefined);
  assert.equal(m.place.lat, null);
  assert.equal(m.smepp.S1.length, 20000);
  assert.equal(m.smepp.ZZ, undefined);
  assert.equal(m.admin.gendrone, 'todo');
  assert.equal(m.mens.supaip.items[0].url, '');
  assert.match(m.mens.supaip.items[1].url, /^https:/);
  assert.equal(m.mens.meteo.gustLimitMs, DEFAULT_GUST_LIMIT_MS);
});

test('importJSON refuse un fichier invalide sans toucher aux missions existantes', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const store = createMissionStore(storage);
  store.create({ name: 'Existante' });
  assert.throws(() => store.importJSON('pas du json'), /illisible/);
  assert.throws(() => store.importJSON('{"format":"autre"}'), /non reconnu/);
  const r = store.importJSON(JSON.stringify({ format: 'prepa-mission-drone/missions@1', missions: [{ id: '../../x', updatedAt: 'x' }, 42] }));
  assert.equal(r.skipped, 2);
  assert.equal(store.list().length, 1);
});

test('recap : n\'affiche que ce qui existe, signale NOTAM et SUP AIP non vérifiés', () => {
  const m = newMission({ now: new Date('2026-10-06T10:00:00Z') });
  m.name = 'Test';
  let r = buildRecap(m);
  assert.match(r, /Lieu : non défini/);
  assert.match(r, /Météo : non évaluée/);
  assert.match(r, /NOTAM : non vérifiés/);
  assert.match(r, /SUP AIP : non vérifiés/);
  assert.match(r, /SMEPP : 0 \/ 9/);
  m.place = { label: 'Place test', lat: 43.6045, lon: 1.4442, radiusM: 300 };
  m.window = { start: '2026-10-06T14:00', end: '2026-10-06T16:30', tz: 'Europe/Paris' };
  m.mens.meteo.slots = [{ hour: '14:00', wind: 4, gust: 6 }, { hour: '15:00', wind: 4, gust: 7 }];
  m.mens.meteo.source = 'Open-Meteo';
  m.mens.notam.items = [{ id: 'A0000/26', text: 't', validity: '' }];
  r = buildRecap(m);
  assert.match(r, /N 43° 36′ 16\.20″/);
  assert.match(r, /Météo : GO/);
  assert.match(r, /NOTAM : 1 saisi\(s\) à la main/);
  assert.match(r, /A0000\/26/);
});

test('espaceLine : jamais « rien à signaler » sans vérification', () => {
  const m = newMission();
  assert.equal(espaceLine(m), 'Non vérifié');
  m.mens.espace.fetchedAt = '2026-10-06T10:00:00Z';
  m.mens.espace.zones = [];
  assert.match(espaceLine(m), /Aucune restriction UAS cartographiée/);
  m.mens.espace.zones = [{ meters: 0, limit: 'Vol interdit' }];
  assert.match(espaceLine(m), /vol interdit/);
});
