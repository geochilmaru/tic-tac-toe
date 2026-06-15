# Handoff — Tic Tac Toe

## What was built

Real-time multiplayer tic-tac-toe. Two browser clients connect to a Node.js/Socket.io server, get matched automatically, and play a full game with server-authoritative state.

---

## What worked

### Core game
- Server-side matchmaking queue, game state, and win detection all work correctly.
- Socket.io event flow (`find-game` → `waiting` → `game-start` → `make-move` → `move-made` → `game-over` / `opponent-left`) is solid end-to-end.
- `roomId` is generated server-side and sent to both clients on `game-start`; clients send it back on `make-move` (unused by the server today but available for future multi-room debugging).

### Bug fixes (session 2)
All seven bugs found during code review were fixed:

| Bug | Fix |
|---|---|
| Player matched against themselves (double `find-game`) | Guard at top of `addToQueue` |
| `find-game` while already in a game | `playerRooms.has(socket.id)` check |
| Rooms leaked in memory after `game-over` | `cleanupGame()` called immediately after emitting `game-over` |
| Spurious `opponent-left` after game ends | Resolved automatically by the `cleanupGame` fix above |
| `removeFromQueue` only removed first occurrence | Reverse-loop splice |
| `playerRooms` entry leaked when room missing | `else { playerRooms.delete(socket.id) }` |
| Float/NaN index accepted by `makeMove` | `Number.isInteger()` check |

### UI (session 2)
- Pop animation on symbol placement (scale 0.2 → 1.15 → 1, ease-out).
- Winning cells pulse with a glow matching the symbol color (X = blue, O = red).
- Status text changes color to the player's symbol color and pulses on their turn; dims on opponent's turn.
- Find Game button shows a CSS spinner while searching.
- Board resizes on mobile via `--cell: min(100px, calc((100vw - 40px) / 3))`.

### Testing
- `test-game.mjs` — unit tests for `TicTacToeGame` logic (pre-existing).
- `test-browser.mjs` — Playwright end-to-end: two-player game, win detection, winner highlight, Play Again flow, opponent-left.

---

## What didn't work / lessons learned

### Chrome focus bug — needed two attempts
`cell.blur()` after `socket.emit('make-move')` was not enough. Chrome re-applies focus to the last-focused element when a disabled button is re-enabled. Required a second fix: `document.activeElement.blur()` inside `setBoardEnabled(true)` plus `outline: none` in CSS.

### Playwright opponent-left test — took three iterations
1. `page.close()` didn't reliably close the WebSocket within the test timeout.
2. `context.close()` was cleaner but still had timing issues.
3. Final approach: `window.io` setter trap via `addInitScript` to expose `socket.disconnect()` explicitly, plus closing P1/P2 first to avoid them stealing the matchmaking slot from P3/P4.

### No PR workflow used
Every commit went directly to `master`. PRs were requested twice but couldn't be created because there were no feature branches. **For any future work, create a feature branch first.**

---

## What's not done (possible next steps)

- **Persistent storage** — all game state is in-memory. A server restart clears everything. Consider Redis or a lightweight DB if uptime matters.
- **Reconnection** — if a player's connection drops briefly, they lose the game. Socket.io supports reconnection; the server could hold the game open for N seconds.
- **Score tracking** — no win/loss history across rounds. Could be added with a simple in-session counter shown above the board.
- **Rooms / lobby** — currently pure random matchmaking. A room code system would let friends play directly.
- **Spectator mode** — additional sockets could join a room as observers.
- **CI** — no automated test runner is wired up. `node test-game.mjs` works locally; a GitHub Actions workflow would run it on push.
- **HTTPS / deployment** — tested locally only. Deploying to Railway, Render, or Fly.io would need the `PORT` env var (already handled in `server.js`) and a process manager or container.
