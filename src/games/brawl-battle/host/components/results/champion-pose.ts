import { keyed, over, restPose, type Pose, type PosePatch } from "../../../render/anim/pose";

/** Both arms straight up, hands together over the head, holding the cup high. */
const TROPHY_UP: PosePatch = {
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
const TROPHY_CHEST: PosePatch = {
  armLRaise: 1.1,
  armRRaise: 1.1,
  armLSpread: -0.45,
  armRSpread: -0.45,
  elbowL: 1.3,
  elbowR: 1.3,
  torsoX: 0.05,
  neckX: 0.1,
};

/** A dip at the knees to load the lift. */
const DIP: PosePatch = { ...TROPHY_CHEST, hipY: -0.12, kneeL: 0.6, kneeR: 0.6, legLLift: 0.3, legRLift: 0.3, torsoX: 0.2 };

const LIFT: readonly (readonly [number, PosePatch])[] = [
  [0, TROPHY_CHEST],
  [0.9, TROPHY_CHEST],
  [1.2, DIP],
  [1.55, { ...TROPHY_UP, hipY: 0.06 }],
  [1.8, TROPHY_UP],
];

/**
 * The champion's pose `t` seconds after the results open: the cup at the
 * chest, a dip, then a press over the head. Held high after that with a
 * bounce in the knees and a pump of the cup every couple of seconds.
 * `stance` is the fighter's own stance, which the legs start from.
 */
export function championPose(t: number, stance: PosePatch): Pose {
  const base = over(restPose(), stance);
  const pose = keyed(LIFT, t, base);
  if (t > 1.8) {
    const high = t - 1.8;
    const pump = Math.max(0, Math.sin(high * Math.PI * 0.9)) ** 8;
    pose.hipY += Math.sin(high * 5) * 0.015 - pump * 0.05;
    pose.elbowL = pose.elbowR = 0.35 + pump * 0.5;
    pose.spin = Math.sin(high * 0.6) * 0.3;
  }
  return pose;
}
