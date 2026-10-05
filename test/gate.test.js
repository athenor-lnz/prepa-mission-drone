import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVerifier, verify, isUnlocked, setUnlocked } from '../src/lib/gate.js';

test('vérificateur : bon et mauvais mot de passe', async () => {
  const v = await makeVerifier('une phrase de passe assez longue', 1000);
  assert.equal(await verify('une phrase de passe assez longue', v), true);
  assert.equal(await verify('autre chose', v), false);
  assert.equal(await verify('', v), false);
  assert.ok(!JSON.stringify(v).includes('phrase'));
});

test('sel différent à chaque génération', async () => {
  const a = await makeVerifier('x', 1000);
  const b = await makeVerifier('x', 1000);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test('vérificateur absent ou incomplet : refus', async () => {
  assert.equal(await verify('x', null), false);
  assert.equal(await verify('x', {}), false);
});

test('état déverrouillé en session', () => {
  const m = new Map();
  const store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  assert.equal(isUnlocked(store), false);
  setUnlocked(true, store);
  assert.equal(isUnlocked(store), true);
  setUnlocked(false, store);
  assert.equal(isUnlocked(store), false);
});
