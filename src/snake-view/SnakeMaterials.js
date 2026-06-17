import * as THREE from "../../lib/three.module.js";

/**
 * Default materials are intentionally simple so the module works in isolation.
 * The renderer can pass custom materials through SnakeView opts.materials.
 */
export function createSnakeMaterials(custom = {}) {
  const defaults = {
    head: new THREE.MeshStandardMaterial({
      color: 0x66d16f,
      roughness: 0.55,
      metalness: 0.0
    }),
    body: new THREE.MeshStandardMaterial({
      color: 0x54bf63,
      roughness: 0.6,
      metalness: 0.0
    }),
    bodyAlt: new THREE.MeshStandardMaterial({
      color: 0x49ad58,
      roughness: 0.64,
      metalness: 0.0
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0x3f9d4b,
      roughness: 0.65,
      metalness: 0.0
    }),
    eyeWhite: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4
    }),
    pupil: new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.25
    }),
    beak: new THREE.MeshStandardMaterial({
      color: 0xffc857,
      roughness: 0.5
    }),
    highlight: new THREE.MeshStandardMaterial({
      color: 0x9af2a0,
      roughness: 0.5
    }),
    dead: new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.85
    })
  };

  return { ...defaults, ...custom };
}

export function setTreeOpacity(root, opacity) {
  root.traverse((obj) => {
    if (!obj.material) return;

    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
      material.needsUpdate = true;
    }
  });
}
