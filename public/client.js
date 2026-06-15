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

function setStatus(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className = cls;
}

function setSearching(searching) {
  findGameBtn.disabled = searching;
  findGameBtn.classList.toggle('is-searching', searching);
}

function setBoardEnabled(enabled) {
  cells.forEach((cell) => {
    cell.disabled = !enabled;
  });
  if (enabled && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function resetBoard() {
  mySymbol = null;
  roomId = null;
  myTurn = false;
  statusEl.style.removeProperty('--player-color');
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
  setSearching(true);
  setStatus('Searching for opponent...');
  socket.emit('find-game');
});

playAgainBtn.addEventListener('click', () => {
  playAgainBtn.hidden = true;
  resetBoard();
  setSearching(true);
  setStatus('Searching for opponent...');
  socket.emit('find-game');
});

cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    if (!myTurn || cell.textContent !== '') return;
    socket.emit('make-move', { index: parseInt(cell.dataset.index), roomId });
    cell.blur();
  });
});

socket.on('waiting', () => {
  setStatus('Waiting for another player...');
});

socket.on('game-start', (data) => {
  mySymbol = data.symbol;
  roomId = data.roomId;
  myTurn = mySymbol === 'X';
  setSearching(false);
  statusEl.style.setProperty('--player-color', mySymbol === 'X' ? '#4a9eff' : '#ff5a5a');
  setBoardEnabled(myTurn);
  setStatus(
    myTurn ? 'Your turn — you are X' : `You are ${mySymbol} — waiting for X to move`,
    myTurn ? 'turn-mine' : 'turn-opponent'
  );
});

socket.on('move-made', ({ board, currentTurn }) => {
  renderBoard(board);
  myTurn = currentTurn === mySymbol;
  setBoardEnabled(myTurn);
  setStatus(myTurn ? 'Your turn' : "Opponent's turn", myTurn ? 'turn-mine' : 'turn-opponent');
});

socket.on('game-over', ({ winner, isDraw, board }) => {
  renderBoard(board);
  myTurn = false;
  setBoardEnabled(false);

  if (isDraw) {
    setStatus("It's a draw!");
  } else if (winner === mySymbol) {
    setStatus('You win!');
    highlightWinnerCells(board);
  } else {
    setStatus('You lose!');
    highlightWinnerCells(board);
  }

  playAgainBtn.hidden = false;
});

socket.on('opponent-left', () => {
  setStatus('Opponent disconnected.');
  myTurn = false;
  setBoardEnabled(false);
  playAgainBtn.hidden = false;
});

setBoardEnabled(false);
