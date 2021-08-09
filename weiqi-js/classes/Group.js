class Group {
  static count = 0;
  id;
  stones = [];
  liberties = [];
  isAlive;
  constructor(stones) {
    this.id = Group.count++;
    this.stones = stones;
    this.stones.forEach((stone) => (stone.group = this));
    this.liberties = [];
    this.isAlive = true;
  }

  addStone(stone) {
    stone.group = this;
    if (!this.stones.some((s) => s.equals(stone))) {
      this.stones.push(stone);
    }
  }

  addLiberty(liberty) {
    if (!this.liberties.some((l) => l.equals(liberty))) {
      this.liberties.push(liberty);
    }
  }

  calculateLiberties() {
    this.liberties = [];
    if (this.isAlive) {
      this.stones.forEach((stone) => {
        stone.liberties.forEach(this.addLiberty, this);
      }, this);
    }
  }

  captured() {
    this.isAlive = false;
  }

  equals(other) {
    return this.id === other.id;
  }

  clearStones() {
    this.stones = [];
    this.liberties = [];
  }
}
export default Group;
