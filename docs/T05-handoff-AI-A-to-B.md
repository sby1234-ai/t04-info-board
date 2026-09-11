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

## AI B 결과

- **저장소 버전 ID (AI B 최종 커밋)**: `49f6067` (AI B 시작 = AI A 종료 커밋 `da8174b`)
- **AI B 사용 모델/서비스**: Gemini (무료, 웹 채팅 — Flash 모델), 이 세션(Claude)과 다른 서비스
- **제출 회차**: 3회 (1차 구현 → 2회 버그 수정 반복 → 3차 최종)
  - 1차: 화면 카드는 나왔지만 `class`/`id` 속성이 한 문자열에 섞여 실제로는 잘못된 HTML이었고, 기존 "기록 없음" 안내·오류 배너 로직을 통째로 빼먹어 회귀 15건 중 1건 FAIL.
  - 2차: HTML 속성은 고쳤지만 안내 문구를 `#statusBanner`가 아니라 `#valueEl`에 넣어 같은 회귀 검사가 다시 FAIL.
  - 3차: 문구 위치를 `#statusBanner`로 수정 — 이후 전체 통과.
- **검증 방식**: Gemini는 코드 생성만 하고 직접 실행하지 못하므로(채팅형, 코드 실행 환경 없음), 매 회차 코드를 이 세션(Claude, 검증자 역할)이 로컬에서 실제로 실행해 판정함 — AI A처럼 스스로 실행·검증한 것은 아님.
- **최종 검사 결과 (S01~S10, 3차 제출 기준)**: 전부 PASS
  - S01~S05 (로직): 5/5 PASS
  - S06~S09 (화면): 4/4 PASS
  - S10 (회귀 23건 + 신규 5건 = 28건): 28/28 PASS
- **오류 회차**: 2회 (10개 고정 검사 중 하나 이상 FAIL한 제출 횟수) — 위 1차, 2차.
- **코드 변경량(생성 파일·lockfile 제외, AI A 종료 → AI B 종료)**: `index.html` +66/−35줄 (약 301→331줄), 문서 갱신 +2/−1줄.
- **시간·호출 수 관련 한계**: Gemini 채팅은 자체 실행 로그가 없어 "실제 작업시간"·"호출 수"를 AI A(도구 호출 타임스탬프 기반)와 같은 방식으로 객관적으로 잴 수 없음. 사용자와 이 세션 간 대화 왕복 횟수로 대체 측정: 총 3회 왕복(프롬프트 전달 1회 + 버그 수정 요청 2회). 비교표에는 이 차이를 그대로 명시함(동일 기준으로 측정된 값이 아님).


