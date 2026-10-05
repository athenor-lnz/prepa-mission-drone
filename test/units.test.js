import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, convertAll, formatNumber, msToKt, ktToMs } from '../src/lib/units.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('longueurs', () => {
  close(convert('length', 1, 'NM', 'm'), 1852);
  close(convert('length', 400, 'ft', 'm'), 121.92);
  close(convert('length', 120, 'm', 'ft'), 393.7007874, 1e-6);
  close(convert('length', 1, 'SM', 'km'), 1.609344);
});

test('vitesses', () => {
  close(convert('speed', 10, 'm/s', 'km/h'), 36);
  close(convert('speed', 10, 'm/s', 'kt'), 19.4384449, 1e-6);
  close(msToKt(ktToMs(15)), 15);
  close(convert('speed', 1, 'mph', 'km/h'), 1.609344);
});

test('pressions', () => {
  close(convert('pressure', 1013.25, 'hPa', 'inHg'), 29.9212, 1e-3);
  close(convert('pressure', 29.92, 'inHg', 'hPa'), 1013.2, 0.1);
});

test('convertAll exclut l\'unité source', () => {
  const r = convertAll('speed', 10, 'm/s');
  assert.deepEqual(Object.keys(r).sort(), ['km/h', 'kt', 'mph']);
});

test('unité inconnue', () => {
  assert.throws(() => convert('length', 1, 'm', 'parsec'));
  assert.throws(() => convert('poids', 1, 'kg', 'g'));
});

test('formatNumber', () => {
  assert.equal(formatNumber(1000), '1000');
  assert.equal(formatNumber(1852.04), '1852');
  assert.equal(formatNumber(0.3048), '0.3048');
  assert.equal(formatNumber(19.43844), '19.438');
  assert.equal(formatNumber(NaN), '—');
});
