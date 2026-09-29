import { KNEE_SLIDE, SUI } from "../../engine/celebrate-moves";
import type { Celebration } from "../../looks";
import type { Frame } from "./frame";
import { neutral, type Pose } from "./pose";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const UP = -2.9;

/**
 * The scorer's goal celebration, a pose `t` seconds into it, timed by
 * the engine's celebrate-moves.ts so the body and its path agree.
 */
export function celebration(kind: Celebration, t: number): Pose {
  return kind === "sui" ? sui(t) : kneeSlide(t);
}

/**
 * The SUI. A last long stride and a crouch to spring, then up with the
 * knees tucked, turning half way round in the air, and down with the
 * feet planted wide, knees soaking up the landing, chest out, both arms
 * thrust down and back, head up and roaring.
 */
function sui(t: number): Pose {
  const p = neutral();
  const crouch = smooth(t / SUI.takeoff) * (1 - smooth((t - SUI.takeoff) / 0.08));
  const air = clamp01((t - SUI.takeoff) / (SUI.land - SUI.takeoff));
  const flying = t > SUI.takeoff && t < SUI.land;
  const land = smooth((t - SUI.land) / (SUI.settle - SUI.land));
  // Takeoff: sink and swing the arms back to throw them up.
  p.kneeL = p.kneeR = 0.75 * crouch;
  p.hipLX = p.hipRX = -0.55 * crouch;
  p.lift = -0.12 * crouch;
  p.shLX = p.shRX = 0.7 * crouch;
  if (flying) {
    const arc = Math.sin(Math.PI * air);
    p.lift = 0.62 * arc;
    p.kneeL = p.kneeR = 0.4 + 0.8 * arc;
    p.hipLX = p.hipRX = -0.5 * arc;
    // Arms swing up with the leap and open out through the turn.
    p.shLX = p.shRX = -1.6 * arc;
    p.shLZ = p.shRZ = 0.3 + 0.7 * air;
    p.spineX = -0.1 * arc;
  }
  // Half a turn in the air, finished by the time the boots touch down.
  p.yaw = Math.PI * 0.999 * smooth(air);
  if (t >= SUI.land) {
    const give = Math.max(0, 1 - (t - SUI.land) / 0.25);
    p.lift = -0.16 * land - 0.1 * give;
    p.hipLZ = p.hipRZ = 0.42 * land;
    p.kneeL = p.kneeR = 0.45 * land + 0.35 * give;
    p.hipLX = p.hipRX = -0.25 * land;
    p.shLX = p.shRX = 0.55 * land;
    p.shLZ = p.shRZ = 0.5 * land;
    p.elL = p.elR = -0.05;
    p.spineX = -0.3 * land;
    p.neckX = -0.45 * land;
    // Breathing hard in the held pose.
    p.spineX += 0.03 * Math.sin(t * 5) * land;
  }
  return p;
}

/**
 * The knee slide: down onto both knees at full pace, leaning back and
 * throwing the arms wide while the grass slows the slide, then both
 * fists pumping as it stops.
 */
function kneeSlide(t: number): Pose {
  const p = neutral();
  const down = smooth(t / KNEE_SLIDE.drop);
  const stopping = smooth((t - 1.2) / 0.4);
  p.lift = -0.46 * down;
  p.hipLX = p.hipRX = 0.1 * down;
  p.kneeL = p.kneeR = 1.55 * down;
  p.ankL = p.ankR = 0.5 * down;
  // Leaning back into the slide, easing upright as it stops.
  p.spineX = (-0.5 + 0.2 * stopping) * down;
  p.neckX = -0.45 * down;
  const wide = 1 - stopping;
  const pump = Math.sin(t * 8);
  p.shLZ = p.shRZ = (1.35 * wide + 0.6 * stopping) * down;
  p.shLX = p.shRX = (-0.3 * wide + (UP * 0.6 + 0.25 * pump) * stopping) * down;
  p.elL = p.elR = -0.1 * wide - 1.6 * stopping;
  return p;
}

/** A team mate's cheer: bouncing with both fists up. */
export function cheer(t: number, phase: number): Pose {
  const p = neutral();
  const hop = Math.abs(Math.sin(t * 5.5 + phase));
  p.lift = 0.22 * hop;
  p.kneeL = p.kneeR = 0.5 * (1 - hop);
  p.shLX = p.shRX = UP * 0.85;
  p.shLZ = p.shRZ = 0.45;
  p.elL = p.elR = -0.9;
  p.neckX = -0.3;
  return p;
}

/** Hands on hips, head down, after conceding or losing, trudging on the run's legs. */
export function dejected(f: Frame, t: number, phase: number): Frame {
  const p = f.pose;
  p.neckX = 0.55 + 0.05 * Math.sin(t * 1.3 + phase);
  p.spineX = 0.22;
  p.shLX = p.shRX = 0.35;
  p.shLZ = p.shRZ = 0.62;
  p.elL = p.elR = -1.7;
  p.spineY *= 0.3;
  return f;
}
