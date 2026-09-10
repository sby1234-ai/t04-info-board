// Runs once per GitHub Actions execution (daily cron, or a manual
// "Run workflow" click). Fetches the real public exchange-rate source,
// updates data/daily.json (one row per KST calendar date) and
// data/state.json (last known good + last error), and never deletes or
// blanks a previously-good value when the fetch fails.
import { readFile, writeFile } from "node:fs/promises";
import { SOURCE_URL, parseSourcePayload, mergeDailyRecord, tzDateString } from "./lib.mjs";

const DAILY_PATH = new URL("../data/daily.json", import.meta.url);
const STATE_PATH = new URL("../data/state.json", import.meta.url);
const TIMEOUT_MS = 10_000;

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch (e) {
    return fallback;
  }
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const fetchedAtIso = new Date().toISOString();
  const daily = await readJson(DAILY_PATH, { records: [] });
  const state = await readJson(STATE_PATH, { lastGood: null, lastError: null, lastCheckedAt: null });

  state.lastCheckedAt = fetchedAtIso;

  let httpRes;
  try {
    httpRes = await fetchWithTimeout(SOURCE_URL, TIMEOUT_MS);
  } catch (e) {
    const type = e.name === "AbortError" ? "timeout" : "network";
    state.lastError = { type, message: String(e.message || e), at: fetchedAtIso };
    await writeJson(STATE_PATH, state);
    console.error("FETCH FAILED (" + type + "):", e.message || e);
    process.exit(0); // not a script bug — a real external failure is an expected, handled outcome
  }

  if (!httpRes.ok) {
    const type = httpRes.status === 401 || httpRes.status === 403 ? "auth_" + httpRes.status
      : httpRes.status === 429 ? "rate_limited"
      : "http_" + httpRes.status;
    state.lastError = { type, message: "HTTP " + httpRes.status, at: fetchedAtIso };
    await writeJson(STATE_PATH, state);
    console.error("FETCH FAILED (" + type + "): HTTP " + httpRes.status);
    process.exit(0);
  }

  let record;
  try {
    const json = await httpRes.json();
    record = parseSourcePayload(json, fetchedAtIso);
  } catch (e) {
    state.lastError = { type: "schema_error", message: String(e.message || e), at: fetchedAtIso };
    await writeJson(STATE_PATH, state);
    console.error("FETCH FAILED (schema_error):", e.message || e);
    process.exit(0);
  }

  // success: update last-good, clear the error, merge into the daily log
  state.lastGood = record;
  state.lastError = null;
  const updatedDaily = { records: mergeDailyRecord(daily.records || [], record) };

  await writeJson(DAILY_PATH, updatedDaily);
  await writeJson(STATE_PATH, state);
  console.log("OK — recorded", tzDateString(new Date(fetchedAtIso)), record.value, record.unit);
}

async function writeJson(url, obj) {
  await writeFile(url, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

main().catch((e) => {
  console.error("UNEXPECTED SCRIPT ERROR:", e);
  process.exit(1);
});
