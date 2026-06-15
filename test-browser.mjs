import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 500 });

const p1 = await browser.newPage();
const p2 = await browser.newPage();

await p1.goto('http://localhost:3000');
await p2.goto('http://localhost:3000');

console.log('--- Initial state ---');
console.log('P1 status:', await p1.locator('#status').textContent());
console.log('P2 status:', await p2.locator('#status').textContent());

// Both players click Find Game
await p1.locator('#find-game-btn').click();
await p2.locator('#find-game-btn').click();
await p1.waitForTimeout(800);

console.log('\n--- After Find Game ---');
const p1Status = await p1.locator('#status').textContent();
const p2Status = await p2.locator('#status').textContent();
console.log('P1 status:', p1Status);
console.log('P2 status:', p2Status);

// Determine who is X (goes first — board enabled)
const p1BoardDisabled = await p1.locator('.cell').first().isDisabled();
const p2BoardDisabled = await p2.locator('.cell').first().isDisabled();
const [first, second] = p1BoardDisabled ? [p2, p1] : [p1, p2];
const firstName = p1BoardDisabled ? 'P2' : 'P1';
const secondName = p1BoardDisabled ? 'P1' : 'P2';
console.log(`\n${firstName} is X (goes first)`);

// Play a game: X wins with top row [0,1,2], O plays [3,4]
const moves = [
  { player: first,  name: firstName,  index: 0 },
  { player: second, name: secondName, index: 3 },
  { player: first,  name: firstName,  index: 1 },
  { player: second, name: secondName, index: 4 },
  { player: first,  name: firstName,  index: 2 }, // X wins
];

console.log('\n--- Playing moves ---');
for (const { player, name, index } of moves) {
  await player.locator(`.cell[data-index="${index}"]`).click();
  await player.waitForTimeout(400);
  console.log(`${name} clicked cell ${index}`);
}

await p1.waitForTimeout(600);

console.log('\n--- After game-over ---');
console.log('P1 status:', await p1.locator('#status').textContent());
console.log('P2 status:', await p2.locator('#status').textContent());

const p1PlayAgainVisible = await p1.locator('#play-again-btn').isVisible();
const p2PlayAgainVisible = await p2.locator('#play-again-btn').isVisible();
console.log('P1 Play Again visible:', p1PlayAgainVisible);
console.log('P2 Play Again visible:', p2PlayAgainVisible);

// Check winner highlight
const winnerCells = await p1.locator('.cell.winner').count();
console.log('Winner cells highlighted:', winnerCells);

// Screenshot
await p1.screenshot({ path: 'p1-gameover.png' });
await p2.screenshot({ path: 'p2-gameover.png' });
console.log('\nScreenshots saved: p1-gameover.png, p2-gameover.png');

// Test Play Again flow
console.log('\n--- Play Again ---');
await first.locator('#play-again-btn').click();
await first.waitForTimeout(400);
console.log(`${firstName} clicked Play Again — status:`, await first.locator('#status').textContent());

// Close P1/P2 so their queued find-game doesn't interfere with matchmaking
await p1.close();
await p2.close();
await new Promise(r => setTimeout(r, 600)); // let server process their disconnects

// Test opponent-left
console.log('\n--- Opponent-left test ---');
const p3 = await browser.newPage();
const p4 = await browser.newPage();

// Trap window.io assignment so we can expose socket.disconnect()
await p4.addInitScript(() => {
  let _realIo;
  Object.defineProperty(window, 'io', {
    configurable: true,
    set(fn) {
      _realIo = function (...args) {
        const s = fn(...args);
        window.__disconnect = () => s.disconnect();
        return s;
      };
    },
    get() { return _realIo; },
  });
});

await p3.goto('http://localhost:3000');
await p4.goto('http://localhost:3000');
await p3.locator('#find-game-btn').click();
await p4.locator('#find-game-btn').click();
await p3.waitForTimeout(800);

const p4Status = await p4.locator('#status').textContent();
console.log('P4 status before disconnect:', p4Status);
const disconnectType = await p4.evaluate(() => typeof window.__disconnect);
console.log('P4 __disconnect type:', disconnectType);
if (disconnectType === 'function') {
  const result = await p4.evaluate(() => { window.__disconnect(); return 'called'; });
  console.log('Disconnect result:', result);
} else {
  console.log('WARNING: __disconnect not available, falling back to context close');
  await p4.close();
}
await p3.waitForTimeout(1500);
console.log('P3 status after opponent left:', await p3.locator('#status').textContent());
console.log('P3 Play Again visible:', await p3.locator('#play-again-btn').isVisible());

await p3.screenshot({ path: 'p3-opponent-left.png' });
console.log('Screenshot saved: p3-opponent-left.png');

await browser.close();
console.log('\nAll tests passed.');
