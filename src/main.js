// App entry / integration glue.
//
// Wires the modules together:
//   input -> engine.step() -> snakeView.playPhase() -> HUD/renderer sync
// The engine is the single source of truth; the view only animates resolved
// phases. Input is locked while phases are animating.

import "./style.css";

import { GameEngine } from "./engine/index.js";
import { Renderer } from "./renderer/index.js";
import { SnakeView } from "./snake-view/index.js";
import { loadLevel } from "./levels/loadlevel.js";

import levelGuide from "../levels/level-guide.json";
import level1 from "../levels/level-1.json";
import level2 from "../levels/level-2.json";
import level3 from "../levels/level-3.json";
import level4 from "../levels/level-4.json";

const LEVELS = [levelGuide, level1, level2, level3, level4].map(loadLevel);

const canvas = document.querySelector("#game-canvas");
const renderer = new Renderer(canvas);

let currentLevelIndex = 0;
let level = LEVELS[currentLevelIndex];
let engine = new GameEngine(level);
let snakeView = new SnakeView(engine.state, { materials: renderer.snakeMaterials });
let busy = false;
let currentView = "iso";

renderer.boardGroup.add(snakeView.object3D);
renderer.start();

// --- HUD ---------------------------------------------------------------
const els = {
  level: document.querySelector("#hud-level"),
  fruit: document.querySelector("#hud-fruit"),
  moves: document.querySelector("#hud-moves"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayText: document.querySelector("#overlay-text"),
  overlayBtn: document.querySelector("#overlay-btn"),
  lightBtn: document.querySelector("#btn-light"),
  prevBtn: document.querySelector("#btn-prev"),
  nextBtn: document.querySelector("#btn-next")
};

function updateHud(state) {
  els.level.textContent = `${currentLevelIndex + 1}/${LEVELS.length} ${level.name ?? level.id ?? ""}`;
  els.fruit.textContent = String(state.remainingFruit?.length ?? 0);
  els.moves.textContent = String(state.moveCount ?? 0);

  if (state.status === "won") {
    const hasNext = currentLevelIndex < LEVELS.length - 1;
    showOverlay(
      hasNext ? "Level complete!" : "You win!",
      hasNext ? "Move on to the next level." : "All levels complete.",
      hasNext ? "Next level (N)" : "Play again (R)"
    );
  } else if (state.status === "dead") {
    showOverlay("Game over", "The snake didn't make it. Try again.", "Try again (R)");
  } else {
    hideOverlay();
  }

  els.prevBtn.disabled = currentLevelIndex === 0;
  els.nextBtn.disabled = currentLevelIndex === LEVELS.length - 1;
}

function showOverlay(title, text, buttonText) {
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.overlayBtn.textContent = buttonText;
  els.overlay.classList.remove("hidden");
}

function hideOverlay() {
  els.overlay.classList.add("hidden");
}

function loadLevelAt(index) {
  if (busy || index < 0 || index >= LEVELS.length) return;

  currentLevelIndex = index;
  level = LEVELS[currentLevelIndex];
  engine = new GameEngine(level);

  renderer.buildLevel(level);
  snakeView.setStateInstant(engine.state);
  renderer.updateFromState(engine.state);
  selectView(currentView);
  updateHud(engine.state);
}

function loadNextLevel() {
  if (currentLevelIndex < LEVELS.length - 1) {
    loadLevelAt(currentLevelIndex + 1);
  }
}

function loadPreviousLevel() {
  if (currentLevelIndex > 0) {
    loadLevelAt(currentLevelIndex - 1);
  }
}

// --- movement ----------------------------------------------------------
async function onMove(direction) {
  if (busy || engine.status !== "playing") return;

  const result = engine.step(direction);
  if (!result.accepted) return;

  busy = true;
  for (const phase of result.phases) {
    renderer.updateFromState(phase.after);
    await snakeView.playPhase(phase);
  }
  busy = false;

  renderer.updateFromState(engine.state);
  updateHud(engine.state);
}

function doUndo() {
  if (busy) return;
  const state = engine.undo();
  if (state) {
    snakeView.setStateInstant(state);
    renderer.updateFromState(state);
    updateHud(state);
  }
}

function doReset() {
  if (busy) return;
  const state = engine.reset();
  snakeView.setStateInstant(state);
  renderer.updateFromState(state);
  updateHud(state);
}

// --- input -------------------------------------------------------------
const KEY_TO_DIR = {
  w: "up", arrowup: "up",
  s: "down", arrowdown: "down",
  a: "left", arrowleft: "left",
  d: "right", arrowright: "right"
};

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key in KEY_TO_DIR) {
    e.preventDefault();
    onMove(KEY_TO_DIR[key]);
  } else if (key === "u") {
    doUndo();
  } else if (key === "r") {
    doReset();
  } else if (key === "n") {
    loadNextLevel();
  } else if (key === "p") {
    loadPreviousLevel();
  } else if (key === "1") {
    selectView("front");
  } else if (key === "2") {
    selectView("iso");
  } else if (key === "3") {
    selectView("orbit");
  } else if (key === "l") {
    toggleLight();
  }
});

// --- UI buttons --------------------------------------------------------
const viewButtons = document.querySelectorAll("[data-view]");

function selectView(view) {
  currentView = view;
  renderer.setCamera(view);
  viewButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
}

viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => selectView(btn.dataset.view));
});

let lightOn = true;
function toggleLight() {
  lightOn = !lightOn;
  renderer.toggleKeyLight(lightOn);
  els.lightBtn.textContent = `Key light: ${lightOn ? "ON" : "OFF"}`;
  els.lightBtn.classList.toggle("active", !lightOn);
}

els.lightBtn.addEventListener("click", toggleLight);
els.prevBtn.addEventListener("click", loadPreviousLevel);
els.nextBtn.addEventListener("click", loadNextLevel);
document.querySelector("#btn-undo").addEventListener("click", doUndo);
document.querySelector("#btn-reset").addEventListener("click", doReset);
els.overlayBtn.addEventListener("click", () => {
  if (engine.status === "won" && currentLevelIndex < LEVELS.length - 1) {
    loadNextLevel();
  } else {
    doReset();
  }
});

// --- init --------------------------------------------------------------
loadLevelAt(0);
