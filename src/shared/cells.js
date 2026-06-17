export const CELL_TYPES = Object.freeze({
  WALL: "#",
  EMPTY: ".",
  FRUIT: "F",
  SPIKES: "^",
  EXIT: "E"
});

export function isSolidCell(cell) {
  return cell === CELL_TYPES.WALL;
}
