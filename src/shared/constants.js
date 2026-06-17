// Shared tuning constants. No Three.js, no DOM — safe to import from any layer.
// Animation feel/scale is tuned here in one place (Tech Spec §8).

export const CELL = 1;                 // world units per grid cell
export const GLIDE_MS = 180;           // normal move duration
export const FALL_MS = 140;            // per-cell fall duration
export const GROW_MS = 160;            // tail pop-in
export const SEGMENT_THICKNESS = 0.8;  // ±Z extrusion (view-layer use)
