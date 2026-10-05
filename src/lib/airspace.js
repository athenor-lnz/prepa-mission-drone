// Espace aérien : restrictions UAS de la Géoplateforme (WFS) — test point-dans-polygone côté navigateur.
// La couche donne des « limites » (hauteur max ou interdiction), PAS la liste des CTR/TMA/NOTAM :
// elle ne dit donc pas à elle seule « zone contrôlée oui/non » (voir docs/05).

export const WFS_LAYER = 'TRANSPORTS.DRONES.RESTRICTIONS:carte_restriction_drones_lf';

/** Emprise de la couche : France métropolitaine et Corse. En dehors, la source ne couvre pas. */
export function inUasCoverage(lat, lon) {
  return lat >= 41.0 && lat <= 51.6 && lon >= -5.6 && lon <= 10.0;
}

/** URL WFS pour une petite emprise autour du point (ordre BBOX : lon,lat). */
export function restrictionsUrl(lat, lon, delta = 0.0005) {
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].map((v) => v.toFixed(6)).join(',');
  const p = new URLSearchParams({
    SERVICE: 'WFS', VERSION: '2.0.0', REQUEST: 'GetFeature',
    TYPENAMES: WFS_LAYER, OUTPUTFORMAT: 'application/json', SRSNAME: 'EPSG:4326',
    BBOX: `${bbox},EPSG:4326`, COUNT: '50'
  });
  return `https://data.geopf.fr/wfs/ows?${p}`;
}

function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Polygone GeoJSON : anneau extérieur moins les trous. Coordonnées [lon, lat]. */
export function inPolygon(rings, lon, lat) {
  if (!rings?.length || !inRing(rings[0], lon, lat)) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(rings[k], lon, lat)) return false;
  return true;
}

export function inGeometry(geometry, lon, lat) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return inPolygon(geometry.coordinates, lon, lat);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((p) => inPolygon(p, lon, lat));
  return false;
}

/** « 30 m » -> 30 ; « Vol interdit » -> 0 ; sinon null (non interprétable). */
export function limitToMeters(limit) {
  if (typeof limit !== 'string') return null;
  if (/interdit/i.test(limit)) return 0;
  const m = /(\d+(?:[.,]\d+)?)\s*m\b/i.exec(limit);
  return m ? Number(m[1].replace(',', '.')) : null;
}

/** Zones de la réponse WFS qui contiennent réellement le point. */
export function zonesAtPoint(json, lat, lon) {
  const feats = Array.isArray(json?.features) ? json.features : [];
  return feats
    .filter((f) => inGeometry(f.geometry, lon, lat))
    .map((f) => ({
      id: String(f.id ?? ''),
      limit: String(f.properties?.limite ?? '').trim() || 'limite non précisée',
      remark: String(f.properties?.remarque ?? '').trim(),
      meters: limitToMeters(f.properties?.limite)
    }));
}

/** Synthèse : 'forbidden' | 'limited' | 'unknown' | 'none'. 'none' = aucune zone cartographiée en ce point. */
export function summarizeZones(zones) {
  if (!zones.length) return { level: 'none', maxHeightM: null };
  if (zones.some((z) => z.meters === 0)) return { level: 'forbidden', maxHeightM: 0 };
  const heights = zones.map((z) => z.meters).filter((v) => v !== null);
  if (heights.length === zones.length) return { level: 'limited', maxHeightM: Math.min(...heights) };
  return { level: 'unknown', maxHeightM: heights.length ? Math.min(...heights) : null };
}
