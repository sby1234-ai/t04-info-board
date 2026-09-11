
// 과제5 로직 검사 S01~S05 — computeRecentStats 단위 테스트 (네트워크 불필요).
// docs/T05-fixed-tests.md에 고정된 검사표와 정확히 대응한다. 이 파일은 AI A가
// 상한 안에서 작성한 것이며, S06~S10(화면 검사 + 회귀 검사)은 AI B가 이어서
// 확인한다 — docs/T05-handoff-AI-A-to-B.md 참고.

import { computeRecentStats } from "./lib.mjs";
import assert from "node:assert/strict";

let passed = 0;
function check(id, actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    console.log(`PASS ${id}`);
    passed++;
  } catch (e) {
    console.log(`FAIL ${id}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// S01
check("S01", computeRecentStats([]), null);

// S02
check("S02", computeRecentStats([{ date: "2026-09-10", value: 1339 }]), {
  count: 1,
  min: 1339,
  max: 1339,
  avg: 1339,
});

// S03
check(
  "S03",
  computeRecentStats([
    { date: "2026-09-10", value: 1339 },
    { date: "2026-09-11", value: 1345.06 },
  ]),
  { count: 2, min: 1339, max: 1345.06, avg: 1342.03 }
);

// S04 — 9 records, dates 09-01..09-09, values 1..9 -> most recent 7 = 09-03..09-09 (values 3..9)
const s04records = [];
for (let i = 1; i <= 9; i++) {
  const day = String(i).padStart(2, "0");
  s04records.push({ date: `2026-09-${day}`, value: i });
}
check("S04", computeRecentStats(s04records), { count: 7, min: 3, max: 9, avg: 6 });

// S05 — duplicate date, last one wins
check(
  "S05",
  computeRecentStats([
    { date: "2026-09-10", value: 100 },
    { date: "2026-09-10", value: 200 },
  ]),
  { count: 1, min: 200, max: 200, avg: 200 }
);

console.log(`\n${passed}/5 (S01-S05) passed`);
if (passed !== 5) process.exit(1);
