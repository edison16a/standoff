import { THROW_MOVES, type ThrowKind } from "../../../engine/throw-preset";
import { keyed, mix, over, type Joint, type Keys, type Pose } from "../pose";
import {
  BOMB_FOLLOW, BOMB_LOAD, BOMB_RELEASE, FADE_FOLLOW, FADE_LOAD, FADE_RELEASE, FLICK_FOLLOW, FLICK_LOAD, FLICK_RELEASE,
  RUN_FOLLOW, RUN_LOAD, RUN_RELEASE, SET,
} from "./keys";

export { SET as THROW_SET } from "./keys";

/**
 * The four throwing motions, keyed on the engine's own clock for the
 * throw so the arm is over the top on exactly the frame the engine lets
 * the ball go (THROW_MOVES[kind].release). Each loads, releases and
 * follows through, then eases back toward the set as the action ends.
 */
interface Track {
  load: Pose;
  release: Pose;
  follow: Pose;
  /** Share of the wind up spent bringing the ball up to the ear. */
  loadAt: number;
  /** Seconds of follow through after the ball goes. */
  after: number;
}

const TRACKS: Record<ThrowKind, Track> = {
  flick: { load: FLICK_LOAD, release: FLICK_RELEASE, follow: FLICK_FOLLOW, loadAt: 0.6, after: 0.13 },
  bomb: { load: BOMB_LOAD, release: BOMB_RELEASE, follow: BOMB_FOLLOW, loadAt: 0.62, after: 0.18 },
  run: { load: RUN_LOAD, release: RUN_RELEASE, follow: RUN_FOLLOW, loadAt: 0.55, after: 0.13 },
  pressure: { load: FADE_LOAD, release: FADE_RELEASE, follow: FADE_FOLLOW, loadAt: 0.5, after: 0.15 },
};

/** The keys of a throw, in seconds from the start of the motion. Exported for the tests. */
export function throwKeys(kind: ThrowKind): Keys {
  const tr = TRACKS[kind];
  const { release, dur } = THROW_MOVES[kind];
  return [
    [0, SET],
    [release * tr.loadAt, tr.load],
    [release, tr.release],
    [release + tr.after, tr.follow],
    [dur, mix(tr.follow, SET, 0.45)],
  ];
}

/** The legs and hips a throw on the run takes from the stride. */
const LEGS: Joint[] = ["lift", "fwd", "side", "roll", "pelvisY", "pelvisZ", "hipLX", "hipLZ", "kneeL", "ankL", "hipRX", "hipRZ", "kneeR", "ankR"];

/** Upper body from `top`, legs from `legs`. */
function onLegs(top: Pose, legs: Pose): Pose {
  const out = { ...top };
  for (const j of LEGS) out[j] = legs[j];
  return out;
}

/** The QB's body `t` seconds into a throw of this kind. `run` is the stride he would be in. */
export function throwMotion(kind: ThrowKind, t: number, dur: number, run: () => Pose): Pose {
  const p = keyed(throwKeys(kind), Math.min(t, dur));
  return kind === "run" ? onLegs(p, run()) : p;
}

/** The ball high by the right shoulder in both hands, ready to go. */
const HIGH = over(SET, { shRX: -0.95, shLX: -0.75, elR: -1.65, elL: -1.7, shRZ: 0.45, spineY: -0.3, neckY: 0.25 });

/** Holding the throw stick while he aims: the ball up and ready, the legs carrying on. */
export function holdingThrow(run: Pose): Pose {
  return onLegs(HIGH, run);
}
