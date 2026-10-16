import type { MatchView } from "../../engine/view";
import { findMoments } from "./moments";

/**
 * A touchdown replay is one shot of the play at full speed, on one
 * camera that never cuts. A passing touchdown opens on the QB as he
 * sets, rides the ball from his hand all the way down into the
 * receiver's, then chases the run in. A touchdown on the ground is the
 * run chased from the handoff to the end zone. It ends as the scorer
 * pulls up, before the celebration that was just seen live.
 */
export type ReplayAngle = "trace" | "run";

export interface ReplaySegment {
  /** Match seconds the replay covers. */
  from: number;
  to: number;
  angle: ReplayAngle;
}

export interface ReplayScript {
  segments: ReplaySegment[];
  /** Seconds the whole replay takes to play, at full speed. */
  length: number;
  passer: number | null;
  scorer: number;
}

/** The pass opens this long before the throwing motion starts: the QB set in the pocket. */
const SET_S = 0.9;
/** A run is shown from the snap, or this long before the score on a long one. */
const RUN_S = 6;
/** This long after the line: the scorer easing up in the end zone. */
const AFTER_S = 1.3;

/** Lays out the replay of a touchdown in the clip, or null when there is no play to show. */
export function scriptReplay(clip: readonly MatchView[], scorer: number): ReplayScript | null {
  const m = findMoments(clip, scorer);
  if (!m) return null;
  const first = clip[0]!.time;
  const to = Math.min(clip[clip.length - 1]!.time, m.tdAt + AFTER_S);
  const from = m.pass ? Math.max(first, m.snapAt, m.pass.throwAt - SET_S) : Math.max(first, m.snapAt - 0.2, m.tdAt - RUN_S);
  if (to - from < 0.5) return null;
  const segments: ReplaySegment[] = [{ from, to, angle: m.pass ? "trace" : "run" }];
  return { segments, length: to - from, passer: m.pass?.passer ?? null, scorer };
}

/** Where in the match `t` seconds of replay lands, and on which shot. */
export function locate(script: ReplayScript, t: number): { time: number; segment: ReplaySegment } | null {
  let left = Math.max(0, t);
  for (const segment of script.segments) {
    const span = segment.to - segment.from;
    if (left <= span) return { time: segment.from + left, segment };
    left -= span;
  }
  const last = script.segments[script.segments.length - 1];
  return last ? { time: last.to, segment: last } : null;
}
