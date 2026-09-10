# 오늘의 환율판 (과제 4 — 실제 정보판)

USD → KRW 환율(무료·무키 공개 API)을 하루 한 번 자동으로 조회해 기록하고, 어제 대비
변화를 저장된 값에서 다시 계산해 보여주는 정보판입니다. 값이 정상적으로 올 때뿐
아니라, 늦거나·거절되거나·형식이 바뀌었을 때도 마지막 정상값을 지우지 않고
정직하게 상태를 설명합니다.

- **결과물(무로그인 공개)**: GitHub Pages — `https://sby1234-ai.github.io/t04-info-board/`
- **소스**: 이 저장소

## 왜 API 키가 없는가

`https://open.er-api.com/v6/latest/USD` (exchangerate-api.com의 무료 공개 엔드포인트)는
키 없이 호출할 수 있습니다. 그래서 브라우저·배포 파일·Git 기록 어디에도 비밀값이
존재하지 않습니다 (T04-C11). 값이 자동으로 오지 않는 값(교통·게임 서버 상태 등)을
쓰고 싶다면 `scripts/lib.mjs`의 `SOURCE_URL`/`parseSourcePayload`만 바꾸면 되는데,
그 경우 키가 필요한 원천이라면 반드시 GitHub Actions의 **Repository secrets**에만
저장하고 `scripts/fetch-and-record.mjs`에서 `process.env`로만 읽어야 합니다(브라우저
코드에는 절대 넣지 않음).

## 어떻게 매일 자동으로 기록되는가

1. `.github/workflows/daily-fetch.yml`이 매일 00:10 UTC(09:10 KST)에 실행되고,
   Actions 탭에서 "Run workflow"로 언제든 수동 실행도 가능합니다.
2. `scripts/fetch-and-record.mjs`가 실제 공개 원천을 호출합니다.
   - 성공하면 `data/state.json.lastGood`을 갱신하고, `data/daily.json`에서
     **오늘(KST) 날짜의 기록을 갱신(같은 날 재실행은 덮어씀)**하거나 새 날짜면
     새로 추가합니다.
   - 실패(느린 응답/401·403/호출 제한/오프라인/형식 변경)하면 `lastGood`은
     그대로 두고 `lastError`만 기록합니다 — **마지막 정상값은 절대 지워지지
     않습니다.**
3. 바뀐 `data/*.json`을 워크플로우가 그대로 커밋·푸시합니다.
4. `index.html`(GitHub Pages)이 그 JSON을 그대로 읽어서 화면에 보여줍니다.

## 합성 실패 재생 (그레이딩용)

과제 카드에 나온 공식 플랫폼 제공 fixture(`assets/studio-task-assets/...`)는
이 세션에서 받을 경로를 몰라 확보하지 못했습니다. 대신 카드에 설명된 5가지
실패와 복구 동작을 그대로 만족하도록 `fixtures/`에 자체 fixture를 만들어
대체했습니다 (자세한 설명은 `fixtures/README.md`).

아래 링크를 열면 각 실패가 서로 다른 문구·다음 행동으로 재생됩니다. **실제
저장 파일(`data/daily.json`, `data/state.json`)은 전혀 건드리지 않습니다.**

- `?sim=slow-response` — 느린 응답(타임아웃)
- `?sim=unauthorized-401` — 401
- `?sim=forbidden-403` — 403
- `?sim=rate-limited-429` — 호출 제한
- `?sim=offline` — 오프라인
- `?sim=schema-changed` — 응답 형식 변경
- `?sim=recover-success` — 복구(상태 fresh 복귀 + 시연용 기록 1건 추가 표시)

## 폴더 구조

```
index.html                    # 공개 정보판 (GitHub Pages로 서빙)
scripts/lib.mjs                # 순수 로직(날짜 키, 병합/중복제거, 변화값 재계산) — 브라우저·Node 양쪽에서 그대로 import
scripts/fetch-and-record.mjs   # GitHub Actions가 매일 실행하는 스크립트
scripts/test-logic.mjs         # 네트워크 없이 도는 로직 단위 테스트
data/daily.json                # 일별 기록 (하루 1건, Actions가 갱신)
data/state.json                # 마지막 정상값 + 마지막 오류
fixtures/                      # 합성 실패/복구 재생용 자체 제작 fixture
test/run-tests.cjs              # Playwright로 실제 화면(정상/6가지 합성 상태) 검증
submission/CHECKLIST.md        # 제출 체크리스트, 짧은 확인 방법, AI/판단 구분
.github/workflows/daily-fetch.yml
```

## 로컬 테스트

```bash
node scripts/test-logic.mjs     # 순수 로직 8건 (네트워크 불필요)

python3 -m http.server 8791 &   # index.html이 ES module을 쓰므로 file://로는 안 열림
npm install playwright
node test/run-tests.cjs          # 화면 15건 (정상 화면 + 6가지 합성 실패/복구)
```

## 저장소 설정 시 꼭 켜야 하는 것

1. **Settings → Actions → General → Workflow permissions** → "Read and write
   permissions" 선택 (기본값이 읽기 전용이면 워크플로우가 커밋을 못 올립니다).
2. **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `(root)`.
3. **Actions 탭 → Daily exchange-rate fetch → Run workflow** 로 첫 실행(오늘,
   1일차 실제 기록)을 수동으로 한 번 트리거합니다. 다음 실제 날짜(KST)에는
   매일 새벽 스케줄이 자동으로 두 번째 기록을 만듭니다.
