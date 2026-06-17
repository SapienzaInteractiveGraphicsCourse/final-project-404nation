// Materials (Part C — renderer).
//
// Every surface here is a MeshStandardMaterial (physically based) wired with
// THREE coordinated map kinds at once — colour `map`, `normalMap`, and
// `roughnessMap`.

import * as THREE from "../../lib/three.module.js";
import {
  makeFloorTextures,
  makeWallTextures,
  makeSnakeTextures,
  makeFruitTextures
} from "./textures.js";

/**
 * Build the environment material set (floor / walls / fruit / exit / spikes).
 * @param {{cols:number, rows:number}} size board size, used to tile the floor.
 */
export function buildEnvironmentMaterials({ cols, rows }) {
  const floorTex = makeFloorTextures();
  // tile the floor so each board cell shows roughly one stone tile cluster
  for (const t of [floorTex.map, floorTex.normalMap, floorTex.roughnessMap]) {
    t.repeat.set(cols / 2, rows / 2);
  }

  const wallTex = makeWallTextures();
  const fruitTex = makeFruitTextures();

  const floor = new THREE.MeshStandardMaterial({
    map: floorTex.map,
    normalMap: floorTex.normalMap,
    roughnessMap: floorTex.roughnessMap,
    normalScale: new THREE.Vector2(1, 1),
    roughness: 1.0,
    metalness: 0.0
  });

  const wall = new THREE.MeshStandardMaterial({
    map: wallTex.map,
    normalMap: wallTex.normalMap,
    roughnessMap: wallTex.roughnessMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 1.0,
    metalness: 0.05
  });

  const fruit = new THREE.MeshStandardMaterial({
    map: fruitTex.map,
    normalMap: fruitTex.normalMap,
    roughnessMap: fruitTex.roughnessMap,
    roughness: 0.7,
    metalness: 0.0,
    emissive: 0x4a0d06,
    emissiveIntensity: 0.25
  });

  const exit = new THREE.MeshStandardMaterial({
    color: 0x37d2c4,
    roughness: 0.25,
    metalness: 0.1,
    emissive: 0x0fae9e,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.85
  });

  const spikes = new THREE.MeshStandardMaterial({
    color: 0x9aa3ad,
    roughness: 0.35,
    metalness: 0.6
  });

  return { floor, wall, fruit, exit, spikes };
}

/**
 * Build the snake material set passed to SnakeView via `opts.materials`.
 * The keys here mirror SnakeMaterials.createSnakeMaterials so the renderer's
 * textured PBR materials cleanly override the module's plain defaults.
 *
 * Head / body / bodyAlt / tail all share the scale texture maps (so the whole
 * articulated body is textured) but vary in tint + roughness for visual depth.
 */
export function buildSnakeMaterials() {
  const headTex = makeSnakeTextures({ r: 102, g: 209, b: 111 });
  const bodyTex = makeSnakeTextures({ r: 84, g: 191, b: 99 });
  const altTex = makeSnakeTextures({ r: 73, g: 173, b: 88 });
  const tailTex = makeSnakeTextures({ r: 63, g: 157, b: 75 });

  const skin = (tex, { roughness = 0.6, color = 0xffffff } = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      map: tex.map,
      normalMap: tex.normalMap,
      roughnessMap: tex.roughnessMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness,
      metalness: 0.0
    });

  return {
    head: skin(headTex, { roughness: 0.5 }),
    body: skin(bodyTex, { roughness: 0.58 }),
    bodyAlt: skin(altTex, { roughness: 0.62 }),
    tail: skin(tailTex, { roughness: 0.66 }),
    // face / accent materials stay as crisp solid colours
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }),
    beak: new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.45, metalness: 0.1 }),
    highlight: new THREE.MeshStandardMaterial({ color: 0x9af2a0, roughness: 0.4 }),
    dead: new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 })
  };
}
