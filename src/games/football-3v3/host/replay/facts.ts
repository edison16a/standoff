import { xToYard, YARD } from "../../engine/field";
import type { MatchView } from "../../engine/view";
import type { PlayMoments } from "./moments";

const MPH = 2.23694;

/** The numbers the replay shows over the play. */
export interface PlayFacts {
  /** The ball's speed out of the hand. */
  ballMph: number | null;
  /** How fast the spiral turns, in turns a minute. */
  spinRpm: number | null;
  /** How far the ball flew in the air, and for how long. */
  airYards: number | null;
  hangTime: number | null;
  /** Yards the scorer ran with the ball: after the catch, or the whole run. */
  runYards: number;
  /** The scorer's top speed on the way in. */
  topMph: number;
}

/** A point on the ball's flight for the traced line, with the match time it was there. */
export interface TracePoint {
  t: number;
  x: number;
  y: number;
  z: number;
}

/** Reads the throw, the flight and the run from the clip. */
export function describePlay(clip: readonly MatchView[], m: PlayMoments): PlayFacts {
  const pass = m.pass;
  const release = pass ? clip[pass.from]! : null;
  const caught = pass ? clip[pass.to]! : null;
  const ball = release?.ball;
  const speed = ball ? Math.hypot(ball.vx, ball.vy, ball.vz) : 0;
  const runFrom = caught ?? clip.find((f) => f.time >= m.snapAt)!;
  const td = clip.find((f) => f.time >= m.tdAt) ?? clip[clip.length - 1]!;
  const scorer = td.athletes[m.scorer];
  const start = runFrom.athletes[m.scorer];
  let top = 0;
  for (const f of clip) if (f.time >= runFrom.time && f.time <= m.tdAt) top = Math.max(top, f.athletes[m.scorer]?.speed ?? 0);
  const team = scorer?.team ?? 0;
  const runYards = scorer && start ? Math.max(0, Math.round(Math.min(100, xToYard(team, scorer.x)) - xToYard(team, start.x))) : 0;
  return {
    ballMph: ball ? Math.round(speed * MPH) : null,
    spinRpm: ball ? Math.round((Math.abs(ball.spin) / (Math.PI * 2)) * 60 / 10) * 10 : null,
    airYards: release && caught ? Math.round(Math.hypot(caught.ball.x - release.ball.x, caught.ball.z - release.ball.z) / YARD) : null,
    hangTime: pass ? Math.round((pass.catchAt - pass.releaseAt) * 10) / 10 : null,
    runYards,
    topMph: Math.round(top * MPH),
  };
}

/**
 * The ball's path from the hand to the catch, for drawing the traced
 * line. It starts at the release: before it the view puts the held ball
 * at the carrier's middle, and a line from there ran up through the
 * QB's body in the close replay angle.
 */
export function tracePass(clip: readonly MatchView[], m: PlayMoments): TracePoint[] {
  if (!m.pass) return [];
  const out: TracePoint[] = [];
  for (let i = m.pass.from; i <= m.pass.to; i++) {
    const f = clip[i];
    if (!f) continue;
    out.push({ t: f.time, x: f.ball.x, y: f.ball.y, z: f.ball.z });
  }
  return out;
}
