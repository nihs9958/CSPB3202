import Position from "./Position";
import Stone from "./Stone";

class Player {
  name;
  color;
  stones;
  constructor(name, color) {
    this.name = name;
    this.color = color;
    this.stones = new Set();
    let numberOfStones = "black" ? 181 : 180;
    for (let i = 0; i < numberOfStones; i++) {
      this.stones.add(new Stone(color, new Position()));
    }
  }
  placeStone() {
    let stonesArray = Array.from(this.stones);
    let playedStone = stonesArray.pop();
    this.stones = new Set(stonesArray);
    return playedStone;
  }
  addStone(stone) {
    this.stones.add(stone);
  }
}

export default Player;
