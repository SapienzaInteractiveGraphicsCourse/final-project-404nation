import * as THREE from "../../lib/three.module.js";

import { cellToWorld } from "../shared/coords.js";
import {
  CELL,
  FALL_MS,
  GLIDE_MS,
  GROW_MS
} from "../shared/constants.js";

import { SnakeSegment } from "./SnakeSegment.js";
import { createSnakeMaterials, setTreeOpacity } from "./SnakeMaterials.js";
import {
  animateScale,
  animateSegments,
  animateShake,
  animateValue,
  easeInOutQuad,
  easeInQuad,
  easeOutBack,
  lerp
} from "./SnakeAnimation.js";

/**
 * SnakeView is the visual module for the 2.5D Snakebird.
 *
 * Contract from the technical specification:
 * - It imports Three.js because it belongs to the view layer.
 * - It never imports the engine.
 * - It never decides rules, collisions, gravity, win, death, or fruit logic.
 * - It receives authoritative GameState snapshots and Phase objects.
 * - It returns Promises from playPhase so app/input can lock until animation ends.
 */
export class SnakeView {
  /**
   * @param {GameState} initialState
   * @param {object} opts
   * @param {object} [opts.materials] optional material overrides supplied by renderer
   * @param {boolean} [opts.debug=false] show optional debug helpers
   */
  constructor(initialState, opts = {}) {
    this.opts = opts;
    this.materials = createSnakeMaterials(opts.materials);
    this.segments = [];
    this.currentState = null;
    this.isAnimating = false;

    this.root = new THREE.Group();
    this.root.name = "SnakeView";

    this.setStateInstant(initialState);
  }

  get object3D() {
    return this.root;
  }

  /**
   * Snap the snake to a state with no animation.
   * Used for init, undo, reset, and level loading.
   *
   * @param {GameState} state
   */
  setStateInstant(state) {
    this.cancelVisualOffsets();
    this.clearSegments();

    for (let i = 0; i < state.segments.length; i++) {
      const segment = new SnakeSegment({
        index: i,
        total: state.segments.length,
        segments: state.segments,
        facing: state.facing,
        materials: this.materials,
        opts: this.opts
      });

      this.root.add(segment.object3D);
      this.segments.push(segment);
    }

    this.currentState = cloneState(state);

    if (state.status === "dead") {
      this.applyDeadPose();
    }
  }

  /**
   * Animate one phase from the engine.
   *
   * @param {Phase} phase
   * @returns {Promise<void>}
   */
  async playPhase(phase) {
    if (!phase || !phase.kind) return;

    this.isAnimating = true;

    try {
      switch (phase.kind) {
        case "glide":
          await this.playGlide(phase);
          break;
        case "fall":
          await this.playFall(phase);
          break;
        case "grow":
          await this.playGrow(phase);
          break;
        case "die":
          await this.playDie(phase);
          break;
        default:
          this.setStateInstant(phase.after ?? this.currentState);
          break;
      }
    } finally {
      this.isAnimating = false;
    }
  }

  clearSegments() {
    for (const segment of this.segments) {
      this.root.remove(segment.object3D);
      segment.dispose();
    }

    this.segments = [];
  }

  cancelVisualOffsets() {
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
    this.root.scale.set(1, 1, 1);
    setTreeOpacity(this.root, 1);
  }

  playGlide(phase) {
    this.setStateInstant(phase.before);

    const starts = phase.before.segments.map(cellToWorld);
    const ends = phase.after.segments.map(cellToWorld);
    const groups = this.segments.map((segment) => segment.object3D);

    return animateSegments({
      groups,
      starts,
      ends,
      duration: GLIDE_MS,
      easing: easeInOutQuad,
      onUpdate: (_t, rawT) => {
        this.applyMoveBounce(rawT, 0.055);
      }
    }).then(async () => {
      this.setStateInstant(phase.after);
      if (phase.after.status === "won") await this.playWinPulse();
    });
  }

  playFall(phase) {
    this.setStateInstant(phase.before);

    const starts = phase.before.segments.map(cellToWorld);
    const ends = phase.after.segments.map(cellToWorld);
    const groups = this.segments.map((segment) => segment.object3D);
    const fallCells = phase.meta?.fallCells ?? Math.max(1, estimateFallCells(phase.before, phase.after));

    return animateSegments({
      groups,
      starts,
      ends,
      duration: FALL_MS * fallCells,
      easing: easeInQuad,
      onUpdate: (_t, rawT) => {
        this.applyMoveBounce(rawT, 0.02);
      }
    }).then(async () => {
      this.setStateInstant(phase.after);
      if (phase.after.status === "won") await this.playWinPulse();
    });
  }

  async playGrow(phase) {
    const beforeLength = phase.before.segments.length;
    const afterLength = phase.after.segments.length;

    this.setStateInstant(phase.after);

    const newSegments = [];
    for (let i = beforeLength; i < afterLength; i++) {
      if (this.segments[i]) newSegments.push(this.segments[i].object3D);
    }

    if (newSegments.length === 0) {
      await this.pulseHead(GROW_MS);
    } else {
      await Promise.all(newSegments.map((segment) => animateScale(segment, 0.05, 1, GROW_MS, easeOutBack)));
      await this.pulseHead(Math.round(GROW_MS * 0.7));
    }

    this.setStateInstant(phase.after);
    if (phase.after.status === "won") await this.playWinPulse();
  }

  async playDie(phase) {
    this.setStateInstant(phase.before);

    const cause = phase.meta?.cause ?? "spikes";

    if (cause === "void") {
      await this.playVoidDeath();
    } else {
      await this.playSpikeDeath();
    }

    this.setStateInstant(phase.after);
    this.applyDeadPose();
  }

  applyMoveBounce(rawT, amount) {
    const bounce = Math.sin(rawT * Math.PI) * amount;

    for (let i = 0; i < this.segments.length; i++) {
      const group = this.segments[i].object3D;
      group.position.z += bounce * (i === 0 ? 1.35 : 1);
      group.scale.y = 1 - bounce * 0.18;
      group.scale.x = 1 + bounce * 0.08;
    }
  }

  async pulseHead(duration) {
    if (this.segments.length === 0) return;

    const head = this.segments[0].object3D;
    const originalScale = head.scale.clone();

    await animateValue({
      duration,
      easing: easeInOutQuad,
      onUpdate: (t) => {
        const wave = Math.sin(t * Math.PI);
        const scale = 1 + wave * 0.18;
        head.scale.set(originalScale.x * scale, originalScale.y * scale, originalScale.z * scale);
      },
      onComplete: () => {
        head.scale.copy(originalScale);
      }
    });
  }

  async playWinPulse() {
    const originals = this.segments.map((segment) => segment.object3D.scale.clone());

    await animateValue({
      duration: 280,
      easing: easeInOutQuad,
      onUpdate: (t) => {
        const wave = Math.sin(t * Math.PI);
        for (let i = 0; i < this.segments.length; i++) {
          const delay = i * 0.06;
          const localWave = Math.max(0, Math.sin(Math.max(0, t - delay) * Math.PI));
          const scale = 1 + wave * localWave * 0.16;
          this.segments[i].object3D.scale.setScalar(scale);
        }
      },
      onComplete: () => {
        for (let i = 0; i < this.segments.length; i++) {
          this.segments[i].object3D.scale.copy(originals[i]);
        }
      }
    });
  }

  async playSpikeDeath() {
    await animateShake(this.root, 420, 0.08);

    await animateValue({
      duration: 240,
      easing: easeInOutQuad,
      onUpdate: (t) => {
        for (let i = 0; i < this.segments.length; i++) {
          const group = this.segments[i].object3D;
          const direction = i % 2 === 0 ? 1 : -1;
          group.rotation.z = direction * lerp(0, 0.2, t);
          group.scale.y = lerp(1, 0.7, t);
        }
      }
    });
  }

  async playVoidDeath() {
    const startY = this.root.position.y;
    const startRot = this.root.rotation.z;

    await animateValue({
      duration: 520,
      easing: easeInQuad,
      onUpdate: (t) => {
        this.root.position.y = lerp(startY, startY - CELL * 2.2, t);
        this.root.rotation.z = lerp(startRot, startRot - 0.4, t);
        setTreeOpacity(this.root, lerp(1, 0.1, t));
      }
    });
  }

  applyDeadPose() {
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      segment.setDeadVisual(this.materials.dead);
      segment.object3D.rotation.z = i % 2 === 0 ? 0.13 : -0.13;
      segment.object3D.scale.y = 0.76;
    }
  }
}

function estimateFallCells(beforeState, afterState) {
  if (!beforeState.segments.length || !afterState.segments.length) return 1;
  return Math.abs(afterState.segments[0].row - beforeState.segments[0].row);
}

function cloneState(state) {
  return {
    ...state,
    segments: state.segments.map((coord) => ({ ...coord })),
    remainingFruit: state.remainingFruit?.map((coord) => ({ ...coord })) ?? []
  };
}

/**
 * @typedef {'up' | 'down' | 'left' | 'right'} Direction
 * @typedef {'playing' | 'won' | 'dead'} Status
 * @typedef {{ col: number, row: number }} Coord
 * @typedef {{ segments: Coord[], facing: Direction, eatenFruit: number, remainingFruit: Coord[], status: Status, moveCount: number }} GameState
 * @typedef {{ kind: 'glide' | 'fall' | 'grow' | 'die', before: GameState, after: GameState, meta?: object }} Phase
 */
