import { CEREMONY } from "../../engine/ceremony";
import { STAND, type Pose } from "./pose";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** 0 before `from`, up to 1 in the middle and back to 0 at `to`. */
const bump = (t: number, from: number, to: number) => Math.sin(Math.PI * clamp01((t - from) / (to - from)));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The two holds on the trophy: hugged at the chest by its column, and straight up over the head. */
const CRADLE = { raise: 0.62, spread: -0.42, twist: 0.35, elbow: 1.55 };
const RAISED = { raise: 2.95, spread: -0.2, twist: 0.1, elbow: 0.3 };

/**
 * The captain with the trophy, `t` seconds into the ceremony. He holds
 * it at his chest and looks down at it, leans in to kiss the ball on
 * top, dips at the knees and drives it up over his head with both
 * hands. Then he pumps it, roaring up at it, and turns a little either
 * way to show it round. The trophy is set between his hands every frame.
 */
export function captainPose(t: number): Pose {
  const p = { ...STAND };
  const lift = smooth((t - CEREMONY.raise) / (CEREMONY.up - CEREMONY.raise));
  const held = t - CEREMONY.up;
  const pump = held > 0 ? (0.5 - 0.5 * Math.cos(held * 4.6)) * smooth(held / 0.6) : 0;
  p.armLRaise = p.armRRaise = mix(CRADLE.raise, RAISED.raise, lift) - 0.12 * pump;
  p.armLSpread = p.armRSpread = mix(CRADLE.spread, RAISED.spread, lift);
  p.armLTwist = p.armRTwist = mix(CRADLE.twist, RAISED.twist, lift);
  p.elbowL = p.elbowR = mix(CRADLE.elbow, RAISED.elbow, lift) + 0.55 * pump;
  // A kiss for the trophy: head and shoulders lean in to it.
  const kiss = bump(t, 0.7, 1.8);
  p.torsoX = 0.05 + 0.22 * kiss - 0.12 * lift;
  p.neckX = mix(0.35 + 0.25 * kiss, -0.55, lift) - 0.1 * pump;
  // A dip at the knees to drive it up, and a bounce with every pump.
  const dip = bump(t, CEREMONY.raise - 0.35, CEREMONY.raise + 0.35);
  const bend = 0.45 * dip + 0.14 * pump;
  p.kneeL = p.kneeR = 0.12 + bend;
  p.legLLift = p.legRLift = 0.06 + bend * 0.5;
  p.hipY = -0.02 - bend * 0.18;
  // Showing it round: a slow turn one way then the other once it is up.
  p.spin = held > 0 ? 0.32 * Math.sin(held * 0.7) * smooth(held / 1.2) : 0;
  return p;
}

/**
 * A teammate at the ceremony. While the captain has it at his chest they
 * clap him. As it goes up they throw both fists in the air and keep
 * jumping (the engine lifts them off the floor), each in their own time.
 */
export function matePose(t: number, phase: number): Pose {
  const p = { ...STAND };
  const go = smooth((t - CEREMONY.up + 0.05 - 0.1 * Math.sin(phase * 2.3)) / 0.3);
  // Clapping: the forearms swing in across the chest until the hands meet, and part, over and over.
  const meet = 0.5 + 0.5 * Math.sin(t * 12 + phase);
  const clapSpread = -0.1 - 0.35 * meet;
  const shake = Math.sin(t * 9 + phase) * 0.25;
  p.armLRaise = p.armRRaise = mix(0.95, 2.75, go);
  p.armLSpread = p.armRSpread = mix(clapSpread, 0.45, go);
  p.armLTwist = p.armRTwist = mix(0.3, 0, go);
  p.elbowL = mix(1.25, 0.55 + shake, go);
  p.elbowR = mix(1.25, 0.55 - shake, go);
  p.neckX = mix(0.05, -0.4, go);
  p.torsoX = mix(0.08, -0.12, go);
  // Knees tuck a little in the air and soak up each landing.
  const beat = Math.abs(Math.sin((t - CEREMONY.up) * 4.2 + phase));
  p.kneeL = p.kneeR = 0.12 + go * 0.35 * beat;
  p.legLLift = p.legRLift = 0.06 + go * 0.25 * beat;
  return p;
}
