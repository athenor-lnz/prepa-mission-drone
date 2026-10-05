// Heures de mission : saisies et stockées en HEURE LOCALE DU LIEU, au format « YYYY-MM-DDTHH:MM ».
// Open-Meteo (timezone=auto) renvoie aussi des heures locales du lieu, la comparaison de chaînes suffit.

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const pad = (n) => String(n).padStart(2, '0');

export const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isLocalDateTime(s) {
  if (typeof s !== 'string') return false;
  const m = LOCAL_RE.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Format d'un champ datetime-local à partir de composantes de l'horloge de l'appareil. */
export function deviceLocalInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Ajoute des minutes à une heure locale (sans notion de fuseau ni de changement d'heure). */
export function addMinutes(local, minutes) {
  if (!isLocalDateTime(local)) return local;
  const ms = Date.parse(`${local}:00Z`) + minutes * 60000;
  return new Date(ms).toISOString().slice(0, 16);
}

/** Créneau par défaut : prochaine heure pleine, durée 2 h. */
export function defaultWindow(now = new Date()) {
  const next = new Date(now.getTime());
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  const start = deviceLocalInput(next);
  return { start, end: addMinutes(start, 120) };
}

/** « mar. 6 oct. · 14:00 » */
export function formatLocal(local) {
  if (!isLocalDateTime(local)) return '—';
  const [y, mo, d, h, mi] = LOCAL_RE.exec(local).slice(1).map(Number);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${JOURS[dow]} ${d} ${MOIS[mo - 1]} · ${pad(h)}:${pad(mi)}`;
}

export function formatTimeOnly(local) {
  return isLocalDateTime(local) ? local.slice(11, 16) : '—';
}

/** « 14:00 – 16:30 » si même jour, sinon avec dates. */
export function formatRange(start, end) {
  if (!isLocalDateTime(start)) return 'créneau à définir';
  if (!isLocalDateTime(end)) return formatLocal(start);
  if (start.slice(0, 10) === end.slice(0, 10)) return `${formatLocal(start)} – ${end.slice(11, 16)}`;
  return `${formatLocal(start)} → ${formatLocal(end)}`;
}

/** Heure locale du lieu -> millisecondes UTC, avec le décalage (secondes) donné par Open-Meteo. */
export function localToUtcMs(local, utcOffsetSeconds) {
  return Date.parse(`${local}:00Z`) - utcOffsetSeconds * 1000;
}

export function formatClock(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
