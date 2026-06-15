const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
let waitingPlayer = null;

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  if (waitingPlayer) {
    const roomId = `room_${Date.now()}`;
    rooms[roomId] = {
      id: roomId,
      players: [waitingPlayer.id, socket.id],
      board: Array(9).fill(null),
      currentTurn: 'X',
      gameOver: false,
    };

    waitingPlayer.join(roomId);
    socket.join(roomId);

    waitingPlayer.emit('gameStart', { symbol: 'X', roomId });
    socket.emit('gameStart', { symbol: 'O', roomId });

    io.to(roomId).emit('gameState', {
      board: rooms[roomId].board,
      currentTurn: 'X',
      gameOver: false,
      winner: null,
    });

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
    socket.emit('waiting');
  }

  socket.on('move', ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room || room.gameOver) return;

    const playerIndex = room.players.indexOf(socket.id);
    const symbol = playerIndex === 0 ? 'X' : 'O';

    if (symbol !== room.currentTurn) return;
    if (room.board[index] !== null) return;

    room.board[index] = symbol;

    const winner = checkWinner(room.board);
    const isDraw = !winner && room.board.every((cell) => cell !== null);

    if (winner || isDraw) room.gameOver = true;

    room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';

    io.to(roomId).emit('gameState', {
      board: room.board,
      currentTurn: room.currentTurn,
      gameOver: room.gameOver,
      winner: winner || (isDraw ? 'draw' : null),
    });
  });

  socket.on('restart', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.board = Array(9).fill(null);
    room.currentTurn = 'X';
    room.gameOver = false;

    io.to(roomId).emit('gameState', {
      board: room.board,
      currentTurn: room.currentTurn,
      gameOver: false,
      winner: null,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
      return;
    }

    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.includes(socket.id)) {
        const otherId = room.players.find((id) => id !== socket.id);
        if (otherId) io.to(otherId).emit('opponentDisconnected');
        delete rooms[roomId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
