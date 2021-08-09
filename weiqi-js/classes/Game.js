import Board from "./Board";
import Player from "./Player";

class Game {
  board;
  whitePlayer;
  blackPlayer;
  turn;
  previousGames = [];
  constructor() {
    this.startNewGame();
  }
  getPlayer() {
    if (this.turn === "white") {
      return this.whitePlayer;
    } else return this.blackPlayer;
  }

  startNewGame() {
    this.board = new Board(13, this);
    // subscribing to the "playerTurn" event which is fired
    // whenever a player places a stone
    this.board.subscribe("playerTurn", (turn) => {
      this.turn = turn;
    });
    this.board.subscribe("gameOver", () => {
      this.gameOver();
    });
    this.blackPlayer = new Player("Player 1", "black");
    this.whitePlayer = new Player("Player 2", "white");
    this.turn = "black";
  }

  gameOver() {
    console.log(this.board);
    alert(
      `${this.board
        .getScore()
        .toUpperCase()} is the winner. Click 'OK' to start a new game.`
    );
    this.previousGames.push(this.board);
    this.startNewGame();
  }
}

export default Game;
