import { add, neutral, type Pose } from "./pose";

/** How the arms carry the ball while the legs run. */
export type Carry = "none" | "tuck" | "ready";

export interface GaitInput {
  /** Ground speed in metres per second. */
  speed: number;
  /** Speed along the facing: negative while backpedalling, as a QB dropping back does. */
  ahead: number;
  /** Where the legs are in their stride, 0 to 1. */
  phase: number;
  carry: Carry;
  /** 0 for a lean player up to about 1.4 for a lineman: heavier bodies run lower with shorter arms swings. */
  build: number;
  time: number;
  /** A per player offset so idle players do not breathe in step. */
  seed: number;
}

const TAU = Math.PI * 2;

/** Metres covered per full stride (two steps) at a speed, for a given leg length. */
export function strideLength(speed: number, leg: number): number {
  return leg * (1.2 + Math.min(1, speed / 9) * 2.3);
}

/**
 * Standing and running. The run grows with speed: longer strides, a
 * forward lean, knees driving high and arms pumping against the legs.
 * Backpedalling runs the same cycle backward, sat upright. Carrying the
 * ball locks one arm: tucked high and tight under the right arm on the
 * run, or held in both hands at the chest for a QB ready to throw.
 */
export function gait(g: GaitInput): Pose {
  const p = neutral();
  const run = Math.min(1, g.speed / 8.5);
  const moving = Math.min(1, g.speed / 0.6);
  const back = g.ahead < -0.5 ? 1 : 0;
  const th = g.phase * TAU;
  const s = Math.sin(th);
  const c = Math.cos(th);
  const breathe = Math.sin(g.time * 2 + g.seed) * 0.02 * (1 - moving);
  const swing = (0.25 + 0.7 * run) * moving * (back ? 0.55 : 1);
  p.hipLX = -s * swing;
  p.hipRX = s * swing;
  // The trailing leg's heel kicks up behind; the knee straightens as the foot reaches ahead.
  p.kneeL = moving * (0.2 + (0.35 + 1.35 * run) * Math.max(0, c)) + 0.08;
  p.kneeR = moving * (0.2 + (0.35 + 1.35 * run) * Math.max(0, -c)) + 0.08;
  p.ankL = moving * 0.25 * Math.max(0, s);
  p.ankR = moving * 0.25 * Math.max(0, -s);
  // With the legs split between footfalls a fast runner is off the ground for a moment.
  p.lift = back ? 0 : run * run * 0.06 * s * s;
  p.pitch = back ? -0.08 : run * 0.3 + moving * 0.05;
  p.spineX = 0.04 + breathe + run * 0.1 + (back ? 0.15 : 0);
  p.neckX = -p.pitch * 0.9 - p.spineX * 0.8;
  p.spineY = -s * run * 0.14;
  const pump = (0.15 + 0.85 * run) * moving * (1 - 0.25 * g.build);
  p.shLX = s * pump;
  p.shRX = -s * pump;
  p.elL = -0.3 - moving * (0.4 + 0.9 * run);
  p.elR = p.elL;
  p.shLZ = 0.22 + 0.06 * g.build;
  p.shRZ = p.shLZ;
  if (g.carry === "tuck") add(p, { shRX: -p.shRX - 0.1, elR: -1.95 - p.elR, shRY: 0.45, shRZ: -0.02 });
  else if (g.carry === "ready") {
    // Two hands on the ball at the chest; the left hand under it, the right on the laces.
    p.shLX = -0.55;
    p.shRX = -0.55;
    p.elL = -1.55;
    p.elR = -1.45;
    p.shLY = 0.55;
    p.shRY = 0.5;
    p.shLZ = 0.28;
    p.shRZ = 0.3;
  }
  return p;
}
