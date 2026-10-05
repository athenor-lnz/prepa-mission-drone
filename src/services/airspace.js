import { getJson } from './http.js';
import { inUasCoverage, restrictionsUrl, zonesAtPoint } from '../lib/airspace.js';

/** Restrictions UAS à un point. Hors couverture : échec explicite, jamais « rien à signaler ». */
export async function fetchRestrictions(lat, lon, opts) {
  if (!inUasCoverage(lat, lon)) {
    return { ok: false, error: 'Lieu hors de la zone couverte par la source (France métropolitaine et Corse).', manualAllowed: true, outOfCoverage: true };
  }
  const r = await getJson(restrictionsUrl(lat, lon), { source: 'Géoplateforme · restrictions UAS', ...opts });
  if (!r.ok) return r;
  if (!Array.isArray(r.data?.features)) return { ok: false, error: 'Réponse inattendue du service.', manualAllowed: true, source: r.source };
  return { ...r, data: zonesAtPoint(r.data, lat, lon) };
}
