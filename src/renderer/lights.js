// Lighting (Part C — renderer).
//
//
//   - keyLight   : a DirectionalLight that casts soft (PCFSoft) shadows. This is
//                  the main light and the one the UI can toggle on/off.
//   - hemisphere : a sky/ground HemisphereLight for gentle ambient fill so the
//                  shadow side never goes fully black.
//   - accent     : a warm PointLight for a bit of colour interest / specular pop.

import * as THREE from "../../lib/three.module.js";

/**
 * Add the light rig to a scene, sized to the board.
 * @param {THREE.Scene} scene
 * @param {{cols:number, rows:number}} size
 * @returns {{ keyLight: THREE.DirectionalLight, toggleKey: (on:boolean)=>void, dispose: ()=>void }}
 */
export function addLights(scene, { cols = 8, rows = 6 } = {}) {
  const span = Math.max(cols, rows);

  // --- key light: directional, casts soft shadows ---
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(span * 0.5, span * 0.9, span * 0.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.radius = 6;        // VSM blur radius (soft penumbra)
  keyLight.shadow.blurSamples = 16;  // smoother VSM filtering
  keyLight.shadow.bias = -0.0004;

  // frame the shadow camera tightly around the board for crisp shadows
  const cam = keyLight.shadow.camera;
  const half = span * 0.85;
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  cam.near = 0.5;
  cam.far = span * 3;
  cam.updateProjectionMatrix();

  keyLight.target.position.set(0, 0, 0);
  scene.add(keyLight);
  scene.add(keyLight.target);

  // --- ambient fill: hemisphere (sky tint above, ground bounce below) ---
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x2a2438, 0.55);
  scene.add(hemi);

  // --- accent point light: warm rim for extra material/specular interest ---
  const accent = new THREE.PointLight(0xffd9a0, 18, span * 4, 2);
  accent.position.set(-span * 0.6, span * 0.4, span * 0.7);
  scene.add(accent);

  return {
    keyLight,
    accent,
    hemi,
    /** Toggle the key light (canonical "toggle lights" interaction). */
    toggleKey(on) {
      keyLight.visible = on;
      // lift ambient slightly when the key is off so the scene stays readable
      hemi.intensity = on ? 0.55 : 0.95;
    },
    dispose() {
      scene.remove(keyLight, keyLight.target, hemi, accent);
    }
  };
}
