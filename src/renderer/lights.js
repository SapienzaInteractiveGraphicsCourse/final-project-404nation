// Lighting (Part C — renderer). 2.5D diorama / "shadow-box" rig.
//
// The board is logically flat (Z = 0). To make it read as a lit 3D diorama the
// key light is deliberately OFF-AXIS (never from the camera direction): a light
// down the camera axis flattens everything and hides shadows behind the objects.
//
// Rig:
//   - keyLight   : DirectionalLight (parallel "sun"), the shadow caster. Placed
//                  above / to one side / in front, aimed at the board centre.
//   - hemisphere : sky+ground fill so shadow cores aren't dead black.
//   - accent     : a warm, toggleable PointLight (doubles as a "toggle lights"
//                  user interaction).
//
// The board is centred on the world origin (see Renderer), so all positions
// below are expressed relative to the board centre = origin.

import * as THREE from "../../lib/three.module.js";

// --- Tunables (adjust feel here) ----------------------------------------
export const KEY_INTENSITY = 2.6;
// Key-light offset as fractions of board width W / height H / span=max(W,H).
// A more grazing (lower-Y) + more lateral (bigger-X) angle throws longer,
// side-cast shadows so they read as "cast" rather than glued under the piece.
export const KEY_OFFSET = { x: -0.55, y: 0.7, z: 0.6 };
export const FILL_INTENSITY = 0.5;       // hemisphere fill
export const FILL_BOOST_WHEN_KEY_OFF = 0.4;
export const ACCENT_INTENSITY = 22;      // warm point light (decay 2 → needs punch)
export const SHADOW_MAP_SIZE = 2048;     // drop to 1024 if perf suffers
export const SHADOW_BIAS = -0.0005;      // kill acne (tune by eye)
export const SHADOW_NORMAL_BIAS = 0.02;
export const SHADOW_RADIUS = 12;         // soft-shadow blur radius (wide penumbra)
export const SHADOW_BLUR_SAMPLES = 25;   // VSM filter samples (smoother edge)
export const SHADOW_MARGIN = 1.5;        // frustum padding around the board

/**
 * Add the diorama light rig to a scene.
 * @param {THREE.Scene} scene
 * @param {{cols:number, rows:number}} size board size in cells (= world units)
 * @returns {{ keyLight, hemi, accent, update, toggleKey, toggleAccent, dispose }}
 */
export function addLights(scene, size = { cols: 8, rows: 6 }) {
  // --- key light: directional, casts soft shadows ---
  const keyLight = new THREE.DirectionalLight(0xffffff, KEY_INTENSITY);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  keyLight.shadow.radius = SHADOW_RADIUS;
  keyLight.shadow.blurSamples = SHADOW_BLUR_SAMPLES;
  keyLight.shadow.bias = SHADOW_BIAS;
  keyLight.shadow.normalBias = SHADOW_NORMAL_BIAS;
  scene.add(keyLight);
  scene.add(keyLight.target);

  // --- ambient fill: hemisphere (sky tint above, ground bounce below) ---
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x2a2438, FILL_INTENSITY);
  scene.add(hemi);

  // --- accent point light: warm rim, toggleable (user interaction) ---
  const accent = new THREE.PointLight(0xffd9a0, ACCENT_INTENSITY, 0, 2);
  scene.add(accent);

  const rig = {
    keyLight,
    hemi,
    accent,
    /** Re-fit the key light + shadow frustum to the actual level size. */
    update(s) {
      applyLayout(keyLight, accent, s);
    },
    /** Toggle the key light (lifts fill so the scene stays readable). */
    toggleKey(on) {
      keyLight.visible = on;
      hemi.intensity = on ? FILL_INTENSITY : FILL_INTENSITY + FILL_BOOST_WHEN_KEY_OFF;
    },
    /** Toggle the warm accent point light. */
    toggleAccent(on) {
      accent.visible = on;
    },
    dispose() {
      scene.remove(keyLight, keyLight.target, hemi, accent);
    }
  };

  rig.update(size);
  return rig;
}

/** Position the key light off-axis and tighten its shadow frustum to the board. */
function applyLayout(keyLight, accent, { cols, rows }) {
  const W = cols;
  const H = rows;
  const span = Math.max(W, H);

  // Off-axis key: above, to one side, well in front of the board.
  keyLight.position.set(KEY_OFFSET.x * W, KEY_OFFSET.y * H, KEY_OFFSET.z * span);
  keyLight.target.position.set(0, 0, 0);
  keyLight.target.updateMatrixWorld();

  // Tighten the orthographic shadow frustum to just enclose the board (+ margin)
  // so shadow-map resolution isn't wasted on empty space.
  const cam = keyLight.shadow.camera;
  const halfW = W / 2 + SHADOW_MARGIN;
  const halfH = H / 2 + SHADOW_MARGIN;
  cam.left = -halfW;
  cam.right = halfW;
  cam.top = halfH;
  cam.bottom = -halfH;
  cam.near = 0.5;
  cam.far = span * 3 + 5; // bracket the light → board → back-plane depth
  cam.updateProjectionMatrix();

  // Accent on the opposite side from the key, near the play area, in front.
  accent.position.set(W * 0.5, H * 0.3, span * 0.7);
  accent.distance = span * 4;
}
