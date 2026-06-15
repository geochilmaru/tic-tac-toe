const socket = io();

let mySymbol = null;
let roomId = null;
let myTurn = false;

const statusEl = document.getElementById('status');
const cells = document.querySelectorAll('.cell');
const restartBtn = document.getElementById('restart-btn');

socket.on('waiting', () => {
  statusEl.textContent = '상대방을 기다리는 중...';
});

socket.on('gameStart', (data) => {
  mySymbol = data.symbol;
  roomId = data.roomId;
  statusEl.textContent = `당신은 ${mySymbol}입니다.`;
});

socket.on('gameState', (state) => {
  renderBoard(state.board);

  if (state.winner) {
    if (state.winner === 'draw') {
      statusEl.textContent = '무승부!';
    } else if (state.winner === mySymbol) {
      statusEl.textContent = '승리했습니다!';
    } else {
      statusEl.textContent = '패배했습니다.';
    }
    restartBtn.style.display = 'block';
    myTurn = false;
  } else {
    myTurn = state.currentTurn === mySymbol;
    statusEl.textContent = myTurn ? '당신의 차례입니다.' : '상대방의 차례입니다.';
    restartBtn.style.display = 'none';
  }
});

socket.on('opponentDisconnected', () => {
  statusEl.textContent = '상대방이 연결을 끊었습니다.';
  restartBtn.style.display = 'none';
  myTurn = false;
});

cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    if (!myTurn || cell.classList.contains('taken')) return;
    socket.emit('move', { roomId, index: parseInt(cell.dataset.index) });
  });
});

restartBtn.addEventListener('click', () => {
  socket.emit('restart', { roomId });
  restartBtn.style.display = 'none';
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
