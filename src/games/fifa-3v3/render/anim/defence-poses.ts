import type { Frame } from "./frame";
import { neutral, type Pose } from "./pose";
import type { Side } from "./leg-ik";

/**
 * The defending moves: standing in the wall, jumping to block, the
 * steal's lunge, and the crouch of a player guarding his man. All but
 * the crouch are drawn from joint angles.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Hands cupped low in front, knees soft, weight shifting as they wait for the kick. */
export function wall(time: number, phase: number): Pose {
  const p = neutral();
  const sway = Math.sin(time * 1.7 + phase);
  p.shLX = p.shRX = -0.32;
  p.shLY = p.shRY = 0.55;
  p.shLZ = p.shRZ = 0.05;
  p.elL = p.elR = -0.55;
  p.kneeL = p.kneeR = 0.18;
  p.hipLX = p.hipRX = -0.1;
  p.lift = -0.02 + 0.006 * sway;
  p.spineX = 0.08;
  p.neckX = -0.08;
  p.roll = 0.02 * sway;
  return p;
}

/**
 * Off the ground: a crouch to spring, knees tucked at the top, and a
 * soft landing. `lift` is how high the boots are, from the engine, so
 * the drawn jump is exactly the one that blocks. A wall keeps its hands
 * in front; a guard reaches up.
 */
export function jump(t: number, length: number, lift: number, arms: "tucked" | "up"): Pose {
  const p = arms === "tucked" ? wall(0, 0) : neutral();
  const u = clamp01(t / length);
  const load = u < 0.1 ? smooth(u / 0.1) : 0;
  const land = u > 0.85 ? smooth((u - 0.85) / 0.15) : 0;
  const tuck = Math.sin(Math.PI * u);
  p.lift = lift - 0.1 * (load + land);
  p.kneeL = p.kneeR = 0.35 * (load + land) + 0.5 * tuck;
  p.hipLX = p.hipRX = -0.25 * (load + land) - 0.35 * tuck;
  p.ankL = p.ankR = 0.3 * tuck;
  if (arms === "up") {
    const up = smooth(u / 0.3);
    p.shLX = p.shRX = -2.6 * up;
    p.shLZ = p.shRZ = 0.25;
    p.elL = p.elR = -0.15;
    p.neckX = -0.2 * up;
  }
  return p;
}

/** The steal: a lunge with the near boot poking at the ball, the arms out for balance. */
export function steal(t: number, length: number, lead: Side): Pose {
  const p = neutral();
  const u = clamp01(t / length);
  const reach = u < 0.35 ? smooth(u / 0.35) : 1 - smooth((u - 0.55) / 0.45);
  p.pitch = 0.22 * reach;
  p.lift = -0.12 * reach;
  p.spineX = 0.2 * reach;
  // The poking leg swings forward nearly straight; the standing leg bends to lower the body.
  const poke = -0.95 * reach;
  const standKnee = 0.75 * reach;
  if (lead === 1) {
    p.hipLX = poke;
    p.kneeL = 0.15;
    p.ankL = -0.3 * reach;
    p.kneeR = standKnee;
    p.hipRX = -0.35 * reach;
  } else {
    p.hipRX = poke;
    p.kneeR = 0.15;
    p.ankR = -0.3 * reach;
    p.kneeL = standKnee;
    p.hipLX = -0.35 * reach;
  }
  p.shLZ = p.shRZ = 0.12 + 0.6 * reach;
  p.shLX = p.shRX = -0.3 * reach;
  p.neckX = -0.25 * reach;
  return p;
}

/** Guarding: lower and wider, the arms out a little, eyes on the man. Laid over the running frame. */
export function guardCrouch(f: Frame, amount: number): Frame {
  const k = clamp01(amount);
  f.pose.lift -= 0.07 * k;
  f.pose.pitch += 0.1 * k;
  f.pose.spineX += 0.08 * k;
  f.pose.shLZ += 0.35 * k;
  f.pose.shRZ += 0.35 * k;
  f.pose.elL -= 0.3 * k;
  f.pose.elR -= 0.3 * k;
  return f;
}
