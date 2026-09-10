// Pure, dependency-free logic shared by the daily fetch script and its tests.
// Kept separate from any network/filesystem code so it can be unit-tested
// without touching the real API or the real data files.

export const TIMEZONE = "Asia/Seoul";
export const SOURCE_NAME = "exchangerate-api.com (open.er-api.com, no API key)";
export const SOURCE_URL = "https://open.er-api.com/v6/latest/USD";
export const UNIT = "KRW per 1 USD";

/** "2026-09-10" style date string in the given IANA timezone for a given Date. */
export function tzDateString(date, timeZone = TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Parse the open.er-api.com response shape into our normalized record shape.
 * Throws a descriptive Error (never returns partial/garbage data) if the
 * response doesn't look like what we expect — this is what T04-C16's
 * "schema changed" failure exercises.
 */
export function parseSourcePayload(json, fetchedAtIso) {
  if (!json || typeof json !== "object") {
    throw new Error("schema_error: response is not a JSON object");
  }
  if (json.result !== "success") {
    throw new Error("schema_error: unexpected result field " + JSON.stringify(json.result));
  }
  const rates = json.rates;
  if (!rates || typeof rates !== "object" || typeof rates.KRW !== "number" || !isFinite(rates.KRW)) {
    throw new Error("schema_error: rates.KRW missing or not a finite number");
  }
  const sourceObservedAt = json.time_last_update_utc;
  if (typeof sourceObservedAt !== "string" || sourceObservedAt.length < 10) {
    throw new Error("schema_error: time_last_update_utc missing or malformed");
  }
  const sourceObservedAtIso = new Date(sourceObservedAt).toISOString();
  if (Number.isNaN(new Date(sourceObservedAtIso).getTime())) {
    throw new Error("schema_error: time_last_update_utc is not a parseable date");
  }
  return {
    value: rates.KRW,
    unit: UNIT,
    source_url: SOURCE_URL,
    source_name: SOURCE_NAME,
    source_observed_at: sourceObservedAtIso,
    fetched_at: fetchedAtIso,
    timezone: TIMEZONE,
  };
}

/**
 * Merge a freshly-fetched record into the existing daily records array,
 * keyed by the record's KST calendar date. Same-day re-runs REPLACE the
 * existing entry for that date (T04-C20: one record per day no matter how
 * many times it succeeds); a new KST date APPENDS a new entry (T04-C21).
 * Returns a NEW array; never mutates the input.
 */
export function mergeDailyRecord(existingRecords, freshRecord) {
  const dateKey = tzDateString(new Date(freshRecord.fetched_at));
  const withoutToday = existingRecords.filter((r) => r.date !== dateKey);
  const entry = { date: dateKey, ...freshRecord };
  return [...withoutToday, entry].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Recompute "change vs. yesterday" directly from the two most recent stored
 * daily records (never trust a cached delta) — this is what T04-C24 checks.
 */
export function computeChangeFromRecords(records) {
  if (!records || records.length < 2) return null;
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const today = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const diff = today.value - prev.value;
  const pct = prev.value !== 0 ? (diff / prev.value) * 100 : null;
  return {
    todayDate: today.date,
    prevDate: prev.date,
    todayValue: today.value,
    prevValue: prev.value,
    diff,
    pct,
  };
}

/** How stale is a lastGood record, in whole minutes, relative to `now`. */
export function staleMinutes(lastGoodFetchedAtIso, now = new Date()) {
  if (!lastGoodFetchedAtIso) return null;
  const ms = now.getTime() - new Date(lastGoodFetchedAtIso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}
