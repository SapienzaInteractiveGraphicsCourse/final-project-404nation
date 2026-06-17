// The engine owns the single authoritative game state; the view is always
// derived from it.

import { isFruit, CELL_TYPES } from '../shared/cells.js';
import { DIRECTIONS } from '../shared/coords.js';
import { freezeState } from './state.js';
import { resolveStep } from './solver.js';
import { History } from './undo.js';

/** @typedef {import('./state.js').GameState} GameState */
/** @typedef {import('./state.js').Status} Status */
/** @typedef {import('./solver.js').StepResult} StepResult */
/** @typedef {import('../shared/coords.js').Direction} Direction */

/**
 * @typedef {Object} LevelData
 * @property {string} id
 * @property {string} name
 * @property {string[]} grid              rows top-to-bottom; every string the same length
 * @property {[number, number][]} snake   ordered [col, row], HEAD FIRST
 * @property {Direction} facing
 */

/**
 * Validate a LevelData and extract the engine's working context.
 * Throws on malformed levels so bad data fails loudly at construction.
 * @param {LevelData} level
 */
function parseLevel(level) {
  if (!level || !Array.isArray(level.grid) || level.grid.length === 0) {
    throw new Error('Invalid level: missing or empty grid');
  }
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  for (const r of level.grid) {
    if (typeof r !== 'string' || r.length !== cols) {
      throw new Error('Invalid level: all grid rows must be strings of the same length');
    }
  }

  if (!Array.isArray(level.snake) || level.snake.length === 0) {
    throw new Error('Invalid level: snake must be a non-empty ordered list (head first)');
  }
  const segments = level.snake.map(([col, row]) => ({ col, row }));
  for (const s of segments) {
    if (s.col < 0 || s.col >= cols || s.row < 0 || s.row >= rows) {
      throw new Error(`Invalid level: snake segment out of bounds (${s.col}, ${s.row})`);
    }
    if (level.grid[s.row][s.col] === CELL_TYPES.WALL) {
      throw new Error(`Invalid level: snake segment inside a wall (${s.col}, ${s.row})`);
    }
  }

  if (!DIRECTIONS.includes(level.facing)) {
    throw new Error(`Invalid level: unknown facing "${level.facing}"`);
  }

  const remainingFruit = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (isFruit(level.grid[row][col])) remainingFruit.push({ col, row });
    }
  }

  return { rows, cols, grid: level.grid.slice(), segments, facing: level.facing, remainingFruit };
}

export class GameEngine {
  /** @param {LevelData} level */
  constructor(level) {
    const parsed = parseLevel(level);

    /** @type {{ grid: string[], rows: number, cols: number }} */
    this._ctx = { grid: parsed.grid, rows: parsed.rows, cols: parsed.cols };

    this._initial = freezeState({
      segments: parsed.segments,
      facing: parsed.facing,
      eatenFruit: 0,
      remainingFruit: parsed.remainingFruit,
      status: 'playing',
      moveCount: 0,
    });

    /** @type {GameState} */
    this._state = this._initial;
    this._history = new History();
  }

  /** Current authoritative snapshot (immutable). @returns {GameState} */
  get state() {
    return this._state;
  }

  /** @returns {Status} */
  get status() {
    return this._state.status;
  }

  /**
   * Attempt a move. Resolves the glide, gravity, and any death/win
   * synchronously and returns the ordered phases for the view to play.
   * @param {Direction} dir
   * @returns {StepResult}
   */
  step(dir) {
    const result = resolveStep(this._state, this._ctx, dir);
    if (result.accepted) {
      this._history.push(this._state);
      this._state = result.finalState;
    }
    return result;
  }

  /**
   * Undo the last accepted move. @returns {GameState | null} null if nothing to undo.
   */
  undo() {
    const prev = this._history.pop();
    if (prev === null) return null;
    this._state = prev;
    return this._state;
  }

  /** Reset to the level start, clearing undo history. @returns {GameState} */
  reset() {
    this._history.clear();
    this._state = this._initial;
    return this._state;
  }
}

export { DIRECTIONS };
