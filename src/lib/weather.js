// Météo : construction de l'URL Open-Meteo, lecture de la réponse, extraction du créneau, Kp NOAA.
// Unités internes : m/s, mètres, °C, % ; direction en degrés d'où vient le vent.

import { localToUtcMs } from './time.js';

export const HOURLY_VARS = [
  'temperature_2m', 'precipitation_probability', 'visibility', 'cloud_cover',
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'wind_speed_80m'
];

export function meteoUrl(lat, lon, days = 7) {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: HOURLY_VARS.join(','),
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: String(days)
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Lit la réponse Open-Meteo. Lève une erreur si la structure est inattendue. */
export function parseOpenMeteo(json) {
  const h = json?.hourly;
  if (!h || !Array.isArray(h.time) || !h.time.length) throw new Error('Réponse météo inattendue.');
  const hours = h.time.map((t, i) => ({
    t,
    wind: num(h.wind_speed_10m?.[i]),
    gust: num(h.wind_gusts_10m?.[i]),
    dir: num(h.wind_direction_10m?.[i]),
    wind80: num(h.wind_speed_80m?.[i]),
    temp: num(h.temperature_2m?.[i]),
    pop: num(h.precipitation_probability?.[i]),
    vis: num(h.visibility?.[i]),
    cloud: num(h.cloud_cover?.[i])
  }));
  return { tz: json.timezone || null, utcOffsetSeconds: num(json.utc_offset_seconds) ?? 0, hours };
}

/** Heures couvrant [start, end[ (heures locales du lieu). Une heure partiellement couverte compte. */
export function slotsForWindow(hours, start, end) {
  if (!Array.isArray(hours) || !start) return [];
  const first = `${start.slice(0, 13)}:00`;
  const last = end && end > start ? end : null;
  return hours
    .filter((h) => h.t >= first && (last ? h.t < last : h.t === first))
    .map((h) => ({ ...h, hour: h.t.slice(11, 16) }));
}

/** Heures autour du créneau pour le graphique (marge en heures). */
export function chartHours(hours, start, end, margin = 3) {
  if (!Array.isArray(hours) || !start) return [];
  const slots = slotsForWindow(hours, start, end);
  if (!slots.length) return [];
  const i0 = hours.findIndex((h) => h.t === slots[0].t);
  const i1 = hours.findIndex((h) => h.t === slots[slots.length - 1].t);
  return hours.slice(Math.max(0, i0 - margin), Math.min(hours.length, i1 + margin + 1)).map((h) => ({ ...h, hour: h.t.slice(11, 16) }));
}

/** True si le créneau n'est pas entièrement couvert par les prévisions. */
export function windowCovered(hours, start, end) {
  if (!hours?.length || !start) return false;
  const last = hours[hours.length - 1].t;
  return start >= hours[0].t.slice(0, 13) + ':00' && (end || start) <= addHourStr(last);
}
function addHourStr(t) {
  return new Date(Date.parse(`${t}:00Z`) + 3600000).toISOString().slice(0, 16);
}

/** Résumé d'un créneau : valeurs max / min utiles. */
export function summarize(slots) {
  if (!slots.length) return null;
  const vals = (k) => slots.map((s) => s[k]).filter((v) => v !== null && v !== undefined);
  const max = (k) => (vals(k).length ? Math.max(...vals(k)) : null);
  const min = (k) => (vals(k).length ? Math.min(...vals(k)) : null);
  const worst = slots.reduce((a, s) => ((s.gust ?? -1) > (a.gust ?? -1) ? s : a), slots[0]);
  return {
    wind: max('wind'), gust: max('gust'), dir: worst.dir, wind80: max('wind80'),
    tempMin: min('temp'), tempMax: max('temp'), pop: max('pop'), vis: min('vis'), cloud: max('cloud')
  };
}

/** Points cardinaux français pour une direction en degrés. */
export function compass(deg) {
  if (!Number.isFinite(deg)) return '—';
  const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return names[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

// --- Indice Kp (NOAA SWPC) ---

export const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

/** Accepte un tableau d'objets {time_tag, kp} ou un tableau de tableaux avec ligne d'en-tête. */
export function parseKp(json) {
  if (!Array.isArray(json)) throw new Error('Réponse Kp inattendue.');
  const rows = Array.isArray(json[0]) ? json.slice(1).map((r) => ({ time_tag: r[0], kp: r[1] })) : json;
  return rows
    .map((r) => ({ t: String(r.time_tag).replace(' ', 'T').slice(0, 19), kp: Number(r.kp) }))
    .filter((r) => r.t.length >= 16 && Number.isFinite(r.kp));
}

/** Kp max sur le créneau (blocs de 3 h en UTC). Null si le créneau sort des données. */
export function kpForWindow(entries, start, end, utcOffsetSeconds) {
  if (!entries?.length || !start) return null;
  const a = localToUtcMs(start, utcOffsetSeconds);
  const b = end && end > start ? localToUtcMs(end, utcOffsetSeconds) : a + 1;
  const hits = entries.filter((e) => {
    const t0 = Date.parse(`${e.t}Z`);
    return t0 < b && t0 + 3 * 3600000 > a;
  });
  return hits.length ? Math.max(...hits.map((e) => e.kp)) : null;
}

export function kpStatus(kp) {
  if (!Number.isFinite(kp)) return 'unknown';
  if (kp >= 5) return 'nogo';
  if (kp >= 4) return 'warn';
  return 'go';
}

export const KP_LABEL = { go: 'calme', warn: 'agité', nogo: 'orage géomagnétique', unknown: 'indisponible' };
