import * as THREE from "../../lib/three.module.js";
import { SEGMENT_THICKNESS } from "../shared/constants.js";

const BODY_DEPTH = SEGMENT_THICKNESS;

export function createCoreGeometry(role) {
  switch (role) {
    case "head":
      return new THREE.BoxGeometry(0.86, 0.86, BODY_DEPTH);
    case "tail":
      return new THREE.BoxGeometry(0.62, 0.62, BODY_DEPTH * 0.92);
    default:
      return new THREE.BoxGeometry(0.72, 0.72, BODY_DEPTH * 0.96);
  }
}

export function createConnectorGeometry() {
  return new THREE.BoxGeometry(0.44, 0.34, BODY_DEPTH * 0.9);
}

export function createEyeGeometry() {
  return new THREE.SphereGeometry(0.075, 16, 16);
}

export function createPupilGeometry() {
  return new THREE.SphereGeometry(0.035, 12, 12);
}

export function createBeakGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.13);
  shape.lineTo(0.22, -0.13);
  shape.lineTo(-0.22, -0.13);
  shape.lineTo(0, 0.13);

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: false
  });
}

export function createTailTipGeometry() {
  return new THREE.ConeGeometry(0.23, 0.45, 4);
}

export function createHighlightGeometry() {
  return new THREE.BoxGeometry(0.28, 0.08, 0.035);
}

export function disposeObjectTree(object3D) {
  object3D.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
  });
}
