// Manual play-tester for the engine (Part A). NOT part of the game build —
// a headless ASCII front-end so you can drive the logic by hand.
//
// Usage:
//   node tools/play.js                 # built-in demo level
//   node tools/play.js levels/foo.json # play a level file
//
// Keys: arrows or WASD = move, u = undo, r = reset, q / Ctrl-C = quit.

import { readFileSync } from 'node:fs';
import { GameEngine } from '../src/engine/index.js';
import { equals } from '../src/shared/coords.js';
import { CELL_TYPES, isFruit } from '../src/shared/cells.js';

const DEMO = {
  id: 'demo', name: 'Demo Room', facing: 'right',
  grid: [
    '########',
    '#......#',
    '#..F...#',
    '#....#E#',
    '#.####.#',
    '#......#',
    '#.####.#',
  ],
  snake: [[2, 1], [1, 1]],
};

const path = process.argv[2];
const level = path ? JSON.parse(readFileSync(path, 'utf8')) : DEMO;
const engine = new GameEngine(level);

let lastMsg = path ? `Loaded ${level.name}` : `Demo level (${level.name})`;

function render() {
  const { state } = engine;
  const grid = level.grid.map((r) => r.split(''));

  // Hide fruit already eaten.
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (isFruit(grid[row][col]) && !state.remainingFruit.some((f) => equals(f, { col, row }))) {
        grid[row][col] = CELL_TYPES.EMPTY;
      }
    }
  }

  // Overlay the snake: H = head, o = body.
  state.segments.forEach((s, i) => {
    if (s.row >= 0 && s.row < grid.length && s.col >= 0 && s.col < grid[0].length) {
      grid[s.row][s.col] = i === 0 ? 'H' : 'o';
    }
  });

  console.clear();
  console.log(grid.map((r) => r.join('')).join('\n'));
  console.log(
    `\nstatus=${state.status}  facing=${state.facing}  ` +
    `moves=${state.moveCount}  fruit ${state.eatenFruit}/${state.eatenFruit + state.remainingFruit.length}`,
  );
  console.log(lastMsg);
  console.log('\n[arrows/WASD] move   [u] undo   [r] reset   [q] quit');
}

const KEYS = {
  '[A': 'up', '[B': 'down', '[C': 'right', '[D': 'left',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

function onKey(key) {
  if (key === '' || key === 'q') { // Ctrl-C / q
    console.log('\nbye');
    process.exit(0);
  }
  if (key === 'u') {
    lastMsg = engine.undo() ? 'undo' : 'nothing to undo';
    return render();
  }
  if (key === 'r') {
    engine.reset();
    lastMsg = 'reset';
    return render();
  }
  const dir = KEYS[key];
  if (!dir) return;

  const r = engine.step(dir);
  lastMsg = r.accepted
    ? `${dir}: ${r.phases.map((p) => p.kind).join(' -> ')} (outcome: ${r.outcome})`
    : `${dir}: blocked`;
  render();
}

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', onKey);

render();
