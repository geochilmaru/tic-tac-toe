import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

const p1 = await context.newPage();
const p2 = await context.newPage();

const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

// ── 1. 접속 및 매칭 ──────────────────────────────────────────
console.log('\n[1] 접속 및 매칭');
await p1.goto(BASE);
await p1.waitForSelector('#status');
const p1WaitStatus = await p1.$eval('#status', (el) => el.textContent);
assert(p1WaitStatus.includes('기다리는'), `P1 대기 상태: "${p1WaitStatus}"`);

await p2.goto(BASE);
await sleep(500);

const p1Status = await p1.$eval('#status', (el) => el.textContent);
const p2Status = await p2.$eval('#status', (el) => el.textContent);
assert(
  p1Status.includes('차례') || p1Status.includes('상대'),
  `P1 매칭 완료: "${p1Status}"`
);
assert(
  p2Status.includes('차례') || p2Status.includes('상대'),
  `P2 매칭 완료: "${p2Status}"`
);

// ── 2. 누가 X인지 파악 ────────────────────────────────────────
console.log('\n[2] 심볼 배정');
const p1IsX = p1Status.includes('당신의 차례');
const [xPage, oPage] = p1IsX ? [p1, p2] : [p2, p1];
assert(true, `X 플레이어: ${p1IsX ? 'P1' : 'P2'}`);

// ── 3. 수 두기 및 실시간 반영 ─────────────────────────────────
console.log('\n[3] 수 두기 및 실시간 반영');

// X → 셀 0
await xPage.click('[data-index="0"]');
await sleep(300);
const p1Cell0 = await p1.$eval('[data-index="0"]', (el) => el.textContent.trim());
const p2Cell0 = await p2.$eval('[data-index="0"]', (el) => el.textContent.trim());
assert(p1Cell0 !== '', `P1에서 셀 0 반영: "${p1Cell0}"`);
assert(p2Cell0 !== '', `P2에서 셀 0 반영: "${p2Cell0}"`);
assert(p1Cell0 === p2Cell0, `양쪽 보드 일치: "${p1Cell0}"`);

// O → 셀 4
await oPage.click('[data-index="4"]');
await sleep(300);
const p1Cell4 = await p1.$eval('[data-index="4"]', (el) => el.textContent.trim());
assert(p1Cell4 !== '', `셀 4 반영: "${p1Cell4}"`);

// ── 4. 차례 검증 (O가 X 차례에 클릭 시도) ─────────────────────
console.log('\n[4] 차례 외 클릭 차단');
await oPage.click('[data-index="1"]'); // X 차례인데 O가 클릭
await sleep(200);
const cell1 = await p1.$eval('[data-index="1"]', (el) => el.textContent.trim());
assert(cell1 === '', `차례 아닌 플레이어 클릭 차단: 셀 1 = "${cell1}"`);

// ── 5. 승리 시나리오 (X: 0,1,2 가로줄) ────────────────────────
console.log('\n[5] 승리 판정 (X가 0-1-2 완성)');
// 현재: X=0, O=4
// X→1, O→3, X→2 → X 승리
await xPage.click('[data-index="1"]');
await sleep(200);
await oPage.click('[data-index="3"]');
await sleep(200);
await xPage.click('[data-index="2"]');
await sleep(400);

const xFinalStatus = await xPage.$eval('#status', (el) => el.textContent);
const oFinalStatus = await oPage.$eval('#status', (el) => el.textContent);
assert(xFinalStatus.includes('승리'), `X에게 승리 표시: "${xFinalStatus}"`);
assert(oFinalStatus.includes('패배'), `O에게 패배 표시: "${oFinalStatus}"`);

const restartVisible = await xPage.$eval(
  '#restart-btn',
  (el) => el.style.display !== 'none'
);
assert(restartVisible, '게임 종료 후 다시 시작 버튼 표시');

// ── 6. 무승부 시나리오 ──────────────────────────────────────
console.log('\n[6] 무승부 판정');
const ctx2 = await browser.newContext();
const d1 = await ctx2.newPage();
const d2 = await ctx2.newPage();
await d1.goto(BASE);
await sleep(200);
await d2.goto(BASE);
await sleep(500);

const d1Status = await d1.$eval('#status', (el) => el.textContent);
const d1IsX = d1Status.includes('당신의 차례');
const [dX, dO] = d1IsX ? [d1, d2] : [d2, d1];

// X: 0,2,7  O: 1,3,8  X: 4  O: 5  X: 6 → 무승부
const moves = [
  [dX, 0], [dO, 1], [dX, 2], [dO, 3],
  [dX, 4], [dO, 5], [dX, 6], [dO, 8], [dX, 7],
];
for (const [page, idx] of moves) {
  await page.click(`[data-index="${idx}"]`);
  await sleep(200);
}
await sleep(300);

const drawStatus1 = await d1.$eval('#status', (el) => el.textContent);
const drawStatus2 = await d2.$eval('#status', (el) => el.textContent);
assert(drawStatus1.includes('무승부'), `P1 무승부 표시: "${drawStatus1}"`);
assert(drawStatus2.includes('무승부'), `P2 무승부 표시: "${drawStatus2}"`);

await ctx2.close();

// ── 결과 ─────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`결과: ${passed} 통과 / ${failed} 실패`);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
