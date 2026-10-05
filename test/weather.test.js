import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalDateTime, addMinutes, formatLocal, formatRange, localToUtcMs, defaultWindow } from '../src/lib/time.js';
import { meteoUrl, parseOpenMeteo, slotsForWindow, chartHours, summarize, compass, parseKp, kpForWindow, kpStatus, windowCovered } from '../src/lib/weather.js';

const sample = {
  timezone: 'Europe/Paris', utc_offset_seconds: 7200,
  hourly: {
    time: ['2026-10-06T12:00', '2026-10-06T13:00', '2026-10-06T14:00', '2026-10-06T15:00', '2026-10-06T16:00', '2026-10-06T17:00'],
    wind_speed_10m: [3, 4, 4.5, 5, 5.5, 6], wind_gusts_10m: [5, 6, 7, 7.5, 8, 11],
    wind_direction_10m: [230, 230, 240, 240, 250, 260], temperature_2m: [18, 19, 20, 20, 19, 18],
    precipitation_probability: [0, 0, 10, 10, 20, 40], visibility: [20000, 20000, 18000, 18000, 15000, 10000],
    cloud_cover: [10, 20, 30, 30, 40, 60], wind_speed_80m: [5, 6, 6, 7, 7, 8]
  }
};

test('isLocalDateTime valide strictement', () => {
  assert.ok(isLocalDateTime('2026-10-06T14:00'));
  assert.ok(!isLocalDateTime('2026-02-30T14:00'));
  assert.ok(!isLocalDateTime('2026-10-06 14:00'));
  assert.ok(!isLocalDateTime(''));
});

test('addMinutes traverse minuit et fin de mois', () => {
  assert.equal(addMinutes('2026-10-31T23:30', 60), '2026-11-01T00:30');
  assert.equal(addMinutes('2026-10-06T14:00', 150), '2026-10-06T16:30');
});

test('formatLocal et formatRange', () => {
  assert.equal(formatLocal('2026-10-06T14:00'), 'mar. 6 oct. · 14:00');
  assert.equal(formatRange('2026-10-06T14:00', '2026-10-06T16:30'), 'mar. 6 oct. · 14:00 – 16:30');
  assert.match(formatRange('2026-10-06T22:00', '2026-10-07T02:00'), /→/);
  assert.equal(formatRange('', ''), 'créneau à définir');
});

test('localToUtcMs applique le décalage du lieu (Nouméa UTC+11)', () => {
  assert.equal(new Date(localToUtcMs('2026-10-06T09:00', 11 * 3600)).toISOString(), '2026-10-05T22:00:00.000Z');
  assert.equal(new Date(localToUtcMs('2026-10-06T09:00', 7200)).toISOString(), '2026-10-06T07:00:00.000Z');
});

test('defaultWindow : heure pleine suivante, durée 2 h', () => {
  const w = defaultWindow(new Date(2026, 9, 6, 13, 20));
  assert.equal(w.start, '2026-10-06T14:00');
  assert.equal(w.end, '2026-10-06T16:00');
});

test('meteoUrl demande des m/s et le fuseau automatique', () => {
  const u = meteoUrl(43.6045, 1.4442);
  assert.match(u, /wind_speed_unit=ms/);
  assert.match(u, /timezone=auto/);
  assert.match(u, /wind_gusts_10m/);
});

test('parseOpenMeteo lit les heures et refuse une réponse vide', () => {
  const r = parseOpenMeteo(sample);
  assert.equal(r.tz, 'Europe/Paris');
  assert.equal(r.hours.length, 6);
  assert.equal(r.hours[2].gust, 7);
  assert.throws(() => parseOpenMeteo({}), /inattendue/);
  assert.equal(parseOpenMeteo({ hourly: { time: ['2026-10-06T12:00'] } }).hours[0].gust, null);
});

test('slotsForWindow : une heure partiellement couverte compte, la borne de fin exclue', () => {
  const { hours } = parseOpenMeteo(sample);
  assert.deepEqual(slotsForWindow(hours, '2026-10-06T14:00', '2026-10-06T16:30').map((s) => s.hour), ['14:00', '15:00', '16:00']);
  assert.deepEqual(slotsForWindow(hours, '2026-10-06T14:00', '2026-10-06T16:00').map((s) => s.hour), ['14:00', '15:00']);
  assert.deepEqual(slotsForWindow(hours, '2026-10-06T14:20', '2026-10-06T15:10').map((s) => s.hour), ['14:00', '15:00']);
  assert.deepEqual(slotsForWindow(hours, '2026-10-06T14:00', '').map((s) => s.hour), ['14:00']);
  assert.deepEqual(slotsForWindow(hours, '2026-11-01T10:00', '2026-11-01T12:00'), []);
});

test('chartHours ajoute une marge autour du créneau', () => {
  const { hours } = parseOpenMeteo(sample);
  assert.equal(chartHours(hours, '2026-10-06T14:00', '2026-10-06T15:00', 1).length, 3);
});

test('windowCovered détecte un créneau hors prévisions', () => {
  const { hours } = parseOpenMeteo(sample);
  assert.ok(windowCovered(hours, '2026-10-06T14:00', '2026-10-06T16:00'));
  assert.ok(!windowCovered(hours, '2026-10-06T14:00', '2026-10-06T20:00'));
  assert.ok(!windowCovered(hours, '2026-10-09T14:00', '2026-10-09T16:00'));
});

test('summarize et compass', () => {
  const { hours } = parseOpenMeteo(sample);
  const s = summarize(slotsForWindow(hours, '2026-10-06T14:00', '2026-10-06T16:30'));
  assert.equal(s.gust, 8);
  assert.equal(s.dir, 250);
  assert.equal(s.pop, 20);
  assert.equal(s.vis, 15000);
  assert.equal(summarize([]), null);
  assert.equal(compass(230), 'SO');
  assert.equal(compass(0), 'N');
  assert.equal(compass(359), 'N');
  assert.equal(compass(null), '—');
});

test('Kp : objets ou tableaux, fenêtre en UTC, seuils', () => {
  const objs = [
    { time_tag: '2026-10-06T06:00:00', kp: 2.33 }, { time_tag: '2026-10-06T09:00:00', kp: 4.0 }, { time_tag: '2026-10-06T12:00:00', kp: 3.0 }
  ];
  const arr = [['time_tag', 'kp'], ['2026-10-06 06:00:00', '2.33'], ['2026-10-06 09:00:00', '4.00']];
  assert.equal(parseKp(objs).length, 3);
  assert.equal(parseKp(arr)[1].kp, 4);
  assert.throws(() => parseKp({}), /inattendue/);
  const e = parseKp(objs);
  // 12:00 locale (UTC+2) = 10:00 UTC -> bloc 09:00-12:00 (Kp 4)
  assert.equal(kpForWindow(e, '2026-10-06T12:00', '2026-10-06T13:00', 7200), 4);
  assert.equal(kpForWindow(e, '2026-10-10T12:00', '2026-10-10T13:00', 7200), null);
  assert.equal(kpStatus(2), 'go');
  assert.equal(kpStatus(4), 'warn');
  assert.equal(kpStatus(5), 'nogo');
  assert.equal(kpStatus(null), 'unknown');
});
