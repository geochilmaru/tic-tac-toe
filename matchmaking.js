const TicTacToeGame = require('./game');

const queue = [];
const activeGames = new Map();
const socketRooms = new Map();

function addToQueue(socket, io) {
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
    socketRooms.set(opponent.id, roomId);
    socketRooms.set(socket.id, roomId);

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
  const index = queue.findIndex((s) => s.id === socket.id);
  if (index !== -1) queue.splice(index, 1);
}

function handleDisconnect(socket, io) {
  removeFromQueue(socket);

  const roomId = socketRooms.get(socket.id);
  if (!roomId) return;

  const room = activeGames.get(roomId);
  if (room) {
    const opponent = room.players.find((p) => p.socket.id !== socket.id);
    if (opponent) opponent.socket.emit('opponent-left');

    room.players.forEach((p) => socketRooms.delete(p.socket.id));
    activeGames.delete(roomId);
  }
}

module.exports = { addToQueue, removeFromQueue, handleDisconnect, activeGames, socketRooms };
