// Undo history (Project Plan §5, Tech Spec §5).
// Because every GameState is an immutable snapshot, undo is trivial: push the
// pre-move state onto a stack, pop to restore. No cloning needed here.

/** @typedef {import('./state.js').GameState} GameState */

export class History {
  constructor() {
    /** @type {GameState[]} */
    this._stack = [];
  }

  /** @param {GameState} state */
  push(state) {
    this._stack.push(state);
  }

  /** @returns {GameState | null} the popped state, or null if empty */
  pop() {
    return this._stack.length > 0 ? this._stack.pop() : null;
  }

  clear() {
    this._stack = [];
  }

  get size() {
    return this._stack.length;
  }
}
