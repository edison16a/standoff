import type { Match } from "./match";
import type { Athlete, Gesture, ShotInfo } from "./types";
import { dist2 } from "./vec";

/**
 * The small gestures after a big basket, picked by what just happened.
 * A dunk or an and one over a defender gets the too small pat, a hand
 * held low as if patting a child on the head. A deep or a contested
 * three gets the sleep sign, hands together under a tilted head, or a
 * finger to the lips. The rest of the makes get the player's own quick
 * celebration. Everything plays once the feet are back on the floor.
 */

/** Seconds a gesture lasts, and the player's own quick celebration after an ordinary make. */
export const GESTURE_TIME = 1.6;
const OWN_TIME = 1.3;

export function cheerFor(m: Match, shot: ShotInfo, shooter: Athlete, andOne: boolean): Gesture | null {
  const nearest = Math.min(...m.opponents(shooter.team).map((o) => dist2(o, shooter)), Infinity);
  if (shot.kind === "dunk" || andOne) {
    if (nearest < 1.9 || andOne) return m.rng() < 0.75 ? "tooSmall" : "flex";
    return m.rng() < 0.35 ? "flex" : null;
  }
  if (shot.points === 3 && (shot.distance > 7.6 || shot.contest > 0.35)) return m.rng() < 0.55 ? "sleep" : "shush";
  return null;
}

/** Starts a celebration if the shooter is free to: the owed gesture, or their own after an ordinary make. */
export function startCheer(a: Athlete, own: boolean): void {
  if (a.action.kind !== "none" || a.y > 0.01) return;
  if (a.cheer) {
    a.action = { kind: "celebrate", t: 0, dur: GESTURE_TIME, gesture: a.cheer };
    a.cheer = null;
  } else if (own) a.action = { kind: "celebrate", t: 0, dur: OWN_TIME, gesture: null };
}
