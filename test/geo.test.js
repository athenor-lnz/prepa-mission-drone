import test from 'node:test';
import assert from 'node:assert/strict';
import { toDD, toDDM, toDMS, toUTM, toUTMParts, fromUTM, parseLatLon, formatAll } from '../src/lib/geo.js';

const close = (a, b, eps = 1e-5) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('formats pour Toulouse (43.6045, 1.4442)', () => {
  assert.equal(toDD(43.6045, 1.4442), '43.604500, 1.444200');
  assert.equal(toDDM(43.6045, 1.4442), 'N 43° 36.2700′  E 1° 26.6520′');
  assert.equal(toDMS(43.6045, 1.4442), 'N 43° 36′ 16.20″  E 1° 26′ 39.12″');
  assert.equal(toUTM(43.6045, 1.4442), '31T 374439 E 4829123 N');
});

test('hémisphères sud et ouest (Nouméa)', () => {
  const s = formatAll(-22.2758, 166.458);
  assert.match(s.dms, /^S 22°/);
  assert.match(s.dms, /E 166°/);
  assert.match(s.utm, /^58K /);
  assert.match(formatAll(48.85, -2.3).dms, /W 2°/);
});

test('pas de 60,00 secondes après arrondi', () => {
  assert.equal(toDMS(10.999999999, 0), 'N 11° 0′ 0.00″  E 0° 0′ 0.00″');
});

test('aller-retour UTM <-> WGS 84', () => {
  for (const [lat, lon] of [[43.6045, 1.4442], [-22.2758, 166.458], [48.8566, 2.3522], [-21.1151, 55.5364]]) {
    const p = toUTMParts(lat, lon);
    const r = fromUTM(p.zone, p.band, p.easting, p.northing);
    close(r.lat, lat, 2e-5);
    close(r.lon, lon, 2e-5);
  }
});

test('parseLatLon : décimal', () => {
  for (const s of ['43.6045, 1.4442', '43.6045,1.4442', '43,6045 1,4442', '43.6045 1.4442', ' 43.6045 ; 1.4442 ']) {
    const r = parseLatLon(s);
    assert.ok(r, s);
    close(r.lat, 43.6045); close(r.lon, 1.4442);
  }
  const neg = parseLatLon('-22.2758, 166.458');
  close(neg.lat, -22.2758);
});

test('parseLatLon : DMS et DDM avec hémisphères', () => {
  let r = parseLatLon('N 43° 36′ 16.20″ E 1° 26′ 39.12″');
  close(r.lat, 43.6045); close(r.lon, 1.4442);
  r = parseLatLon(`43°36'16.2"N 1°26'39.12"E`);
  close(r.lat, 43.6045); close(r.lon, 1.4442);
  r = parseLatLon('43°36.27\'N 1°26.652\'E');
  close(r.lat, 43.6045); close(r.lon, 1.4442);
  r = parseLatLon('S 22 16 33 E 166 27 29');
  close(r.lat, -22.275833, 1e-4);
  r = parseLatLon('48.85 N 2.3 W');
  close(r.lon, -2.3);
});

test('parseLatLon : UTM', () => {
  const r = parseLatLon('31T 374439 4829123');
  close(r.lat, 43.6045, 2e-4); close(r.lon, 1.4442, 2e-4);
  assert.ok(parseLatLon('31T 374439 E 4829123 N'));
});

test('parseLatLon : refus', () => {
  for (const s of ['', 'abc', '91, 0', '0, 181', '43.6', '1 2 3', null, 12]) assert.equal(parseLatLon(s), null, String(s));
});
