const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const TicTacToeGame = require('./game');
const { addToQueue, handleDisconnect, activeGames, socketRooms } = require('./matchmaking');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  addToQueue(socket, io);

  socket.on('move', ({ roomId, index }) => {
    const room = activeGames.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.socket.id === socket.id);
    if (!player || player.symbol !== room.game.currentTurn) return;

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
    const room = activeGames.get(roomId);
    if (!room) return;

    room.game = new TicTacToeGame();

    const { board, currentTurn } = room.game.getState();
    io.to(roomId).emit('gameState', { board, currentTurn, gameOver: false, winner: null });
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
