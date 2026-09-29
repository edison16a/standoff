import { keyed, over, restPose, type Pose, type PosePatch } from "../../../render/anim/pose";

/**
 * How a winner holds the cup: overhead in both hands, or high in the
 * left with the right arm keeping their weapon low at their side. A
 * sword or staff lifted with the cup would stick up through the name.
 */
export interface Hold {
  hands: "both" | "left";
  /** The right arm's pose while it holds the weapon, for a one handed lift. */
  weapon?: PosePatch;
}

export type Keyframes = readonly (readonly [number, PosePatch])[];

/** Both arms straight up, hands together over the head, holding the cup high. */
const BOTH_UP: PosePatch = {
  armLRaise: 2.95,
  armRRaise: 2.95,
  armLSpread: -0.28,
  armRSpread: -0.28,
  elbowL: 0.35,
  elbowR: 0.35,
  torsoX: -0.12,
  neckX: -0.25,
  legLLift: 0.1,
  legRLift: -0.1,
  kneeL: 0.12,
  kneeR: 0.12,
};

/** The cup held in front of the chest before the lift. */
const BOTH_CHEST: PosePatch = { armLRaise: 1.1, armRRaise: 1.1, armLSpread: -0.45, armRSpread: -0.45, elbowL: 1.3, elbowR: 1.3, torsoX: 0.05, neckX: 0.1 };

/** The left arm straight up with the cup, leaning a touch away from the weapon side. */
const LEFT_UP: PosePatch = { armLRaise: 2.95, armLSpread: -0.1, elbowL: 0.3, torsoX: -0.1, torsoZ: -0.06, neckX: -0.25, legLLift: 0.1, legRLift: -0.1, kneeL: 0.12, kneeR: 0.12 };

const LEFT_CHEST: PosePatch = { armLRaise: 1.1, armLSpread: -0.45, elbowL: 1.3, torsoX: 0.05, neckX: 0.1 };

/** Seconds at which the pose is fully up; the celebration after it counts from here. */
export const UP_AT = 1.8;

/**
 * The lift for one way of holding the cup: at the chest, a dip at the
 * knees to load it, then a press over the head.
 */
export function liftFrames(hold: Hold): Keyframes {
  const one = hold.hands === "left";
  const chest = one ? { ...LEFT_CHEST, ...hold.weapon } : BOTH_CHEST;
  const up = one ? { ...LEFT_UP, ...hold.weapon } : BOTH_UP;
  const dip = { ...chest, hipY: -0.12, kneeL: 0.6, kneeR: 0.6, legLLift: 0.3, legRLift: 0.3, torsoX: 0.2 };
  return [
    [0, chest],
    [0.9, chest],
    [1.2, dip],
    [1.55, { ...up, hipY: 0.06 }],
    [UP_AT, up],
  ];
}

/**
 * The champion's pose `t` seconds after the results open, following
 * `frames` from `liftFrames`. Held high after that with a bounce in the
 * knees, a pump of the cup every couple of seconds and a slow turn to
 * show it round. `stance` is the fighter's own stance, which the legs
 * start from.
 */
export function championPose(t: number, stance: PosePatch, frames: Keyframes, hold: Hold): Pose {
  const pose = keyed(frames, t, over(restPose(), stance));
  if (t > UP_AT) {
    const high = t - UP_AT;
    const pump = Math.max(0, Math.sin(high * Math.PI * 0.9)) ** 8;
    pose.hipY += Math.sin(high * 5) * 0.015 - pump * 0.05;
    pose.elbowL += pump * 0.5;
    if (hold.hands === "both") pose.elbowR += pump * 0.5;
    pose.spin = Math.sin(high * 0.6) * 0.3;
  }
  return pose;
}
