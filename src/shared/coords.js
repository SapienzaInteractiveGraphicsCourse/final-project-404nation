import { CELL } from "./constants.js";

/**
 * Convert a logic-grid coordinate to the center of the corresponding
 * Three.js world cell, before renderer board-centering is applied.
 *
 * Logic rows increase downward, while world Y increases upward.
 *
 * @param {{ col: number, row: number }} coord
 * @returns {{ x: number, y: number, z: number }}
 */
export function cellToWorld({ col, row }) {
  return {
    x: col * CELL,
    y: -row * CELL,
    z: 0
  };
}
