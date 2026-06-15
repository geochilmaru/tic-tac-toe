class TicTacToeGame {
  constructor() {
    this.board = Array(9).fill(null);
    this.currentTurn = 'X';
    this.gameOver = false;
  }

  makeMove(cellIndex) {
    if (cellIndex < 0 || cellIndex > 8) {
      return { valid: false };
    }
    if (this.board[cellIndex] !== null) {
      return { valid: false };
    }
    if (this.gameOver) {
      return { valid: false };
    }

    const symbol = this.currentTurn;
    this.board[cellIndex] = symbol;

    const winner = this._checkWinner();
    const isDraw = !winner && this.board.every((cell) => cell !== null);

    if (winner || isDraw) this.gameOver = true;

    this.currentTurn = this.currentTurn === 'X' ? 'O' : 'X';

    return {
      valid: true,
      symbol,
      winner,
      isDraw,
      board: [...this.board],
    };
  }

  getState() {
    return {
      board: [...this.board],
      currentTurn: this.currentTurn,
    };
  }

  _checkWinner() {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a];
      }
    }
    return null;
  }
}

module.exports = TicTacToeGame;
