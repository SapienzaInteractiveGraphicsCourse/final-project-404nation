// Materials (Part C — renderer).
//
// Every surface is a MeshStandardMaterial (physically based) that can load a
// custom PBR texture set — colour `map`, `normalMap`, `roughnessMap` — from
// files (see textures.js). When a texture file is absent the material falls back
// to its base colour, so the game always renders.
//
// Materials are organised in a MaterialLibrary keyed by name, so different
// blocks/cells can be assigned different materials, and new custom materials can
// be registered at runtime.

import * as THREE from "../../lib/three.module.js";
import { textureSet, applyTextureSet } from "./textures.js";

/**
 * Built-in material definitions. Each entry = base PBR params + an optional
 * texture set (file paths). Drop matching PNGs into public/assets/textures to
 * skin any surface; until then the base colour is used. Add entries here (or via
 * MaterialLibrary.define) to give blocks different looks.
 */
export const MATERIAL_DEFS = {
  // --- blocks (walls / obstacles): several looks so cells can differ ---
  wall: { color: 0x8a6f52, roughness: 1.0, metalness: 0.05, textures: textureSet("wall"), normalScale: [1.2, 1.2] },
  wallAlt: { color: 0x6f5a44, roughness: 1.0, metalness: 0.05, textures: textureSet("wall_alt"), normalScale: [1.2, 1.2] },
  stone: { color: 0x7d8590, roughness: 0.95, metalness: 0.0, textures: textureSet("stone") },
  // NOTE: high metalness with no environment map renders black. Keep metalness
  // modest so metals still shade under direct light alone.
  metal: { color: 0x9aa3ad, roughness: 0.4, metalness: 0.4, textures: textureSet("metal") },

  // --- other environment ---
  spikes: { color: 0xb9c0c9, roughness: 0.45, metalness: 0.15, textures: textureSet("spikes") },
  fruit: {
    color: 0xc0392b, roughness: 0.7, metalness: 0.0, textures: textureSet("fruit"),
    emissive: 0x4a0d06, emissiveIntensity: 0.25
  },
  exit: {
    color: 0x37d2c4, roughness: 0.25, metalness: 0.1, textures: textureSet("exit"),
    emissive: 0x0fae9e, emissiveIntensity: 0.6, transparent: true, opacity: 0.85
  },

  // --- snake (head / body / alt / tail; varied tint, each own texture slot) ---
  snakeHead: { color: 0x66d16f, roughness: 0.5, metalness: 0.0, textures: textureSet("snake_head"), normalScale: [1.1, 1.1] },
  snakeBody: { color: 0x54bf63, roughness: 0.58, metalness: 0.0, textures: textureSet("snake_body"), normalScale: [1.1, 1.1] },
  snakeBodyAlt: { color: 0x49ad58, roughness: 0.62, metalness: 0.0, textures: textureSet("snake_body_alt"), normalScale: [1.1, 1.1] },
  snakeTail: { color: 0x3f9d4b, roughness: 0.66, metalness: 0.0, textures: textureSet("snake_tail"), normalScale: [1.1, 1.1] }
};

/**
 * Create one MeshStandardMaterial from a definition, loading any custom textures.
 * @param {object} [def] base params + textures ({map,normalMap,roughnessMap}) or
 *                        individual `map`/`normalMap`/`roughnessMap` file paths.
 * @returns {THREE.MeshStandardMaterial}
 */
export function createMaterial(def = {}) {
  const {
    color = 0xffffff, roughness = 0.8, metalness = 0.0,
    emissive, emissiveIntensity, transparent, opacity, side,
    map, normalMap, roughnessMap, textures, repeat = [1, 1], normalScale
  } = def;

  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  if (emissive !== undefined) mat.emissive = new THREE.Color(emissive);
  if (emissiveIntensity !== undefined) mat.emissiveIntensity = emissiveIntensity;
  if (transparent !== undefined) mat.transparent = transparent;
  if (opacity !== undefined) mat.opacity = opacity;
  if (side !== undefined) mat.side = side;
  if (normalScale) mat.normalScale = new THREE.Vector2(normalScale[0], normalScale[1]);

  // Custom textures: an explicit map-set, or individual file paths.
  const set = textures || { map, normalMap, roughnessMap };
  applyTextureSet(mat, set, { repeat });
  return mat;
}

/**
 * A registry of named materials. Blocks request materials by name; new custom
 * materials can be registered or re-skinned at runtime.
 */
export class MaterialLibrary {
  /** @param {Object<string, object>} [overrides] extra/override definitions */
  constructor(overrides = {}) {
    /** @type {Map<string, THREE.MeshStandardMaterial>} */
    this.materials = new Map();
    const defs = { ...MATERIAL_DEFS, ...overrides };
    for (const [name, def] of Object.entries(defs)) {
      this.materials.set(name, createMaterial(def));
    }
  }

  get(name) {
    return this.materials.get(name);
  }

  has(name) {
    return this.materials.has(name);
  }

  /** Register/replace a named material from a definition (custom textures ok). */
  define(name, def) {
    const mat = createMaterial(def);
    this.materials.set(name, mat);
    return mat;
  }

  /** Attach a custom texture set to an existing named material at runtime. */
  setTextures(name, set, opts) {
    const mat = this.materials.get(name);
    if (mat) applyTextureSet(mat, set, opts);
    return mat;
  }
}

/**
 * Snake material set passed to SnakeView via opts.materials. Pulls the snake
 * skins from the library (so they share the custom-texture pipeline) and adds
 * the small solid-colour face/accent materials.
 * @param {MaterialLibrary} [lib]
 */
export function buildSnakeMaterials(lib = new MaterialLibrary()) {
  return {
    head: lib.get("snakeHead"),
    body: lib.get("snakeBody"),
    bodyAlt: lib.get("snakeBodyAlt"),
    tail: lib.get("snakeTail"),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }),
    beak: new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.45, metalness: 0.1 }),
    highlight: new THREE.MeshStandardMaterial({ color: 0x9af2a0, roughness: 0.4 }),
    dead: new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 })
  };
}
