import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVerdict, slotStatus } from '../src/lib/verdict.js';

const slots = [
  { hour: '09:00', wind: 4, gust: 6 },
  { hour: '10:00', wind: 5, gust: 7 },
  { hour: '11:00', wind: 6, gust: 9 },
  { hour: '12:00', wind: 7, gust: 9 }
];

test('GO sous le seuil', () => {
  const v = computeVerdict(slots, 12);
  assert.equal(v.status, 'go');
  assert.equal(v.maxGust, 9);
  assert.equal(v.maxWind, 7);
  assert.equal(v.ratio, 0.75);
});

test('Prudence au-delà de 85 % du seuil', () => {
  assert.equal(computeVerdict(slots, 10).status, 'warn');
});

test('NO-GO si une heure dépasse', () => {
  const v = computeVerdict(slots, 8);
  assert.equal(v.status, 'nogo');
  assert.deepEqual(v.perSlot.map((p) => p.status), ['go', 'warn', 'nogo', 'nogo']);
});

test('limite exacte : pas de NO-GO', () => {
  assert.equal(slotStatus(12, 12), 'warn');
  assert.equal(slotStatus(12.01, 12), 'nogo');
});

test('seuil de vent moyen optionnel', () => {
  assert.equal(computeVerdict(slots, 12, { windLimit: 6 }).status, 'nogo');
  assert.equal(computeVerdict(slots, 12, { windLimit: 20 }).status, 'go');
});

test('données absentes ou invalides : indéterminé, jamais GO', () => {
  assert.equal(computeVerdict([], 12).status, 'unknown');
  assert.equal(computeVerdict(slots, 0).status, 'unknown');
  assert.equal(computeVerdict([{ hour: '09:00', wind: 4, gust: NaN }], 12).status, 'unknown');
  assert.equal(computeVerdict(null, 12).status, 'unknown');
});
