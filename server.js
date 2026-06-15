const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { addToQueue, handleDisconnect, cleanupGame, activeGames, playerRooms } = require('./matchmaking');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('find-game', () => {
    addToQueue(socket, io);
  });

  socket.on('make-move', ({ index }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = activeGames.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.socket.id === socket.id);
    if (!player || player.symbol !== room.game.currentTurn) return;

    const result = room.game.makeMove(index);
    if (!result.valid) return;

    io.to(roomId).emit('move-made', {
      index,
      symbol: result.symbol,
      board: result.board,
      currentTurn: room.game.currentTurn,
    });

    if (result.winner || result.isDraw) {
      io.to(roomId).emit('game-over', {
        winner: result.winner,
        isDraw: result.isDraw,
        board: result.board,
      });
      cleanupGame(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    handleDisconnect(socket, io);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
