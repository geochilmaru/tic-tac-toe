const socket = io();

let mySymbol = null;
let roomId = null;
let myTurn = false;

const findGameBtn = document.getElementById('find-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const statusEl = document.getElementById('status');
const cells = document.querySelectorAll('.cell');

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function setBoardEnabled(enabled) {
  cells.forEach((cell) => {
    cell.disabled = !enabled;
  });
}

function resetBoard() {
  mySymbol = null;
  roomId = null;
  myTurn = false;
  cells.forEach((cell) => {
    cell.textContent = '';
    delete cell.dataset.symbol;
    cell.classList.remove('placed', 'winner');
    cell.disabled = true;
  });
}

function renderBoard(board) {
  cells.forEach((cell, i) => {
    const symbol = board[i] ?? '';
    if (symbol && cell.textContent !== symbol) {
      cell.textContent = symbol;
      cell.dataset.symbol = symbol;
      cell.classList.add('placed');
      cell.addEventListener('animationend', () => cell.classList.remove('placed'), { once: true });
    }
  });
}

function highlightWinnerCells(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      [a, b, c].forEach((i) => cells[i].classList.add('winner'));
      return;
    }
  }
}

findGameBtn.addEventListener('click', () => {
  findGameBtn.disabled = true;
  statusEl.textContent = 'Searching for opponent...';
  socket.emit('find-game');
});

playAgainBtn.addEventListener('click', () => {
  playAgainBtn.hidden = true;
  resetBoard();
  statusEl.textContent = 'Searching for opponent...';
  socket.emit('find-game');
});

cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    if (!myTurn || cell.textContent !== '') return;
    socket.emit('make-move', { index: parseInt(cell.dataset.index), roomId });
  });
});

socket.on('waiting', () => {
  statusEl.textContent = 'Waiting for another player...';
});

socket.on('game-start', (data) => {
  mySymbol = data.symbol;
  roomId = data.roomId;
  myTurn = mySymbol === 'X';
  setBoardEnabled(myTurn);
  statusEl.textContent = myTurn
    ? 'Your turn — you are X'
    : `You are ${mySymbol} — waiting for X to move`;
});

socket.on('move-made', ({ board, currentTurn }) => {
  renderBoard(board);
  myTurn = currentTurn === mySymbol;
  setBoardEnabled(myTurn);
  statusEl.textContent = myTurn ? 'Your turn' : "Opponent's turn";
});

socket.on('game-over', ({ winner, isDraw, board }) => {
  renderBoard(board);
  myTurn = false;
  setBoardEnabled(false);

  if (isDraw) {
    statusEl.textContent = "It's a draw!";
  } else if (winner === mySymbol) {
    statusEl.textContent = 'You win!';
    highlightWinnerCells(board);
  } else {
    statusEl.textContent = 'You lose!';
    highlightWinnerCells(board);
  }

  playAgainBtn.hidden = false;
});

socket.on('opponent-left', () => {
  statusEl.textContent = 'Opponent disconnected.';
  myTurn = false;
  setBoardEnabled(false);
  playAgainBtn.hidden = false;
});

setBoardEnabled(false);
