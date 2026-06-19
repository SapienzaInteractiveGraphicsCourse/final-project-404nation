// App entry / integration glue.
//
// Wires the four modules together per the Tech Spec (§7.3) and the snake-view
// integration guide:
//   input → engine.step() → snakeView.playPhase() (in order) → HUD/renderer sync
// The engine is the single source of truth; the view only animates what it
// resolved. Input is locked while phases are animating.

import "./style.css";

import { GameEngine } from "./engine/index.js";
import { Renderer } from "./renderer/index.js";
import { SnakeView } from "./snake-view/index.js";
import { loadLevel } from "./levels/loadlevel.js";
import level01 from "../levels/level-3.json";

const level = loadLevel(level01);

const canvas = document.querySelector("#game-canvas");
const renderer = new Renderer(canvas);
const engine = new GameEngine(level);
// Pass C's PBR snake materials (colour + normal + roughness) into the view.
const snakeView = new SnakeView(engine.state, { materials: renderer.snakeMaterials });

renderer.buildLevel(level);
renderer.boardGroup.add(snakeView.object3D);
renderer.updateFromState(engine.state);
renderer.start();

// --- HUD ---------------------------------------------------------------
const els = {
  level: document.querySelector("#hud-level"),
  fruit: document.querySelector("#hud-fruit"),
  moves: document.querySelector("#hud-moves"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayText: document.querySelector("#overlay-text"),
  lightBtn: document.querySelector("#btn-light")
};

function updateHud(state) {
  els.level.textContent = level.name ?? level.id ?? "—";
  els.fruit.textContent = String(state.remainingFruit?.length ?? 0);
  els.moves.textContent = String(state.moveCount ?? 0);

  if (state.status === "won") {
    showOverlay("You win!", "All fruit eaten and you reached the exit.");
  } else if (state.status === "dead") {
    showOverlay("Game over", "The snake didn't make it. Try again.");
  } else {
    hideOverlay();
  }
}

function showOverlay(title, text) {
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.overlay.classList.remove("hidden");
}

function hideOverlay() {
  els.overlay.classList.add("hidden");
}

// --- movement ----------------------------------------------------------
let busy = false;

async function onMove(direction) {
  if (busy || engine.status !== "playing") return;

  const result = engine.step(direction);
  if (!result.accepted) return;

  busy = true;
  for (const phase of result.phases) {
    renderer.updateFromState(phase.after); // hide eaten fruit mid-sequence
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
document.querySelector("#btn-undo").addEventListener("click", doUndo);
document.querySelector("#btn-reset").addEventListener("click", doReset);
document.querySelector("#overlay-btn").addEventListener("click", doReset);

// --- init --------------------------------------------------------------
selectView("iso");
updateHud(engine.state);
