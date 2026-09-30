import type { MatchView } from "../../engine/view";

/** The moments of a touchdown play, in match seconds, read from its stills. */
export interface PlayMoments {
  /** The ball was snapped. */
  snapAt: number;
  /** The ball crossed the goal line. */
  tdAt: number;
  scorer: number;
  pass: PassMoments | null;
}

/** A pass that ended in the scorer's hands, a catch or a pick. */
export interface PassMoments {
  passer: number;
  /** The throwing motion started. */
  throwAt: number;
  /** The ball left the hand. */
  releaseAt: number;
  /** The scorer took the ball. */
  catchAt: number;
  /** The frames of the ball's flight, from release to the catch. */
  from: number;
  to: number;
}

/**
 * Reads a clip for the snap, the throw, the catch and the score. Null
 * when the clip holds no live play before the touchdown, like one set up
 * from the admin panel, which has nothing to replay.
 */
export function findMoments(clip: readonly MatchView[], scorer: number): PlayMoments | null {
  const td = clip.findIndex((f) => f.phase === "touchdown");
  if (td <= 0) return null;
  let snap = -1;
  for (let i = td - 1; i >= 0; i--) {
    if (clip[i]!.phase !== "live") break;
    snap = i;
  }
  if (snap < 0) return null;
  return { snapAt: clip[snap]!.time, tdAt: clip[td]!.time, scorer, pass: findPass(clip, snap, td, scorer) };
}

function findPass(clip: readonly MatchView[], snap: number, td: number, scorer: number): PassMoments | null {
  let release = -1;
  for (let i = snap + 1; i < td; i++) {
    if (clip[i]!.ball.state === "pass" && clip[i - 1]!.ball.state !== "pass") release = i;
  }
  // A pitch on a run call is replayed as the run it starts.
  if (release < 0 || clip[release]!.ball.pitch) return null;
  let caught = -1;
  for (let i = release + 1; i <= td; i++) {
    const b = clip[i]!.ball;
    if (b.state === "pass") continue;
    if (b.state === "held" && b.holder === scorer) caught = i;
    break;
  }
  if (caught < 0) return null;
  const passer = clip[release - 1]!.ball.holder;
  if (passer === null) return null;
  let windup = release - 1;
  while (windup > snap && clip[windup - 1]!.athletes[passer]?.action === "throw") windup--;
  return {
    passer,
    throwAt: clip[windup]!.time,
    releaseAt: clip[release]!.time,
    catchAt: clip[caught]!.time,
    from: release,
    to: caught,
  };
}
