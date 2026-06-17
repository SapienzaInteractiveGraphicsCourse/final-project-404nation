import * as THREE from "../../lib/three.module.js";
import { cellToWorld } from "../shared/coords.js";
import {
  createBeakGeometry,
  createConnectorGeometry,
  createCoreGeometry,
  createEyeGeometry,
  createHighlightGeometry,
  createPupilGeometry,
  createTailTipGeometry,
  disposeObjectTree
} from "./SnakeGeometry.js";

const FRONT_Z = 0.43;

export class SnakeSegment {
  constructor({ index, total, segments, facing, materials, opts = {} }) {
    this.index = index;
    this.total = total;
    this.materials = materials;
    this.opts = opts;

    this.group = new THREE.Group();
    this.group.name = `snake-segment-${index}`;

    this.role = getRole(index, total);
    this.core = null;
    this.connectorA = null;
    this.connectorB = null;
    this.faceGroup = null;
    this.tailTip = null;
    this.highlight = null;

    this.rebuild();
    this.update({ index, total, segments, facing });
  }

  get object3D() {
    return this.group;
  }

  setPosition(coord) {
    const pos = cellToWorld(coord);
    this.group.position.set(pos.x, pos.y, pos.z);
  }

  update({ index, total, segments, facing }) {
    this.index = index;
    this.total = total;

    const newRole = getRole(index, total);
    if (newRole !== this.role) {
      this.role = newRole;
      this.rebuild();
    }

    this.group.name = `snake-segment-${index}-${this.role}`;
    this.setPosition(segments[index]);

    if (this.role === "head") {
      this.updateHead(facing);
    } else if (this.role === "tail") {
      this.updateTail(segments);
    } else {
      this.updateBody(segments);
    }
  }

  setDeadVisual(deadMaterial) {
    this.group.traverse((obj) => {
      if (obj.isMesh) obj.material = deadMaterial;
    });
  }

  dispose() {
    disposeObjectTree(this.group);
  }

  rebuild() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      disposeObjectTree(child);
    }

    this.core = new THREE.Mesh(
      createCoreGeometry(this.role),
      getMaterialForRole(this.role, this.index, this.materials)
    );
    this.core.name = `${this.role}-core`;
    this.core.castShadow = true;
    this.core.receiveShadow = true;
    this.group.add(this.core);

    if (this.role === "head") {
      this.buildHeadDetails();
    } else if (this.role === "tail") {
      this.buildTailDetails();
    } else {
      this.buildBodyDetails();
    }
  }

  buildHeadDetails() {
    this.faceGroup = new THREE.Group();
    this.faceGroup.name = "head-face";
    this.faceGroup.position.z = FRONT_Z;

    const leftEye = new THREE.Mesh(createEyeGeometry(), this.materials.eyeWhite);
    leftEye.name = "left-eye";
    leftEye.position.set(-0.18, 0.17, 0.02);

    const rightEye = new THREE.Mesh(createEyeGeometry(), this.materials.eyeWhite);
    rightEye.name = "right-eye";
    rightEye.position.set(0.18, 0.17, 0.02);

    const leftPupil = new THREE.Mesh(createPupilGeometry(), this.materials.pupil);
    leftPupil.name = "left-pupil";
    leftPupil.position.set(-0.18, 0.16, 0.08);

    const rightPupil = new THREE.Mesh(createPupilGeometry(), this.materials.pupil);
    rightPupil.name = "right-pupil";
    rightPupil.position.set(0.18, 0.16, 0.08);

    const beak = new THREE.Mesh(createBeakGeometry(), this.materials.beak);
    beak.name = "beak";
    beak.position.set(0, -0.12, 0.05);
    beak.rotation.x = 0;

    this.faceGroup.add(leftEye, rightEye, leftPupil, rightPupil, beak);
    this.group.add(this.faceGroup);

    this.highlight = new THREE.Mesh(createHighlightGeometry(), this.materials.highlight);
    this.highlight.name = "head-highlight";
    this.highlight.position.set(0, 0.28, FRONT_Z + 0.02);
    this.group.add(this.highlight);
  }

  buildBodyDetails() {
    this.connectorA = new THREE.Mesh(createConnectorGeometry(), getMaterialForRole("body", this.index, this.materials));
    this.connectorB = new THREE.Mesh(createConnectorGeometry(), getMaterialForRole("body", this.index, this.materials));

    this.connectorA.name = "body-connector-a";
    this.connectorB.name = "body-connector-b";
    this.connectorA.castShadow = true;
    this.connectorB.castShadow = true;
    this.connectorA.receiveShadow = true;
    this.connectorB.receiveShadow = true;

    this.group.add(this.connectorA, this.connectorB);

    this.highlight = new THREE.Mesh(createHighlightGeometry(), this.materials.highlight);
    this.highlight.name = "body-highlight";
    this.highlight.position.set(0, 0.22, FRONT_Z + 0.02);
    this.group.add(this.highlight);
  }

  buildTailDetails() {
    this.tailTip = new THREE.Mesh(createTailTipGeometry(), this.materials.tail);
    this.tailTip.name = "tail-tip";
    this.tailTip.castShadow = true;
    this.tailTip.receiveShadow = true;
    this.group.add(this.tailTip);
  }

  updateHead(facing) {
    if (!this.faceGroup) return;
    this.faceGroup.rotation.z = angleForFacing(facing);
  }

  updateBody(segments) {
    const current = segments[this.index];
    const prev = segments[this.index - 1];
    const next = segments[this.index + 1];

    if (this.connectorA && prev) {
      placeConnector(this.connectorA, directionBetween(current, prev));
    }

    if (this.connectorB && next) {
      placeConnector(this.connectorB, directionBetween(current, next));
    }

    if (this.highlight && prev && next) {
      const a = directionBetween(current, prev);
      const b = directionBetween(current, next);
      const straight = Math.abs(a.x + b.x) < 0.001 && Math.abs(a.y + b.y) < 0.001;
      this.highlight.rotation.z = straight ? angleForLocalX(a) : 0;
    }
  }

  updateTail(segments) {
    if (!this.tailTip || this.index === 0) return;

    const current = segments[this.index];
    const previous = segments[this.index - 1];
    const awayFromBody = directionBetween(previous, current);

    this.tailTip.position.set(awayFromBody.x * 0.32, awayFromBody.y * 0.32, 0);
    this.tailTip.rotation.z = angleForLocalY(awayFromBody);
  }
}

function getRole(index, total) {
  if (index === 0) return "head";
  if (index === total - 1) return "tail";
  return "body";
}

function getMaterialForRole(role, index, materials) {
  if (role === "head") return materials.head;
  if (role === "tail") return materials.tail;
  return index % 2 === 0 ? materials.body : materials.bodyAlt;
}

function directionBetween(fromCoord, toCoord) {
  const from = cellToWorld(fromCoord);
  const to = cellToWorld(toCoord);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: dx / length,
    y: dy / length
  };
}

function placeConnector(connector, dir) {
  connector.visible = true;
  connector.position.set(dir.x * 0.28, dir.y * 0.28, 0);
  connector.rotation.z = angleForLocalX(dir);
}

function angleForLocalX(dir) {
  return Math.atan2(dir.y, dir.x);
}

function angleForLocalY(dir) {
  return Math.atan2(-dir.x, dir.y);
}

function angleForFacing(facing) {
  switch (facing) {
    case "right":
      return -Math.PI / 2;
    case "left":
      return Math.PI / 2;
    case "down":
      return Math.PI;
    case "up":
    default:
      return 0;
  }
}
