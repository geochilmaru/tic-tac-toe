const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const TicTacToeGame = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
let waitingPlayer = null;

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  if (waitingPlayer) {
    const roomId = `room_${Date.now()}`;
    const game = new TicTacToeGame();
    rooms[roomId] = { id: roomId, players: [waitingPlayer.id, socket.id], game };

    waitingPlayer.join(roomId);
    socket.join(roomId);

    waitingPlayer.emit('gameStart', { symbol: 'X', roomId });
    socket.emit('gameStart', { symbol: 'O', roomId });

    const { board, currentTurn } = game.getState();
    io.to(roomId).emit('gameState', { board, currentTurn, gameOver: false, winner: null });

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
    socket.emit('waiting');
  }

  socket.on('move', ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    const symbol = playerIndex === 0 ? 'X' : 'O';

    if (symbol !== room.game.currentTurn) return;

    const result = room.game.makeMove(index);
    if (!result.valid) return;

    io.to(roomId).emit('gameState', {
      board: result.board,
      currentTurn: room.game.currentTurn,
      gameOver: result.winner !== null || result.isDraw,
      winner: result.winner || (result.isDraw ? 'draw' : null),
    });
  });

  socket.on('restart', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.game = new TicTacToeGame();

    const { board, currentTurn } = room.game.getState();
    io.to(roomId).emit('gameState', { board, currentTurn, gameOver: false, winner: null });
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
