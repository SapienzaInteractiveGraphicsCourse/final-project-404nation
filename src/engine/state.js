// GameState helpers (Tech Spec §5). Snapshots are immutable: the engine
// hands the view frozen objects with cloned coords so the view can never
// corrupt the authoritative state, and so undo is just "keep the old object".

/** @typedef {import('../shared/coords.js').Coord} Coord */
/** @typedef {import('../shared/coords.js').Direction} Direction */
/** @typedef {'playing' | 'won' | 'dead'} Status */

/**
 * @typedef {Object} GameState
 * @property {Coord[]} segments       ordered, HEAD FIRST; segments[0] is the head
 * @property {Direction} facing
 * @property {number} eatenFruit      count eaten so far
 * @property {Coord[]} remainingFruit fruit cells not yet eaten
 * @property {Status} status
 * @property {number} moveCount
 */

export function cloneCoord(c) {
  return { col: c.col, row: c.row };
}

/**
 * Produce a deeply-frozen GameState snapshot with independent coord objects.
 * @param {GameState} state
 * @returns {GameState}
 */
export function freezeState(state) {
  return Object.freeze({
    segments: Object.freeze(state.segments.map(cloneCoord)),
    facing: state.facing,
    eatenFruit: state.eatenFruit,
    remainingFruit: Object.freeze(state.remainingFruit.map(cloneCoord)),
    status: state.status,
    moveCount: state.moveCount,
  });
}
