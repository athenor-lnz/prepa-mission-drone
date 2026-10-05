// Coordonnées : analyse (DD, DDM, DMS, UTM) et formatage. WGS 84.

const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);

const num = (s) => parseFloat(String(s).replace(',', '.'));
const validLat = (v) => Number.isFinite(v) && Math.abs(v) <= 90;
const validLon = (v) => Number.isFinite(v) && Math.abs(v) <= 180;

/** UTM -> { lat, lon }. band : lettre de bande (C..X). */
export function fromUTM(zone, band, easting, northing) {
  const north = String(band).toUpperCase() >= 'N';
  const x = easting - 500000;
  const y = north ? northing : northing - 1e7;
  const M = y / K0;
  const mu = M / (A * (1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const s = Math.sin(phi1);
  const N1 = A / Math.sqrt(1 - E2 * s * s);
  const T1 = Math.tan(phi1) ** 2;
  const C1 = EP2 * Math.cos(phi1) ** 2;
  const R1 = A * (1 - E2) / Math.pow(1 - E2 * s * s, 1.5);
  const D = x / (N1 * K0);
  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const lon = lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5 / 120) / Math.cos(phi1);
  return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
}

/** { lat, lon } -> { zone, band, easting, northing } (arrondis au mètre). */
export function toUTMParts(lat, lon) {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const lam = lon * Math.PI / 180;
  const N = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = EP2 * Math.cos(phi) ** 2;
  const a = Math.cos(phi) * (lam - lon0);
  const M = A * ((1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256) * phi
    - (3 * E2 / 8 + 3 * E2 ** 2 / 32 + 45 * E2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * E2 ** 2 / 256 + 45 * E2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * E2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = K0 * N * (a + (1 - T + C) * a ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * a ** 5 / 120) + 500000;
  let y = K0 * (M + N * Math.tan(phi) * (a * a / 2 + (5 - T + 9 * C + 4 * C * C) * a ** 4 / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * a ** 6 / 720));
  if (lat < 0) y += 1e7;
  const band = 'CDEFGHJKLMNPQRSTUVWX'[Math.max(0, Math.min(19, Math.floor((lat + 80) / 8)))];
  return { zone, band, easting: Math.round(x), northing: Math.round(y) };
}

export function toUTM(lat, lon) {
  const p = toUTMParts(lat, lon);
  return `${p.zone}${p.band} ${p.easting} E ${p.northing} N`;
}

const hemi = (v, isLat) => (isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W'));

export function toDD(lat, lon, decimals = 6) {
  return `${lat.toFixed(decimals)}, ${lon.toFixed(decimals)}`;
}

function ddm(v, isLat) {
  const tot = Math.round(Math.abs(v) * 600000); // 1e-4 minute
  const d = Math.floor(tot / 600000);
  const min = (tot % 600000) / 10000;
  return `${hemi(v, isLat)} ${d}° ${min.toFixed(4)}′`;
}
export function toDDM(lat, lon) {
  return `${ddm(lat, true)}  ${ddm(lon, false)}`;
}

function dms(v, isLat) {
  const cs = Math.round(Math.abs(v) * 360000); // centièmes de seconde
  const d = Math.floor(cs / 360000);
  const rem = cs % 360000;
  const m = Math.floor(rem / 6000);
  const s = (rem % 6000) / 100;
  return `${hemi(v, isLat)} ${d}° ${m}′ ${s.toFixed(2)}″`;
}
export function toDMS(lat, lon) {
  return `${dms(lat, true)}  ${dms(lon, false)}`;
}

/** Tous les formats d'un coup. */
export function formatAll(lat, lon) {
  return { dd: toDD(lat, lon), ddm: toDDM(lat, lon), dms: toDMS(lat, lon), utm: toUTM(lat, lon) };
}

/**
 * Analyse une saisie libre. Retourne { lat, lon } ou null.
 * Accepte : "43.6045, 1.4442" · "43,6045 1,4442" · "N 43° 36′ 16.2″ E 1° 26′ 39.12″"
 * · "43°36.27'N 1°26.652'E" · "31T 374439 4829123" · "31T 374439 E 4829123 N".
 */
export function parseLatLon(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s) return null;

  const u = s.match(/^(\d{1,2})\s*([C-HJ-NP-X])\s+(\d{5,7})\s*E?\s*[,;]?\s*(\d{6,8})\s*N?$/i);
  if (u) {
    const r = fromUTM(Number(u[1]), u[2], Number(u[3]), Number(u[4]));
    return validLat(r.lat) && validLon(r.lon) ? r : null;
  }

  s = s.replace(/[′’']/g, ' ').replace(/[″”"]/g, ' ').replace(/[°º]/g, ' ');

  if (/[NSEWO]/i.test(s)) {
    const tokens = [...s.matchAll(/([NSEWO])|([^NSEWO]+)/gi)].map((m) => (m[1] ? { l: m[1].toUpperCase() } : { t: m[2] }));
    const groups = [];
    for (let i = 0; i < tokens.length; i++) {
      if (!tokens[i].l) continue;
      const before = tokens[i - 1] && tokens[i - 1].t && !groups.some((g) => g.t === tokens[i - 1].t) ? tokens[i - 1].t : null;
      const after = tokens[i + 1] && tokens[i + 1].t ? tokens[i + 1].t : null;
      const text = (tokens[0].l ? after : before) ?? after ?? before;
      if (text) groups.push({ l: tokens[i].l, t: text });
    }
    if (groups.length !== 2) return null;
    let lat = null;
    let lon = null;
    for (const g of groups) {
      const parts = (g.t.match(/\d+(?:[.,]\d+)?/g) || []).map(num);
      if (!parts.length || parts.length > 3) return null;
      const [d, m = 0, sec = 0] = parts;
      let v = d + m / 60 + sec / 3600;
      if (g.l === 'S' || g.l === 'W' || g.l === 'O') v = -v;
      if (g.l === 'N' || g.l === 'S') lat = v; else lon = v;
    }
    return validLat(lat) && validLon(lon) ? { lat, lon } : null;
  }

  let parts;
  if (s.includes(';')) parts = s.split(';');
  else if (/\s/.test(s)) parts = s.split(/\s*,\s+|\s+/);
  else parts = s.split(',');
  parts = parts.map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = num(parts[0].replace(/,$/, ''));
  const lon = num(parts[1]);
  return validLat(lat) && validLon(lon) ? { lat, lon } : null;
}
