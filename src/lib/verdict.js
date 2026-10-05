// Verdict météo GO / Prudence / NO-GO sur un créneau.
// slots : [{ hour:'09:00', wind:4, gust:6, ... }] en m/s. limit : seuil de rafales en m/s.
// Le verdict est une aide à la décision, pas une autorisation.

export const WARN_RATIO = 0.85;

export function slotStatus(gust, limit, warnRatio = WARN_RATIO) {
  if (!Number.isFinite(gust) || !Number.isFinite(limit) || limit <= 0) return 'unknown';
  if (gust > limit) return 'nogo';
  if (gust > limit * warnRatio) return 'warn';
  return 'go';
}

const RANK = { go: 0, warn: 1, nogo: 2 };

export function computeVerdict(slots, limit, { warnRatio = WARN_RATIO, windLimit = null } = {}) {
  if (!Array.isArray(slots) || slots.length === 0 || !(limit > 0)) {
    return { status: 'unknown', maxGust: null, maxWind: null, ratio: null, perSlot: [] };
  }
  const perSlot = slots.map((s) => {
    let status = slotStatus(s.gust, limit, warnRatio);
    if (windLimit > 0 && status !== 'unknown') {
      const w = slotStatus(s.wind, windLimit, warnRatio);
      if (w !== 'unknown' && RANK[w] > RANK[status]) status = w;
    }
    return { hour: s.hour ?? null, status };
  });
  if (perSlot.some((p) => p.status === 'unknown')) {
    return { status: 'unknown', maxGust: null, maxWind: null, ratio: null, perSlot };
  }
  const maxGust = Math.max(...slots.map((s) => s.gust));
  const maxWind = Math.max(...slots.map((s) => s.wind));
  const status = perSlot.reduce((acc, p) => (RANK[p.status] > RANK[acc] ? p.status : acc), 'go');
  return { status, maxGust, maxWind, ratio: maxGust / limit, perSlot };
}

export const LABELS = { go: 'GO', warn: 'Prudence', nogo: 'NO-GO', unknown: 'Indéterminé' };
