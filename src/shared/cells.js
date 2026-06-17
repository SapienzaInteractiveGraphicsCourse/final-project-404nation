export const CELL_TYPES = Object.freeze({
  WALL: "#",
  EMPTY: ".",
  FRUIT: "F",
  SPIKES: "^",
  EXIT: "E"
});

export function isWall(cell) {
  return cell === CELL_TYPES.WALL;
}

export function isSolid(cell) {
  return isWall(cell);
}

export function isSolidCell(cell) {
  return isSolid(cell);
}

export function isFruit(cell) {
  return cell === CELL_TYPES.FRUIT;
}

export function isSpikes(cell) {
  return cell === CELL_TYPES.SPIKES;
}

export function isExit(cell) {
  return cell === CELL_TYPES.EXIT;
}