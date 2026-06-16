// Cell-type vocabulary shared across all modules (Tech Spec §3).
// A level grid is made of single-character cells.

export const CELL_TYPES = Object.freeze({
  WALL: '#',   // solid: blocks movement, supports the snake
  EMPTY: '.',  // air
  FRUIT: 'F',  // snake grows by 1 on enter
  SPIKES: '^', // death on enter
  EXIT: 'E',   // win iff all fruit eaten, otherwise acts as air
});

export const ALL_CELL_CHARS = Object.freeze(Object.values(CELL_TYPES));

export function isWall(ch) { return ch === CELL_TYPES.WALL; }
export function isFruit(ch) { return ch === CELL_TYPES.FRUIT; }
export function isSpikes(ch) { return ch === CELL_TYPES.SPIKES; }
export function isExit(ch) { return ch === CELL_TYPES.EXIT; }

// v1 rule: only walls are "solid" — they both block a move and support the
// snake against gravity. Fruit/spikes/exit/empty are all non-solid.
export function isSolid(ch) { return ch === CELL_TYPES.WALL; }

// Alias kept for the view layer, which imports `isSolidCell`.
export const isSolidCell = isSolid;
