// Recherche d'adresse : Géoplateforme (France), puis Nominatim (OpenStreetMap) hors France ou en secours.
import { getJson } from './http.js';
import { parseLatLon } from '../lib/geo.js';

export function geoplateformeUrl(q) {
  return `https://data.geopf.fr/geocodage/search?${new URLSearchParams({ q, limit: '5' })}`;
}
export function nominatimUrl(q) {
  return `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'jsonv2', limit: '5', 'accept-language': 'fr' })}`;
}

export function parseGeoplateforme(json) {
  return (json?.features || [])
    .map((f) => ({ label: String(f.properties?.label ?? ''), lon: f.geometry?.coordinates?.[0], lat: f.geometry?.coordinates?.[1] }))
    .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lon));
}
export function parseNominatim(json) {
  return (Array.isArray(json) ? json : [])
    .map((r) => ({ label: String(r.display_name ?? ''), lat: Number(r.lat), lon: Number(r.lon) }))
    .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lon));
}

/** Coordonnées saisies -> résultat direct ; sinon recherche d'adresse. */
export async function search(query, opts = {}) {
  const q = String(query ?? '').trim();
  if (q.length < 2) return { ok: true, results: [], source: null };
  const c = parseLatLon(q);
  if (c) return { ok: true, results: [{ label: 'Coordonnées saisies', lat: c.lat, lon: c.lon }], source: 'saisie' };
  const a = await getJson(geoplateformeUrl(q), { source: 'Géoplateforme (IGN)', ...opts });
  if (a.ok) {
    const results = parseGeoplateforme(a.data);
    if (results.length) return { ok: true, results, source: a.source };
  }
  const b = await getJson(nominatimUrl(q), { source: 'Nominatim (OpenStreetMap)', ...opts });
  if (b.ok) return { ok: true, results: parseNominatim(b.data), source: b.source };
  return { ok: false, error: a.ok ? b.error : a.error, results: [] };
}
