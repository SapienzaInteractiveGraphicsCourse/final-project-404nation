// Procedural texture generation (Part C — renderer).
//
// For each surface we generate
// three coordinated maps on a <canvas> at runtime:
//
//   - colour map      (`map`)          : the albedo / base colour
//   - normal map      (`normalMap`)    : per-texel surface bumps, derived from a
//                                        height field via a Sobel gradient
//   - roughness map   (`roughnessMap`) : per-texel micro-roughness (the PBR
//                                        analogue of a specular map)
//
// Generating them procedurally keeps the project's "static assets only" rule
// trivially satisfied (no rigged/animated imports) and means the repo has no
// binary texture dependencies to commit.

import * as THREE from "../../lib/three.module.js";

const SIZE = 256; // texel resolution per map; plenty for the minimalist art.

/** Allocate a 2D canvas + context at the working resolution. */
function makeCanvas(size = SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d") };
}

/**
 * Convert a grayscale HEIGHT canvas into a tangent-space NORMAL map canvas.
 * We read the red channel as height, take the Sobel gradient, and encode the
 * surface normal as RGB (the standard normal-map convention: flat = (128,128,255)).
 *
 * @param {HTMLCanvasElement} heightCanvas
 * @param {number} strength bump intensity (higher = deeper relief)
 * @returns {HTMLCanvasElement}
 */
function heightToNormal(heightCanvas, strength = 2.0) {
  const size = heightCanvas.width;
  const src = heightCanvas.getContext("2d").getImageData(0, 0, size, size).data;
  const { canvas, ctx } = makeCanvas(size);
  const out = ctx.createImageData(size, size);

  const h = (x, y) => {
    // wrap so the normal map tiles seamlessly
    const xi = (x + size) % size;
    const yi = (y + size) % size;
    return src[(yi * size + xi) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sobel gradients in x and y
      const dx =
        (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) -
        (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy =
        (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) -
        (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));

      // surface normal of the height field, normalised
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (y * size + x) * 4;
      out.data[i] = (nx * 0.5 + 0.5) * 255;
      out.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      out.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Wrap a canvas in a Three.js texture configured for tiling + colour space. */
function toTexture(canvas, { srgb = false, repeat = 1 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  // Colour maps are authored in sRGB; data maps (normal/rough) are linear.
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Cheap value-noise fill used as a base for several surfaces. */
function fillNoise(ctx, size, base, spread) {
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = base + (Math.random() - 0.5) * spread;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, n));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * FLOOR — stone tiles with recessed grout. Tiles read slightly raised and
 * smoother than the rougher grout lines, so the normal + roughness maps carry
 * real, visible information (not just a flat colour).
 */
export function makeFloorTextures() {
  const tiles = 4; // tiles per texture, then repeated across the board

  // --- colour ---
  const col = makeCanvas();
  {
    const c = col.ctx;
    c.fillStyle = "#3a4654"; // grout
    c.fillRect(0, 0, SIZE, SIZE);
    const step = SIZE / tiles;
    for (let ty = 0; ty < tiles; ty++) {
      for (let tx = 0; tx < tiles; tx++) {
        const shade = 70 + Math.floor(Math.random() * 22);
        c.fillStyle = `rgb(${shade + 18},${shade + 26},${shade + 34})`;
        c.fillRect(tx * step + 3, ty * step + 3, step - 6, step - 6);
      }
    }
  }

  // --- height (tiles raised, grout sunken, plus fine grain) ---
  const height = makeCanvas();
  {
    const c = height.ctx;
    fillNoise(c, SIZE, 60, 16); // dark grout grain
    const step = SIZE / tiles;
    for (let ty = 0; ty < tiles; ty++) {
      for (let tx = 0; tx < tiles; tx++) {
        c.fillStyle = "rgba(220,220,220,1)";
        c.fillRect(tx * step + 4, ty * step + 4, step - 8, step - 8);
      }
    }
    // speckle the tiles so the normals aren't perfectly flat
    for (let i = 0; i < 1400; i++) {
      const v = 150 + Math.random() * 90;
      c.fillStyle = `rgba(${v},${v},${v},0.25)`;
      c.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2, 2);
    }
  }

  // --- roughness (grout rougher = brighter; tiles a bit polished) ---
  const rough = makeCanvas();
  {
    const c = rough.ctx;
    c.fillStyle = "#dcdcdc"; // rough grout
    c.fillRect(0, 0, SIZE, SIZE);
    const step = SIZE / tiles;
    for (let ty = 0; ty < tiles; ty++) {
      for (let tx = 0; tx < tiles; tx++) {
        const r = 150 + Math.floor(Math.random() * 40);
        c.fillStyle = `rgb(${r},${r},${r})`;
        c.fillRect(tx * step + 4, ty * step + 4, step - 8, step - 8);
      }
    }
  }

  return {
    map: toTexture(col.canvas, { srgb: true }),
    normalMap: toTexture(heightToNormal(height.canvas, 2.4)),
    roughnessMap: toTexture(rough.canvas)
  };
}

/**
 * WALL — chunky bricks with mortar. Strong relief so the directional light
 * produces obvious shading across each block.
 */
export function makeWallTextures() {
  const rows = 5;
  const cols = 3;
  const bh = SIZE / rows;
  const bw = SIZE / cols;

  const col = makeCanvas();
  const height = makeCanvas();
  const rough = makeCanvas();

  const cc = col.ctx;
  const hc = height.ctx;
  const rc = rough.ctx;

  cc.fillStyle = "#2a2622"; // mortar
  cc.fillRect(0, 0, SIZE, SIZE);
  hc.fillStyle = "#3a3a3a"; // mortar sunken
  hc.fillRect(0, 0, SIZE, SIZE);
  rc.fillStyle = "#e8e8e8"; // mortar rough
  rc.fillRect(0, 0, SIZE, SIZE);

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : bw / 2; // running-bond offset
    for (let c = -1; c < cols; c++) {
      const x = c * bw + offset + 3;
      const y = r * bh + 3;
      const w = bw - 6;
      const h = bh - 6;

      const base = 78 + Math.floor(Math.random() * 28);
      cc.fillStyle = `rgb(${base + 34},${base + 14},${base - 6})`; // warm brick
      cc.fillRect(x, y, w, h);

      const hv = 190 + Math.floor(Math.random() * 50);
      hc.fillStyle = `rgb(${hv},${hv},${hv})`;
      hc.fillRect(x, y, w, h);

      const rv = 120 + Math.floor(Math.random() * 50);
      rc.fillStyle = `rgb(${rv},${rv},${rv})`;
      rc.fillRect(x, y, w, h);
    }
  }
  // grain on the bricks
  for (let i = 0; i < 2200; i++) {
    const v = Math.random() * 60;
    hc.fillStyle = `rgba(${v},${v},${v},0.12)`;
    hc.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2, 2);
  }

  return {
    map: toTexture(col.canvas, { srgb: true }),
    normalMap: toTexture(heightToNormal(height.canvas, 3.0)),
    roughnessMap: toTexture(rough.canvas)
  };
}

/**
 * SNAKE SKIN — a diamond scale pattern in a given palette. Used for the snake
 * body/head materials so the hierarchical model itself carries multi-map
 * textures (the second mandatory surface alongside the floor).
 *
 * @param {{r:number,g:number,b:number}} tint base scale colour
 */
export function makeSnakeTextures(tint = { r: 84, g: 191, b: 99 }) {
  const cells = 6; // scales across the texture
  const step = SIZE / cells;

  const col = makeCanvas();
  const height = makeCanvas();
  const rough = makeCanvas();

  const cc = col.ctx;
  const hc = height.ctx;
  const rc = rough.ctx;

  cc.fillStyle = `rgb(${Math.max(0, tint.r - 26)},${Math.max(0, tint.g - 26)},${Math.max(0, tint.b - 26)})`;
  cc.fillRect(0, 0, SIZE, SIZE);
  hc.fillStyle = "#202020";
  hc.fillRect(0, 0, SIZE, SIZE);
  rc.fillStyle = "#b0b0b0";
  rc.fillRect(0, 0, SIZE, SIZE);

  // draw overlapping diamond scales on two interleaved rows
  const drawScale = (cx, cy) => {
    const grad = cc.createRadialGradient(cx, cy - step * 0.15, step * 0.1, cx, cy, step * 0.7);
    const v = 0.85 + Math.random() * 0.3;
    grad.addColorStop(0, `rgb(${Math.min(255, tint.r * v + 30)},${Math.min(255, tint.g * v + 30)},${Math.min(255, tint.b * v + 20)})`);
    grad.addColorStop(1, `rgb(${tint.r * 0.6 | 0},${tint.g * 0.6 | 0},${tint.b * 0.6 | 0})`);
    cc.fillStyle = grad;
    diamond(cc, cx, cy, step * 0.62, step * 0.78);

    const hg = hc.createRadialGradient(cx, cy - step * 0.2, step * 0.05, cx, cy, step * 0.7);
    hg.addColorStop(0, "#f4f4f4");
    hg.addColorStop(1, "#3a3a3a");
    hc.fillStyle = hg;
    diamond(hc, cx, cy, step * 0.62, step * 0.78);

    rc.fillStyle = `rgb(${130 + Math.random() * 40 | 0},${130},${130})`;
    diamond(rc, cx, cy, step * 0.6, step * 0.76);
  };

  for (let row = -1; row <= cells; row++) {
    const offset = row % 2 === 0 ? 0 : step / 2;
    for (let c = -1; c <= cells; c++) {
      drawScale(c * step + offset + step / 2, row * step + step / 2);
    }
  }

  return {
    map: toTexture(col.canvas, { srgb: true }),
    normalMap: toTexture(heightToNormal(height.canvas, 2.2)),
    roughnessMap: toTexture(rough.canvas)
  };
}

/** Helper: draw a filled diamond/leaf scale shape. */
function diamond(ctx, cx, cy, halfW, halfH) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - halfH);
  ctx.quadraticCurveTo(cx + halfW, cy - halfH * 0.1, cx, cy + halfH);
  ctx.quadraticCurveTo(cx - halfW, cy - halfH * 0.1, cx, cy - halfH);
  ctx.closePath();
  ctx.fill();
}

/**
 * FRUIT — glossy speckled sphere skin. Simpler than the mandatory surfaces but
 * still ships all three map kinds for visual consistency.
 */
export function makeFruitTextures() {
  const col = makeCanvas(128);
  const height = makeCanvas(128);
  const rough = makeCanvas(128);
  const S = 128;

  col.ctx.fillStyle = "#c0392b";
  col.ctx.fillRect(0, 0, S, S);
  height.ctx.fillStyle = "#808080";
  height.ctx.fillRect(0, 0, S, S);
  rough.ctx.fillStyle = "#5a5a5a"; // fairly glossy
  rough.ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const v = 200 + Math.random() * 55;
    col.ctx.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},80,0.5)`;
    col.ctx.fillRect(x, y, 2, 2);
    height.ctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
    height.ctx.fillRect(x, y, 2, 2);
  }

  return {
    map: toTexture(col.canvas, { srgb: true }),
    normalMap: toTexture(heightToNormal(height.canvas, 1.4)),
    roughnessMap: toTexture(rough.canvas)
  };
}
