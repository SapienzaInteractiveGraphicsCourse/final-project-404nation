// Single-step resolution (Project Plan §5, Tech Spec §6.2).
//
// One `step` resolves synchronously into an ordered list of visual phases:
// the glide/grow, then zero or more gravity falls, then possibly a death or
// win. The engine decides every outcome here; the view only plays it back.
//
// Contract guarantees (Tech Spec §6.2) honoured below:
//   - phases is ordered and gapless: phases[i].after deep-equals phases[i+1].before
//   - phases[last].after deep-equals finalState
//   - if accepted === false, phases is empty and finalState === state (unchanged)

import { move, equals } from '../shared/coords.js';
import { isWall, isFruit, isSpikes, isExit } from '../shared/cells.js';
import { freezeState, cloneCoord } from './state.js';
import { simulateFall, cellKey } from './gravity.js';

/** Set of cell keys for the uneaten fruit in a state — used as gravity ground. */
function fruitSetOf(state) {
  return new Set(state.remainingFruit.map((f) => cellKey(f.col, f.row)));
}

/** @typedef {import('./state.js').GameState} GameState */
/** @typedef {import('../shared/coords.js').Direction} Direction */
/** @typedef {{ grid: string[], rows: number, cols: number }} Ctx */

/**
 * @typedef {Object} Phase
 * @property {'glide' | 'fall' | 'grow' | 'die'} kind
 * @property {GameState} before
 * @property {GameState} after
 * @property {{ fruitEaten?: import('../shared/coords.js').Coord,
 *              fallCells?: number,
 *              cause?: 'spikes' | 'void' }} [meta]
 */

/**
 * @typedef {Object} StepResult
 * @property {boolean} accepted
 * @property {Phase[]} phases
 * @property {GameState} finalState
 * @property {'none' | 'ate' | 'won' | 'dead'} outcome
 */

/**
 * @param {GameState} state
 * @param {Ctx} ctx
 * @param {Direction} dir
 * @returns {StepResult}
 */
export function resolveStep(state, ctx, dir) {
  const reject = () => ({ accepted: false, phases: [], finalState: state, outcome: 'none' });

  // Only the engine's own status gates a move; callers also guard, but be safe.
  if (state.status !== 'playing') return reject();

  const head = state.segments[0];
  const target = move(head, dir);

  // Illegal moves (blocked): out of bounds, into a wall, or into the snake's
  // own body. Per the contract (§3) the whole body blocks — including the tail
  // cell, even though it would vacate. (Open question §13; kept literal so the
  // four modules don't silently diverge.)
  if (target.col < 0 || target.col >= ctx.cols || target.row < 0 || target.row >= ctx.rows) {
    return reject();
  }
  const targetCh = ctx.grid[target.row][target.col];
  if (isWall(targetCh)) return reject();
  if (state.segments.some((s) => equals(s, target))) return reject();

  // --- Legal move: build the glide/grow state. ---
  const ate = isFruit(targetCh) && state.remainingFruit.some((f) => equals(f, target));
  // New head enters target; every other segment takes the previous cell of the
  // one ahead. On growth the tail stays (length + 1), so we don't drop it.
  const movedSegments = ate
    ? [cloneCoord(target), ...state.segments.map(cloneCoord)]
    : [cloneCoord(target), ...state.segments.slice(0, -1).map(cloneCoord)];
  const remainingFruit = ate
    ? state.remainingFruit.filter((f) => !equals(f, target))
    : state.remainingFruit;
  const eatenFruit = ate ? state.eatenFruit + 1 : state.eatenFruit;

  const phases = [];
  const before = freezeState(state);

  let current = freezeState({
    segments: movedSegments,
    facing: dir,
    eatenFruit,
    remainingFruit,
    status: 'playing',
    moveCount: state.moveCount + 1,
  });
  phases.push({
    kind: ate ? 'grow' : 'glide',
    before,
    after: current,
    ...(ate ? { meta: { fruitEaten: cloneCoord(target) } } : {}),
  });

  // Spikes: the snake glides onto the cell, then dies there.
  if (isSpikes(targetCh)) {
    return finishDeath(phases, current, 'spikes');
  }

  // Win by stepping straight onto the exit with all fruit eaten.
  if (isExit(targetCh) && remainingFruit.length === 0) {
    return finishWin(phases, current);
  }

  // Gravity: fall as a single phase covering all dropped cells. Uneaten fruit
  // (in current.remainingFruit) counts as ground; the just-eaten fruit is
  // already gone from the set, so its cell is now air.
  const fall = simulateFall(current.segments, ctx, fruitSetOf(current));
  if (fall.fallCells > 0) {
    const fallen = freezeState({ ...current, segments: fall.segments });
    phases.push({ kind: 'fall', before: current, after: fallen, meta: { fallCells: fall.fallCells } });
    current = fallen;
    if (fall.fellOut) {
      return finishDeath(phases, current, 'void');
    }
  }

  // Win by landing on the exit after a fall (with all fruit eaten).
  const settledHead = current.segments[0];
  if (isExit(ctx.grid[settledHead.row][settledHead.col]) && current.remainingFruit.length === 0) {
    return finishWin(phases, current);
  }

  return { accepted: true, phases, finalState: current, outcome: ate ? 'ate' : 'none' };
}

/** Append a terminal die phase and return the dead StepResult. */
function finishDeath(phases, current, cause) {
  const dead = freezeState({ ...current, status: 'dead' });
  phases.push({ kind: 'die', before: current, after: dead, meta: { cause } });
  return { accepted: true, phases, finalState: dead, outcome: 'dead' };
}

/**
 * Mark a win. There's no 'win' phase kind — the win is carried as status on
 * the last phase's `after` so phases stay gapless and final.
 */
function finishWin(phases, current) {
  const won = freezeState({ ...current, status: 'won' });
  const last = phases[phases.length - 1];
  phases[phases.length - 1] = { ...last, after: won };
  return { accepted: true, phases, finalState: won, outcome: 'won' };
}
