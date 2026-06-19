// Camera + viewpoint interaction (Part C — renderer).
//
//
// We implement a small self-contained orbit controller (no three/examples
// dependency, since only the core build is vendored). The camera is positioned
// in spherical coordinates around a fixed target (board centre = origin):
//   - drag    : orbit (azimuth + polar)
//   - wheel   : zoom (radius)
//   - presets : front / iso / orbit framings via setView()

import * as THREE from "../../lib/three.module.js";

// Orbit clamps — keep the camera in a small front sector so the scene always
// reads as "looking into a shadow box" (the diorama lighting is calibrated for a
// near-front view; wide angles reveal the flat back and break the illusion).
const MAX_AZIMUTH = Math.PI / 4;          // ±45° left/right
const MIN_POLAR = 0.55;                   // don't look down past the board
const MAX_POLAR = Math.PI / 2 - 0.02;     // and not below the horizon (no flip-under)
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.0;

/** Named preset framings: { azimuth, polar, radius } in spherical coords. */
const VIEWS = {
  front: { azimuth: 0, polar: Math.PI / 2 - 0.03, radius: 1.05 },
  iso: { azimuth: -0.62, polar: 0.92, radius: 1.15 },
  orbit: { azimuth: -0.62, polar: 0.92, radius: 1.15 } // free-look starts here
};

export class OrbitCamera {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement listens for pointer/wheel events
   * @param {THREE.Vector3} [target] look-at point (board centre)
   */
  constructor(camera, domElement, target = new THREE.Vector3()) {
    this.camera = camera;
    this.dom = domElement;
    this.target = target.clone();

    this.azimuth = VIEWS.iso.azimuth;
    this.polar = VIEWS.iso.polar;
    this.baseRadius = 12; // set from board size by Renderer via setBaseRadius()
    this.radiusScale = VIEWS.iso.radius;

    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;

    this._bind();
    this.update();
  }

  /** Distance scale derived from the board so framing fits any level. */
  setBaseRadius(r) {
    this.baseRadius = r;
    this.update();
  }

  setTarget(v) {
    this.target.copy(v);
    this.update();
  }

  /** Snap to a named preset ('front' | 'iso' | 'orbit'). */
  setView(name) {
    const v = VIEWS[name] || VIEWS.iso;
    this.azimuth = v.azimuth;
    this.polar = v.polar;
    this.radiusScale = v.radius;
    this.update();
  }

  /** Recompute the camera position from the spherical state. */
  update() {
    const r = this.baseRadius * this.radiusScale;
    const sinPolar = Math.sin(this.polar);
    const x = this.target.x + r * sinPolar * Math.sin(this.azimuth);
    const y = this.target.y + r * Math.cos(this.polar);
    const z = this.target.z + r * sinPolar * Math.cos(this.azimuth);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  _bind() {
    const onDown = (e) => {
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.dom.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.azimuth = clamp(this.azimuth - dx * 0.008, -MAX_AZIMUTH, MAX_AZIMUTH);
      this.polar = clamp(this.polar - dy * 0.008, MIN_POLAR, MAX_POLAR);
      this.update();
    };
    const onUp = (e) => {
      this._dragging = false;
      this.dom.releasePointerCapture?.(e.pointerId);
    };
    const onWheel = (e) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.001);
      this.radiusScale = clamp(this.radiusScale * factor, MIN_ZOOM, MAX_ZOOM);
      this.update();
    };

    this.dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    this.dom.addEventListener("wheel", onWheel, { passive: false });

    this._unbind = () => {
      this.dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.dom.removeEventListener("wheel", onWheel);
    };
  }

  dispose() {
    this._unbind?.();
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
