/**
 * Normalize course session dates for MongoDB (Date-only, UTC noon avoids DST edge cases).
 * @param {unknown} value - From req.body: JSON string, array, newline/comma string, or undefined
 * @returns {{ dates?: Date[] }} `dates` omitted = do not update field; `dates: []` = clear
 */
export function parseAvailableDatesFromRequest(value) {
  if (value === undefined) {
    return {};
  }

  let list = [];

  if (Array.isArray(value)) {
    list = value.map((v) => (v == null ? '' : String(v).trim())).filter(Boolean);
  } else if (typeof value === 'string') {
    const t = value.trim();
    if (!t) {
      return { dates: [] };
    }
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        list = parsed.map((v) => (v == null ? '' : String(v).trim())).filter(Boolean);
      } else {
        list = t.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      list = t.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    }
  } else {
    return { dates: [] };
  }

  const dates = [];
  const seen = new Set();

  for (const item of list) {
    const d = dateOnlyUtcFromString(item);
    if (!d) continue;
    const key = d.toISOString().slice(0, 10);
    if (seen.has(key)) continue;
    seen.add(key);
    dates.push(d);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());
  return { dates };
}

/**
 * @param {string} raw
 * @returns {Date | null}
 */
function dateOnlyUtcFromString(raw) {
  const s = String(raw).trim();
  if (!s) return null;

  const isoDay = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    const y = Number(isoDay[1], 10);
    const mo = Number(isoDay[2], 10);
    const d = Number(isoDay[3], 10);
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  }

  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const x = new Date(t);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12, 0, 0));
}
