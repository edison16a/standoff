import type { MatchView } from "../../engine/view";
import { describePlay, tracePass, type PlayFacts, type TracePoint } from "./facts";
import { findMoments } from "./moments";

/**
 * A touchdown replay is cut into stages, each at its own speed and from
 * its own camera, like a television replay: from behind the QB as he
 * aims, deep slow motion on the throw, the ball chased through the air
 * into the scorer's hands with its path traced, then the run into the
 * end zone at full speed. A touchdown on the ground is just the run.
 */
export type ReplayStage = "aim" | "throw" | "flight" | "run";
export type ReplayCamera = "qb" | "ball" | "runner";

export interface ReplaySegment {
  /** Match seconds this stage covers. */
  from: number;
  to: number;
  /** Playback speed: 1 is real time. */
  rate: number;
  stage: ReplayStage;
  camera: ReplayCamera;
}

export interface ReplayScript {
  segments: ReplaySegment[];
  /** Seconds the whole replay takes to play. */
  length: number;
  passer: number | null;
  scorer: number;
  facts: PlayFacts;
  /** The ball's path from the hand to the catch, empty for a run. */
  trace: TracePoint[];
}

export const RATE: Record<ReplayStage, number> = { aim: 0.7, throw: 0.15, flight: 0.5, run: 1 };
/** How far back the aim starts before the throw, and how long the run may be before the goal line. */
const AIM_S = 1.6;
const RUN_S = 6.5;
/** The celebration after the line, kept short: it was just seen live. */
const AFTER_S = 1;

/** Lays out the stages for a touchdown in the clip, or null when there is no play to show. */
export function scriptReplay(clip: readonly MatchView[], scorer: number): ReplayScript | null {
  const m = findMoments(clip, scorer);
  if (!m) return null;
  const end = Math.min(clip[clip.length - 1]!.time, m.tdAt + AFTER_S);
  const cuts: [number, ReplayStage, ReplayCamera][] = [];
  const pass = m.pass;
  if (pass) {
    cuts.push([Math.max(m.snapAt + 0.2, pass.throwAt - AIM_S), "aim", "qb"]);
    cuts.push([pass.throwAt, "throw", "qb"]);
    cuts.push([pass.releaseAt + 0.3, "flight", "ball"]);
    cuts.push([Math.max(pass.catchAt + 0.15, m.tdAt - RUN_S), "run", "runner"]);
  } else {
    cuts.push([Math.max(m.snapAt, m.tdAt - RUN_S), "run", "runner"]);
  }
  const segments: ReplaySegment[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const [at, stage, camera] = cuts[i]!;
    const from = Math.max(at, segments[segments.length - 1]?.to ?? at);
    const to = Math.min(end, i + 1 < cuts.length ? cuts[i + 1]![0] : end);
    if (to - from > 1e-3) segments.push({ from, to, rate: RATE[stage], stage, camera });
  }
  if (segments.length === 0) return null;
  const length = segments.reduce((sum, s) => sum + (s.to - s.from) / s.rate, 0);
  return { segments, length, passer: pass?.passer ?? null, scorer, facts: describePlay(clip, m), trace: tracePass(clip, m) };
}

/** Where in the match `t` seconds of replay lands, and on which stage. */
export function locate(script: ReplayScript, t: number): { time: number; segment: ReplaySegment } | null {
  let left = Math.max(0, t);
  for (const segment of script.segments) {
    const span = (segment.to - segment.from) / segment.rate;
    if (left <= span) return { time: segment.from + left * segment.rate, segment };
    left -= span;
  }
  const last = script.segments[script.segments.length - 1];
  return last ? { time: last.to, segment: last } : null;
}
