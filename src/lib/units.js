// Conversions d'unités. Chaque grandeur a une unité de base ; les facteurs convertissent vers la base.

export const CATEGORIES = {
  length: { label: 'Longueur / altitude', units: { m: 1, km: 1000, ft: 0.3048, NM: 1852, SM: 1609.344 } },
  speed: { label: 'Vitesse', units: { 'm/s': 1, 'km/h': 1 / 3.6, kt: 1852 / 3600, mph: 0.44704 } },
  pressure: { label: 'Pression', units: { hPa: 1, inHg: 33.8638866667, mmHg: 1.33322387415 } }
};

/** Convertit une valeur d'une unité à une autre de la même grandeur. */
export function convert(category, value, from, to) {
  const units = CATEGORIES[category]?.units;
  if (!units || !(from in units) || !(to in units)) throw new Error(`Unité inconnue : ${category} ${from} -> ${to}`);
  return (value * units[from]) / units[to];
}

/** Toutes les conversions d'une valeur, hors unité source. */
export function convertAll(category, value, from) {
  const units = CATEGORIES[category].units;
  const out = {};
  for (const to of Object.keys(units)) if (to !== from) out[to] = convert(category, value, from, to);
  return out;
}

/** Nombre lisible : pas de zéros inutiles, précision adaptée à l'ordre de grandeur. */
export function formatNumber(x) {
  if (!Number.isFinite(x)) return '—';
  const a = Math.abs(x);
  const s = a >= 1000 ? x.toFixed(1) : a >= 1 ? x.toFixed(3) : x.toFixed(5);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

export const msToKt = (v) => convert('speed', v, 'm/s', 'kt');
export const ktToMs = (v) => convert('speed', v, 'kt', 'm/s');
