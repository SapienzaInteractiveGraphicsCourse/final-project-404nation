// Gravity resolution (Tech Spec §3, Project Plan §5 step 4).
// The snake is supported iff ANY segment has a solid cell directly below it
// (row + 1). Otherwise it falls one cell at a time until supported, or until
// it leaves the grid through the bottom = death by void.
//
// Support solidity is partly dynamic: a wall is always solid, and an UNEATEN
// fruit also acts as solid (a platform the snake can rest on). Once a fruit is
// eaten it is removed from `fruitSet` and becomes air, so anything resting on
// it then falls. Fruit never blocks movement — the head still enters its cell
// to eat it; only gravity treats uneaten fruit as ground.

import { isSolid, isFruit } from '../shared/cells.js';

/** @typedef {import('../shared/coords.js').Coord} Coord */
/** @typedef {{ grid: string[], rows: number, cols: number }} Ctx */

/** Key for a cell, matching the fruitSet entries built in the solver. */
export function cellKey(col, row) {
  return `${col},${row}`;
}

/** Does the cell at (col, row) hold the snake up? @param {Set<string>} fruitSet */
function supportsAt(col, row, ctx, fruitSet) {
  if (row >= ctx.rows) return false;
  const ch = ctx.grid[row][col];
  if (isSolid(ch)) return true;
  if (isFruit(ch) && fruitSet.has(cellKey(col, row))) return true; // uneaten fruit = ground
  return false;
}

/**
 * @param {Coord[]} segments
 * @param {Ctx} ctx
 * @param {Set<string>} fruitSet  keys of still-uneaten fruit cells
 * @returns {boolean}
 */
export function isSupported(segments, ctx, fruitSet) {
  for (const s of segments) {
    if (supportsAt(s.col, s.row + 1, ctx, fruitSet)) return true;
  }
  return false;
}

/**
 * Drop the snake under gravity until it rests or falls out the bottom.
 * Pure: never mutates the input segments. `fruitSet` is constant during a fall
 * (no eating happens mid-fall).
 * @param {Coord[]} segments
 * @param {Ctx} ctx
 * @param {Set<string>} fruitSet
 * @returns {{ segments: Coord[], fallCells: number, fellOut: boolean }}
 */
export function simulateFall(segments, ctx, fruitSet) {
  let current = segments.map((s) => ({ col: s.col, row: s.row }));
  let fallCells = 0;

  while (!isSupported(current, ctx, fruitSet)) {
    const next = current.map((s) => ({ col: s.col, row: s.row + 1 }));
    fallCells++;
    // Any segment past the bottom edge means the snake fell into the void.
    if (next.some((s) => s.row >= ctx.rows)) {
      return { segments: next, fallCells, fellOut: true };
    }
    current = next;
  }

  return { segments: current, fallCells, fellOut: false };
}
