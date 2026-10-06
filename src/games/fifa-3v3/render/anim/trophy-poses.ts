import { CEREMONY } from "../../engine/ceremony";
import { neutral, type Pose } from "./pose";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** 0 before `from`, rising to 1 at the middle and back to 0 at `to`. */
const bump = (t: number, from: number, to: number) => Math.sin(Math.PI * clamp01((t - from) / (to - from)));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Arms straight up over the head. */
const UP = -2.95;

/** The two holds on the cup: cradled at the chest, and right up over the head. */
const CRADLE = { shX: -0.2, shZ: -0.06, shY: 0.6, el: -0.95 };
const RAISED = { shX: UP, shZ: -0.06, shY: 0.05, el: -0.28 };

/**
 * The captain with the cup, `t` seconds into the ceremony. He holds it
 * at his chest and looks down at it, gives it a kiss, dips at the knees
 * and drives it up over his head with both hands. Then he pumps it up
 * and down in time, roaring, and turns a little either way to show it
 * round. The cup is placed between his hands every frame.
 */
export function captainPose(t: number): Pose {
  const p = neutral();
  const lift = smooth((t - CEREMONY.raise) / (CEREMONY.up - CEREMONY.raise));
  const held = t - CEREMONY.up;
  const pump = held > 0 ? 0.5 - 0.5 * Math.cos(held * 5.2) : 0;
  p.shLX = p.shRX = mix(CRADLE.shX, RAISED.shX, lift);
  p.shLZ = p.shRZ = mix(CRADLE.shZ, RAISED.shZ, lift) + 0.1 * pump;
  p.shLY = p.shRY = mix(CRADLE.shY, RAISED.shY, lift);
  p.elL = p.elR = mix(CRADLE.el, RAISED.el, lift) - 0.55 * pump;
  // A kiss for the cup: the head and shoulders lean in to it.
  const kiss = bump(t, 0.7, 1.7);
  p.spineX = 0.3 * kiss - 0.14 * lift;
  p.neckX = mix(0.3 + 0.3 * kiss, -0.5, lift);
  // A dip at the knees to drive it up, and a bounce on the toes with every pump.
  const dip = bump(t, CEREMONY.raise - 0.3, CEREMONY.raise + 0.35);
  p.kneeL = p.kneeR = 0.4 * dip + 0.12 * pump;
  p.hipLX = p.hipRX = -0.22 * dip - 0.06 * pump;
  p.ankL = p.ankR = 0.1 * dip;
  p.lift = -0.07 * dip - 0.03 * pump + 0.02 * lift;
  // Showing it round: a slow turn one way then the other once it is up.
  p.yaw = held > 0 ? 0.38 * Math.sin(held * 0.75) * smooth(held / 1.2) : 0;
  return p;
}

/**
 * A team mate at the ceremony. While the captain has the cup at his
 * chest they clap him, bouncing on their toes. As it goes up they leap
 * with both fists in the air and keep jumping, each in their own time.
 */
export function matePose(t: number, phase: number): Pose {
  const p = neutral();
  // A beat's reaction after the cup goes up, a little different for each.
  const go = smooth((t - CEREMONY.up + 0.05 - 0.12 * Math.sin(phase * 2.3)) / 0.25);
  const clap = Math.sin(t * 13 + phase);
  const bounce = Math.abs(Math.sin(t * 4.5 + phase));
  // Clapping: forearms swing in across the chest till the hands meet, and part, over and over.
  const meet = 0.5 + 0.5 * clap;
  p.shLX = p.shRX = mix(-0.7, UP * 0.92, go);
  p.shLZ = p.shRZ = mix(-0.08 + 0.12 * meet, 0.42, go);
  p.shLY = p.shRY = mix(0.95 - 0.35 * meet, 0, go);
  p.elL = p.elR = mix(-1.35, -0.75 + 0.35 * Math.sin(t * 9 + phase), go);
  p.lift = mix(0.03 * bounce, 0, go);
  p.neckX = mix(0.05, -0.35, go);
  // Jumping: up off both feet with the knees tucked, down, and up again.
  const hop = Math.abs(Math.sin((t - CEREMONY.up) * 4.2 + phase));
  const air = go * hop;
  p.lift += 0.34 * air - 0.1 * go * (1 - hop);
  p.kneeL = p.kneeR = go * (0.55 * (1 - hop) + 0.3 * hop) + (1 - go) * 0.08 * (1 - bounce);
  p.hipLX = p.hipRX = -go * (0.3 * (1 - hop) + 0.25 * hop);
  p.ankL = p.ankR = go * 0.25 * hop;
  p.spineX = mix(0.04, -0.12, go);
  return p;
}
