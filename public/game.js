const socket = io();

let mySymbol = null;
let myTurn = false;

const statusEl = document.getElementById('status');
const cells = document.querySelectorAll('.cell');
const restartBtn = document.getElementById('restart-btn');

socket.emit('find-game');

socket.on('waiting', () => {
  statusEl.textContent = '상대방을 기다리는 중...';
});

socket.on('game-start', ({ symbol }) => {
  mySymbol = symbol;
  myTurn = symbol === 'X';
  statusEl.textContent = myTurn ? '당신의 차례입니다.' : '상대방의 차례입니다.';
});

socket.on('move-made', ({ board, currentTurn }) => {
  renderBoard(board);
  myTurn = currentTurn === mySymbol;
  statusEl.textContent = myTurn ? '당신의 차례입니다.' : '상대방의 차례입니다.';
});

socket.on('game-over', ({ winner, isDraw, board }) => {
  renderBoard(board);
  myTurn = false;

  if (isDraw) {
    statusEl.textContent = '무승부!';
  } else if (winner === mySymbol) {
    statusEl.textContent = '승리했습니다!';
  } else {
    statusEl.textContent = '패배했습니다.';
  }

  restartBtn.style.display = 'block';
});

socket.on('opponent-left', () => {
  statusEl.textContent = '상대방이 연결을 끊었습니다.';
  myTurn = false;
  restartBtn.style.display = 'none';
});

cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    if (!myTurn || cell.classList.contains('taken')) return;
    socket.emit('make-move', { index: parseInt(cell.dataset.index) });
  });
});

restartBtn.addEventListener('click', () => {
  restartBtn.style.display = 'none';
  socket.emit('find-game');
});

function renderBoard(board) {
  cells.forEach((cell, i) => {
    cell.textContent = board[i] || '';
    cell.className = 'cell';
    if (board[i]) {
      cell.classList.add('taken', board[i].toLowerCase());
    }
  });
}
