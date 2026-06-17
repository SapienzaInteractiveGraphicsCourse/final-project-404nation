// Gravity resolution (Tech Spec §3, Project Plan §5 step 4).
// The snake is supported iff ANY segment has a solid cell directly below it
// (row + 1). Otherwise it falls one cell at a time until supported, or until
// it leaves the grid through the bottom = death by void.

import { isSolid } from '../shared/cells.js';

/** @typedef {import('../shared/coords.js').Coord} Coord */
/** @typedef {{ grid: string[], rows: number, cols: number }} Ctx */

/**
 * @param {Coord[]} segments
 * @param {Ctx} ctx
 * @returns {boolean}
 */
export function isSupported(segments, ctx) {
  for (const s of segments) {
    const below = s.row + 1;
    if (below < ctx.rows && isSolid(ctx.grid[below][s.col])) return true;
  }
  return false;
}

/**
 * Drop the snake under gravity until it rests or falls out the bottom.
 * Pure: never mutates the input segments.
 * @param {Coord[]} segments
 * @param {Ctx} ctx
 * @returns {{ segments: Coord[], fallCells: number, fellOut: boolean }}
 */
export function simulateFall(segments, ctx) {
  let current = segments.map((s) => ({ col: s.col, row: s.row }));
  let fallCells = 0;

  while (!isSupported(current, ctx)) {
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
