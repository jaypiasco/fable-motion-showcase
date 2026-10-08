import type { Gpu, Target } from "vgpu";
import type { StirInput } from "./pointer-input";
import {
  advectVelocityWgsl,
  curlWgsl,
  vorticityWgsl,
  divergenceWgsl,
  pressureWgsl,
  projectWgsl,
  advectDyeWgsl,
  displayWgsl,
} from "./shaders";
import { compute, effect, frame, pingPongStorage, storage } from "vgpu";

const GRID_SIZE = [128, 72] as const;
const DYE_SIZE = [GRID_SIZE[0] * 4, GRID_SIZE[1] * 4] as const;
const CELLS = GRID_SIZE[0] * GRID_SIZE[1];
const DYE_CELLS = DYE_SIZE[0] * DYE_SIZE[1];

export function createFluid(gpu: Gpu) {
  const allocated: object[] = [];
  try {
    const velocity = pingPongStorage(gpu, CELLS * 8);
    allocated.push(velocity.read, velocity.write);
    const dye = pingPongStorage(gpu, DYE_CELLS * 16);
    allocated.push(dye.read, dye.write);
    const pressure = pingPongStorage(gpu, CELLS * 4);
    allocated.push(pressure.read, pressure.write);
    const divergence = storage(gpu, CELLS * 4, "read-write");
    allocated.push(divergence);
    const curl = storage(gpu, CELLS * 4, "read-write");
    allocated.push(curl);
    const passes = createPasses(gpu);
    return {
      gpu,
      velocity,
      dye,
      pressure,
      divergence,
      curl,
      passes,
      step: 0,
      lastInputStep: -1000,
    };
  } catch (error) {
    for (const buffer of allocated) {
      destroyBuffer(buffer);
    }
    throw error;
  }
}

export type Fluid = ReturnType<typeof createFluid>;

export function destroyFluid(fluid: Fluid): void {
  const buffers = [
    fluid.velocity.read,
    fluid.velocity.write,
    fluid.dye.read,
    fluid.dye.write,
    fluid.pressure.read,
    fluid.pressure.write,
    fluid.divergence,
    fluid.curl,
  ];
  for (const buffer of buffers) {
    destroyBuffer(buffer);
  }
}

function destroyBuffer(buffer: object) {
  (buffer as { destroy(): void }).destroy();
}

function createPasses(gpu: Gpu) {
  const withGrid = (shader: string) =>
    compute(gpu, shader, {
      set: { grid: { size: GRID_SIZE, dye_size: DYE_SIZE } },
    });
  return {
    advectVelocity: withGrid(advectVelocityWgsl),
    curl: withGrid(curlWgsl),
    vorticity: withGrid(vorticityWgsl),
    divergence: withGrid(divergenceWgsl),
    pressure: withGrid(pressureWgsl),
    project: withGrid(projectWgsl),
    advectDye: withGrid(advectDyeWgsl),
    display: effect(gpu, displayWgsl),
  };
}

export async function prepareFluid(
  fluid: Fluid,
  output: Target
): Promise<void> {
  resizeFluid(fluid, output);
  await fluid.passes.display.compile({ colors: [output.format] });
}

export function resizeFluid(fluid: Fluid, output: Target): void {
  fluid.passes.display.set({ config: { output_size: output.size } });
}

export function stepFluid(fluid: Fluid, input?: StirInput): void {
  if (input?.active) fluid.lastInputStep = fluid.step;
  const dynamic = inputUniforms(fluid, input);
  const p = fluid.passes;

  p.advectVelocity
    .set({
      input: dynamic,
      src: fluid.velocity.read,
      dst: fluid.velocity.write,
    })
    .dispatch(16, 9);
  fluid.velocity.swap();

  // Confinement restores the small rotating details lost by semi-Lagrangian advection.
  p.curl
    .set({ velocity: fluid.velocity.read, curl: fluid.curl })
    .dispatch(16, 9);
  p.vorticity
    .set({
      src: fluid.velocity.read,
      curl: fluid.curl,
      dst: fluid.velocity.write,
    })
    .dispatch(16, 9);
  fluid.velocity.swap();

  p.divergence
    .set({ velocity: fluid.velocity.read, divergence: fluid.divergence })
    .dispatch(16, 9);
  for (let i = 0; i < 3; i++) {
    p.pressure
      .set({
        params: { decay: i === 0 ? 0.8 : 1 },
        src: fluid.pressure.read,
        divergence: fluid.divergence,
        dst: fluid.pressure.write,
      })
      .dispatch(16, 9);
    fluid.pressure.swap();
  }

  p.project
    .set({
      src: fluid.velocity.read,
      pressure: fluid.pressure.read,
      dst: fluid.velocity.write,
    })
    .dispatch(16, 9);
  fluid.velocity.swap();

  p.advectDye
    .set({
      input: dynamic,
      src: fluid.dye.read,
      velocity: fluid.velocity.read,
      dst: fluid.dye.write,
    })
    .dispatch(64, 36);
  fluid.dye.swap();
  fluid.step++;
  input?.consumeStep();
}

export function renderFluid(fluid: Fluid, output: Target): void {
  fluid.passes.display.set({ dye: fluid.dye.read });
  frame(fluid.gpu, (currentFrame) => {
    currentFrame.pass(output, fluid.passes.display);
  });
}

function inputUniforms(fluid: Fluid, input?: StirInput) {
  const [a, b] = idleEmitters(fluid.step);
  const pointerVelocity = input?.velocity ?? ([0, 0] as [number, number]);
  const speed = Math.hypot(...pointerVelocity);
  const direction =
    speed > 1e-4
      ? [pointerVelocity[0] / speed, pointerVelocity[1] / speed]
      : [0, 0];

  const sinceInput = fluid.step - fluid.lastInputStep;
  // Dynamic presence: when user is stirring, idle emitters gently duck down to 0.12 so cursor waves dominate;
  // when cursor rests, idle emitters gracefully rise back up to 0.85
  const idle =
    sinceInput < 60 ? 0.12 : 0.12 + 0.73 * Math.min(1, (sinceInput - 60) / 60);
  const ramp = Math.min(1, (fluid.step + 1) / 30);
  const idleWeight = ramp * idle;

  return {
    step: fluid.step,
    pointer_active: input?.active ? 1 : 0,
    pointer_from: input?.from ?? [0.5, 0.5],
    pointer_to: input?.to ?? [0.5, 0.5],
    pointer_velocity: pointerVelocity,
    // Dynamic Gradient Oscillation: Electric Blue [0.08, 0.65, 1.0] to Warm Magenta [1.0, 0.18, 0.80] with luminous light core
    pointer_color: (() => {
      const angle = Math.atan2(direction[1], direction[0]);
      const t = (fluid.step / 60) * 2.8;
      const osc = Math.sin(t + angle) * 0.5 + 0.5;

      // Interpolate between Electric Blue/Cyan [0.08, 0.65, 1.0] and Warm Magenta/Pink [1.0, 0.18, 0.80]
      const r = 0.08 + (1.0 - 0.08) * osc;
      const g = 0.65 + (0.18 - 0.65) * osc;
      const b = 1.0 + (0.80 - 1.0) * osc;

      return [r, g, b, 1.0] as [number, number, number, number];
    })(),
    // Idle background emitters disabled here as they are replaced by Idle harmonic emitter paths in the hero section
    idle_a: [...a, 0.0, 0.006],
    idle_b: [...b, 0.0, 0.0055],
  };
}

function idleEmitters(step: number): [[number, number], [number, number]] {
  const t = step / 60;
  return [
    [0.5 + 0.28 * Math.sin(0.73 * t), 0.5 + 0.22 * Math.sin(1.09 * t + 0.4)],
    [
      0.5 + 0.26 * Math.sin(0.61 * t + Math.PI),
      0.5 + 0.24 * Math.sin(0.97 * t + 2.1),
    ],
  ];
}
