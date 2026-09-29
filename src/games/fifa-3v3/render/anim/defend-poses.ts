import { JUMP, STEAL } from "../../engine/defend";
import { bump, clamp01, smooth, type Frame } from "./frame";
import type { Side } from "./leg-ik";
import { neutral, type Pose } from "./pose";

/**
 * The defending moves drawn from joint angles: the jump to block, the
 * steal's poke, the guard's low stance and the free kick wall.
 */

/**
 * Up to block: a dip to load the legs, a spring with both arms thrown
 * up, knees tucking at the top, and a soft landing. The body's lift
 * follows the engine's jump height, so the block the engine tests is
 * the block that is drawn.
 */
export function jumpPose(t: number, length: number, wall: boolean): Pose {
  const p = neutral();
  const u = clamp01(t / length);
  // Loading before the spring, and the knees soaking up the landing.
  const load = t < 0 ? 1 : 1 - smooth(u / 0.18);
  const land = smooth((u - 0.82) / 0.18);
  const bend = Math.max(load * 0.9, land * 0.7);
  const air = 4 * JUMP.height * u * (1 - u);
  p.lift = air - 0.12 * bend;
  p.kneeL = p.kneeR = 0.25 + 1.1 * bend + 0.5 * bump(u);
  p.hipLX = p.hipRX = -0.3 - 0.7 * bend - 0.35 * bump(u);
  p.ankL = p.ankR = 0.3 * bend;
  p.spineX = 0.1 + 0.2 * bend;
  const reach = smooth((u - 0.05) / 0.3) * (1 - land * 0.6);
  if (wall) {
    // A wall jumps with its hands kept in front, turning a shoulder to the ball.
    p.shLX = p.shRX = -0.6 - 0.4 * reach;
    p.shLY = p.shRY = 0.9;
    p.elL = p.elR = -1.3;
    p.neckX = 0.35 * reach;
  } else {
    p.shLX = p.shRX = -0.5 - 2.3 * reach;
    p.shLZ = p.shRZ = 0.25 + 0.3 * reach;
    p.elL = p.elR = -0.25;
    p.neckX = -0.25 * reach;
  }
  return p;
}

/** The poke: the lead boot stabs out at the ball, low, the body dropping behind it. */
export function stealPose(t: number, lead: Side): Pose {
  const p = neutral();
  const out = smooth(t / STEAL.strikeAt) * (1 - smooth((t - STEAL.strikeAt - 0.08) / 0.2));
  const front = lead === 1 ? "L" : "R";
  const back = lead === 1 ? "R" : "L";
  p[`hip${front}X`] = -1.05 * out;
  p[`knee${front}`] = 0.15 + 0.3 * (1 - out);
  p[`ank${front}`] = -0.3 * out;
  p[`hip${back}X`] = 0.35 * out;
  p[`knee${back}`] = 0.9 * out;
  p.lift = -0.14 * out;
  p.fwd = 0.1 * out;
  p.pitch = 0.18 * out;
  p.spineX = 0.2 * out;
  p.shLZ = p.shRZ = 0.45 * out + 0.12;
  p.shLX = p.shRX = -0.3 * out;
  p.elL = p.elR = -0.5;
  p.yaw = (lead === 1 ? -0.25 : 0.25) * out;
  return p;
}

/** Guarding: the running frame sunk into a low, wide stance with the arms out for balance. */
export function guardStance(f: Frame): Frame {
  f.pose.lift -= 0.08;
  f.pose.spineX += 0.18;
  f.pose.pitch += 0.06;
  f.pose.shLZ += 0.35;
  f.pose.shRZ += 0.35;
  f.pose.elL -= 0.35;
  f.pose.elR -= 0.35;
  f.pose.neckX -= 0.12;
  return f;
}

/** In the wall before the kick: feet together, hands crossed low in front, weight on the toes. */
export function wallPose(time: number, phase: number): Pose {
  const p = neutral();
  const shuffle = Math.sin(time * 3.1 + phase) * 0.03;
  p.kneeL = p.kneeR = 0.22;
  p.hipLX = p.hipRX = -0.14;
  p.hipLZ = p.hipRZ = 0.02;
  p.lift = -0.03;
  p.spineX = 0.1 + shuffle;
  p.shLX = p.shRX = -0.55;
  p.shLY = p.shRY = 0.95;
  p.shLZ = p.shRZ = 0.05;
  p.elL = p.elR = -1.25;
  p.neckX = -0.08;
  return p;
}
