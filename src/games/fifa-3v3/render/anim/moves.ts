import type { Frame } from "./frame";
import type { Build } from "./leg-ik";
import { neutral, type Pose } from "./pose";

/**
 * The outfield players' moves that are drawn from joint angles alone:
 * standing in the lobby, tackles and falls. Running, kicks and skills
 * place the feet instead (gait.ts, kicks.ts, skill-poses.ts).
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Standing, weight on the balls of the feet, breathing. */
export function idle(time: number, phase: number): Pose {
  const p = neutral();
  const breath = Math.sin(time * 2.1 + phase);
  p.spineX = 0.04 + breath * 0.015;
  p.kneeL = p.kneeR = 0.14;
  p.hipLX = p.hipRX = -0.08;
  p.hipLZ = p.hipRZ = 0.06;
  p.lift = -0.012;
  p.shLZ = p.shRZ = 0.16 + breath * 0.02;
  p.neckX = -0.05;
  return p;
}

/** Leaning back into a slide, the leading leg out along the turf and one hand trailing. */
export function slide(t: number): Pose {
  const p = neutral();
  const drop = smooth(t / 0.12);
  p.pitch = -1.12 * drop;
  p.lift = -0.08 * drop;
  p.fwd = 0.5 * drop;
  p.hipRX = -0.15 * drop;
  p.kneeR = 0.05;
  p.hipLX = -0.3 * drop;
  p.kneeL = 1.5 * drop;
  p.hipLZ = 0.2;
  p.shLX = 1.2 * drop;
  p.shLZ = 0.5;
  p.shRX = -1.4 * drop;
  p.shRZ = 0.6;
  p.elR = -0.3;
  p.spineX = 0.4 * drop;
  p.neckX = 0.5 * drop;
  return p;
}

/** Scythed down: pitching forward onto the turf with the arms out. */
export function stumble(t: number): Pose {
  const p = neutral();
  const fall = smooth(t / 0.35);
  p.pitch = 1.3 * fall;
  p.lift = -0.05 * fall;
  p.fwd = -0.2 * fall;
  p.shLX = p.shRX = -2.4 * fall;
  p.shLZ = p.shRZ = 0.5;
  p.elL = p.elR = -0.5;
  p.hipLX = 0.3 * fall;
  p.kneeL = 0.6 * fall;
  p.kneeR = 0.2;
  p.neckX = -0.6 * fall;
  return p;
}

/** Back on the feet from the floor, through a crouch. */
export function getUp(t: number, length: number): Pose {
  const p = neutral();
  const up = smooth(t / length);
  p.kneeL = p.kneeR = 1.3 * (1 - up);
  p.hipLX = p.hipRX = -1.1 * (1 - up);
  p.pitch = 0.5 * (1 - up);
  p.lift = -0.32 * (1 - up);
  p.shLX = p.shRX = -0.5 * (1 - up);
  p.shLZ = p.shRZ = 0.3;
  return p;
}

/** Hopping over a sliding boot with the ball: the run carries on, tucked up in the air. */
export function hurdle(f: Frame, t: number, length: number, b: Build): Frame {
  const h = Math.sin(Math.PI * clamp01(t / length));
  f.pose.lift += 0.38 * h;
  f.pose.shLZ += 0.9 * h;
  f.pose.shRZ += 0.9 * h;
  // The feet tuck up under the body, leaving the ankles' height over the turf unchanged by the lift.
  for (const foot of [f.left, f.right]) {
    if (!foot) continue;
    foot.y += (0.38 + 0.2 * b.s) * h;
    foot.z -= 0.12 * h;
    foot.plant = false;
  }
  return f;
}
