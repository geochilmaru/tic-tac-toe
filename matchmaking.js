const TicTacToeGame = require('./game');

const queue = [];
const activeGames = new Map();
const playerRooms = new Map();

function addToQueue(socket, io) {
  if (queue.some((s) => s.id === socket.id)) return;
  if (playerRooms.has(socket.id)) return;

  if (queue.length > 0) {
    const opponent = queue.shift();

    const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const game = new TicTacToeGame();

    const symbols = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
    const players = [
      { socket: opponent, symbol: symbols[0] },
      { socket, symbol: symbols[1] },
    ];

    activeGames.set(roomId, { game, players });
    playerRooms.set(opponent.id, roomId);
    playerRooms.set(socket.id, roomId);

    opponent.join(roomId);
    socket.join(roomId);

    players.forEach(({ socket: s, symbol }) => {
      s.emit('game-start', { symbol, roomId });
    });
  } else {
    queue.push(socket);
    socket.emit('waiting');
  }
}

function removeFromQueue(socket) {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].id === socket.id) queue.splice(i, 1);
  }
}

function cleanupGame(roomId) {
  const room = activeGames.get(roomId);
  if (!room) return;
  room.players.forEach((p) => playerRooms.delete(p.socket.id));
  activeGames.delete(roomId);
}

function handleDisconnect(socket, io) {
  removeFromQueue(socket);

  const roomId = playerRooms.get(socket.id);
  if (!roomId) return;

  const room = activeGames.get(roomId);
  if (room) {
    const opponent = room.players.find((p) => p.socket.id !== socket.id);
    if (opponent) opponent.socket.emit('opponent-left');
    room.players.forEach((p) => playerRooms.delete(p.socket.id));
    activeGames.delete(roomId);
  } else {
    playerRooms.delete(socket.id);
  }
}

module.exports = { addToQueue, removeFromQueue, handleDisconnect, cleanupGame, activeGames, playerRooms };
