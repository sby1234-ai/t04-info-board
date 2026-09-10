# 합성 실패 재생용 fixture (자체 제작)

과제 카드에 언급된 공식 플랫폼 제공 자산(`assets/studio-task-assets/t04-real-information-board/README.md`,
`public-contract.json`, `asset-manifest.json`, `T04-RECOVER-D2` 등)은 이 세션에서
내려받을 경로를 알 수 없어 확보하지 못했습니다. 대신 카드 3·5에 설명된 동작
사양(느린 응답 / 401·403 / 호출 제한 / 오프라인 / 응답 형식 변경, 그리고 복구 시
상태가 fresh로 돌아오고 일별 기록이 정확히 한 건 늘어나는 것)을 그대로 만족하도록
이 폴더의 fixture를 직접 만들어 대체했습니다. 실제 제출 전, 공식 자산을 구할 수
있다면 이 폴더를 그걸로 교체하고 `public-contract.json`의 스키마에 맞춰
`scripts/lib.mjs`의 `parseSourcePayload`를 다시 맞추는 것을 권장합니다.

각 파일은 `index.html`이 `?sim=<name>` 쿼리로 불러와 화면에 재생하는 용도이며,
**절대 `data/daily.json`·`data/state.json`(진짜 기록)을 건드리지 않습니다** —
화면 상단에 "합성 테스트 모드" 배너가 뜨는 동안만 보이는 화면 전용 데이터입니다.

| 파일 | 재생하는 실패 |
|---|---|
| `slow-response.json` | 느린 외부 응답(타임아웃) |
| `unauthorized-401.json` | 출처 401 거절 |
| `forbidden-403.json` | 출처 403 거절 |
| `rate-limited-429.json` | 호출 제한(429) |
| `offline.json` | 오프라인 |
| `schema-changed.json` | 응답 형식 변경 |
| `recover-success.json` | 복구 재생(T04-RECOVER-D2 대체) — 상태 fresh 복귀 + 일별 기록 정확히 1건 추가 시연 |
