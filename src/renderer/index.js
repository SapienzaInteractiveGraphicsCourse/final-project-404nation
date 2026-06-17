// Renderer (Part C). Owns the Three.js scene: lights, materials, shadows,
// camera, and the board's static environment meshes (floor / walls / fruit /
// exit / spikes). Public surface matches the Tech Spec §7.2:
//
//   constructor(canvas)
//   get boardGroup()            B's snake + environment live here
//   buildLevel(level)           build environment meshes + materials
//   setCamera('front'|'iso'|'orbit')
//   toggleKeyLight(on)
//   start()                     render loop (also ticks TWEEN)
//
// Contract notes (snake-view integration guide §6): the renderer ONLY adds the
// snake's object3D to boardGroup — it never moves or animates the snake, and it
// never duplicates game state. The one piece of state it derives is cosmetic:
// hiding eaten-fruit meshes and lighting the exit, via updateFromState().

import * as THREE from "../../lib/three.module.js";
import { update as tweenUpdate } from "../../lib/tween.module.js";

import { cellToWorld } from "../shared/coords.js";
import { CELL, SEGMENT_THICKNESS } from "../shared/constants.js";
import { CELL_TYPES } from "../shared/cells.js";

import { addLights } from "./lights.js";
import { OrbitCamera } from "./camera.js";
import { buildEnvironmentMaterials, buildSnakeMaterials } from "./materials.js";

const WALL_DEPTH = 1.0;

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap; // genuinely soft shadows
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1d2b);
    this.scene.fog = new THREE.Fog(0x1a1d2b, 18, 42);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    // Board group: B's snake + C's environment. Centred so any level sits in
    // front of the camera (Tech Spec §2 — centring is done ONCE here, never in
    // the coords function or snake-view).
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "BoardGroup";
    this.scene.add(this.boardGroup);

    // Environment meshes live in their own sub-group so buildLevel can rebuild
    // them without touching the externally-added snake.
    this.envGroup = new THREE.Group();
    this.envGroup.name = "Environment";
    this.boardGroup.add(this.envGroup);

    this.lights = addLights(this.scene, { cols: 8, rows: 6 });
    this.orbit = new OrbitCamera(this.camera, canvas);

    /** @type {Map<string, THREE.Object3D>} fruit meshes by "col,row" */
    this.fruitMeshes = new Map();
    this.exitMesh = null;
    this.envMaterials = null;
    this.snakeMaterials = buildSnakeMaterials();

    this._timer = new THREE.Timer();
    this._running = false;

    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);
    this._resize();
  }

  /**
   * Build the static environment for a level: floor, walls, fruit, exit, spikes.
   * @param {{grid:string[]}} level
   */
  buildLevel(level) {
    const grid = level.grid;
    const rows = grid.length;
    const cols = grid[0].length;

    this._clearEnv();
    this.envMaterials = buildEnvironmentMaterials({ cols, rows });

    // Centre the board on the origin (offset applied once, to the board group).
    this.boardGroup.position.set(-(cols - 1) / 2 * CELL, (rows - 1) / 2 * CELL, 0);

    // --- floor backboard (receives shadows) ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * CELL + 1.5, rows * CELL + 1.5),
      this.envMaterials.floor
    );
    floor.position.set((cols - 1) / 2 * CELL, -(rows - 1) / 2 * CELL, -WALL_DEPTH / 2 - 0.05);
    floor.receiveShadow = true;
    this.envGroup.add(floor);

    // --- cell contents ---
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ch = grid[row][col];
        const { x, y } = cellToWorld({ col, row });

        if (ch === CELL_TYPES.WALL) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(CELL, CELL, WALL_DEPTH),
            this.envMaterials.wall
          );
          wall.position.set(x, y, 0);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.envGroup.add(wall);
        } else if (ch === CELL_TYPES.FRUIT) {
          const fruit = new THREE.Mesh(
            new THREE.SphereGeometry(0.3 * CELL, 24, 18),
            this.envMaterials.fruit
          );
          fruit.position.set(x, y, 0.1);
          fruit.castShadow = true;
          fruit.receiveShadow = true;
          fruit.userData.spin = true;
          this.envGroup.add(fruit);
          this.fruitMeshes.set(`${col},${row}`, fruit);
        } else if (ch === CELL_TYPES.EXIT) {
          const exit = this._buildExit();
          exit.position.set(x, y, 0);
          this.envGroup.add(exit);
          this.exitMesh = exit;
        } else if (ch === CELL_TYPES.SPIKES) {
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.32 * CELL, 0.7 * CELL, 12),
            this.envMaterials.spikes
          );
          // cone points up (+Y) out of the play plane toward the snake
          spike.position.set(x, y, 0.1);
          spike.rotation.x = Math.PI / 2;
          spike.castShadow = true;
          this.envGroup.add(spike);
        }
      }
    }

    // frame the camera to the new board
    const span = Math.max(cols, rows);
    this.orbit.setBaseRadius(span * 1.4 + 4);
    this.orbit.setTarget(new THREE.Vector3(0, 0, 0));
    this.orbit.setView("iso");
  }

  /** A glowing exit portal (torus + inner disc). */
  _buildExit() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34 * CELL, 0.07 * CELL, 16, 32),
      this.envMaterials.exit
    );
    group.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.3 * CELL, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0b3b38,
        emissive: 0x27c2b4,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      })
    );
    disc.position.z = -0.02;
    group.add(disc);
    group.userData.exit = true;
    return group;
  }

  /**
   * Cosmetic sync with game state: hide eaten fruit and brighten the exit once
   * all fruit is collected. Does NOT drive logic — purely visual.
   * @param {{remainingFruit?: {col:number,row:number}[]}} state
   */
  updateFromState(state) {
    if (!state) return;
    const remaining = new Set((state.remainingFruit ?? []).map((f) => `${f.col},${f.row}`));
    for (const [key, mesh] of this.fruitMeshes) {
      mesh.visible = remaining.has(key);
    }
    if (this.exitMesh) {
      const open = remaining.size === 0;
      this.exitMesh.userData.open = open;
    }
  }

  /** Switch the camera framing (viewpoint interaction). */
  setCamera(view) {
    this.orbit.setView(view);
  }

  /** Toggle the directional key light (lights interaction). */
  toggleKeyLight(on) {
    this.lights.toggleKey(on);
  }

  /** Start the render loop. Single place TWEEN.update() is called. */
  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      requestAnimationFrame(loop);
      this._timer.update();
      const t = this._timer.getElapsed();
      tweenUpdate();
      this._tickEnv(t);
      this._ensureShadows();
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
  }

  // --- internals ---

  /** Idle environment motion: bob/spin fruit, pulse the open exit. */
  _tickEnv(t) {
    for (const mesh of this.fruitMeshes.values()) {
      if (!mesh.visible) continue;
      mesh.rotation.y = t * 1.5;
      mesh.position.z = 0.1 + Math.sin(t * 2 + mesh.position.x) * 0.05;
    }
    if (this.exitMesh) {
      this.exitMesh.rotation.z = t * 0.6;
      const open = this.exitMesh.userData.open;
      const s = open ? 1 + Math.sin(t * 4) * 0.08 : 1;
      this.exitMesh.scale.setScalar(s);
      this.envMaterials.exit.emissiveIntensity = open ? 1.1 + Math.sin(t * 4) * 0.4 : 0.5;
    }
  }

  /**
   * The snake-view rebuilds its segment meshes on every setStateInstant, so new
   * meshes appear without shadow flags. Tag + enable shadow casting on any
   * freshly-added mesh in the board group each frame (idempotent, cheap).
   */
  _ensureShadows() {
    this.boardGroup.traverse((obj) => {
      if (obj.isMesh && !obj.userData.__shadowed) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.userData.__shadowed = true;
      }
    });
  }

  _clearEnv() {
    this.envGroup.traverse((obj) => {
      if (obj.isMesh) obj.geometry?.dispose();
    });
    this.envGroup.clear();
    this.fruitMeshes.clear();
    this.exitMesh = null;
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    this.orbit.dispose();
    this.lights.dispose();
    this._clearEnv();
    this.renderer.dispose();
  }
}
