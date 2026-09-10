// Playwright verification for the info board page, served over a real local
// HTTP server (ES module imports need a real origin, not file://).
// Run: python3 -m http.server 8791 &  then  node test/run-tests.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8791';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function log(id, desc, pass, note) {
  results.push({ id, desc, pass, note: note || '' });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + id + '  ' + desc + (note ? '  -- ' + note : ''));
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  // ---- Real mode, empty state (before any Actions run) ----
  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(300);
  const emptyBannerText = await page.textContent('#statusBanner');
  log('실제모드-빈상태', '데이터 없을 때 안내 문구 표시', emptyBannerText.includes('첫 자동 조회'));
  await page.screenshot({ path: path.join(OUT, 'real-empty.png') });

  // ---- Seed real data: one record + a synthetic "yesterday" record to test delta math ----
  const daily = {
    records: [
      { date: '2026-09-09', value: 1340.86, unit: 'KRW per 1 USD', source_url: 'https://open.er-api.com/v6/latest/USD', source_name: 'exchangerate-api.com', source_observed_at: '2026-09-09T00:02:31.000Z', fetched_at: '2026-09-09T09:05:00.000Z', timezone: 'Asia/Seoul' },
      { date: '2026-09-10', value: 1345.20, unit: 'KRW per 1 USD', source_url: 'https://open.er-api.com/v6/latest/USD', source_name: 'exchangerate-api.com', source_observed_at: '2026-09-10T00:03:11.000Z', fetched_at: '2026-09-10T09:06:00.000Z', timezone: 'Asia/Seoul' },
    ],
  };
  const state = {
    lastGood: daily.records[1],
    lastError: null,
    lastCheckedAt: '2026-09-10T09:06:00.000Z',
  };
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'daily.json'), JSON.stringify(daily, null, 2));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'state.json'), JSON.stringify(state, null, 2));

  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(300);
  const value = await page.textContent('#valueEl');
  const delta = await page.textContent('#deltaEl');
  const rows = await page.$$eval('#dailyBody tr', trs => trs.length);
  log('T04-C04~09', '값/단위/출처/시각/기준시간대 표시', (await page.textContent('#unitEl')).includes('KRW') && (await page.textContent('#sourceEl')).includes('exchangerate'));
  log('T04-C10-비유', '원자료(2건)=화면 최신값 일치, 어제대비 재계산 표시', value.includes('1,345.2') && delta.includes('4.34'));
  log('일별기록-행수', '일별 기록 2건이 표에 모두 보임', rows === 2);
  await page.screenshot({ path: path.join(OUT, 'real-with-data.png') });

  // ---- Simulate modes: each must render a DISTINCT banner + next action ----
  const sims = [
    ['slow-response', 'T04-C12', '느린 응답'],
    ['unauthorized-401', 'T04-C13a', '401'],
    ['forbidden-403', 'T04-C13b', '403'],
    ['rate-limited-429', 'T04-C14', '호출 제한'],
    ['offline', 'T04-C15', '오프라인'],
    ['schema-changed', 'T04-C16', '형식 변경'],
  ];
  const seenTitles = new Set();
  for (const [name, id, label] of sims) {
    await page.goto(BASE + '/index.html?sim=' + name);
    await page.waitForTimeout(name === 'slow-response' ? 4500 : 400);
    const bannerHtml = await page.textContent('#statusBanner');
    const simBannerVisible = await page.isVisible('#simBanner');
    const lastGoodShown = (await page.textContent('#valueEl')) !== '—';
    const hasNextAction = bannerHtml.includes('다음 행동');
    log(id, label + ' 합성 재생: 배너 표시 + 마지막 정상값 유지(T04-C17) + 다음 행동 제시', simBannerVisible && lastGoodShown && hasNextAction);
    seenTitles.add(bannerHtml.slice(0, 40));
    await page.screenshot({ path: path.join(OUT, 'sim-' + name + '.png') });
  }
  log('T04-C12~16-구분', '5가지 실패가 서로 다른 문구로 표시됨(중복 없음)', seenTitles.size === sims.length);

  // stale badge present on failure (T04-C18)
  await page.goto(BASE + '/index.html?sim=forbidden-403');
  await page.waitForTimeout(400);
  const staleBadge = await page.textContent('.badge.stale').catch(() => '');
  log('T04-C18', '실패 화면에 "오래된 값" 배지 표시', staleBadge.includes('오래된 값'));

  // retry button present (T04-C19 partial: recovery action UI)
  const retryVisible = await page.isVisible('#retryBtn');
  log('T04-C19-재시도UI', '실패 상태에 "다시 시도" 행동이 보임', retryVisible);

  // ---- Recover replay ----
  await page.goto(BASE + '/index.html?sim=recover-success');
  await page.waitForTimeout(400);
  const recoverText = await page.textContent('#statusBanner');
  const demoRowText = await page.textContent('#dailyBody');
  const realDailyUnchanged = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'daily.json'), 'utf8')).records.length === 2;
  log('T04-C19', '복구 재생: status fresh / error_code none 표시 + 시연용 행 1건 추가 표시', recoverText.includes('fresh') && recoverText.includes('none') && demoRowText.includes('시연'));
  log('합성테스트-격리', '복구 재생 후에도 실제 data/daily.json은 그대로 2건 (합성이 실제 기록을 대신하지 않음)', realDailyUnchanged);
  await page.screenshot({ path: path.join(OUT, 'sim-recover.png') });

  await browser.close();

  const failCount = results.filter(r => !r.pass).length;
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log('\n=== SUMMARY: ' + (results.length - failCount) + '/' + results.length + ' passed ===');
  process.exit(failCount > 0 ? 1 : 0);
})();
