// The one coordinate vocabulary everyone shares (Tech Spec §2).
//
// Grid space (logic): { col, row }, integers. col increases rightward,
// row increases downward, origin (0,0) is top-left. Gravity pulls +row.
//
// World space (view): Y up, X right, Z out of screen. The single grid->world
// mapping lives here so the logic and view layers can never disagree on it.

import { CELL } from './constants.js';

/** @typedef {{ col: number, row: number }} Coord */
/** @typedef {'up' | 'down' | 'left' | 'right'} Direction */

export const DIRECTIONS = Object.freeze(['up', 'down', 'left', 'right']);

const DELTA = Object.freeze({
  up:    { dCol: 0,  dRow: -1 }, // row - 1
  down:  { dCol: 0,  dRow: 1 },  // row + 1
  left:  { dCol: -1, dRow: 0 },  // col - 1
  right: { dCol: 1,  dRow: 0 },  // col + 1
});

/** Step one cell from `coord` in `dir`. Pure; returns a fresh Coord. */
export function move(coord, dir) {
  const d = DELTA[dir];
  if (!d) throw new Error(`Unknown direction: ${dir}`);
  return { col: coord.col + d.dCol, row: coord.row + d.dRow };
}

export function equals(a, b) {
  return a.col === b.col && a.row === b.row;
}

export function coordKey(c) {
  return `${c.col},${c.row}`;
}

/**
 * Grid -> world (center of the cell), before any board-centering offset.
 * Note y = -row * CELL: increasing row goes down in world space, so the
 * engine's "gravity = +row" matches "fall = -Y" in the renderer. Board
 * centering is done once by the renderer translating its board Group —
 * never by editing this function.
 * @param {Coord} c
 * @returns {{ x: number, y: number, z: number }}
 */
export function cellToWorld({ col, row }) {
  return { x: col * CELL, y: -row * CELL, z: 0 };
}
