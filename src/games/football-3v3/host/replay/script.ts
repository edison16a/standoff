import type { MatchView } from "../../engine/view";
import { findMoments, type PlayMoments } from "./moments";

/**
 * A touchdown replay is the play shown twice at full speed, like a
 * network's replay package: first wide from high behind the offense, so
 * the whole field reads (the line firing out, the routes, the pursuit),
 * then close, over the QB's shoulder for the throw, beside the receiver
 * for the catch, and from the end zone as he runs in. A touchdown on
 * the ground is the wide take, then the run chased and met at the line.
 */
export type ReplayAngle = "all22" | "qb" | "catch" | "chase" | "endzone";

export interface ReplaySegment {
  /** Match seconds this shot covers. */
  from: number;
  to: number;
  angle: ReplayAngle;
  /** Which showing of the play it belongs to; the play starts over at each new take. */
  take: number;
}

export interface ReplayScript {
  segments: ReplaySegment[];
  /** Seconds the whole replay takes to play, at full speed. */
  length: number;
  passer: number | null;
  scorer: number;
}

/** The wide take opens on the line set before the snap, and is never longer than this. */
const LEAD_S = 0.7;
const WIDE_MAX_S = 9;
/** The close take starts this long before the throw, or before the line on a long run. */
const WINDUP_S = 1.1;
const RUN_S = 5.5;
/** The catch angle comes in this long before the ball arrives, and holds this long after. */
const CATCH_IN_S = 1;
const CATCH_HOLD_S = 1;
/** The end zone camera meets the runner for at least this long, else the shot before carries on. */
const ENDZONE_MIN_S = 1.3;
const ENDZONE_RUN_S = 2.4;
/** A beat over the line: it was just seen live. */
const AFTER_S = 0.8;
/** No shot is shorter than this; a cut that would make one is dropped. */
const MIN_SHOT_S = 0.7;

type Cut = [at: number, angle: ReplayAngle];

/** The close take's cuts for a passing touchdown. */
function passCuts(m: PlayMoments, end: number): Cut[] {
  const pass = m.pass!;
  const cuts: Cut[] = [[Math.max(m.snapAt, pass.throwAt - WINDUP_S), "qb"]];
  // Over the QB's shoulder the ball flies away down the line of the throw; the catch angle meets it.
  cuts.push([Math.max(pass.releaseAt + 0.45, pass.catchAt - CATCH_IN_S), "catch"]);
  const runIn = Math.max(pass.catchAt + CATCH_HOLD_S, m.tdAt - ENDZONE_RUN_S);
  if (end - runIn >= ENDZONE_MIN_S) cuts.push([runIn, "endzone"]);
  return cuts;
}

/** The close take's cuts for a run into the end zone. */
function runCuts(m: PlayMoments, end: number): Cut[] {
  const cuts: Cut[] = [[Math.max(m.snapAt - 0.2, m.tdAt - RUN_S), "chase"]];
  const runIn = m.tdAt - ENDZONE_RUN_S;
  if (end - runIn >= ENDZONE_MIN_S) cuts.push([runIn, "endzone"]);
  return cuts;
}

/** Turns one take's cuts into shots, dropping any cut that would leave a shot too short to read. */
function shots(cuts: Cut[], end: number, take: number): ReplaySegment[] {
  const kept: Cut[] = [];
  for (const cut of cuts) {
    const last = kept[kept.length - 1];
    if (last && cut[0] - last[0] < MIN_SHOT_S) continue;
    if (last && end - cut[0] < MIN_SHOT_S) continue;
    kept.push(cut);
  }
  return kept.map(([from, angle], i) => ({ from, to: i + 1 < kept.length ? kept[i + 1]![0] : end, angle, take }))
    .filter((s) => s.to - s.from > 1e-3);
}

/** Lays out the takes for a touchdown in the clip, or null when there is no play to show. */
export function scriptReplay(clip: readonly MatchView[], scorer: number): ReplayScript | null {
  const m = findMoments(clip, scorer);
  if (!m) return null;
  const first = clip[0]!.time;
  const end = Math.min(clip[clip.length - 1]!.time, m.tdAt + AFTER_S);
  const wideFrom = Math.max(first, m.snapAt - LEAD_S, m.tdAt - WIDE_MAX_S);
  const segments = [
    ...shots([[wideFrom, "all22"]], end, 0),
    ...shots(m.pass ? passCuts(m, end) : runCuts(m, end), end, 1),
  ];
  if (segments.length === 0) return null;
  const length = segments.reduce((sum, s) => sum + (s.to - s.from), 0);
  return { segments, length, passer: m.pass?.passer ?? null, scorer };
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
