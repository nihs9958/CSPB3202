class Stone {
  static count = 0;
  id;
  color;
  position;
  liberties = [];
  group;
  constructor(color, position, liberties = []) {
    this.id = Stone.count++;
    this.color = color;
    this.position = position;
    this.liberties = liberties;
  }

  equals(other) {
    return this.color == other.color && this.position.equals(other.position);
  }

  addLiberty(position) {
    if (!this.liberties.some((pos) => pos.equals(position))) {
      this.liberties.push(position);
    }
  }

  captured() {
    this.group?.captured?.();
  }
}

export default Stone;
