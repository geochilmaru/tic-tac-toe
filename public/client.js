const socket = io();

let mySymbol = null;
let myTurn = false;

const findGameBtn = document.getElementById('find-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const statusEl = document.getElementById('status');
const cells = document.querySelectorAll('.cell');

findGameBtn.addEventListener('click', () => {
  findGameBtn.disabled = true;
  statusEl.textContent = 'Finding a game...';
  socket.emit('find-game');
});

playAgainBtn.addEventListener('click', () => {
  playAgainBtn.hidden = true;
  findGameBtn.disabled = false;
  resetBoard();
  statusEl.textContent = 'Click Find Game to start';
});

cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    if (!myTurn || cell.textContent !== '') return;
    socket.emit('make-move', { index: parseInt(cell.dataset.index) });
  });
});

socket.on('waiting', () => {
  statusEl.textContent = 'Waiting for an opponent...';
});

socket.on('game-start', ({ symbol }) => {
  mySymbol = symbol;
  myTurn = symbol === 'X';
  statusEl.textContent = myTurn ? 'Your turn (X goes first)' : `You are ${symbol} — waiting for X to move`;
});

socket.on('move-made', ({ board, currentTurn }) => {
  renderBoard(board);
  myTurn = currentTurn === mySymbol;
  statusEl.textContent = myTurn ? 'Your turn' : "Opponent's turn";
});

socket.on('game-over', ({ winner, isDraw, board }) => {
  renderBoard(board);
  myTurn = false;

  if (isDraw) {
    statusEl.textContent = "It's a draw!";
  } else if (winner === mySymbol) {
    statusEl.textContent = 'You win!';
  } else {
    statusEl.textContent = 'You lose!';
  }

  playAgainBtn.hidden = false;
});

socket.on('opponent-left', () => {
  statusEl.textContent = 'Opponent disconnected.';
  myTurn = false;
  playAgainBtn.hidden = false;
});

function renderBoard(board) {
  cells.forEach((cell, i) => {
    cell.textContent = board[i] ?? '';
  });
}

function resetBoard() {
  mySymbol = null;
  myTurn = false;
  cells.forEach((cell) => {
    cell.textContent = '';
  });
}
