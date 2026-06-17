export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeLinear(t) {
  return t;
}

export function easeInQuad(t) {
  return t * t;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function animateValue({ duration, easing = easeLinear, onUpdate, onComplete }) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    const frame = (now) => {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easing(rawT);

      onUpdate(t, rawT);

      if (rawT < 1) {
        requestAnimationFrame(frame);
      } else {
        if (onComplete) onComplete();
        resolve();
      }
    };

    requestAnimationFrame(frame);
  });
}

export function animateSegments({
  groups,
  starts,
  ends,
  duration,
  easing = easeInOutQuad,
  onUpdate
}) {
  return animateValue({
    duration,
    easing,
    onUpdate: (t, rawT) => {
      for (let i = 0; i < groups.length; i++) {
        const start = starts[i];
        const end = ends[i];
        const group = groups[i];

        group.position.set(
          lerp(start.x, end.x, t),
          lerp(start.y, end.y, t),
          lerp(start.z, end.z, t)
        );
      }

      if (onUpdate) onUpdate(t, rawT);
    }
  });
}

export function animateScale(object3D, from, to, duration, easing = easeOutBack) {
  object3D.scale.setScalar(from);

  return animateValue({
    duration,
    easing,
    onUpdate: (t) => {
      const value = lerp(from, to, t);
      object3D.scale.setScalar(value);
    },
    onComplete: () => object3D.scale.setScalar(to)
  });
}

export function animateShake(object3D, duration, amplitude = 0.08) {
  const originalX = object3D.position.x;
  const originalY = object3D.position.y;
  const originalRot = object3D.rotation.z;

  return animateValue({
    duration,
    easing: easeLinear,
    onUpdate: (t) => {
      const wave = Math.sin(t * Math.PI * 12);
      const fade = 1 - t;
      object3D.position.x = originalX + wave * amplitude * fade;
      object3D.position.y = originalY + Math.cos(t * Math.PI * 10) * amplitude * 0.35 * fade;
      object3D.rotation.z = originalRot + wave * 0.08 * fade;
    },
    onComplete: () => {
      object3D.position.x = originalX;
      object3D.position.y = originalY;
      object3D.rotation.z = originalRot;
    }
  });
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
