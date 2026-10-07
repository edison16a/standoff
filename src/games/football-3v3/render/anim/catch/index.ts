import type { AthleteView } from "../../../engine/view";
import { mirrorDelta } from "../tackle/body-keys";
import { keyed, over, type Keys, type Pose } from "../pose";
import { catchTrack } from "./moves";

export { catchTrack } from "./moves";

/** Below this speed the knees give with the ball; running, the stride carries on under the hands. */
const SLOW = 3;
/** Keys up to this long after the ball arrives are still about where it came in, so they mirror with it. */
const SIDED = 0.15;

export interface CatchMove {
  pose: Pose;
  /** Off the ground for part of the move: the feet are free, not planted by the stride. */
  air: boolean;
}

/**
 * The authored catch, pick or swat for a player with a move for the
 * ball (the engine picks it before the ball arrives), played on that
 * move's own clock so the hands meet the ball on the frame it gets
 * there. Laid over `run`, his stride, so a receiver catching in full
 * flight keeps running. Null for a player with no move.
 */
export function catchMove(a: AthleteView, run: () => Pose): CatchMove | null {
  const c = a.catching;
  if (!c) return null;
  const tau = c.t - c.at;
  const track = catchTrack(c.kind, c.result, { height: c.height, slow: a.speed < SLOW });
  const legs = run();
  // A ball on his right is the same move in a mirror, up to the moment it is in his hands.
  const keys: Keys = track.steps.map(([at, part]) => [at, over(legs, c.side < 0 && at <= SIDED ? mirrorDelta(part) : part)]);
  return { pose: keyed(keys, tau), air: track.air };
}
