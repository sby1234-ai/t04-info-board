// Local, network-free tests for the pure logic in lib.mjs.
// Run: node scripts/test-logic.mjs
import assert from "node:assert/strict";
import {
  tzDateString,
  parseSourcePayload,
  mergeDailyRecord,
  computeChangeFromRecords,
  staleMinutes,
} from "./lib.mjs";

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    fn();
    pass++;
    console.log("PASS  " + name);
  } catch (e) {
    fail++;
    console.log("FAIL  " + name + "  -- " + e.message);
  }
}

// ---- T04-C20: same KST day, 3 successful runs -> exactly 1 record ----
check("같은 날짜 3번 성공 -> 일별 기록 1건 (T04-C20)", () => {
  const base = { value: 1340, unit: "KRW per 1 USD", source_url: "x", source_observed_at: "2026-09-10T00:00:00.000Z" };
  let records = [];
  // three "runs" on the same KST calendar date (2026-09-10 09:00/12:00/18:00 KST == 00:00/03:00/09:00 UTC)
  records = mergeDailyRecord(records, { ...base, value: 1340.1, fetched_at: "2026-09-10T00:10:00.000Z" });
  records = mergeDailyRecord(records, { ...base, value: 1340.5, fetched_at: "2026-09-10T03:10:00.000Z" });
  records = mergeDailyRecord(records, { ...base, value: 1341.0, fetched_at: "2026-09-10T09:10:00.000Z" });
  assert.equal(records.length, 1);
  assert.equal(records[0].date, "2026-09-10");
  assert.equal(records[0].value, 1341.0); // latest run of the day wins
});

// ---- T04-C21: next KST day -> a new record is added ----
check("다음 날짜 1번 성공 -> 새 일별 기록 추가 (T04-C21)", () => {
  const base = { value: 1341, unit: "KRW per 1 USD", source_url: "x", source_observed_at: "2026-09-10T00:00:00.000Z" };
  let records = [{ date: "2026-09-10", ...base, fetched_at: "2026-09-10T09:10:00.000Z" }];
  // 2026-09-11 09:10 KST == 2026-09-11 00:10 UTC
  records = mergeDailyRecord(records, { ...base, value: 1345.2, fetched_at: "2026-09-11T00:10:00.000Z" });
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((r) => r.date), ["2026-09-10", "2026-09-11"]);
});

// ---- midnight-boundary check: 08:59 UTC vs 09:00 UTC land on different KST dates ----
check("자정 경계 근처 UTC 시각이 올바른 KST 날짜로 분리됨", () => {
  // 2026-09-10 08:59 UTC == 2026-09-10 17:59 KST ; 2026-09-10 15:00 UTC == 2026-09-11 00:00 KST
  assert.equal(tzDateString(new Date("2026-09-10T08:59:00.000Z")), "2026-09-10");
  assert.equal(tzDateString(new Date("2026-09-10T15:00:00.000Z")), "2026-09-11");
});

// ---- schema parsing: a real-shaped payload parses cleanly ----
check("정상 응답 스키마 파싱 성공", () => {
  const payload = {
    result: "success",
    time_last_update_utc: "Wed, 09 Sep 2026 00:02:31 +0000",
    rates: { KRW: 1340.864413 },
  };
  const rec = parseSourcePayload(payload, "2026-09-10T07:15:03.000Z");
  assert.equal(rec.value, 1340.864413);
  assert.equal(rec.unit, "KRW per 1 USD");
  assert.equal(rec.source_observed_at, "2026-09-09T00:02:31.000Z");
  assert.equal(rec.fetched_at, "2026-09-10T07:15:03.000Z");
});

// ---- schema parsing: this is what "형식 변경" (T04-C16) looks like at the parser level ----
check("응답 형식이 바뀌면 명확한 오류로 거부됨 (T04-C16 근거)", () => {
  assert.throws(() => parseSourcePayload({ result: "success", rates: {} }, "2026-09-10T00:00:00Z"), /schema_error/);
  assert.throws(() => parseSourcePayload({ result: "error" }, "2026-09-10T00:00:00Z"), /schema_error/);
  assert.throws(() => parseSourcePayload(null, "2026-09-10T00:00:00Z"), /schema_error/);
});

// ---- T04-C24: change vs. yesterday is recomputed from the two stored records ----
check("어제 대비 변화값이 저장된 두 기록에서 재계산됨 (T04-C24)", () => {
  const records = [
    { date: "2026-09-10", value: 1340.86 },
    { date: "2026-09-11", value: 1345.20 },
  ];
  const change = computeChangeFromRecords(records);
  assert.equal(change.prevDate, "2026-09-10");
  assert.equal(change.todayDate, "2026-09-11");
  assert.ok(Math.abs(change.diff - 4.34) < 1e-9);
  assert.ok(Math.abs(change.pct - (4.34 / 1340.86) * 100) < 1e-9);
});

check("기록이 1건뿐이면 변화값 계산 불가(null)", () => {
  assert.equal(computeChangeFromRecords([{ date: "2026-09-10", value: 1340 }]), null);
  assert.equal(computeChangeFromRecords([]), null);
});

// ---- staleness ----
check("오래된 값 경과 시간(분) 계산", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");
  assert.equal(staleMinutes("2026-09-10T09:00:00.000Z", now), 180);
  assert.equal(staleMinutes(null, now), null);
});

console.log("\n=== " + pass + "/" + (pass + fail) + " passed ===");
process.exit(fail > 0 ? 1 : 0);
