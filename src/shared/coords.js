import { CELL } from "./constants.js";

export const DIRECTIONS = Object.freeze(["up", "down", "left", "right"]);

export function cellToWorld({ col, row }) {
  return {
    x: col * CELL,
    y: -row * CELL,
    z: 0
  };
}

export function move(coord, dir) {
  switch (dir) {
    case "up":
      return { col: coord.col, row: coord.row - 1 };
    case "down":
      return { col: coord.col, row: coord.row + 1 };
    case "left":
      return { col: coord.col - 1, row: coord.row };
    case "right":
      return { col: coord.col + 1, row: coord.row };
    default:
      throw new Error(`Unknown direction: ${dir}`);
  }
}

export function equals(a, b) {
  return a.col === b.col && a.row === b.row;
}