// Texture loading (Part C — renderer).
//
// Materials load their maps from FILES under public/assets/textures. These are
// reserved placeholder locations — no images are generated here. Each surface
// follows the project's PBR naming convention:
//
//   <name>_basecolor.png   <name>_normal.png   <name>_roughness.png
//
// Loading is graceful: a missing/optional file simply leaves the material at its
// base colour, so the game runs before any art exists and "lights up" the moment
// a real texture file is dropped in.

import * as THREE from "../../lib/three.module.js";

// Resolve against Vite's base URL so paths work both in dev ("/") and on
// GitHub Pages ("/<repo>/").
const BASE = (import.meta.env && import.meta.env.BASE_URL) || "/";

/** Root folder for all reserved texture files. */
export const TEXTURE_DIR = `${BASE}assets/textures`;

/** Standard PBR map-set file paths for a named surface (files optional). */
export function textureSet(name) {
  return {
    map: `${TEXTURE_DIR}/${name}_basecolor.png`,
    normalMap: `${TEXTURE_DIR}/${name}_normal.png`,
    roughnessMap: `${TEXTURE_DIR}/${name}_roughness.png`
  };
}

/** Default scene background. Solid colour fallback + an optional image file. */
export const DEFAULT_BACKGROUND = {
  color: 0x121530,
  texture: `${TEXTURE_DIR}/background.png`, // optional; flat image or 360° map
  equirect: false                           // true → treat as environment map
};

const _loader = new THREE.TextureLoader();

/**
 * Asynchronously load `path` into `material[slot]`. On success the map is
 * applied and the material refreshed; on failure (absent placeholder) nothing
 * changes, so the material's base colour shows through.
 *
 * @param {THREE.Material} material
 * @param {string} slot e.g. "map" | "normalMap" | "roughnessMap"
 * @param {string} path file URL
 * @param {{srgb?:boolean, repeat?:[number,number]}} [opts]
 */
export function applyTexture(material, slot, path, { srgb = false, repeat = [1, 1] } = {}) {
  if (!path) return;
  _loader.load(
    path,
    (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      tex.anisotropy = 4;
      tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      material[slot] = tex;
      material.needsUpdate = true;
    },
    undefined,
    () => { /* optional texture absent — keep base colour */ }
  );
}

/**
 * Apply a full PBR map-set (colour + normal + roughness) onto a material.
 * The colour map is treated as sRGB; normal/roughness as linear data.
 *
 * @param {THREE.Material} material
 * @param {{map?:string, normalMap?:string, roughnessMap?:string}} set file paths
 * @param {{repeat?:[number,number]}} [opts]
 */
export function applyTextureSet(material, set, { repeat = [1, 1] } = {}) {
  if (!set) return;
  applyTexture(material, "map", set.map, { srgb: true, repeat });
  applyTexture(material, "normalMap", set.normalMap, { repeat });
  applyTexture(material, "roughnessMap", set.roughnessMap, { repeat });
}

/**
 * Load a single standalone texture (e.g. the background image).
 * @returns {THREE.Texture|null}
 */
export function loadTexture(path, { onLoad, onError } = {}) {
  if (!path) return null;
  return _loader.load(path, onLoad, undefined, onError);
}
