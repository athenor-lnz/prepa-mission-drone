import { getJson } from './http.js';
import { meteoUrl, parseOpenMeteo, KP_URL, parseKp } from '../lib/weather.js';

export async function fetchForecast(lat, lon, opts) {
  const r = await getJson(meteoUrl(lat, lon), { source: 'Open-Meteo', ...opts });
  if (!r.ok) return r;
  try { return { ...r, data: parseOpenMeteo(r.data) }; } catch (e) { return { ok: false, error: e.message, manualAllowed: true, source: r.source }; }
}

export async function fetchKp(opts) {
  const r = await getJson(KP_URL, { source: 'NOAA SWPC', ...opts });
  if (!r.ok) return r;
  try { return { ...r, data: parseKp(r.data) }; } catch (e) { return { ok: false, error: e.message, manualAllowed: true, source: r.source }; }
}
