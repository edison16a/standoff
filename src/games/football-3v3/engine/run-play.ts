import { isDown } from "./body";
import { tracePath } from "./catch/path";
import { launch } from "./flight";
import { solveLaunch } from "./aim";
import { clampToWorld, FIELD, YARD } from "./field";
import type { Match } from "./match";
import { handOver } from "./control";
import { handSpot } from "./passer-facing";
import { PASS, PITCH } from "./tuning";
import type { Athlete, TeamId } from "./types";
import { clamp, len3, type V2, type V3 } from "./vec";

/**
 * The run call. One runner lines up beside the QB; after the snap the
 * QB pitches him the ball with a short lob and he runs with it. A pitch
 * goes backward or sideways, so it is not a forward pass: it counts as a
 * run, nobody can pick it off, and a pitch that hits the turf is dead
 * where the play started.
 */

/** The runner who lines up by the QB: a person's runner first, so a player gets the carry, else the first one. */
export function pickBack(athletes: readonly Athlete[], team: TeamId): number | null {
  const runners = athletes.filter((a) => a.team === team && a.role === "runner").sort((a, b) => a.slot - b.slot);
  return (runners.find((r) => r.seat !== null && !r.auto) ?? runners[0])?.id ?? null;
}

/** Beside the QB and a yard deeper, on the side with more room. */
export function backSpot(qb: V2, sign: 1 | -1, ballZ: number): V2 {
  const side = ballZ > 0 ? -1 : 1;
  return { x: qb.x - sign * PITCH.deeper * YARD, z: clamp(qb.z + side * PITCH.wide, -FIELD.halfWidth + 3, FIELD.halfWidth - 3) };
}

/** The computer back's path: out wide past the linemen, then upfield. */
export function sweepRoute(back: V2, qb: V2, sign: 1 | -1): V2[] {
  const side = back.z >= qb.z ? 1 : -1;
  const edgeX = FIELD.endX - 1;
  const edgeZ = FIELD.halfWidth - 1.5;
  const legs: [number, number][] = [[1, 3], [5, 7], [40, 9]];
  return legs.map(([down, wide]) => ({
    x: clamp(back.x + sign * down, -edgeX, edgeX),
    z: clamp(back.z + side * wide, -edgeZ, edgeZ),
  }));
}

/** The QB may pitch once, on a run call, while still a passer, with the ball and the back on his feet. */
export function canPitch(m: Match, a: Athlete): boolean {
  const play = m.play;
  if (m.phase !== "live" || !play || play.call !== "run" || play.pitched || play.qbRun || play.back === null) return false;
  const back = m.athlete(play.back);
  if (!back || isDown(back)) return false;
  return a.role === "qb" && a.team === m.offense && m.carrier()?.id === a.id && (a.action.kind === "none" || a.action.kind === "juke");
}

/** Starts the pitching motion; the ball leaves the hand part way through, as on a pass. */
export function startPitch(m: Match, a: Athlete): boolean {
  if (!canPitch(m, a)) return false;
  const to = m.play!.back!;
  m.play!.target = to;
  a.action = { kind: "throw", t: 0, dur: PASS.throwTime, released: false, to, lob: true, style: "flick", release: PASS.windup };
  return true;
}

/** The pitch leaves the hand: a soft lob to where the back will be. */
export function releasePitch(m: Match, a: Athlete, to: number): void {
  const back = m.athlete(to);
  if (!back || m.carrier()?.id !== a.id) return;
  const from: V3 = handSpot(a, back, PITCH.releaseHeight);
  const spot = clampToWorld({ x: back.x + back.vx * PITCH.time, z: back.z + back.vz * PITCH.time });
  const vel = solveLaunch(from, { x: spot.x, y: PASS.catchHeight, z: spot.z }, PITCH.time, "spiral", PITCH.spin);
  m.ball.state = "pass";
  m.ball.holder = null;
  const flight = launch(from, vel, "spiral", PITCH.spin, 0.08);
  m.ball.flight = flight;
  m.ball.pass = {
    from: a.id, to, interceptor: null, spot, arrive: PITCH.time, t: 0, speed: len3(vel),
    rps: PITCH.spin / (Math.PI * 2), release: from, at: m.time, tried: {}, path: tracePath(flight, m.time), tipped: false, pitch: true, lane: {},
  };
  m.play!.pitched = true;
  m.emit({ type: "pitch", id: a.id, to });
  handOver(m, a, back);
}
