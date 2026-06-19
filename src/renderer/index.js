// Renderer (Part C). Owns the Three.js scene: lights, materials, shadows,
// camera, background, and the board's static environment meshes (walls / fruit /
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
import { MaterialLibrary, buildSnakeMaterials } from "./materials.js";
import { DEFAULT_BACKGROUND, loadTexture } from "./textures.js";

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

    // Named, texture-aware materials. Blocks/cells pick from here by name and
    // custom materials can be registered via materialLibrary.define(...).
    this.materialLibrary = new MaterialLibrary();
    this.snakeMaterials = buildSnakeMaterials(this.materialLibrary);
    this.exitMaterial = this.materialLibrary.get("exit");

    /** @type {Map<string, THREE.Object3D>} fruit meshes by "col,row" */
    this.fruitMeshes = new Map();
    this.exitMesh = null;

    // Soft-shadow catcher (restores visible shadows without a backboard wall).
    // Depth = how far behind the play plane it sits; a larger gap lets the
    // off-axis light throw an offset, softer shadow instead of a glued-on patch.
    this.shadowCatcher = true;
    this.shadowCatcherOpacity = 0.22;
    this.shadowCatcherDepth = 1.5;
    this.shadowCatcherColor = 0x101d33; // cool tint blends with the sky

    // Customizable background (replaces the old backboard wall).
    this._bgConfig = { ...DEFAULT_BACKGROUND };
    this.setBackground();

    this._timer = new THREE.Timer();
    this._running = false;

    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);
    this._resize();
  }

  /**
   * Configure the scene background (color fallback + optional image file).
   * @param {{color?:number, texture?:string|null, equirect?:boolean}} [def]
   *   Pass `texture` as a file path to use an image; `equirect:true` treats it
   *   as a 360° environment. Omit/null `texture` to use the solid color.
   */
  setBackground(def = {}) {
    const cfg = { ...this._bgConfig, ...def };
    this._bgConfig = cfg;

    // immediate solid-color fallback + matching fog
    this.scene.background = new THREE.Color(cfg.color);
    this.scene.fog = new THREE.Fog(cfg.color, 18, 55);

    if (!cfg.texture) return;
    // Optional background image — applied only if the file actually loads, so a
    // missing placeholder leaves the solid color in place.
    loadTexture(cfg.texture, {
      onLoad: (tex) => {
        if (cfg.equirect) {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          this.scene.environment = tex; // also light reflections
        } else {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
        this.scene.background = tex;
        this.scene.fog = null; // image background reads better without fog
      },
      onError: () => { /* keep solid color */ }
    });
  }

  /**
   * Build the static environment for a level.
   * @param {{grid:string[], cellMaterials?:Object<string,string>}} level
   * @param {{wallMaterial?:string, cellMaterials?:Object<string,string>}} [options]
   *   Blocks can use different materials: `wallMaterial` sets the default wall
   *   material name; `cellMaterials` maps "col,row" → a material name in the
   *   library (also read from level.cellMaterials).
   */
  buildLevel(level, options = {}) {
    const grid = level.grid;
    const rows = grid.length;
    const cols = grid[0].length;

    this._clearEnv();

    // Per-block material resolution (Requirement: blocks can load different
    // materials). Falls back to the default wall material if a name is unknown.
    const wallMaterialName = options.wallMaterial || "wall";
    const cellMaterials = { ...(level.cellMaterials || {}), ...(options.cellMaterials || {}) };
    const blockMaterial = (col, row) => {
      const name = cellMaterials[`${col},${row}`] || wallMaterialName;
      return this.materialLibrary.get(name) || this.materialLibrary.get("wall");
    };

    // Centre the board on the origin (offset applied once, to the board group).
    this.boardGroup.position.set(-(cols - 1) / 2 * CELL, (rows - 1) / 2 * CELL, 0);

    // Re-fit the key light + shadow frustum to this level's actual bounds.
    this.lights.update({ cols, rows });

    // --- cell contents (no backboard wall — see setBackground) ---
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ch = grid[row][col];
        const { x, y } = cellToWorld({ col, row });

        if (ch === CELL_TYPES.WALL) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(CELL, CELL, WALL_DEPTH),
            blockMaterial(col, row)
          );
          wall.position.set(x, y, 0);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.envGroup.add(wall);
        } else if (ch === CELL_TYPES.FRUIT) {
          const fruit = new THREE.Mesh(
            new THREE.SphereGeometry(0.3 * CELL, 24, 18),
            this.materialLibrary.get("fruit")
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
          // cone points up (+Y) so it reads as a classic spike from any view
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.34 * CELL, 0.8 * CELL, 12),
            this.materialLibrary.get("spikes")
          );
          spike.position.set(x, y, 0.1);
          spike.castShadow = true;
          spike.receiveShadow = true;
          this.envGroup.add(spike);
        }
      }
    }

    // Invisible shadow catcher behind the board: a transparent ShadowMaterial
    // plane so the soft shadows are still visible against the background now that
    // there's no backboard wall. Set shadowCatcher=false to disable.
    if (this.shadowCatcher) {
      const catcher = new THREE.Mesh(
        new THREE.PlaneGeometry(cols * CELL + 4, rows * CELL + 4),
        new THREE.ShadowMaterial({ color: this.shadowCatcherColor, opacity: this.shadowCatcherOpacity })
      );
      catcher.position.set((cols - 1) / 2 * CELL, -(rows - 1) / 2 * CELL, -this.shadowCatcherDepth);
      catcher.receiveShadow = true;
      this.envGroup.add(catcher);
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
      this.exitMaterial
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

  /** Toggle the warm accent point light (secondary lights interaction). */
  toggleAccentLight(on) {
    this.lights.toggleAccent(on);
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
      this.exitMaterial.emissiveIntensity = open ? 1.1 + Math.sin(t * 4) * 0.4 : 0.5;
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
