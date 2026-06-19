# Texture files (reserved placeholder locations)

The renderer loads PBR textures from this folder at runtime. **No images are
generated** — these are reserved file slots. Drop a matching PNG in and it is
picked up automatically on the next load; any file that is absent simply falls
back to the material's base colour, so the game always runs.

Served at `/<base>/assets/textures/…` via Vite's `public/` folder (works in dev
and on GitHub Pages).

## Naming convention

Each surface uses up to three coordinated map kinds (grading Requirement B —
"different kinds of textures"):

```
<name>_basecolor.png    colour / albedo   (sRGB)
<name>_normal.png       tangent-space normal map
<name>_roughness.png    roughness (PBR specular analogue)
```

## Reserved names

| `<name>`          | Surface                          |
|-------------------|----------------------------------|
| `wall`            | default block / wall             |
| `wall_alt`        | alternate block look             |
| `stone`           | block variant                    |
| `metal`           | block variant                    |
| `spikes`          | spike hazard                     |
| `fruit`           | fruit pickup                     |
| `exit`            | exit portal                      |
| `snake_head`      | snake head                       |
| `snake_body`      | snake body                       |
| `snake_body_alt`  | snake body (alternating segment) |
| `snake_tail`      | snake tail                       |

## Background

| File             | Use                                                    |
|------------------|--------------------------------------------------------|
| `background.png` | optional scene background image (flat, or 360° if set) |

Without `background.png` the scene uses the solid background colour configured
in `src/renderer/textures.js` (`DEFAULT_BACKGROUND`).

## Adding a new block material

Register a named material (with its own texture set) at runtime:

```js
renderer.materialLibrary.define("lava", {
  color: 0xff5522,
  textures: {
    map: "/assets/textures/lava_basecolor.png",
    normalMap: "/assets/textures/lava_normal.png",
    roughnessMap: "/assets/textures/lava_roughness.png"
  }
});
// then assign it to specific cells:
renderer.buildLevel(level, { cellMaterials: { "3,1": "lava" } });
```
