import Position from "./Position";

class Move {
  position;
  stoneColor;
  constructor(position, stoneColor) {
    this.position = position || new Position();
    this.stoneColor = stoneColor;
  }
}

export default Move;
