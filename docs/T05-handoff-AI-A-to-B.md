# 인수인계 문서 — AI A → AI B

**저장소 버전 ID (AI B가 시작할 커밋)**: GitHub 저장소 첫 화면(Code 탭)에 보이는 최신 커밋의 해시 — 사용자가 이 파일들을 업로드한 직후의 커밋 1개를 "AI A 종료 버전"으로 기록한다.
**AI A 시작**: 2026-09-11T01:14:20Z / **AI A 종료**: 2026-09-11T01:15:22Z (약 1분)
**AI A 실제 도구 호출 수**: 4회 (lib.mjs 수정 1, 테스트 파일 작성 1, 테스트 실행 1, 커밋 1) — 상한 30회 이내
**AI A 사용 모델/서비스**: Claude (Sonnet 5), Claude Cowork 세션

이 문서와 저장소만으로 이어서 작업하세요. 이전 대화 내용은 전달되지 않습니다.

## 1. 목표

`docs/T05-fixed-tests.md`에 고정된 검사 10개(S01~S10)를 모두 통과시켜, 환율판(과제4)에
"최근 통계 카드"(최근 최대 7일 최고/최저/평균값, raw 데이터에서 매번 재계산)를 완성한다.

## 2. 현재 상태

- `scripts/lib.mjs`에 `computeRecentStats(records, {maxDays=7})` 함수 구현 완료.
- `scripts/test-recent-stats.mjs`에 로직 검사 S01~S05 작성, 전부 PASS.
- `index.html` 화면에는 아직 통계 카드가 없음 — **UI는 전혀 손대지 않았음.**
- 기존 과제4 기능(값 표시, 실패 재생, 일별 기록 표 등)은 그대로이며 이번 변경으로
  건드린 파일은 `scripts/lib.mjs`(함수 추가만, 기존 함수 미변경)와
  `scripts/test-recent-stats.mjs`(신규 파일)뿐입니다.

## 3. 실행 명령

\`\`\`bash
node scripts/test-logic.mjs         # 기존 로직 8건
node scripts/test-recent-stats.mjs  # 신규 로직 S01~S05 (5건)

python3 -m http.server 8791 &       # index.html이 ES module을 쓰므로 file://로는 안 열림
npm install playwright
node test/run-tests.cjs             # 기존 화면 15건
\`\`\`

## 4. 통과 검사

`docs/T05-fixed-tests.md`의 S01~S05 (로직) — **PASS** (5/5).
S06~S10 (화면 4건 + 회귀 1건)은 **아직 미실행** — AI B가 확인.

## 5. 남은 문제

- `index.html`에 "최근 통계" 카드 UI가 없음. `computeRecentStats`를 import해서
  상단 환율 카드 바로 아래에 새 카드로 렌더링해야 함(S06, S07).
- 기록이 1건뿐일 때 "최근 1일 기준"처럼 실제 건수를 반영한 문구가 필요함(S08) —
  7일을 하드코딩하면 안 됨.
- `data/daily.json`을 화면이 읽어올 때 통계도 그 자리에서 재계산해야 함(캐시 금지, S09).
- S10 회귀 검사(기존 23건) 미실행.

## 6. 다음 행동

1. `index.html`의 `<script type="module">` 안에서 `computeRecentStats`를 import.
2. `data/daily.json`의 `records`를 불러오는 기존 코드 바로 다음에 호출해서 상단 카드
   아래 새 카드(`#recent-stats` 같은 id 권장)로 렌더링.
3. 카드 제목에 실제 건수(`count`)를 반영: 예) `최근 ${count}일 기준`.
4. `docs/T05-fixed-tests.md`의 S06~S09를 Playwright 테스트로 `test/run-tests.cjs`에 추가.
5. `node scripts/test-logic.mjs && node scripts/test-recent-stats.mjs && node test/run-tests.cjs`
   전부 실행해서 S01~S10 전부 PASS 확인(S10).
6. 작업 종료 시 이 문서 아래에 "AI B 결과" 섹션을 추가해 종료 버전 ID·소요 시간·
   호출 수·최종 검사 결과를 남길 것.

## 7. 건드리지 말 것

- `docs/T05-fixed-tests.md`의 검사 10개 — **삭제·완화·기대값 변경 금지**
  (통과가 안 되면 코드를 고치는 것이지 검사를 고치는 게 아님).
- `scripts/lib.mjs`의 기존 함수(`parseSourcePayload`, `mergeDailyRecord`,
  `computeChangeFromRecords`, `staleMinutes`, `tzDateString`) 시그니처/동작 변경 금지.
- `data/daily.json`, `data/state.json`의 실제 데이터 — 손으로 값 조작 금지
  (테스트용 임시 조작은 반드시 원상복구).
- `.github/workflows/daily-fetch.yml` — 이번 기능과 무관, 손대지 않음.

---

## AI B 결과 (AI B가 작성)

*(여기부터 AI B가 채웁니다)*
