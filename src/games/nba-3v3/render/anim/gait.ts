import type { PosePatch } from "./pose";

/**
 * The walk, the jog and the sprint as one gait that changes with speed.
 * Each leg spends part of its cycle on the floor (most of it walking,
 * little of it sprinting) and the rest swinging through. On the floor
 * the hip sweeps so the foot moves back under the body at exactly the
 * ground speed, so it stays planted; in the swing the knee folds (the
 * heel kicks up to the seat in a sprint) and drives forward. Arms swing
 * against the legs, the pelvis turns with the leading leg and the
 * shoulders turn against it, and the head stays square.
 */

export interface GaitInput {
  /** Where the left leg is in its cycle, 0 to 1, 0 as its heel strikes. */
  phase: number;
  /** Ground speed, metres a second. */
  speed: number;
  /** Ground covered in one full cycle (two steps), metres. */
  stride: number;
  /** Hip to ankle, metres. */
  leg: number;
  /** The way of travel in the player's own frame, radians: 0 straight ahead, π/2 to his left, π backward. */
  heading: number;
}

export interface GaitOutput {
  pose: PosePatch;
  /** How far up both feet are in the flight between running steps, 0 to 1. */
  air: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const ease = (u: number) => u * u * (3 - 2 * u);

/** How much of the cycle a foot is down: 60 percent walking, down to 36 sprinting. */
export function stanceShare(run: number): number {
  return 0.6 - 0.24 * run;
}

interface Leg {
  hip: number;
  knee: number;
  foot: number;
  /** -1 at the back of the sweep to 1 at the front, for the arm on the other side. */
  swing: number;
}

/** Thigh and shin as shares of the leg, as the rig builds them. */
const THIGH = 0.514;
const SHIN = 0.486;

/**
 * The hip angle that puts the foot `ahead` of the hip with the knee bent
 * by `knee`, by Newton's method from a straight leg's answer.
 */
function hipFor(ahead: number, knee: number, leg: number): number {
  let hip = Math.asin(Math.max(-1, Math.min(1, ahead / leg)));
  for (let i = 0; i < 4; i++) {
    const f = THIGH * leg * Math.sin(hip) + SHIN * leg * Math.sin(hip - knee) - ahead;
    const df = THIGH * leg * Math.cos(hip) + SHIN * leg * Math.cos(hip - knee);
    hip -= f / Math.max(0.2, df);
  }
  return hip;
}

/** One leg at `phase` of its own cycle; `reach` is how far ahead of the hip the foot lands. */
function leg(phase: number, reach: number, len: number, run: number, sprint: number): Leg {
  const s = stanceShare(run);
  const p = ((phase % 1) + 1) % 1;
  if (p < s) {
    // On the floor the foot slides back under the hip at a steady rate, as fast as the body moves on,
    // while the knee gives a little as it takes the weight; the hip follows so the foot stays put.
    const u = p / s;
    const give = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (0.14 + 0.36 * run);
    const knee = 0.06 + 0.2 * run + give;
    const hip = hipFor(reach * (1 - 2 * u), knee, len);
    // Heel strike toes up, flat, then up onto the toes to push off.
    const foot = -0.14 * (1 - run) * (1 - smooth(0, 0.18, u)) + smooth(0.62, 1, u) * (0.32 + 0.22 * run);
    return { hip, knee, foot, swing: 1 - 2 * u };
  }
  // In the air: the knee folds and the thigh drives through, reaching out ahead for the next strike.
  const u = (p - s) / (1 - s);
  const a = hipFor(reach, 0.06 + 0.2 * run, len);
  const back = hipFor(-reach, 0.06 + 0.2 * run, len);
  const drive = (0.12 + 0.3 * sprint) * run * Math.sin(Math.PI * u) ** 2;
  const hip = back + (a - back) * ease(u) + drive;
  const fold = 1.0 + 0.55 * run + 0.6 * sprint;
  const knee = 0.06 + 0.2 * run + fold * Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 1.5 * (1 - 0.15 * u);
  const foot = (0.3 + 0.15 * run) * (1 - smooth(0, 0.5, u)) - 0.12 * smooth(0.5, 1, u);
  return { hip, knee, foot, swing: -1 + 2 * ease(u) };
}

/**
 * The legs, arms and trunk for a step of the gait. The sweep of the
 * hip on the floor is worked out from the stride, so the faster the
 * player goes the further each foot reaches.
 */
export function gait(g: GaitInput): GaitOutput {
  const run = smooth(1.7, 3.4, g.speed);
  const sprint = smooth(4.6, 7, g.speed);
  const s = stanceShare(run);
  // Each foot lands this far ahead of the hip and leaves as far behind, so it covers the stance's share of the stride.
  const reach = Math.min(0.85 * g.leg, (g.stride * s) / 2);
  const L = leg(g.phase, reach, g.leg, run, sprint);
  const R = leg(g.phase + 0.5, reach, g.leg, run, sprint);
  const fwd = Math.cos(g.heading);
  const side = Math.sin(g.heading);
  // Stepping sideways the legs open and close instead; they never cross far.
  const spread = (h: number) => Math.max(-0.06, h);
  const armAmp = 0.5 + 0.35 * run + 0.6 * sprint;
  const elbowBase = 0.22 + 1.2 * run + 0.15 * sprint;
  const turn = (0.07 + 0.08 * run) * (L.swing - R.swing) * 0.5 * Math.abs(fwd);
  const pose: PosePatch = {
    legLLift: 0.04 + L.hip * fwd,
    legRLift: 0.04 + R.hip * fwd,
    legLSpread: 0.05 + spread(L.hip * side),
    legRSpread: 0.05 + spread(-R.hip * side),
    kneeL: L.knee,
    kneeR: R.knee,
    footL: L.foot,
    footR: R.foot,
    // Each arm swings with the opposite leg; running, the elbows hold near a right angle and close as the hand comes up.
    armLRaise: 0.08 + armAmp * R.swing * 0.5 * fwd,
    armRRaise: 0.08 + armAmp * L.swing * 0.5 * fwd,
    elbowL: elbowBase + 0.25 * run * Math.max(0, R.swing),
    elbowR: elbowBase + 0.25 * run * Math.max(0, L.swing),
    armLSpread: 0.12 + 0.04 * run,
    armRSpread: 0.12 + 0.04 * run,
    armLTwist: 0.15 * run,
    armRTwist: 0.15 * run,
    pelvisY: turn,
    torsoY: -turn * 1.9,
    neckY: turn * 0.9,
    // The swinging side of the pelvis dips a little each step.
    pelvisZ: 0.035 * (L.swing > R.swing ? -1 : 1) * Math.abs(L.swing - R.swing) * 0.5 * (1 - run * 0.5),
    torsoX: 0.05 + 0.1 * run + 0.16 * sprint,
    neckX: -0.04 - 0.08 * run - 0.1 * sprint,
  };
  // Both feet are up in the gap after one foot leaves and before the other lands.
  const gap = 0.5 - s;
  const flight = (p: number) => {
    const f = (((p % 1) + 1) % 1) - s;
    return f > 0 && f < gap ? Math.sin((Math.PI * f) / gap) : 0;
  };
  const air = gap > 0 ? Math.max(flight(g.phase), flight(g.phase + 0.5)) * run : 0;
  return { pose, air };
}
