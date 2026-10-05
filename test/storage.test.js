import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionStore, newMission, EXPORT_FORMAT } from '../src/lib/storage.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
function ticker(start = '2026-10-05T10:00:00Z') {
  let t = Date.parse(start);
  return () => new Date((t += 60000));
}

test('créer, lire, modifier, supprimer', () => {
  const st = createMissionStore(fakeStorage(), ticker());
  const m = st.create({ name: 'A' });
  assert.equal(st.list().length, 1);
  const saved = st.save({ ...m, name: 'B' });
  assert.equal(st.get(m.id).name, 'B');
  assert.ok(saved.updatedAt > m.updatedAt);
  st.remove(m.id);
  assert.equal(st.list().length, 0);
});

test('liste triée de la plus récente à la plus ancienne', () => {
  const st = createMissionStore(fakeStorage(), ticker());
  const a = st.create({ name: 'A' });
  const b = st.create({ name: 'B' });
  st.save(a);
  assert.deepEqual(st.list().map((x) => x.name), ['A', 'B']);
  assert.ok(b);
});

test('duplication', () => {
  const st = createMissionStore(fakeStorage(), ticker());
  const a = st.create({ name: 'A' });
  const c = st.duplicate(a.id);
  assert.notEqual(c.id, a.id);
  assert.equal(c.name, 'A (copie)');
  assert.equal(st.list().length, 2);
});

test('persistance entre deux instances', () => {
  const s = fakeStorage();
  createMissionStore(s, ticker()).create({ name: 'A' });
  assert.equal(createMissionStore(s, ticker()).list().length, 1);
});

test('export puis import : fusion, la plus récente l\'emporte', () => {
  const clock = ticker();
  const s1 = createMissionStore(fakeStorage(), clock);
  const a = s1.create({ name: 'A' });
  const json = s1.exportJSON();
  assert.equal(JSON.parse(json).format, EXPORT_FORMAT);

  const s2 = createMissionStore(fakeStorage(), clock);
  assert.deepEqual(s2.importJSON(json), { added: 1, updated: 0, skipped: 0 });
  assert.deepEqual(s2.importJSON(json), { added: 0, updated: 0, skipped: 1 });

  s1.save({ ...a, name: 'A2' });
  assert.deepEqual(s2.importJSON(s1.exportJSON()), { added: 0, updated: 1, skipped: 0 });
  assert.equal(s2.get(a.id).name, 'A2');
});

test('import : fichiers invalides refusés', () => {
  const st = createMissionStore(fakeStorage(), ticker());
  assert.throws(() => st.importJSON('pas du json'), /illisible/);
  assert.throws(() => st.importJSON('{"format":"autre","missions":[]}'), /non reconnu/);
});

test('stockage indisponible : repli en mémoire', () => {
  const broken = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };
  const st = createMissionStore(broken, ticker());
  const m = st.create({ name: 'A' });
  assert.equal(st.isPersistent, false);
  assert.equal(st.get(m.id).name, 'A');
});

test('structure d\'une nouvelle mission', () => {
  const m = newMission({ now: new Date('2026-10-05T10:00:00Z') });
  assert.match(m.id, /^m_20261005_[0-9a-z]{4}$/);
  assert.equal(m.place.radiusM, 500);
  assert.equal(m.mens.meteo.gustLimitMs, 10.3);
  assert.equal(Object.keys(m.smepp).length, 9);
  assert.equal(Object.keys(m.macloe).length, 6);
  assert.deepEqual(m.admin, { gendrone: 'todo', visualdrone: 'todo' });
});
