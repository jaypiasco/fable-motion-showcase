export interface StirInput {
  active: boolean;
  from: [number, number];
  to: [number, number];
  velocity: [number, number];
  consumeStep(): void;
  dispose(): void;
}

export interface StirInputOptions {
  canvas: HTMLCanvasElement;
  hostElement?: HTMLElement | null;
}

export function installStirInput(
  canvasOrOptions: HTMLCanvasElement | StirInputOptions
): StirInput {
  const canvas =
    "canvas" in canvasOrOptions ? canvasOrOptions.canvas : canvasOrOptions;

  let from: [number, number] = [0.5, 0.5];
  let to: [number, number] = [0.5, 0.5];
  let velocity: [number, number] = [0, 0];
  let lastTime = 0;
  let decay = 0;
  let isInside = false;

  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";

  const point = (clientX: number, clientY: number): [number, number] => {
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return [0.5, 0.5];
    return [
      Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height)),
    ];
  };

  const handlePointerMove = (event: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;

    // Allow slight buffer so cursor entering the hero triggers smoothly
    const inBounds =
      event.clientX >= r.left &&
      event.clientX <= r.right &&
      event.clientY >= r.top &&
      event.clientY <= r.bottom;

    if (!inBounds) {
      if (isInside) {
        isInside = false;
        // Ease out remaining momentum gently on exit
        decay = Math.min(decay, 6);
      }
      return;
    }

    const next = point(event.clientX, event.clientY);
    const now = event.timeStamp || performance.now();

    if (!isInside || lastTime === 0) {
      isInside = true;
      from = to = next;
      lastTime = now;
      velocity = [0, 0];
      decay = 8;
      return;
    }

    const dx = next[0] - to[0];
    const dy = next[1] - to[1];
    const dist = Math.hypot(dx, dy);

    // Deadband filter: ignore micro-jitters and resting cursor sensor noise
    if (dist < 0.0012) return;

    const dt = Math.max(0.008, Math.min(0.04, (now - lastTime) / 1000));
    from = to;
    to = next;

    const rawVx = Math.max(-2.0, Math.min(2.0, dx / dt));
    const rawVy = Math.max(-2.0, Math.min(2.0, dy / dt));

    // Smooth velocity with EMA to eliminate erratic sensitivity spikes
    velocity = [
      velocity[0] * 0.35 + rawVx * 0.65,
      velocity[1] * 0.35 + rawVy * 0.65,
    ];

    lastTime = now;
    const speed = Math.hypot(...velocity);
    // Adaptive decay: gentle moves stop smoothly, sweeping gestures leave a controlled wake
    decay = speed > 0.4 ? 7 : (speed > 0.1 ? 4 : 2);
  };

  const handlePointerLeave = () => {
    isInside = false;
    lastTime = 0;
    decay = 0;
    velocity = [0, 0];
  };

  // Single global listener on window prevents duplicate bubbling and tracks seamlessly across all hero children
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("pointerleave", handlePointerLeave, { passive: true });

  return {
    get active() {
      return decay > 0 && Math.hypot(velocity[0], velocity[1]) > 0.02;
    },
    get from() {
      return from;
    },
    get to() {
      return to;
    },
    get velocity() {
      return velocity;
    },
    consumeStep() {
      from = to;
      if (decay > 0) {
        // Natural fluid inertial momentum damping
        velocity = [velocity[0] * 0.80, velocity[1] * 0.80];
        decay--;
        if (decay === 0 || Math.hypot(velocity[0], velocity[1]) < 0.015) {
          velocity = [0, 0];
          decay = 0;
        }
      }
    },
    dispose() {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      canvas.style.touchAction = previousTouchAction;
    },
  };
}
