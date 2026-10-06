import { leanInto } from "./lean";
import { add, bump, neutral, smooth, type Pose } from "./pose";
import { legAngles, legPhase } from "./strides";

/** How the arms carry the ball while the legs run. */
export type Carry = "none" | "tuck" | "ready";

export interface GaitInput {
  /** Ground speed in metres per second. */
  speed: number;
  /** Speed along the facing: negative while backpedalling, as a QB dropping back does. */
  ahead: number;
  /** Speed to the body's left, for a shuffle across. */
  across?: number;
  /** Acceleration along the facing and to the left, m/s²: the body leans into both. */
  push?: number;
  turn?: number;
  /** Where the legs are in their stride, 0 to 1: the left foot strikes at a quarter, the right at three quarters. */
  phase: number;
  carry: Carry;
  /** 0 for a lean player up to about 1.4 for a lineman: heavier bodies run lower with shorter arm swings. */
  build: number;
  time: number;
  /** A per player offset so idle players do not breathe in step. */
  seed: number;
}

const TAU = Math.PI * 2;

/**
 * Metres covered per full stride (two steps) at a speed, for a given leg
 * length: about 1.7 legs walking, 3.2 jogging and 4.8 at a sprint, so
 * the cadence climbs from under two steps a second to over four.
 */
export function strideLength(speed: number, leg: number): number {
  return leg * Math.min(4.8, 1.25 + 0.47 * speed);
}

/**
 * The share of the stride each foot is on the ground. Walking, one foot
 * is always down and both are for a moment each step; running, a foot
 * stays down for under a leg's length of travel, so the share falls to
 * under a quarter at a sprint.
 */
export function dutyFactor(speed: number): number {
  const running = Math.max(0.22, Math.min(0.5, 0.85 / Math.min(4.8, 1.25 + 0.47 * speed)));
  return 0.6 + (running - 0.6) * gaitMix(speed).run;
}

/** How much of each gait the body is in: walking below about 1.5 m/s, sprinting over 6. */
export function gaitMix(speed: number): { walk: number; run: number; sprint: number } {
  const walk = 1 - smooth((speed - 1.1) / 1.8);
  const sprint = smooth((speed - 4.8) / 3.2);
  return { walk, run: 1 - walk, sprint };
}

/**
 * Standing still is never frozen: the chest rises and falls with each
 * breath, the weight drifts from one leg to the other with the free knee
 * unlocking, and the head looks about the field.
 */
function idle(p: Pose, g: GaitInput, still: number): void {
  if (still <= 0) return;
  const t = g.time + g.seed * 7.3;
  const breath = Math.sin(t * 1.7);
  const shift = Math.sin(t * 0.43) + 0.4 * Math.sin(t * 0.97);
  p.spineX += breath * 0.022 * still;
  p.shLZ -= breath * 0.02 * still;
  p.shRZ -= breath * 0.02 * still;
  p.side += shift * 0.018 * still;
  p.pelvisZ += shift * 0.035 * still;
  p.kneeL += Math.max(0, -shift) * 0.14 * still;
  p.kneeR += Math.max(0, shift) * 0.14 * still;
  p.neckY += (Math.sin(t * 0.37) * 0.3 + Math.sin(t * 0.83) * 0.12) * still;
}

/**
 * Standing, walking, jogging and sprinting as one blended cycle. The
 * thigh drives further forward than back, and higher the faster he goes;
 * the swinging knee folds the heel up behind; the stance knee gives a
 * little as the foot takes the weight. The pelvis turns with the leading
 * leg and drops on the swinging side while the chest turns back against
 * it and the arms pump against the legs. Walking rides over the stance
 * leg; running bounces off it with a moment in the air. Carrying the
 * ball locks one arm, or both at the chest for a QB ready to throw.
 */
export function gait(g: GaitInput): Pose {
  const p = neutral();
  const { walk, run, sprint } = gaitMix(g.speed);
  const moving = Math.min(1, g.speed / 0.5);
  const back = g.ahead < -0.5 ? 1 : 0;
  const th = g.phase * TAU;
  const s = Math.sin(th);
  const heavy = 1 - 0.22 * Math.min(1, g.build);
  const duty = dutyFactor(g.speed);
  // Backpedalling plays the stride backward (the phase runs the other way) in short, low, choppy steps.
  const reachK = back ? 0.55 : 1;
  const leg = (left: boolean) => {
    const l = legAngles(legPhase(g.phase, left), duty, run, sprint);
    const knee = 0.06 + (l.knee - 0.06) * (back ? 0.55 : 1) + (back ? 0.3 : 0);
    return { hip: (l.hip * reachK - (back ? 0.15 : 0)) * moving * heavy, knee: 0.06 + (knee - 0.06) * moving, ankle: l.ankle * moving * reachK };
  };
  const L = leg(true);
  const R = leg(false);
  Object.assign(p, { hipLX: L.hip, kneeL: L.knee, ankL: L.ankle, hipRX: R.hip, kneeR: R.knee, ankR: R.ankle });
  // A walk rides up over the stance leg; a run floats with both feet off the ground between steps.
  const flight = (left: boolean) => (duty < 0.5 ? bump((legPhase(g.phase, left) - duty) / (0.5 - duty)) : 0);
  const bob = Math.cos(2 * (th - TAU * (0.25 + duty / 2)));
  p.lift = back ? 0 : (walk * 0.012 * (1 + bob) + run * (0.03 + 0.03 * sprint) * Math.max(flight(true), flight(false))) * moving;
  p.pelvisY = -s * (0.12 * walk + 0.16 * run) * moving;
  // The hip over the planted foot rides up and the swinging side drops.
  p.pelvisZ = Math.cos(th - TAU * (0.25 + duty / 2)) * (0.06 * walk + 0.04 * run) * moving;
  p.spineY = s * (0.1 * walk + 0.16 * run) * moving;
  p.spineZ = -p.pelvisZ * 0.6;
  p.pitch = back ? -0.08 : (0.03 * walk + 0.1 * run + 0.18 * sprint) * moving;
  p.spineX = 0.04 + (back ? 0.15 : (0.03 * run + 0.08 * sprint) * moving);
  // The arms swing against the legs: loose and low walking, driving with the elbows bent running.
  const pump = (0.32 * walk + 0.55 * run + 0.35 * sprint) * moving * heavy;
  p.shLX = s * pump - 0.05 * run;
  p.shRX = -s * pump - 0.05 * run;
  const bend = 0.3 + (0.25 * walk + 1.2 * run + 0.25 * sprint) * moving;
  // The elbow opens as the arm swings back and closes as it drives forward.
  p.elL = -(bend - 0.25 * s * run * moving);
  p.elR = -(bend + 0.25 * s * run * moving);
  p.shLZ = 0.2 + 0.06 * g.build;
  p.shRZ = p.shLZ;
  leanInto(p, g, moving);
  idle(p, g, 1 - moving);
  // Eyes stay level over everything the body does.
  p.neckX = -p.pitch * 0.85 - p.spineX * 0.8;
  // High and tight: the forearm across the ribs, the ball's nose up in the hand, the elbow pinned in.
  if (g.carry === "tuck") add(p, { shRX: -p.shRX - 0.22, elR: -2.0 - p.elR, shRY: 0.55, shRZ: 0.12 - p.shRZ });
  else if (g.carry === "ready") {
    // Two hands on the ball at the chest; the left hand under it, the right on the laces.
    Object.assign(p, { shLX: -0.55, shRX: -0.55, elL: -1.55, elR: -1.45, shLY: 0.55, shRY: 0.5, shLZ: 0.28, shRZ: 0.3 });
  }
  return p;
}
