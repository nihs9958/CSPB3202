import Position from "./Position";
import _ from "lodash";
import Group from "./Group";

class Board {
  size;
  gutter = 50;
  positions;
  stones;
  groups;
  capturedStones = [];
  deltas = [
    new Position(1, 0),
    new Position(0, 1),
    new Position(-1, 0),
    new Position(0, -1),
  ];
  nextDeltas = [new Position(1, 0), new Position(0, 1)];
  anchorPositions;
  consecutivePasses = 0;
  game;
  turn;
  history = [];
  eventHandlers = { playerTurn: [] };
  winner;

  constructor(size, game) {
    this.size = size;
    this.gutter = Math.floor((window.innerHeight * 0.75) / this.size);
    this.anchorPositions = [
      new Position(3, 3),
      new Position(3, size - 4),
      new Position(Math.ceil(size / 2) - 1, Math.ceil(size / 2) - 1),
      new Position(size - 4, 3),
      new Position(size - 4, size - 4),
    ];
    this.game = game;
    this.turn = "black";
    this.stones = Array.from({ length: size }).map((_) =>
      Array.from({ length: size })
    );
    const range = Array.from({ length: size }).map((_, i) => i);
    this.positions = [];
    range.forEach((x) =>
      range.forEach((y) => this.positions.push(new Position(x, y)))
    );
    this.groups = [];
    this.renderBoard();
  }

  subscribe(event, fn) {
    if (!this.eventHandlers[event]) {
      // initializing an array for an unknown event
      this.eventHandlers[event] = [];
    }
    // storing the provided callback function in
    // the handlers array of the given 'event'
    this.eventHandlers[event].push(fn);
  }

  unsubscribe(event, fn) {
    // removing the given callback for the given 'event'
    this.eventHandlers[event] =
      this.eventHandlers[event]?.filter?.(function (item) {
        if (item !== fn) {
          return item;
        }
      }) || [];
  }

  fire(event, o, thisObj) {
    var scope = thisObj || this;
    // invoke all the event handlers assiciated to the given 'event'
    this.eventHandlers[event].forEach(function (item) {
      item.call(scope, o);
    });
  }

  switchTurns() {
    this.turn = this.turn === "black" ? "white" : "black";
    // fire the "playerTurn" event
    this.fire("playerTurn", this.turn);
  }

  addPositions(a, b) {
    return new Position(a.x + b.x, a.y + b.y);
  }

  positionInBounds(position) {
    const x = position.x;
    const y = position.y;
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  compareBoardStates(stonesA, stonesB) {
    return this.positions.every((position) => {
      const stoneA = stonesA[position.x][position.y];
      const stoneB = stonesB[position.x][position.y];

      if (!stoneA && !stoneB) {
        return true;
      } else if (stoneA && stoneB && stoneA.equals(stoneB)) {
        return true;
      }
    });
  }

  isPreviousBoardState(stones, history) {
    let isPositionalSuperKo = false;
    history.forEach((prevBoard) => {
      isPositionalSuperKo ||= this.compareBoardStates(prevBoard.stones, stones);
    });

    return isPositionalSuperKo;
  }

  calculateStoneLiberties(stone) {
    stone.liberties = [];
    const neighbors = this.getNeighbors(stone.position);
    neighbors.forEach((position) => {
      if (!this.stones[position.x][position.y]) {
        stone.addLiberty(position);
      }
    });
  }

  calculateBoardLiberties() {
    this.stones.forEach((col) => {
      col.forEach((stone) => {
        if (stone) {
          this.calculateStoneLiberties(stone);
        }
      });
    });

    this.groups.forEach((group) => {
      group.calculateLiberties();
    });
  }

  checkIfStoneShouldCaptured(stone) {
    let isCaptured = false;
    if (stone.group) {
      if (stone.group.liberties.length === 0) {
        isCaptured = true;
      }
    } else if (stone.liberties.length === 0) {
      isCaptured = true;
    }
    return isCaptured;
  }

  checkAndCaptureStones(stonePlayed) {
    let isLegal = false;
    this.stones.forEach((col) => {
      col.forEach((stone) => {
        if (stone && !stone.equals(stonePlayed)) {
          let isCaptured = this.checkIfStoneShouldCaptured(stone);
          if (isCaptured) {
            this.captureStone(stone.position);
          }
          isLegal ||= isCaptured;
        }
      });
    });
    let placedStoneCaptured = this.checkIfStoneShouldCaptured(stonePlayed);
    if (placedStoneCaptured) {
      !isLegal && this.captureStone(stonePlayed.position);
      isLegal ||= false;
    } else {
      isLegal ||= true;
    }
    return isLegal;
  }

  captureStone(position) {
    let capturedStone = this.stones[position.x][position.y];
    capturedStone.captured();
    this.capturedStones.push(capturedStone);
    this.stones[position.x][position.y] = undefined;
  }

  checkIfMoveLegal(board, position) {
    if (board.stones[position.x][position.y]) {
      console.log(board.stones[position.x][position.y]);
      return false;
    }
    let stonePlayed = board.game.getPlayer().placeStone();
    stonePlayed.position = position;
    board.stones[position.x][position.y] = stonePlayed;
    let { history } = board;
    board.checkAndAddToGroup();
    board.calculateBoardLiberties();
    let stonesCaptured = board.checkAndCaptureStones(stonePlayed);
    let positionalSuperKo = board.isPreviousBoardState(board.stones, history);
    console.log({ stonesCaptured, positionalSuperKo });
    return stonesCaptured && !positionalSuperKo;
  }

  checkAndAddToGroup() {
    this.stones.forEach((col) => {
      col.forEach((stone) => {
        if (stone) {
          const neighbors = this.getNeighbors(stone.position);
          neighbors.forEach((position) => {
            let neighborStone = this.stones[position.x][position.y];
            if (neighborStone && neighborStone.color === stone.color) {
              if (stone.group && !neighborStone.group) {
                stone.group.addStone(neighborStone);
              } else if (!stone.group && neighborStone.group) {
                neighborStone.group.addStone(stone);
              } else if (!stone.group && !neighborStone.group) {
                let newGroup = new Group([stone, neighborStone]);
                this.groups.push(newGroup);
              } else if (
                stone.group &&
                neighborStone.group &&
                !stone.group.equals(neighborStone.group)
              ) {
                let thisGroup = stone.group;
                let neighborGroup = neighborStone.group;
                let newGroup = new Group([
                  ...stone.group.stones,
                  ...neighborStone.group.stones,
                ]);
                console.log(newGroup);
                thisGroup.clearStones();
                neighborGroup.clearStones();
                this.groups.push(newGroup);
                console.log(this.groups);
              }
            }
          });
        }
      });
    });
  }

  getStoneUI(position, color, ghost) {
    let stone = document.createElementNS("http://www.w3.org/2000/svg", "image");
    stone.id = ghost
      ? `${position.x}-${position.y}-ghost`
      : `${position.x}-${position.y}-stone`;
    stone.setAttributeNS(null, "x", `${position.x * this.gutter}`);
    stone.setAttributeNS(null, "y", `${position.y * this.gutter}`);
    stone.setAttributeNS(null, "height", `${this.gutter}`);
    stone.setAttributeNS(null, "width", `${this.gutter}`);
    if (color === "black") {
      stone.setAttribute("href", "../assets/balck.png");
    } else {
      stone.setAttribute("href", "../assets/white.png");
    }
    let opacity = ghost ? 0.75 : 1;
    stone.setAttributeNS(null, "opacity", `${opacity}`);
    stone.addEventListener("click", (e) => {
      if (!ghost) {
        alert("You can't place stone here!");
      }
    });
    return stone;
  }

  showStonePlacement(position, moved = false) {
    if (this.stones[position.x][position.y]) {
      if (moved) {
        alert("You can't place stone here!");
      }
      return false;
    }
    let stone = this.getStoneUI(position, this.turn, !moved);
    if (moved) {
      document.getElementById("board").appendChild(stone);
    } else {
      document
        .getElementById("background")
        .insertAdjacentElement("afterend", stone);
    }
    return true;
  }

  hideStonePlacement(position) {
    document.getElementById(`${position.x}-${position.y}-ghost`)?.remove?.();
  }

  getNeighbors(position) {
    return this.deltas
      .map((d) => this.addPositions(position, d))
      .filter((p) => this.positionInBounds(p));
  }

  getNextNeighbors(position) {
    return this.nextDeltas
      .map((d) => this.addPositions(position, d))
      .filter((p) => this.positionInBounds(p));
  }

  handleClick(position, e) {
    const board = _.cloneDeep(this);
    if (!this.checkIfMoveLegal(board, position)) {
      return alert("You can't make this move");
    }
    let stonePlayed = this.game.getPlayer().placeStone();
    stonePlayed.position = position;
    this.stones[position.x][position.y] = stonePlayed;
    let { history, game, positions, ...historyItem } = this;
    this.history.push(_.cloneDeep(historyItem));
    this.checkAndAddToGroup();
    this.calculateBoardLiberties();
    this.checkAndCaptureStones(stonePlayed);
    this.calculateBoardLiberties();
    e.target.setAttributeNS(null, "cursor", "no-drop");
    this.switchTurns();
    this.renderBoard();
  }

  renderCell(position, board) {
    let neighbours = this.getNextNeighbors(position);
    let offset = this.gutter * 0.5;
    neighbours.forEach((pos) => {
      let xOffset = position.x === pos.x ? 0 : 0.5;
      let yOffset = position.y === pos.y ? 0 : 0.5;
      let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.id = `line:${position.x}-${position.y}:${pos.x}-${pos.y}`;
      line.setAttributeNS(
        null,
        "x1",
        position.x * this.gutter + offset - xOffset
      );
      line.setAttributeNS(
        null,
        "y1",
        position.y * this.gutter + offset - yOffset
      );
      line.setAttributeNS(null, "x2", pos.x * this.gutter + offset + xOffset);
      line.setAttributeNS(null, "y2", pos.y * this.gutter + offset + yOffset);
      line.setAttributeNS(null, "stroke", "rgb(0,0,0)");
      line.setAttributeNS(null, "stroke-width", 3);
      board.appendChild(line);
    });
    let square = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    square.id = `x:${position.x};y:${position.y}`;
    square.setAttributeNS(null, "width", this.gutter);
    square.setAttributeNS(null, "height", this.gutter);
    square.setAttributeNS(null, "x", position.x * this.gutter);
    square.setAttributeNS(null, "y", position.y * this.gutter);
    square.setAttributeNS(null, "fill", "rgba(0,0,0,0)");
    square.addEventListener("mouseenter", (e) => {
      this.showStonePlacement(position);
    });
    square.addEventListener("mouseleave", (e) => {
      this.hideStonePlacement(position);
    });

    square.addEventListener("click", (e) => {
      this.handleClick(position, e);
    });

    board.appendChild(square);
    if (this.stones?.[position.x]?.[position.y]) {
      let stone = this.getStoneUI(
        position,
        this.stones[position.x][position.y].color,
        false
      );
      board.appendChild(stone);
    }
  }

  renderBoard() {
    const element = document.getElementById("app");
    document.getElementById("board")?.remove?.();
    document.getElementById("pass-button")?.remove?.();
    let board = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    board.id = "board";
    board.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    board.setAttributeNS(null, "width", this.size * this.gutter);
    board.setAttributeNS(null, "height", this.size * this.gutter);
    board.setAttributeNS(
      null,
      "background-size",
      `${this.size * this.gutter}px ${this.size * this.gutter}px`
    );
    board.setAttributeNS(
      null,
      "viewBox",
      `0 0 ${this.size * this.gutter} ${this.size * this.gutter}`
    );
    board.innerHTML = `<image id="background" width="2400" height="1600" xlink:href="../assets/wood-2.jpeg" style="filter: blur(2px); -webkit-filter: blur(2px);" />`;
    element.appendChild(board);
    this.anchorPositions.forEach((position) => {
      let offset = this.gutter * 0.5;
      board.innerHTML += `<circle cx="${
        position.x * this.gutter + offset
      }" cy="${position.y * this.gutter + offset}" r="5" fill="black" />`;
    });
    this.positions.forEach((position) => this.renderCell(position, board));

    let passButton = document.createElement("button");
    passButton.id = "pass-button";
    passButton.innerHTML = "Pass Chance";
    passButton.addEventListener("click", () => {
      this.passChance();
    });
    passButton.classList.add("pass-button");
    element.appendChild(passButton);
  }

  getScore() {
    return "white";
  }

  getOppositeColor(color) {
    if (color === "white") {
      return "black";
    } else {
      return "white";
    }
  }

  passChance() {
    this.consecutivePasses++;
    console.log({ consecutivePasses: this.consecutivePasses });
    this.switchTurns();
    if (this.consecutivePasses >= 2) {
      this.clearBoard();
    }
  }

  clearBoard() {
    document.getElementById("board")?.remove?.();
    document.getElementById("pass-button")?.remove?.();
    this.fire("gameOver", null, this);
  }
}

export default Board;
